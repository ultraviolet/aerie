"""Generate PrairieLearn-format questions using Gemini + Supermemory RAG.

Uses a two-pass LLM approach:
  Pass 1 — Type selection: LLM picks the best question types for the topic.
  Pass 2 — Generation: only the specs for selected types are injected into
            the system prompt, keeping it focused and token-efficient.
"""

import json
import logging
import os
import re
import uuid
from xml.etree import ElementTree

from google import genai
from sqlalchemy.orm import Session

from app.models import Assessment, Course, Question
from app.services.supermemory_service import search as sm_search

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Question-type spec registry
# Each entry describes one PrairieLearn element: HTML structure, correct_answers
# format, and when to use it.  Only the specs selected by Pass 1 are injected
# into the generation prompt.
# ---------------------------------------------------------------------------

QUESTION_TYPE_SPECS: dict[str, str] = {
    "pl-multiple-choice": """\
### pl-multiple-choice — Single-select from options (radio buttons)
Best for: factual recall, concept identification, "which of the following" questions.
HTML:
```
<pl-multiple-choice answers-name="X">
  <pl-answer correct="true">Correct option text</pl-answer>
  <pl-answer correct="false">Wrong option A</pl-answer>
  <pl-answer correct="false">Wrong option B</pl-answer>
  <pl-answer correct="false">Wrong option C</pl-answer>
</pl-multiple-choice>
```
correct_answers: `{"X": "Correct option text"}`
CRITICAL: The value MUST be the EXACT text content of the correct `<pl-answer>` element, character-for-character.
Provide 4-5 options. Exactly ONE must have correct="true".""",

    "pl-checkbox": """\
### pl-checkbox — Select all that apply (checkboxes)
Best for: questions where multiple answers are correct, "select all", classification tasks.
HTML:
```
<pl-checkbox answers-name="X">
  <pl-answer correct="true">Correct option 1</pl-answer>
  <pl-answer correct="true">Correct option 2</pl-answer>
  <pl-answer correct="false">Wrong option A</pl-answer>
  <pl-answer correct="false">Wrong option B</pl-answer>
</pl-checkbox>
```
correct_answers: `{"X": ["Correct option 1", "Correct option 2"]}`
CRITICAL: Each value in the list MUST be the EXACT text of a correct `<pl-answer>` element.
Provide 4-6 options. At least 2 should be correct.""",

    "pl-number-input": """\
### pl-number-input — Numeric answer (decimals allowed)
Best for: calculations, quantitative problems, statistics, measurements.
HTML:
```
<pl-number-input answers-name="X" label="$y =$" />
```
correct_answers: `{"X": "42.5"}`
The value is a string representation of the number. Tolerance of ±1% is applied during grading.""",

    "pl-integer-input": """\
### pl-integer-input — Integer-only numeric answer
Best for: counting, combinatorics, modular arithmetic, base conversion, discrete values.
HTML:
```
<pl-integer-input answers-name="X" label="$n =$" />
```
correct_answers: `{"X": "7"}`
The value must be a whole number (no decimals). Exact match required.""",

    "pl-string-input": """\
### pl-string-input — Free-text answer
Best for: short definitions, naming things, single-word or short-phrase answers.
HTML:
```
<pl-string-input answers-name="X" label="Answer:" />
```
correct_answers: `{"X": "the_answer"}`
Grading is case-insensitive with whitespace trimmed. Keep expected answers short and unambiguous.""",

    "pl-dropdown": """\
### pl-dropdown — Inline dropdown selection
Best for: fill-in-the-blank within sentences, compact single-select, classification into categories.
HTML:
```
<pl-dropdown answers-name="X">
  <pl-answer correct="true">Correct choice</pl-answer>
  <pl-answer correct="false">Wrong choice A</pl-answer>
  <pl-answer correct="false">Wrong choice B</pl-answer>
</pl-dropdown>
```
correct_answers: `{"X": "Correct choice"}`
CRITICAL: The value MUST be the EXACT text of the correct `<pl-answer>` element.
Exactly ONE must have correct="true". Works like pl-multiple-choice but renders as a dropdown.""",

    "pl-matching": """\
### pl-matching — Match statements to options
Best for: term-to-definition, concept-to-example, pairing related items.
HTML:
```
<pl-matching answers-name="X">
  <pl-option name="opt1">Definition A</pl-option>
  <pl-option name="opt2">Definition B</pl-option>
  <pl-option name="opt3">Definition C</pl-option>
  <pl-statement match="opt1">Term 1</pl-statement>
  <pl-statement match="opt2">Term 2</pl-statement>
  <pl-statement match="opt3">Term 3</pl-statement>
</pl-matching>
```
correct_answers: `{"X": {"0": "opt1", "1": "opt2", "2": "opt3"}}`
The keys "0","1","2",... correspond to statements in order. Values are option names.
Each `<pl-statement>` has a `match` attribute pointing to the correct `<pl-option name="...">`.
You can have more options than statements (distractors). Provide 3-5 pairs minimum.""",

    "pl-order-blocks": """\
### pl-order-blocks — Put items in the correct order (ranking / sorting)
Best for: algorithm steps, process ordering, sorting by some criterion, proof steps, timelines.
HTML:
```
<pl-order-blocks answers-name="X">
  <pl-answer correct="true" ranking="1">First step</pl-answer>
  <pl-answer correct="true" ranking="2">Second step</pl-answer>
  <pl-answer correct="true" ranking="3">Third step</pl-answer>
  <pl-answer correct="true" ranking="4">Fourth step</pl-answer>
  <pl-answer correct="false">Distractor (not part of the answer)</pl-answer>
</pl-order-blocks>
```
correct_answers: `{"X": ["First step", "Second step", "Third step", "Fourth step"]}`
The list is in the CORRECT order. Items with correct="true" and their ranking define the answer.
Items with correct="false" are distractors. Include 4-6 items with 0-2 distractors.
CRITICAL: Each value in the list MUST be the EXACT text of the corresponding `<pl-answer>` element.""",

    "pl-true-false": """\
### pl-true-false — True or False
Best for: verifying understanding of facts, definitions, properties, common misconceptions.
HTML:
```
<pl-true-false answers-name="X" correct-answer="true" />
```
correct_answers: `{"X": "True"}`
Set correct-answer to "true" or "false". The correct_answers value is "True" or "False" (capitalized).
The question text should make a clear statement that is definitively true or false.""",
}

