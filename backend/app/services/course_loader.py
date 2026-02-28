"""Load a PrairieLearn-format course directory into the database."""

import json
import logging
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import Assessment, Course, Question

log = logging.getLogger(__name__)


def _read_json(path: Path) -> dict:
    with open(path) as f:
        return json.load(f)


def load_course(db: Session, course_path: str, user_id: int) -> Course:
    """Scan a PrairieLearn course directory and populate the database."""
    root = Path(course_path).resolve()
    if not root.is_dir():
        raise FileNotFoundError(f"Course directory not found: {root}")

    # Read infoCourse.json
    info_path = root / "infoCourse.json"
    if info_path.exists():
        info = _read_json(info_path)
        name = info.get("name", root.name)
        title = info.get("title", root.name)
    else:
        name = root.name
        title = root.name

    # Upsert course (per user)
    existing = db.query(Course).filter(Course.path == str(root), Course.user_id == user_id).first()
    if existing:
        existing.name = name
        existing.title = title
        course = existing
    else:
        course = Course(name=name, title=title, path=str(root), user_id=user_id)
        db.add(course)
    db.flush()

    # Ensure container_tag is set (for Supermemory isolation)
    if not course.container_tag:
        course.container_tag = f"course_{course.id}"
        db.flush()

    # Clear old questions and assessments for this course (reload)
    db.query(Question).filter(Question.course_id == course.id).delete()
    db.query(Assessment).filter(Assessment.course_id == course.id).delete()
    db.flush()

    # Discover questions
    questions_dir = root / "questions"
    question_map: dict[str, Question] = {}  # qid -> Question
    if questions_dir.is_dir():
        for qdir in sorted(questions_dir.iterdir()):
            if not qdir.is_dir():
                continue
            q = _load_question(db, course.id, qdir)
            if q:
                question_map[q.qid] = q

    # Discover assessments from courseInstances
    ci_dir = root / "courseInstances"
    if ci_dir.is_dir():
        for instance_dir in sorted(ci_dir.iterdir()):
            if not instance_dir.is_dir():
                continue
            assessments_dir = instance_dir / "assessments"
            if assessments_dir.is_dir():
                for adir in sorted(assessments_dir.iterdir()):
                    if not adir.is_dir():
                        continue
                    _load_assessment(db, course.id, adir, question_map)

    # If no assessments found, create a default one containing all questions
    if not db.query(Assessment).filter(Assessment.course_id == course.id).first():
        a = Assessment(
            course_id=course.id,
            tid="default",
            title="All Questions",
            type="Homework",
        )
        a.question_ids = [q.qid for q in question_map.values()]
        db.add(a)

    db.commit()
    db.refresh(course)
    return course


def _load_question(db: Session, course_id: int, qdir: Path) -> Question | None:
    info_path = qdir / "info.json"
    if not info_path.exists():
        # Check subdirectories (nested question structure)
        loaded = []
        for sub in sorted(qdir.iterdir()):
            if sub.is_dir() and (sub / "info.json").exists():
                q = _load_question(db, course_id, sub)
                if q:
                    loaded.append(q)
        return loaded[0] if loaded else None

    info = _read_json(info_path)
    html_path = qdir / "question.html"
    question_html = html_path.read_text() if html_path.exists() else ""
    has_server_py = (qdir / "server.py").exists()

    q = Question(
        course_id=course_id,
        qid=qdir.name,
        uuid=info.get("uuid", ""),
        title=info.get("title", qdir.name),
        topic=info.get("topic", ""),
        question_html=question_html,
        has_server_py=has_server_py,
        single_variant=info.get("singleVariant", False),
        directory=str(qdir),
    )
    q.tags = info.get("tags", [])
    db.add(q)
    db.flush()
    return q


def _load_assessment(
    db: Session,
    course_id: int,
    adir: Path,
    question_map: dict[str, Question],
) -> Assessment | None:
    info_path = adir / "infoAssessment.json"
    if not info_path.exists():
        return None

    info = _read_json(info_path)
    qids: list[str] = []

    # Extract question IDs from zones
    for zone in info.get("zones", []):
        for q_entry in zone.get("questions", []):
            if "id" in q_entry:
                qids.append(q_entry["id"])
            for alt in q_entry.get("alternatives", []):
                if "id" in alt:
                    qids.append(alt["id"])

    a = Assessment(
        course_id=course_id,
        tid=adir.name,
        title=info.get("title", adir.name),
        type=info.get("type", "Homework"),
        number=str(info.get("number", "")),
        set_name=info.get("set", ""),
    )
    a.question_ids = qids
    db.add(a)
    db.flush()
    return a
