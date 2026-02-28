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
from app.services import supermemory_service as sm
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

    "pl-code-editor": """\
### pl-code-editor — Write Python code to solve a programming problem
Best for: algorithm implementation, data structure operations, function writing, coding exercises.
HTML:
```
<pl-question-panel>
<markdown>
Write a function `fn_name(params)` that does X.

**Examples:**
- `fn_name(arg1, arg2)` → `expected_result`
</markdown>
</pl-question-panel>

<pl-code-editor answers-name="X" language="python" fn-name="fn_name">
def fn_name(params):
    # Your code here
    pass
</pl-code-editor>

<pl-answer-panel>
<markdown>
**Reference solution:**
</markdown>
<pl-code language="python">
def fn_name(params):
    return ...
</pl-code>
</pl-answer-panel>
```
The text content inside `<pl-code-editor>` is the starter code shown to the student.
correct_answers format:
```
{
  "X": {
    "code": "def fn_name(params):\\n    return ...",
    "test_cases": [
      {"input": [arg1, arg2], "expected": result, "hidden": false, "description": "Basic test"},
      {"input": [arg1, arg2], "expected": result, "hidden": true, "description": "Edge case"}
    ]
  }
}
```
CRITICAL RULES:
- `correct_answers.X.code` is the reference solution (complete, working Python code).
- `correct_answers.X.test_cases` includes BOTH visible and hidden test cases.
- Visible tests (hidden: false): 2-3 sample tests shown to the student as examples.
- Hidden tests (hidden: true): 3-5 additional rigorous tests for edge cases, empty inputs, large inputs.
- The `fn-name` attribute MUST match the function name in starter code, solution, and test cases.
- `language` is always "python".
- Starter code MUST be a valid Python function skeleton with `pass` or `return None`.
- Test case `input` is always a JSON list of positional arguments to pass to the function.
- Test case `expected` is the expected return value (any JSON-serializable Python value: int, float, str, list, dict, bool, None).
- Include at least 5 total test cases (2-3 visible + 3-5 hidden).
- DO NOT use input/output or stdin/stdout — only function calls and return values.""",
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
    "pl-code-editor": "Write Python code to solve a problem. Good for algorithm implementation, function writing, coding exercises.",
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
- The USER REQUEST is your PRIMARY directive — always generate questions that match what the user asked for.
- If COURSE MATERIAL CONTEXT is provided, use it as a reference to ground your questions in the course's notation, terminology, and examples. But do NOT ignore the user's prompt in favor of the context — if the user asks for "basic addition", generate basic addition questions even if the context is about something else.
- If no course material context is provided, generate questions based on the user's prompt using your own knowledge.
- Make questions educational and appropriately challenging
- Vary question types across the batch — use different types from those available below
- Each question should cover a DIFFERENT concept or aspect of the material — avoid repetition
- EVERY question MUST include a `<pl-answer-panel>` with a clear, detailed explanation of the correct answer. This is MANDATORY — never omit it.
- Return ONLY valid JSON, no markdown fences

AVAILABLE QUESTION TYPES (use ONLY these):
{type_specs}

When asked for ONE question, return a JSON object:
{{"title": "...", "topics": ["..."], "tags": ["..."], "question_html": "...", "correct_answers": {{ ... }}}}

When asked for MULTIPLE questions, return a JSON object with a "questions" array:
{{"questions": [{{"title": "...", "topics": ["..."], "tags": ["..."], "question_html": "...", "correct_answers": {{ ... }}}}, ...]}}
"""


ALL_TYPE_NAMES = list(QUESTION_TYPE_SPECS.keys())


def _detect_question_type(question_html: str) -> str | None:
    """Detect which PrairieLearn element type is used in the question HTML."""
    try:
        root = ElementTree.fromstring(f"<root>{question_html}</root>")
    except ElementTree.ParseError:
        return None
    for el in root.iter():
        if el.tag in QUESTION_TYPE_SPECS:
            return el.tag
    return None


SIMILAR_QUESTION_SYSTEM_PROMPT = """\
You are a question generator for an educational platform called prAIrie.
You create questions in PrairieLearn format.