# Short descriptions for Pass 1 (type selection)
QUESTION_TYPE_SUMMARIES: dict[str, str] = {
    "pl-multiple-choice": "Single-select from options (radio buttons). Good for factual recall, concept identification.",
    "pl-checkbox": "Select all that apply (checkboxes). Good for multi-correct, classification tasks.",
    "pl-number-input": "Numeric answer with decimals. Good for calculations, measurements, statistics.",
    "pl-integer-input": "Integer-only answer. Good for counting, combinatorics, modular arithmetic.",
    "pl-string-input": "Free-text short answer. Good for definitions, naming, short phrases.",
    "pl-dropdown": "Inline dropdown selection. Good for fill-in-the-blank, compact classification.",
    "pl-matching": "Match statements to options. Good for term-to-definition, concept-to-example pairing.",
    "pl-order-blocks": "Put items in correct order. Good for algorithm steps, process ordering, timelines.",
    "pl-true-false": "True or False. Good for verifying facts, definitions, common misconceptions.",
}

SYSTEM_PROMPT_BASE = """\
You are a question generator for an educational platform called prAIrie.
You create questions in PrairieLearn format.

A question consists of:
1. **question_html**: HTML using these custom elements:
   - `<pl-question-panel>` wraps the question content
   - `<pl-answer-panel>` wraps the answer/explanation shown after submission
   - `<markdown>` renders Markdown inside HTML
   - Input elements (use ONE per question, chosen from the types listed below)

2. **correct_answers**: A JSON object mapping each answers-name to its correct value.
   Format depends on the element type — see the type specs below.

3. **title**: A short descriptive title for the question.
4. **topics**: A list of topic strings for this question. Each question can belong to one or more topics.
{topics_instruction}
5. **tags**: A list of relevant tags.

IMPORTANT RULES:
- Each `answers-name` in the HTML must have a corresponding key in `correct_answers`
- You MUST base your questions on the COURSE MATERIAL CONTEXT provided below. Do NOT generate generic questions from your own knowledge. If context is provided, the question MUST test concepts, facts, or examples found in that context.
- If no course material context is provided, you may generate a question based on the user's prompt alone, but prefer to note that no course materials were available.
- Make questions educational and appropriately challenging
- Vary question types across the batch — use different types from those available below
- Each question should cover a DIFFERENT concept or aspect of the material — avoid repetition
- Always include an `<pl-answer-panel>` with a clear explanation
- Return ONLY valid JSON, no markdown fences

AVAILABLE QUESTION TYPES (use ONLY these):
{type_specs}

When asked for ONE question, return a JSON object:
{{"title": "...", "topics": ["..."], "tags": ["..."], "question_html": "...", "correct_answers": {{ ... }}}}

When asked for MULTIPLE questions, return a JSON object with a "questions" array:
{{"questions": [{{"title": "...", "topics": ["..."], "tags": ["..."], "question_html": "...", "correct_answers": {{ ... }}}}, ...]}}
"""


