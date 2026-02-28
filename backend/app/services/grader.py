"""Grade a submission by executing server.py grade()."""

import importlib.util
import logging
import sys
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)


def _import_server_module(server_py_path: str, course_path: str):
    """Dynamically import a question's server.py."""
    course_root = Path(course_path)
    server_files = course_root / "serverFilesCourse"

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


def grade_submission(
    question_dir: str,
    course_path: str,
    params: dict[str, Any],
    correct_answers: dict[str, Any],
    submitted_answers: dict[str, Any],
) -> dict[str, Any]:
    """Grade a submission. Returns {score, feedback, partial_scores}."""
    qdir = Path(question_dir)
    server_py = qdir / "server.py"

    data: dict[str, Any] = {
        "params": params,
        "correct_answers": correct_answers,
        "submitted_answers": submitted_answers,
        "format_errors": {},
        "partial_scores": {},
        "score": 0,
        "feedback": {},
    }

    if server_py.exists():
        try:
            mod = _import_server_module(str(server_py), course_path)
            if hasattr(mod, "parse"):
                mod.parse(data)
            if hasattr(mod, "grade"):
                mod.grade(data)
        except Exception:
            log.exception("Error running server.py grade() for %s", question_dir)
            data["feedback"] = {"message": "Grading error occurred."}
            data["score"] = 0
    else:
        # Simple built-in grading: exact match on correct_answers
        if not correct_answers:
            data["score"] = 1.0
            data["feedback"] = {"message": "No grading criteria defined."}
        else:
            correct_count = 0
            total = len(correct_answers)
            for key, expected in correct_answers.items():
                submitted = submitted_answers.get(key)
                if str(submitted).strip().lower() == str(expected).strip().lower():
                    correct_count += 1
                    data["partial_scores"][key] = {"score": 1.0}
                else:
                    data["partial_scores"][key] = {"score": 0.0}
            data["score"] = correct_count / total if total > 0 else 0
            data["feedback"] = {
                "message": f"Score: {correct_count}/{total}",
                "correct_count": correct_count,
                "total": total,
            }

    return {
        "score": data.get("score", 0),
        "feedback": data.get("feedback", {}),
        "partial_scores": data.get("partial_scores", {}),
    }