You are generating a NEW question that is SIMILAR to an existing one.
The new question must:
- Use the SAME question type (element) as the original
- Cover the SAME topic area
- Have the SAME difficulty level
- But use DIFFERENT specific content, numbers, examples, or scenarios
- NOT be a trivial rephrasing — change the substance while keeping the structure

A question consists of:
1. **question_html**: HTML using PrairieLearn custom elements
2. **correct_answers**: A JSON object mapping each answers-name to its correct value
3. **title**: A short descriptive title
4. **topics**: A list of topic strings
{topics_instruction}
5. **tags**: A list of relevant tags

IMPORTANT RULES:
- Each `answers-name` must have a corresponding key in `correct_answers`
- Base your question on the COURSE MATERIAL CONTEXT provided below
- Always include a `<pl-answer-panel>` with a clear explanation
- Return ONLY valid JSON, no markdown fences

QUESTION TYPE TO USE:
{type_specs}

Return a single JSON object:
{{"title": "...", "topics": ["..."], "tags": ["..."], "question_html": "...", "correct_answers": {{ ... }}}}
"""


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


def _understand_prompt(prompt: str, topics: list[str], course_topics: list[str]) -> dict:
    """Analyze the user's natural-language prompt to determine material scope and weakness focus."""
    client = _get_gemini_client()
    topic_list = ", ".join(f'"{t}"' for t in course_topics) if course_topics else "none yet"
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=f"User prompt: {prompt}\nSelected topics filter: {topics}",
        config=genai.types.GenerateContentConfig(
            system_instruction=(
                "You analyze educational question-generation requests. "
                "The user is asking an AI to generate practice questions from their course materials.\n"
                "Determine:\n"
                "1. material_query: What specific course content to search for "
                "(e.g. 'unit 1', 'chapter 3', 'binary trees'). null if no specific material referenced.\n"
                "2. focus_weaknesses: true if the user wants to practice weak areas, mistakes, or struggles.\n"
                "3. weakness_scope: If focusing on weaknesses, scope it (e.g. 'unit 1') or null for all.\n"
                "4. refined_prompt: A clearer version of the request for the question generator.\n\n"
                f"The course has these existing topics: [{topic_list}]\n"
                "Return ONLY valid JSON with keys: material_query, focus_weaknesses, weakness_scope, refined_prompt."
            ),
            temperature=0.1,
            max_output_tokens=512,
            response_mime_type="application/json",
        ),
    )
    try:
        result = json.loads(response.text.strip())
        log.info("Prompt understanding: %r", result)
        return result
    except (json.JSONDecodeError, TypeError):
        log.warning("Prompt understanding failed to parse, using defaults")
        return {
            "material_query": None,
            "focus_weaknesses": False,
            "weakness_scope": None,
            "refined_prompt": prompt,
        }


def _fetch_weakness_context(user_id: int, course_id: int, scope: str | None = None) -> str:
    """Retrieve user weakness data from Supermemory and format as generation context."""
    profile = sm.get_user_profile(user_id, course_id)

    query = "student answered incorrectly struggled weak"
    if scope:
        query += f" {scope}"
    weakness_memories = sm.search_user_memories(query, user_id, course_id, limit=10)

    if not weakness_memories and not profile.get("dynamic"):
        log.info("No weakness data found for user %d course %d", user_id, course_id)
        return ""

    lines = ["STUDENT WEAKNESS DATA (generate questions targeting these areas):"]
    for fact in (profile.get("dynamic") or [])[:5]:
        lines.append(f"- Profile: {fact}")
    for mem in weakness_memories:
        lines.append(f"- {mem}")

    context = "\n".join(lines)
    log.info("Weakness context: %d lines for user %d course %d", len(lines) - 1, user_id, course_id)
    return context