ALL_TYPE_NAMES = list(QUESTION_TYPE_SPECS.keys())


def _select_question_types(
    prompt: str, topic: str, num_questions: int, context_summary: str,
) -> list[str]:
    """Pass 1: Ask the LLM which question types best fit the content."""
    summary_lines = "\n".join(
        f"- {name}: {desc}" for name, desc in QUESTION_TYPE_SUMMARIES.items()
    )

    selection_prompt = f"""\
The user wants {num_questions} question(s) about the following topic/prompt.

User prompt: {prompt}
{"Topic: " + topic if topic else ""}
{"Context summary: " + context_summary[:500] if context_summary else "No course context available."}

Available question types:
{summary_lines}

Select the best question types for this content. Pick {min(num_questions + 1, len(ALL_TYPE_NAMES))} types \
that would create diverse, effective assessments. Consider what cognitive skills each type tests.

Return ONLY a JSON array of type names, e.g. ["pl-multiple-choice", "pl-matching", "pl-order-blocks"]
"""
    client = _get_gemini_client()
    response = client.models.generate_content(
        model="gemini-3-pro-preview",
        contents=selection_prompt,
        config=genai.types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=256,
            response_mime_type="application/json",
        ),
    )

    try:
        selected = json.loads(response.text.strip())
        if isinstance(selected, list):
            # Filter to valid type names only
            valid = [t for t in selected if t in QUESTION_TYPE_SPECS]
            if valid:
                log.info("Type selection: %r", valid)
                return valid
    except (json.JSONDecodeError, TypeError):
        log.warning("Type selection failed to parse, using all types")

    # Fallback: return all types
    return ALL_TYPE_NAMES


def _build_system_prompt(selected_types: list[str], existing_topics: list[str]) -> str:
    """Build the generation system prompt with only the selected type specs."""
    specs = "\n\n".join(
        QUESTION_TYPE_SPECS[t] for t in selected_types if t in QUESTION_TYPE_SPECS
    )
    if existing_topics:
        topic_list = ", ".join(f'"{t}"' for t in existing_topics)
        topics_instruction = (
            f"   The course already has these topics: [{topic_list}]. "
            "Reuse existing topics when they fit. Only create a new topic if the question "
            "covers something genuinely different. A question can have multiple topics."
        )
    else:
        topics_instruction = (
            "   No topics exist yet for this course. Create clear, concise topic names "
            "(e.g. \"Sorting Algorithms\", \"Big-O Notation\", \"DFA Construction\")."
        )
    return SYSTEM_PROMPT_BASE.format(type_specs=specs, topics_instruction=topics_instruction)


def _get_gemini_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set")
    return genai.Client(api_key=api_key)


def _expand_queries(prompt: str, topic: str = "") -> list[str]:
    """Use Gemini to turn a user prompt into content-rich search queries."""
    full_prompt = f"User request: {prompt}"
    if topic:
        full_prompt += f"\nTopic: {topic}"

    client = _get_gemini_client()
    response = client.models.generate_content(
        model="gemini-3-pro-preview",
        contents=full_prompt,
        config=genai.types.GenerateContentConfig(
            system_instruction=(
                "You are a search query generator for an educational RAG system. "
                "The user wants to be quizzed on a topic from their course notes. "
                "Generate 3-5 specific, content-rich search queries that would retrieve "
                "relevant educational material from course notes stored in a vector database. "
                "Each query should target different aspects of the topic and use terminology "
                "likely found in lecture notes or textbooks (definitions, theorems, examples, "
                "algorithms, comparisons, etc.). "
                "Return ONLY a JSON array of strings, e.g. [\"query1\", \"query2\", ...]"
            ),
            temperature=0.3,
            max_output_tokens=512,
            response_mime_type="application/json",
        ),
    )

    raw = response.text.strip()
    try:
        queries = json.loads(raw)
        # Handle {"queries": [...]} wrapper that Gemini sometimes returns
        if isinstance(queries, dict) and "queries" in queries:
            queries = queries["queries"]
        if isinstance(queries, list) and all(isinstance(q, str) for q in queries):
            log.info("Query expansion: %r -> %d queries", prompt[:60], len(queries))
            return queries[:5]
        log.warning("Query expansion returned unexpected structure: %s", raw[:300])
    except (json.JSONDecodeError, TypeError):
        # Fallback: try to extract quoted strings from malformed JSON
        extracted = re.findall(r'"([^"]{5,})"', raw)
        if extracted:
            log.warning("Query expansion JSON malformed, extracted %d strings from raw", len(extracted))
            return extracted[:5]
        log.warning("Query expansion failed to parse (raw=%s), falling back to raw prompt", raw[:300])

    return [prompt]


