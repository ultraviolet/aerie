import json
import logging
import os
import threading
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from google import genai
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Course, Question, Submission, User, Variant
from app.schemas import QuestionOut, SubmissionOut, SubmitRequest, VariantOut
from app.services.grader import grade_submission
from app.services.question_renderer import generate_variant
from app.services import supermemory_service as sm

log = logging.getLogger(__name__)
router = APIRouter(tags=["questions"])


def _check_question_access(q: Question | None, db: Session, user: User) -> Question:
    if not q:
        raise HTTPException(404, "Question not found")
    course = db.get(Course, q.course_id)
    if not course or course.user_id != user.id:
        raise HTTPException(404, "Question not found")
    return q


@router.get("/questions/{question_id}", response_model=QuestionOut)
def get_question(question_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.get(Question, question_id)
    _check_question_access(q, db, user)
    return q


@router.get("/questions/{question_id}/last-attempt")
def last_attempt(question_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Return the most recent variant + submission for a question, or null if none."""
    q = _check_question_access(db.get(Question, question_id), db, user)

    # Find the most recent variant that has a submission
    variant = (
        db.query(Variant)
        .filter(Variant.question_id == q.id, Variant.user_id == user.id)
        .join(Submission, Submission.variant_id == Variant.id)
        .order_by(Submission.submitted_at.desc())
        .first()
    )
    if not variant:
        return {"variant": None, "submission": None}

    sub = (
        db.query(Submission)
        .filter(Submission.variant_id == variant.id, Submission.user_id == user.id)
        .order_by(Submission.submitted_at.desc())
        .first()
    )

    # Re-render the HTML for this variant
    rendered_html = q.question_html
    if variant.params:
        import chevron
        try:
            rendered_html = chevron.render(q.question_html, {"params": variant.params, "correct_answers": variant.correct_answers})
        except Exception:
            pass

    return {
        "variant": VariantOut(
            id=variant.id,
            question_id=variant.question_id,
            seed=variant.seed,
            params=variant.params,
            correct_answers={},
            rendered_html=rendered_html,
            created_at=variant.created_at,
        ),
        "submission": SubmissionOut.model_validate(sub) if sub else None,
    }


@router.post("/questions/{question_id}/variant", response_model=VariantOut)
def create_variant(question_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = _check_question_access(db.get(Question, question_id), db, user)

    course = db.get(Course, q.course_id)
    result = generate_variant(
        question_dir=q.directory,
        course_path=course.path if course else "",
        question_html=q.question_html,
        stored_correct_answers=q.stored_correct_answers or None,
    )

    variant = Variant(question_id=q.id, user_id=user.id, seed=result["seed"])
    variant.params = result["params"]
    variant.correct_answers = result["correct_answers"]
    db.add(variant)
    db.commit()
    db.refresh(variant)

    return VariantOut(
        id=variant.id,
        question_id=variant.question_id,
        seed=variant.seed,
        params=variant.params,
        correct_answers={},
        rendered_html=result["rendered_html"],
        created_at=variant.created_at,
    )


@router.get("/variants/{variant_id}", response_model=VariantOut)
def get_variant(variant_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    v = db.get(Variant, variant_id)
    if not v or v.user_id != user.id:
        raise HTTPException(404, "Variant not found")

    q = db.get(Question, v.question_id)
    rendered_html = q.question_html if q else ""
    if q and v.params:
        import chevron
        try:
            rendered_html = chevron.render(q.question_html, {"params": v.params, "correct_answers": v.correct_answers})
        except Exception:
            pass

    return VariantOut(
        id=v.id,
        question_id=v.question_id,
        seed=v.seed,
        params=v.params,
        correct_answers={},
        rendered_html=rendered_html,
        created_at=v.created_at,
    )


@router.post("/variants/{variant_id}/submit", response_model=SubmissionOut)
def submit_answers(variant_id: int, req: SubmitRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    v = db.get(Variant, variant_id)
    if not v or v.user_id != user.id:
        raise HTTPException(404, "Variant not found")

    q = db.get(Question, v.question_id)
    course = db.get(Course, q.course_id) if q else None

    result = grade_submission(
        question_dir=q.directory if q else "",
        course_path=course.path if course else "",
        params=v.params,
        correct_answers=v.correct_answers,
        submitted_answers=req.submitted_answers,
    )

    sub = Submission(variant_id=v.id, user_id=user.id, score=result["score"])
    sub.submitted_answers = req.submitted_answers
    sub.feedback = result["feedback"]
    db.add(sub)
    db.commit()
    db.refresh(sub)

    # Save performance to supermemory in background (don't block response)
    if q and course:
        score = result["score"] or 0
        topic = q.topic or "General"
        title = q.title
        uid, cid = user.id, course.id

        def _save():
            try:
                if score >= 1.0:
                    mem = f"Student answered correctly on topic '{topic}': {title}"
                elif score > 0:
                    mem = f"Student got partial credit ({score*100:.0f}%) on topic '{topic}': {title}"
                else:
                    mem = f"Student answered incorrectly on topic '{topic}': {title}"
                sm.add_user_memory(mem, uid, cid)
            except Exception:
                log.exception("Failed to save submission memory")

        threading.Thread(target=_save, daemon=True).start()

    return sub


# ---------- Question Chat ----------


class ChatMessage(BaseModel):
    role: str  # "user" or "ai"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    question_html: str = ""
    submitted_answers: dict[str, Any] = {}
    correct_answers: dict[str, Any] = {}
    score: float | None = None
    feedback: dict[str, Any] = {}
    course_id: int | None = None


class ChatResponse(BaseModel):
    reply: str


CHAT_SYSTEM_PROMPT = """\
You are a helpful teaching assistant for a university course. A student just \
answered a practice question and wants to discuss it with you.

Your role:
- Help the student understand the concept being tested
- If they got it wrong, guide them toward the correct reasoning without just giving the answer outright at first
- If they got it right, reinforce their understanding or offer deeper insight
- Use LaTeX notation ($..$ for inline, $$..$$ for display) when writing math
- Keep responses concise and conversational — this is a chat, not a lecture
- Reference the specific question and their answer when relevant

You have a save_memory tool. Use it to remember important things about this \
student's learning. Call it when:
- The student is struggling with a specific concept or topic
- The student explicitly says they're weak at something or asks you to remember something
- You notice a pattern (e.g. repeated mistakes on a topic)
- The student demonstrates strong understanding of something
Do NOT call save_memory for every message — only when genuinely useful.

QUESTION CONTEXT:
{question_context}

STUDENT'S ANSWER:
{student_answer}

CORRECT ANSWER:
{correct_answer}

SCORE: {score}
{feedback}
{user_memory_context}
"""

# Gemini function declaration for save_memory
_SAVE_MEMORY_DECL = genai.types.FunctionDeclaration(
    name="save_memory",
    description=(
        "Save an observation about the student's learning to long-term memory. "
        "Use this when you notice the student struggling with a concept, when they "
        "ask you to remember something, or when you observe a learning pattern. "
        "The memory should be a concise, factual statement about the student."
    ),
    parameters=genai.types.Schema(
        type="OBJECT",
        properties={
            "memory": genai.types.Schema(
                type="STRING",
                description="A concise factual statement about the student's learning, e.g. 'Student struggles with SQL JOIN syntax' or 'Student prefers visual explanations for tree algorithms'",
            ),
        },
        required=["memory"],
    ),
)

_SAVE_MEMORY_TOOL = genai.types.Tool(function_declarations=[_SAVE_MEMORY_DECL])


@router.post("/variants/{variant_id}/chat", response_model=ChatResponse)
def chat_about_question(
    variant_id: int,
    req: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    import re

    v = db.get(Variant, variant_id)
    if not v or v.user_id != user.id:
        raise HTTPException(404, "Variant not found")

    q = db.get(Question, v.question_id)
    course_id = req.course_id or (q.course_id if q else None)

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(500, "GEMINI_API_KEY not configured")

    # Build context from the question
    question_html = req.question_html or ""
    clean_question = re.sub(r"<[^>]+>", " ", question_html)
    clean_question = re.sub(r"\s+", " ", clean_question).strip()

    score_str = f"{req.score * 100:.0f}%" if req.score is not None else "Not graded"
    feedback_str = ""
    if req.feedback and req.feedback.get("message"):
        feedback_str = f"FEEDBACK: {req.feedback['message']}"

    # Search user memories for relevant context
    user_memory_context = ""
    if course_id:
        topic = q.topic if q else req.message
        memories = sm.search_user_memories(topic, user.id, course_id, limit=5)
        if memories:
            user_memory_context = (
                "\nSTUDENT LEARNING HISTORY (from previous interactions):\n"
                + "\n".join(f"- {m}" for m in memories)
            )

    system_prompt = CHAT_SYSTEM_PROMPT.format(
        question_context=clean_question[:2000],
        student_answer=json.dumps(req.submitted_answers, default=str)[:500],
        correct_answer=json.dumps(req.correct_answers, default=str)[:500],
        score=score_str,
        feedback=feedback_str,
        user_memory_context=user_memory_context,
    )

    # Build conversation contents for Gemini
    contents: list[genai.types.Content] = []
    for msg in req.history:
        contents.append(genai.types.Content(
            role="user" if msg.role == "user" else "model",
            parts=[genai.types.Part(text=msg.content)],
        ))
    contents.append(genai.types.Content(
        role="user",
        parts=[genai.types.Part(text=req.message)],
    ))

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=contents,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
                max_output_tokens=1024,
                tools=[_SAVE_MEMORY_TOOL],
            ),
        )

        # Handle function calls — Gemini may call save_memory + return text
        reply_parts: list[str] = []
        for candidate in response.candidates or []:
            for part in candidate.content.parts or []:
                if part.text:
                    reply_parts.append(part.text)
                if part.function_call and part.function_call.name == "save_memory":
                    args = part.function_call.args or {}
                    memory_text = args.get("memory", "")
                    if memory_text and course_id:
                        sm.add_user_memory(memory_text, user.id, course_id)
                        log.info("Gemini saved memory for user %d: %s", user.id, memory_text[:120])

        reply = " ".join(reply_parts).strip()

        # If Gemini only returned a function call with no text, do a follow-up
        if not reply:
            # Send the function result back and get the text response
            contents.append(response.candidates[0].content)
            contents.append(genai.types.Content(
                role="user",
                parts=[genai.types.Part(function_response=genai.types.FunctionResponse(
                    name="save_memory",
                    response={"status": "saved"},
                ))],
            ))
            follow_up = client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=contents,
                config=genai.types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.7,
                    max_output_tokens=1024,
                ),
            )
            reply = follow_up.text.strip()

        log.info("Chat response for variant %d: %d chars", variant_id, len(reply))
        return ChatResponse(reply=reply)
    except Exception as e:
        log.exception("Chat failed for variant %d", variant_id)
        raise HTTPException(502, f"Chat failed: {e}")