def _ensure_answer_panel(question_html: str, correct_answers: dict) -> str:
    """Ensure question_html contains a <pl-answer-panel>. Add a basic one if missing."""
    if not question_html:
        return question_html
    if "<pl-answer-panel>" in question_html.lower():
        return question_html

    # Build a simple explanation from correct_answers
    lines = ["<pl-answer-panel>", "<markdown>", "**Answer:**", ""]
    for key, val in correct_answers.items():
        if isinstance(val, list):
            lines.append(f"- **{key}**: {', '.join(str(v) for v in val)}")
        elif isinstance(val, dict):
            lines.append(f"- **{key}**: {val}")
        else:
            lines.append(f"- **{key}**: {val}")
    lines.extend(["", "</markdown>", "</pl-answer-panel>"])
    log.info("Injected missing <pl-answer-panel> into question HTML")
    return question_html + "\n" + "\n".join(lines)


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
        # pl-code-editor: complex structure (code + test_cases dict), no HTML-based fix needed

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
            "COURSE MATERIAL CONTEXT (use as reference for terminology and style, but follow the user request):\n"
            + "\n---\n".join(context_chunks)
            + "\n\n"
        )
        log.info("Context section length: %d chars", len(context_section))
    else:
        log.warning("No RAG context available — Gemini will generate without course materials")

    user_prompt = f"{context_section}USER REQUEST (this is the primary instruction — follow it): {prompt}"
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

    # 5b. Ensure answer panels exist and fix correct_answers
    for item in items:
        item["question_html"] = _ensure_answer_panel(
            item.get("question_html", ""),
            item.get("correct_answers", {}),
        )
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


