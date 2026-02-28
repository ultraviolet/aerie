"""Generate PrairieLearn-format questions using Gemini + Supermemory RAG."""

import json
import logging
import os
import uuid

from google import genai
from sqlalchemy.orm import Session

from app.models import Assessment, Course, Question
from app.services.supermemory_service import search as sm_search

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are a question generator for an educational platform called prAIrie.
You create questions in PrairieLearn format.

A question consists of:
1. **question_html**: HTML using these custom elements:
   - `<pl-question-panel>` wraps the question content
   - `<pl-answer-panel>` wraps the answer/explanation shown after submission
   - `<markdown>` renders Markdown inside HTML
   - Input elements (use ONE per question):
     - `<pl-number-input answers-name="X" label="Y" />` for numeric answers
     - `<pl-string-input answers-name="X" label="Y" />` for text answers
     - `<pl-multiple-choice answers-name="X">` with `<pl-answer correct="true/false">text</pl-answer>` children
     - `<pl-checkbox answers-name="X">` with `<pl-answer correct="true/false">text</pl-answer>` children

2. **correct_answers**: A JSON object mapping each answers-name to its correct value.
   - For number/string inputs: `{"X": "the_answer"}`
   - For multiple-choice: `{"X": "the correct option text"}`
   - For checkbox: `{"X": ["correct1", "correct2"]}`

3. **title**: A short descriptive title for the question.
4. **topic**: The topic/category.
5. **tags**: A list of relevant tags.

IMPORTANT RULES:
- Each `answers-name` in the HTML must have a corresponding key in `correct_answers`
- You MUST base your questions on the COURSE MATERIAL CONTEXT provided below. Do NOT generate generic questions from your own knowledge. If context is provided, the question MUST test concepts, facts, or examples found in that context.
- If no course material context is provided, you may generate a question based on the user's prompt alone, but prefer to note that no course materials were available.
- Make questions educational and appropriately challenging
- Vary question types across the batch (mix multiple-choice, checkbox, number-input, string-input)
- Each question should cover a DIFFERENT concept or aspect of the material — avoid repetition
- Always include an `<pl-answer-panel>` with a clear explanation
- Return ONLY valid JSON, no markdown fences

When asked for ONE question, return a JSON object:
{"title": "...", "topic": "...", "tags": ["..."], "question_html": "...", "correct_answers": { ... }}

When asked for MULTIPLE questions, return a JSON object with a "questions" array:
{"questions": [{"title": "...", "topic": "...", "tags": ["..."], "question_html": "...", "correct_answers": { ... }}, ...]}
"""


def _get_gemini_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set")
    return genai.Client(api_key=api_key)


def generate_questions(
    prompt: str,
    course: Course,
    db: Session,
    topic: str = "",
    num_questions: int = 1,
) -> tuple[list[Question], list[str]]:
    """Generate questions using RAG context from the course's documents.

    Returns (list_of_questions, context_chunks).
    """

    # 1. Retrieve relevant context from Supermemory
    context_chunks: list[str] = []
    if course.container_tag:
        try:
            context_chunks = sm_search(prompt, course.container_tag, limit=8)
            log.info(
                "RAG context for course %s (tag=%s): %d chunks retrieved",
                course.id, course.container_tag, len(context_chunks),
            )
        except Exception:
            log.exception("Supermemory search failed for course %s (tag=%s)", course.id, course.container_tag)
    else:
        log.warning("Course %s has no container_tag — skipping RAG", course.id)

    # 2. Build the Gemini prompt
    context_section = ""
    if context_chunks:
        context_section = (
            "COURSE MATERIAL CONTEXT (use this to generate the questions):\n"
            + "\n---\n".join(context_chunks)
            + "\n\n"
        )
        log.info("Context section length: %d chars", len(context_section))
    else:
        log.warning("No RAG context available — Gemini will generate without course materials")

    user_prompt = f"{context_section}USER REQUEST: {prompt}"
    if topic:
        user_prompt += f"\nTOPIC: {topic}"
    if num_questions > 1:
        user_prompt += f"\nNUMBER OF QUESTIONS: {num_questions} (return a diverse set covering different aspects of the material)"

    log.debug("Full Gemini prompt (%d chars): %s...", len(user_prompt), user_prompt[:200])

    # 3. Call Gemini — scale tokens with question count
    max_tokens = min(4096 * num_questions, 65536)
    client = _get_gemini_client()
    response = client.models.generate_content(
        model="gemini-3-pro-preview",
        contents=user_prompt,
        config=genai.types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.7,
            max_output_tokens=max_tokens,
            response_mime_type="application/json",
        ),
    )

    # 4. Parse response — check for truncation first
    if (
        response.candidates
        and response.candidates[0].finish_reason
        and str(response.candidates[0].finish_reason) not in ("STOP", "FinishReason.STOP", "1")
    ):
        log.error("Gemini response truncated (finish_reason=%s)", response.candidates[0].finish_reason)
        raise ValueError("Gemini response was truncated — try fewer questions or a simpler prompt")

    raw = response.text.strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        log.error("Failed to parse Gemini response (len=%d): %s...", len(raw), raw[:300])
        raise ValueError("Gemini returned invalid JSON — the response may have been truncated")

    # Normalize: single question vs batch
    if "questions" in data and isinstance(data["questions"], list):
        items = data["questions"]
    else:
        items = [data]

    log.info("Gemini returned %d question(s)", len(items))

    # 5. Create a new assessment for this batch
    assessment_title = topic if topic else prompt[:60].strip()
    if not assessment_title:
        assessment_title = "AI Generated Quiz"
    tid = f"gen_{uuid.uuid4().hex[:8]}"

    assessment = Assessment(
        course_id=course.id,
        tid=tid,
        title=assessment_title,
        type="Practice",
    )
    assessment.question_ids = []
    db.add(assessment)
    db.flush()

    # 6. Create Question rows
    questions: list[Question] = []
    current_ids: list[str] = []

    for item in items:
        title = item.get("title", "Generated Question")
        q_topic = item.get("topic", topic)
        tags = item.get("tags", ["ai-generated"])
        question_html = item.get("question_html", "")
        correct_answers = item.get("correct_answers", {})

        if not question_html:
            log.warning("Skipping question with empty question_html: %s", title)
            continue

        qid = f"gen_{uuid.uuid4().hex[:8]}"
        question = Question(
            course_id=course.id,
            qid=qid,
            uuid=str(uuid.uuid4()),
            title=title,
            topic=q_topic,
            question_html=question_html,
            has_server_py=False,
            single_variant=True,
            directory="",
        )
        question.tags = tags if isinstance(tags, list) else [str(tags)]
        question.stored_correct_answers = correct_answers
        db.add(question)
        db.flush()

        current_ids.append(qid)
        questions.append(question)

    assessment.question_ids = current_ids
    db.flush()

    return questions, context_chunks