def _retrieve_context(queries: list[str], container_tag: str, limit_per_query: int = 5) -> list[str]:
    """Run multiple queries against Supermemory and deduplicate chunks."""
    seen: set[str] = set()
    chunks: list[str] = []

    for query in queries:
        try:
            results = sm_search(query, container_tag, limit=limit_per_query)
            for chunk in results:
                if chunk not in seen:
                    seen.add(chunk)
                    chunks.append(chunk)
        except Exception:
            log.exception("Supermemory search failed for query: %s", query[:80])

    log.info("Retrieved %d unique chunks from %d queries", len(chunks), len(queries))
    return chunks


def _fix_correct_answers(question_html: str, correct_answers: dict) -> dict:
    """Ensure correct_answers values match the actual element content in the HTML.

    Gemini often produces mismatches (e.g. shortened text, extra detail, wrong case).
    This parses the HTML, extracts ground-truth answers from element attributes and
    text, and overwrites the correct_answers dict.
    """
    if not question_html or not correct_answers:
        return correct_answers

    # Wrap in a root element so ElementTree can parse fragments
    try:
        root = ElementTree.fromstring(f"<root>{question_html}</root>")
    except ElementTree.ParseError:
        log.debug("Could not parse question_html as XML, skipping correct_answers fix")
        return correct_answers

    fixed = dict(correct_answers)

    for el in root.iter():
        tag = el.tag
        answers_name = el.get("answers-name")

        # --- pl-multiple-choice / pl-dropdown: single correct <pl-answer> ---
        if tag in ("pl-multiple-choice", "pl-dropdown"):
            if not answers_name or answers_name not in correct_answers:
                continue
            for answer_el in el.iter("pl-answer"):
                if answer_el.get("correct", "").lower() == "true":
                    text = "".join(answer_el.itertext()).strip()
                    if text:
                        fixed[answers_name] = text
                        break

        # --- pl-checkbox: list of correct <pl-answer> texts ---
        elif tag == "pl-checkbox":
            if not answers_name or answers_name not in correct_answers:
                continue
            correct_texts = []
            for answer_el in el.iter("pl-answer"):
                if answer_el.get("correct", "").lower() == "true":
                    text = "".join(answer_el.itertext()).strip()
                    if text:
                        correct_texts.append(text)
            if correct_texts:
                fixed[answers_name] = correct_texts

        # --- pl-matching: build {index -> option_name} from <pl-statement match="..."> ---
        elif tag == "pl-matching":
            if not answers_name or answers_name not in correct_answers:
                continue
            match_dict = {}
            idx = 0
            for stmt_el in el.iter("pl-statement"):
                match_val = stmt_el.get("match", "")
                if match_val:
                    match_dict[str(idx)] = match_val
                    idx += 1
            if match_dict:
                fixed[answers_name] = match_dict

        # --- pl-order-blocks: ordered list from ranking attrs ---
        elif tag == "pl-order-blocks":
            if not answers_name or answers_name not in correct_answers:
                continue
            ranked = []
            for answer_el in el.iter("pl-answer"):
                if answer_el.get("correct", "").lower() != "false":
                    ranking = answer_el.get("ranking", "")
                    text = "".join(answer_el.itertext()).strip()
                    if ranking and text:
                        try:
                            ranked.append((int(ranking), text))
                        except ValueError:
                            pass
            if ranked:
                ranked.sort(key=lambda x: x[0])
                fixed[answers_name] = [text for _, text in ranked]

        # --- pl-true-false: correct-answer attr ---
        elif tag == "pl-true-false":
            if not answers_name or answers_name not in correct_answers:
                continue
            correct_val = el.get("correct-answer", "").lower()
            if correct_val in ("true", "false"):
                fixed[answers_name] = "True" if correct_val == "true" else "False"

        # pl-number-input, pl-integer-input, pl-string-input: no fix needed

        else:
            continue

        if answers_name and answers_name in fixed and fixed[answers_name] != correct_answers.get(answers_name):
            log.info(
                "Fixed correct_answers[%s]: %r -> %r",
                answers_name, correct_answers.get(answers_name), fixed[answers_name],
            )

    return fixed


