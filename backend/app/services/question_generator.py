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
- Use the RAG context provided to create questions about the course material
- Make questions educational and appropriately challenging
- Always include an `<pl-answer-panel>` with a clear explanation
- Return ONLY valid JSON, no markdown fences

Return a JSON object:
{
  "title": "...",
  "topic": "...",
  "tags": ["..."],
  "question_html": "...",
  "correct_answers": { ... }
}
"""


def _get_gemini_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set")
    return genai.Client(api_key=api_key)


def generate_question(
    prompt: str,
    course: Course,
    db: Session,
    topic: str = "",
) -> Question:
    """Generate a single question using RAG context from the course's documents."""

    # 1. Retrieve relevant context from Supermemory
    context_chunks: list[str] = []
    if course.container_tag:
        try:
            context_chunks = sm_search(prompt, course.container_tag, limit=8)
        except Exception:
            log.exception("Supermemory search failed for course %s", course.id)

    # 2. Build the Gemini prompt
    context_section = ""
    if context_chunks:
        context_section = "COURSE MATERIAL CONTEXT:\n" + "\n---\n".join(context_chunks) + "\n\n"

    user_prompt = f"""{context_section}USER REQUEST: {prompt}"""
    if topic:
        user_prompt += f"\nTOPIC: {topic}"

    # 3. Call Gemini
    client = _get_gemini_client()
    response = client.models.generate_content(
        model="gemini-3-pro-preview",
        contents=user_prompt,
        config=genai.types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.7,
            response_mime_type="application/json",
        ),
    )

    # 4. Parse response
    raw = response.text.strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        log.error("Failed to parse Gemini response: %s", raw[:500])
        raise ValueError("Gemini returned invalid JSON")

    title = data.get("title", "Generated Question")
    q_topic = data.get("topic", topic)
    tags = data.get("tags", ["ai-generated"])
    question_html = data.get("question_html", "")
    correct_answers = data.get("correct_answers", {})

    if not question_html:
        raise ValueError("Gemini did not return question_html")

    # 5. Create the Question in the DB
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

    # 6. Add to "AI Generated" assessment (create if missing)
    ai_assessment = (
        db.query(Assessment)
        .filter(Assessment.course_id == course.id, Assessment.tid == "ai_generated")
        .first()
    )
    if not ai_assessment:
        ai_assessment = Assessment(
            course_id=course.id,
            tid="ai_generated",
            title="AI Generated Questions",
            type="Practice",
        )
        ai_assessment.question_ids = []
        db.add(ai_assessment)
        db.flush()

    current_ids = ai_assessment.question_ids
    current_ids.append(qid)
    ai_assessment.question_ids = current_ids
    db.flush()

    return question, correct_answers, context_chunks