def generate_questions_stream(
    prompt: str,
    course: Course,
    db: Session,
    user_id: int,
    topics: list[str] | None = None,
    num_questions: int = 1,
):
    """Generator that yields (event_type, data) tuples as it progresses through question generation.

    Same logic as generate_questions() but wrapped in a generator for SSE streaming.
    """
    from app.schemas import QuestionOut

    topics = topics or []
    topic_hint = ", ".join(topics) if topics else ""

    # Step 0: Understand the prompt
    yield ("step", {"step": "understanding", "message": "Understanding your request..."})
    understood = _understand_prompt(prompt, topics, course.topics)
    effective_prompt = understood.get("refined_prompt") or prompt
    focus_weaknesses = understood.get("focus_weaknesses", False)
    material_query = understood.get("material_query")
    weakness_scope = understood.get("weakness_scope")

    summary = effective_prompt[:80]
    if focus_weaknesses:
        summary = f"focusing on weak areas — {summary}"
    yield ("step", {"step": "understood", "message": summary})

    # Step 1: Expand queries + RAG retrieval
    yield ("step", {"step": "searching", "message": "Searching course materials..."})
    context_chunks: list[str] = []
    if course.container_tag:
        try:
            search_prompt = material_query or effective_prompt
            queries = _expand_queries(search_prompt, topic_hint)
            context_chunks = _retrieve_context(queries, course.container_tag)
            log.info("RAG: %d chunks from %d queries", len(context_chunks), len(queries))
        except Exception:
            log.exception("RAG retrieval failed for course %s", course.id)
    yield ("step", {"step": "searched", "message": f"Found {len(context_chunks)} relevant passages"})

    # Step 2: Fetch weakness data if needed
    weakness_context = ""
    if focus_weaknesses:
        yield ("step", {"step": "analyzing", "message": "Analyzing your performance history..."})
        weakness_context = _fetch_weakness_context(user_id, course.id, weakness_scope)
        if weakness_context:
            yield ("step", {"step": "analyzed", "message": "Identified focus areas from your history"})
        else:
            yield ("step", {"step": "analyzed", "message": "No performance history yet — generating general questions"})

    # Step 3: Pass 1 — Type selection
    yield ("step", {"step": "selecting_types", "message": "Selecting question types..."})
    context_summary = " | ".join(c[:120] for c in context_chunks[:3]) if context_chunks else ""
    try:
        selected_types = _select_question_types(effective_prompt, topic_hint, num_questions, context_summary)
    except Exception:
        log.exception("Type selection failed, falling back to all types")
        selected_types = ALL_TYPE_NAMES
    yield ("step", {"step": "types_selected", "message": f"Chose {len(selected_types)} question format{'s' if len(selected_types) != 1 else ''}"})

    # Step 4: Build prompts and generate (Pass 2)
    yield ("step", {"step": "generating", "message": "Generating questions..."})
    existing_topics = course.topics
    system_prompt = _build_system_prompt(selected_types, existing_topics)

    # Build user prompt with optional weakness context
    context_section = ""
    if context_chunks:
        context_section = (
            "COURSE MATERIAL CONTEXT (use as reference for terminology and style, but follow the user request):\n"
            + "\n---\n".join(context_chunks)
            + "\n\n"
        )

    user_prompt = ""
    if weakness_context:
        user_prompt += weakness_context + "\n\n"
    user_prompt += f"{context_section}USER REQUEST (this is the primary instruction — follow it): {effective_prompt}"
    if topics:
        user_prompt += f"\nFOCUS ON TOPICS: {', '.join(topics)}"
    if num_questions > 1:
        user_prompt += f"\nNUMBER OF QUESTIONS: {num_questions} (return a diverse set covering different aspects of the material)"

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

    # Check for truncation
    if (
        response.candidates
        and response.candidates[0].finish_reason
        and str(response.candidates[0].finish_reason) not in ("STOP", "FinishReason.STOP", "1")
    ):
        raise ValueError("Gemini response was truncated — try fewer questions or a simpler prompt")

    raw = response.text.strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise ValueError("Gemini returned invalid JSON — the response may have been truncated")

    if "questions" in data and isinstance(data["questions"], list):
        items = data["questions"]
    else:
        items = [data]

    # Step 5: Ensure answer panels + fix answers + save
    yield ("step", {"step": "finalizing", "message": f"Validating {len(items)} question{'s' if len(items) != 1 else ''}..."})
    for item in items:
        item["question_html"] = _ensure_answer_panel(
            item.get("question_html", ""),
            item.get("correct_answers", {}),
        )
        item["correct_answers"] = _fix_correct_answers(
            item.get("question_html", ""),
            item.get("correct_answers", {}),
        )

    # Create assessment
    if len(topics) > 3:
        assessment_title = f"{', '.join(topics[:3])} + {len(topics) - 3} more"
    elif topics:
        assessment_title = ", ".join(topics)
    else:
        assessment_title = effective_prompt[:60].strip() or "AI Generated Quiz"
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

    # Create Question rows
    questions: list[Question] = []
    current_ids: list[str] = []
    all_new_topics: set[str] = set()

    for item in items:
        title = item.get("title", "Generated Question")
        tags = item.get("tags", ["ai-generated"])
        question_html = item.get("question_html", "")
        correct_answers = item.get("correct_answers", {})

        item_topics = item.get("topics", [])
        if not item_topics:
            legacy_topic = item.get("topic", topic_hint)
            item_topics = [legacy_topic] if legacy_topic else []
        if isinstance(item_topics, str):
            item_topics = [item_topics]

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

    # Update course topics
    existing_set = set(existing_topics)
    new_topics_list = [t for t in all_new_topics if t and t not in existing_set]
    if new_topics_list:
        course.topics = existing_topics + new_topics_list

    db.flush()

    # Final result
    questions_out = [QuestionOut.model_validate(q) for q in questions]
    seen: set[str] = set()
    unique_context = [c for c in context_chunks if c not in seen and not seen.add(c)]  # type: ignore[func-returns-value]

    yield ("result", {
        "questions": [q.model_dump() for q in questions_out],
        "context_used": unique_context[:5],
    })


