import json
import logging
import os
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

QUESTION CONTEXT:
{question_context}

STUDENT'S ANSWER:
{student_answer}

CORRECT ANSWER:
{correct_answer}

SCORE: {score}
{feedback}
"""


@router.post("/variants/{variant_id}/chat", response_model=ChatResponse)
def chat_about_question(
    variant_id: int,
    req: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    v = db.get(Variant, variant_id)
    if not v or v.user_id != user.id:
        raise HTTPException(404, "Variant not found")

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(500, "GEMINI_API_KEY not configured")

    # Build context from the question
    question_html = req.question_html or ""
    # Strip HTML tags for a cleaner context
    import re
    clean_question = re.sub(r"<[^>]+>", " ", question_html)
    clean_question = re.sub(r"\s+", " ", clean_question).strip()

    score_str = f"{req.score * 100:.0f}%" if req.score is not None else "Not graded"
    feedback_str = ""
    if req.feedback and req.feedback.get("message"):
        feedback_str = f"FEEDBACK: {req.feedback['message']}"

    system_prompt = CHAT_SYSTEM_PROMPT.format(
        question_context=clean_question[:2000],
        student_answer=json.dumps(req.submitted_answers, default=str)[:500],
        correct_answer=json.dumps(req.correct_answers, default=str)[:500],
        score=score_str,
        feedback=feedback_str,
    )

    # Build conversation contents for Gemini
    contents: list[genai.types.Content] = []
    for msg in req.history:
        contents.append(genai.types.Content(
            role="user" if msg.role == "user" else "model",
            parts=[genai.types.Part(text=msg.content)],
        ))
    # Add the new user message
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
            ),
        )
        reply = response.text.strip()
        log.info("Chat response for variant %d: %d chars", variant_id, len(reply))
        return ChatResponse(reply=reply)
    except Exception as e:
        log.exception("Chat failed for variant %d", variant_id)
        raise HTTPException(502, f"Chat failed: {e}")