def generate_questions(
    prompt: str,
    course: Course,
    db: Session,
    topics: list[str] | None = None,
    num_questions: int = 1,
) -> tuple[list[Question], list[str]]:
    """Generate questions using RAG context from the course's documents.

    Returns (list_of_questions, context_chunks).
    """
    topics = topics or []
    topic_hint = ", ".join(topics) if topics else ""

    # 1. Expand user prompt into content-rich search queries, then retrieve context
    context_chunks: list[str] = []
    if course.container_tag:
        try:
            queries = _expand_queries(prompt, topic_hint)
            context_chunks = _retrieve_context(queries, course.container_tag)
            log.info(
                "RAG context for course %s (tag=%s): %d chunks from %d queries",
                course.id, course.container_tag, len(context_chunks), len(queries),
            )
        except Exception:
            log.exception("RAG retrieval failed for course %s (tag=%s)", course.id, course.container_tag)
    else:
        log.warning("Course %s has no container_tag — skipping RAG", course.id)

    # 2. Pass 1 — Select the best question types for this content
    context_summary = ""
    if context_chunks:
        context_summary = " | ".join(c[:120] for c in context_chunks[:3])

    try:
        selected_types = _select_question_types(prompt, topic_hint, num_questions, context_summary)
    except Exception:
        log.exception("Type selection failed, falling back to all types")
        selected_types = ALL_TYPE_NAMES

    log.info("Selected question types: %r", selected_types)
    existing_topics = course.topics
    system_prompt = _build_system_prompt(selected_types, existing_topics)

    # 3. Build the user prompt with RAG context
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
    if topics:
        user_prompt += f"\nFOCUS ON TOPICS: {', '.join(topics)}"
    if num_questions > 1:
        user_prompt += f"\nNUMBER OF QUESTIONS: {num_questions} (return a diverse set covering different aspects of the material)"

    log.debug("Full Gemini prompt (%d chars): %s...", len(user_prompt), user_prompt[:200])

    # 4. Pass 2 — Generate questions with focused type specs
    max_tokens = min(4096 * num_questions, 65536)
    client = _get_gemini_client()
    response = client.models.generate_content(
        model="gemini-3-pro-preview",
        contents=user_prompt,
        config=genai.types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.7,
            max_output_tokens=max_tokens,
            response_mime_type="application/json",
        ),
    )

    # 5. Parse response — check for truncation first
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

    # 5b. Fix correct_answers to match actual HTML answer text
    for item in items:
        item["correct_answers"] = _fix_correct_answers(
            item.get("question_html", ""),
            item.get("correct_answers", {}),
        )

    # 6. Create a new assessment for this batch
    if len(topics) > 3:
        assessment_title = f"{', '.join(topics[:3])} + {len(topics) - 3} more"
    elif topics:
        assessment_title = ", ".join(topics)
    else:
        assessment_title = prompt[:60].strip() or "AI Generated Quiz"
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

    # 7. Create Question rows and collect new topics
    questions: list[Question] = []
    current_ids: list[str] = []
    all_new_topics: set[str] = set()

    for item in items:
        title = item.get("title", "Generated Question")
        tags = item.get("tags", ["ai-generated"])
        question_html = item.get("question_html", "")
        correct_answers = item.get("correct_answers", {})

        # Handle topics: LLM returns "topics" (list) or legacy "topic" (string)
        item_topics = item.get("topics", [])
        if not item_topics:
            legacy_topic = item.get("topic", topic_hint)
            item_topics = [legacy_topic] if legacy_topic else []
        if isinstance(item_topics, str):
            item_topics = [item_topics]

        # Primary topic for the Question.topic field (first in list)
        q_topic = item_topics[0] if item_topics else topic_hint
        all_new_topics.update(item_topics)

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

    # 8. Update the course's topic catalog with any new topics
    existing_set = set(existing_topics)
    new_topics = [t for t in all_new_topics if t and t not in existing_set]
    if new_topics:
        course.topics = existing_topics + new_topics
        log.info("Added %d new topic(s) to course %s: %r", len(new_topics), course.id, new_topics)

    db.flush()

    return questions, context_chunks