def generate_similar_question(
    original_question: Question,
    course: Course,
    db: Session,
) -> Question:
    """Generate a new question similar to the original (same topic/type, different content).

    Returns the new Question (flushed to DB — caller must commit).
    """
    topic = original_question.topic or ""

    # 1. Detect question type from original HTML
    detected_type = _detect_question_type(original_question.question_html)
    if not detected_type:
        detected_type = "pl-multiple-choice"
        log.warning("Could not detect question type, defaulting to %s", detected_type)
    log.info("Generating similar question: type=%s, topic=%r", detected_type, topic)

    # 2. RAG context
    context_chunks: list[str] = []
    if course.container_tag and topic:
        try:
            queries = _expand_queries(f"practice question about {topic}", topic)
            context_chunks = _retrieve_context(queries, course.container_tag)
        except Exception:
            log.exception("RAG retrieval failed for similar question")

    # 3. Build system prompt with ONE type spec
    type_spec = QUESTION_TYPE_SPECS.get(detected_type, "")
    existing_topics = course.topics
    if existing_topics:
        topic_list = ", ".join(f'"{t}"' for t in existing_topics)
        topics_instruction = (
            f"   The course already has these topics: [{topic_list}]. "
            "Reuse existing topics when they fit."
        )
    else:
        topics_instruction = "   Create clear, concise topic names."

    system_prompt = SIMILAR_QUESTION_SYSTEM_PROMPT.format(
        type_specs=type_spec,
        topics_instruction=topics_instruction,
    )

    # 4. User prompt with original question as reference + RAG
    context_section = ""
    if context_chunks:
        context_section = (
            "COURSE MATERIAL CONTEXT:\n"
            + "\n---\n".join(context_chunks)
            + "\n\n"
        )

    user_prompt = (
        f"{context_section}"
        f"ORIGINAL QUESTION (generate something SIMILAR but DIFFERENT):\n"
        f"Title: {original_question.title}\n"
        f"Topic: {topic}\n"
        f"HTML:\n{original_question.question_html}\n\n"
        f"Generate ONE new question. Same type ({detected_type}), same topic, "
        f"different content/numbers/examples."
    )

    # 5. Single Gemini call
    client = _get_gemini_client()
    response = client.models.generate_content(
        model="gemini-3-pro-preview",
        contents=user_prompt,
        config=genai.types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.8,
            max_output_tokens=8192,
            response_mime_type="application/json",
        ),
    )

    # 6. Parse
    if (
        response.candidates
        and response.candidates[0].finish_reason
        and str(response.candidates[0].finish_reason) not in ("STOP", "FinishReason.STOP", "1")
    ):
        reason = response.candidates[0].finish_reason
        log.error("Similar question Gemini truncated: finish_reason=%s", reason)
        raise ValueError(f"Gemini response was truncated (reason={reason})")

    raw = response.text.strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise ValueError("Gemini returned invalid JSON")

    if "questions" in data and isinstance(data["questions"], list):
        data = data["questions"][0]

    # 7. Ensure answer panel + fix correct_answers
    data["question_html"] = _ensure_answer_panel(
        data.get("question_html", ""),
        data.get("correct_answers", {}),
    )
    data["correct_answers"] = _fix_correct_answers(
        data.get("question_html", ""),
        data.get("correct_answers", {}),
    )

    question_html = data.get("question_html", "")
    if not question_html:
        raise ValueError("Generated question has empty HTML")

    # 8. Create Question row
    item_topics = data.get("topics", [])
    if isinstance(item_topics, str):
        item_topics = [item_topics]
    if not item_topics:
        item_topics = [topic] if topic else []

    qid = f"gen_{uuid.uuid4().hex[:8]}"
    new_question = Question(
        course_id=course.id,
        qid=qid,
        uuid=str(uuid.uuid4()),
        title=data.get("title", "Similar Question"),
        topic=item_topics[0] if item_topics else topic,
        question_html=question_html,
        has_server_py=False,
        single_variant=True,
        directory="",
    )
    tags = data.get("tags", original_question.tags + ["similar-question"])
    new_question.tags = tags if isinstance(tags, list) else [str(tags)]
    new_question.stored_correct_answers = data.get("correct_answers", {})
    db.add(new_question)
    db.flush()

    # 9. Update course topics
    existing_set = set(existing_topics)
    new_topics = [t for t in item_topics if t and t not in existing_set]
    if new_topics:
        course.topics = existing_topics + new_topics

    return new_question
