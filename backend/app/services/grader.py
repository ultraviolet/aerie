"""Grade a submission by executing server.py grade()."""

import importlib.util
import json as json_mod
import logging
import os
import subprocess
import sys
import tempfile
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


def _answers_match(submitted: Any, expected: Any) -> bool | float:
    """Compare a submitted answer to the expected answer.

    Returns True/False for exact-match types, or a float 0.0-1.0 for partial credit.

    Handles:
    - strings (case-insensitive)
    - lists/checkboxes (order-independent, set comparison)
    - ordered lists/order-blocks (order matters, partial credit via LCS)
    - dicts/matching (key-value comparison, partial credit)
    - numeric values (with tolerance)
    """
    if submitted is None:
        return False

    # --- Dict answers (pl-matching: {index -> option_name}) ---
    if isinstance(expected, dict) and isinstance(submitted, dict):
        if not expected:
            return True
        correct = 0
        total = len(expected)
        for key, exp_val in expected.items():
            sub_val = submitted.get(key)
            if sub_val is not None and str(sub_val).strip().lower() == str(exp_val).strip().lower():
                correct += 1
        return correct / total if total > 0 else False

    if isinstance(expected, dict) or isinstance(submitted, dict):
        return False

    # --- Ordered list answers (pl-order-blocks) ---
    # Distinguish from checkbox: order-blocks submits a list where order matters.
    # We check if expected is a list. If submitted is also a list, we check
    # whether the expected values are ordered or set-based.
    if isinstance(expected, list) and isinstance(submitted, list):
        # Heuristic: if expected has no duplicates and order matters,
        # check for ordered match. We use the "ordered" flag if present,
        # otherwise fall back to order-independent (checkbox behavior).
        # For now: if all expected items are unique and len > 0, try ordered first.
        expected_strs = [str(v).strip().lower() for v in expected]
        submitted_strs = [str(v).strip().lower() for v in submitted]

        # Exact ordered match
        if expected_strs == submitted_strs:
            return True

        # Fallback: unordered set match (checkbox)
        if set(expected_strs) == set(submitted_strs):
            return True

        # Partial credit for order-blocks: longest common subsequence / total
        if len(expected_strs) > 0:
            lcs_len = _lcs_length(submitted_strs, expected_strs)
            return lcs_len / len(expected_strs)

        return False

    # Expected is a list but submitted isn't (or vice versa) — mismatch
    if isinstance(expected, list) or isinstance(submitted, list):
        return False

    # --- Numeric comparison with tolerance ---
    exp_str = str(expected).strip()
    sub_str = str(submitted).strip()
    try:
        exp_num = float(exp_str)
        sub_num = float(sub_str)
        # ±1% relative tolerance or ±1e-8 absolute
        if exp_num == 0:
            return abs(sub_num) < 1e-8
        return abs(sub_num - exp_num) / abs(exp_num) < 0.01 or abs(sub_num - exp_num) < 1e-8
    except (ValueError, OverflowError):
        pass

    # --- Scalar comparison — case-insensitive string match ---
    return sub_str.lower() == exp_str.lower()


def _lcs_length(a: list[str], b: list[str]) -> int:
    """Longest common subsequence length between two lists."""
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]


_CODE_HARNESS = """\
import json, sys, traceback

with open(sys.argv[1]) as f:
    data = json.load(f)

test_cases = data["test_cases"]
fn_name = data["fn_name"]

# Load student code
try:
    with open(sys.argv[2]) as f:
        exec(compile(f.read(), "student_code.py", "exec"))
except Exception as e:
    print(json.dumps({"error": f"Code failed to compile: {e}"}))
    sys.exit(0)

fn = locals().get(fn_name) or globals().get(fn_name)
if fn is None:
    print(json.dumps({"error": f"Function '{fn_name}' not defined"}))
    sys.exit(0)

results = []
for i, tc in enumerate(test_cases):
    try:
        actual = fn(*tc["input"])
        passed = (actual == tc["expected"])
        results.append({
            "index": i, "passed": passed,
            "actual": repr(actual), "expected": repr(tc["expected"]),
            "description": tc.get("description", ""),
            "hidden": tc.get("hidden", False),
        })
    except Exception as e:
        results.append({
            "index": i, "passed": False,
            "error": str(e),
            "expected": repr(tc["expected"]),
            "description": tc.get("description", ""),
            "hidden": tc.get("hidden", False),
        })

print(json.dumps({"results": results}))
"""


