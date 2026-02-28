"""Generate question variants by executing server.py generate()."""

import importlib.util
import logging
import random
import sys
from pathlib import Path
from typing import Any

import chevron

log = logging.getLogger(__name__)


def _import_server_module(server_py_path: str, course_path: str):
    """Dynamically import a question's server.py, with course serverFilesCourse on sys.path."""
    course_root = Path(course_path)
    server_files = course_root / "serverFilesCourse"

    # Temporarily add serverFilesCourse to sys.path so shared imports resolve
    added_paths: list[str] = []
    if server_files.is_dir() and str(server_files) not in sys.path:
        sys.path.insert(0, str(server_files))
        added_paths.append(str(server_files))

    try:
        spec = importlib.util.spec_from_file_location("question_server", server_py_path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Cannot load {server_py_path}")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    finally:
        for p in added_paths:
            if p in sys.path:
                sys.path.remove(p)


def generate_variant(
    question_dir: str,
    course_path: str,
    question_html: str,
    seed: int | None = None,
    stored_correct_answers: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Generate a variant for a question. Returns {params, correct_answers, rendered_html, seed}."""
    qdir = Path(question_dir) if question_dir else None
    server_py = qdir / "server.py" if qdir else None

    if seed is None:
        seed = random.randint(0, 2**31)

    data: dict[str, Any] = {
        "params": {},
        "correct_answers": {},
        "submitted_answers": {},
        "format_errors": {},
        "partial_scores": {},
        "score": 0,
        "feedback": {},
        "variant_seed": seed,
        "options": {},
    }

    # Execute server.py generate() if it exists
    if server_py and server_py.exists():
        random.seed(seed)
        try:
            mod = _import_server_module(str(server_py), course_path)
            if hasattr(mod, "generate"):
                mod.generate(data)
            if hasattr(mod, "prepare"):
                mod.prepare(data)
        except Exception:
            log.exception("Error running server.py generate() for %s", question_dir)
    elif stored_correct_answers:
        # AI-generated questions: use stored correct answers
        data["correct_answers"] = stored_correct_answers

    # Render the question HTML with Mustache/Chevron using params
    rendered_html = question_html
    if data["params"]:
        try:
            rendered_html = chevron.render(question_html, data)
        except Exception:
            log.exception("Error rendering question HTML for %s", question_dir)

    return {
        "params": data["params"],
        "correct_answers": data["correct_answers"],
        "rendered_html": rendered_html,
        "seed": seed,
    }