def _grade_code_submission(
    submitted_code: str,
    correct_answer_data: dict[str, Any],
) -> dict[str, Any]:
    """Grade a code submission by running it against all test cases in a subprocess."""
    import re as _re

    test_cases = correct_answer_data.get("test_cases", [])

    # Extract function name from reference solution
    ref_code = correct_answer_data.get("code", "")
    fn_name = ""
    match = _re.search(r"def\s+(\w+)\s*\(", ref_code)
    if match:
        fn_name = match.group(1)
    if not fn_name:
        match = _re.search(r"def\s+(\w+)\s*\(", submitted_code)
        if match:
            fn_name = match.group(1)

    if not test_cases or not fn_name:
        return {"score": 0.0, "passed": 0, "total": 0, "results": [],
                "error": "No test cases or function name defined"}

    with tempfile.TemporaryDirectory() as tmpdir:
        student_file = os.path.join(tmpdir, "student_code.py")
        harness_file = os.path.join(tmpdir, "harness.py")
        test_data_file = os.path.join(tmpdir, "test_cases.json")

        with open(student_file, "w") as f:
            f.write(submitted_code)
        with open(test_data_file, "w") as f:
            json_mod.dump({"test_cases": test_cases, "fn_name": fn_name}, f)
        with open(harness_file, "w") as f:
            f.write(_CODE_HARNESS)

        try:
            proc = subprocess.run(
                [sys.executable, harness_file, test_data_file, student_file],
                capture_output=True, text=True, timeout=10, cwd=tmpdir,
            )
            if proc.returncode != 0 and not proc.stdout.strip():
                return {
                    "score": 0.0, "passed": 0, "total": len(test_cases),
                    "results": [],
                    "error": f"Execution error: {proc.stderr[:500]}",
                }
            output = json_mod.loads(proc.stdout.strip())
        except subprocess.TimeoutExpired:
            return {
                "score": 0.0, "passed": 0, "total": len(test_cases),
                "results": [],
                "error": "Code execution timed out (10s limit). Check for infinite loops.",
            }
        except (json_mod.JSONDecodeError, Exception) as e:
            return {
                "score": 0.0, "passed": 0, "total": len(test_cases),
                "results": [],
                "error": f"Grading error: {e}",
            }

    if "error" in output:
        return {
            "score": 0.0, "passed": 0, "total": len(test_cases),
            "results": [], "error": output["error"],
        }

    results = output.get("results", [])
    passed = sum(1 for r in results if r.get("passed"))
    total = len(results)

    return {
        "score": passed / total if total > 0 else 0.0,
        "passed": passed,
        "total": total,
        "results": results,
    }


def grade_submission(
    question_dir: str,
    course_path: str,
    params: dict[str, Any],
    correct_answers: dict[str, Any],
    submitted_answers: dict[str, Any],
) -> dict[str, Any]:
    """Grade a submission. Returns {score, feedback, partial_scores}."""
    data: dict[str, Any] = {
        "params": params,
        "correct_answers": correct_answers,
        "submitted_answers": submitted_answers,
        "format_errors": {},
        "partial_scores": {},
        "score": 0,
        "feedback": {},
    }

    # Only try server.py if the question has an actual directory on disk
    server_py = Path(question_dir) / "server.py" if question_dir else None

    if server_py and server_py.exists():
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
        # Built-in grading: match on correct_answers (supports partial credit)
        if not correct_answers:
            data["score"] = 1.0
            data["feedback"] = {"message": "No grading criteria defined."}
        else:
            # Detect code questions (values that are dicts with code + test_cases)
            code_keys = [
                k for k, v in correct_answers.items()
                if isinstance(v, dict) and "code" in v and "test_cases" in v
            ]
            non_code_keys = [k for k in correct_answers if k not in code_keys]

            if code_keys:
                # Grade code submissions
                total_score = 0.0
                total_keys = len(correct_answers)
                all_code_results = []

                for key in code_keys:
                    submitted_code = submitted_answers.get(key, "")
                    if not isinstance(submitted_code, str):
                        submitted_code = str(submitted_code)
                    result = _grade_code_submission(submitted_code, correct_answers[key])
                    score = result["score"]
                    total_score += score
                    data["partial_scores"][key] = {
                        "score": score,
                        "passed": result.get("passed", 0),
                        "total": result.get("total", 0),
                    }
                    all_code_results.append(result)

                # Grade any non-code keys with standard matching
                for key in non_code_keys:
                    submitted = submitted_answers.get(key)
                    match_result = _answers_match(submitted, correct_answers[key])
                    s = match_result if isinstance(match_result, float) else (1.0 if match_result else 0.0)
                    total_score += s
                    data["partial_scores"][key] = {"score": s}

                data["score"] = total_score / total_keys if total_keys > 0 else 0

                # Build feedback with test results
                code_result = all_code_results[0] if all_code_results else {}
                passed = code_result.get("passed", 0)
                total = code_result.get("total", 0)
                error = code_result.get("error", "")
                test_results = code_result.get("results", [])

                visible_results = [r for r in test_results if not r.get("hidden")]
                hidden_passed = sum(1 for r in test_results if r.get("hidden") and r.get("passed"))
                hidden_total = sum(1 for r in test_results if r.get("hidden"))

                data["feedback"] = {
                    "message": f"Tests passed: {passed}/{total}" + (f" | Error: {error}" if error else ""),
                    "test_results": visible_results,
                    "hidden_summary": f"{hidden_passed}/{hidden_total} hidden tests passed",
                    "error": error,
                }
            else:
                # Standard grading for non-code questions
                total_score = 0.0
                total = len(correct_answers)
                for key, expected in correct_answers.items():
                    submitted = submitted_answers.get(key)
                    result = _answers_match(submitted, expected)
                    if isinstance(result, float):
                        score = result
                    else:
                        score = 1.0 if result else 0.0
                    total_score += score
                    data["partial_scores"][key] = {"score": score}
                data["score"] = total_score / total if total > 0 else 0
                score_str = f"{int(total_score)}" if total_score == int(total_score) else f"{total_score:.1f}"
                total_str = f"{int(total)}" if total == int(total) else f"{total}"
                data["feedback"] = {
                    "message": f"Score: {score_str}/{total_str}",
                    "total_score": total_score,
                    "total": total,
                }

    return {
        "score": data.get("score", 0),
        "feedback": data.get("feedback", {}),
        "partial_scores": data.get("partial_scores", {}),
    }
