"""Create and load PrairieLearn-format course directories."""

import json
import logging
import re
from pathlib import Path
import shutil

from sqlalchemy.orm import Session

from app.models import Assessment, Course, Question

log = logging.getLogger(__name__)

# Base directory for newly created courses (project-relative)
COURSES_BASE = Path(__file__).resolve().parent.parent.parent / "data" / "courses"


def _read_json(path: Path) -> dict:
    with open(path) as f:
        return json.load(f)


def _slugify(title: str) -> str:
    """Convert a title to a URL-friendly slug."""
    slug = title.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or "untitled"


def create_course(db: Session, title: str, user_id: int) -> Course:
    """Create a new course with a PrairieLearn skeleton directory."""
    slug = _slugify(title)
    course_dir = COURSES_BASE / str(user_id) / slug

    # Avoid collisions by appending a number
    base_dir = course_dir
    counter = 2
    while course_dir.exists():
        course_dir = base_dir.parent / f"{base_dir.name}-{counter}"
        counter += 1

    # Create PrairieLearn skeleton
    course_dir.mkdir(parents=True)
    (course_dir / "questions").mkdir()
    (course_dir / "courseInstances" / "Default" / "assessments").mkdir(parents=True)

    info = {"name": slug.upper().replace("-", "_"), "title": title}
    (course_dir / "infoCourse.json").write_text(json.dumps(info, indent=2))

    # Create DB record
    course = Course(
        name=info["name"],
        title=title,
        path=str(course_dir),
        user_id=user_id,
    )
    db.add(course)
    db.flush()

    course.container_tag = f"course_{course.id}"
    db.flush()

    # Create default empty assessment
    a = Assessment(
        course_id=course.id,
        tid="default",
        title="All Questions",
        type="Homework",
    )
    a.question_ids = []
    db.add(a)

    db.commit()
    db.refresh(course)
    return course


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
        a.question_ids = [q.id for q in question_map.values()]
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
    raw_qids: list[str] = []

    # Extract question IDs from zones
    for zone in info.get("zones", []):
        for q_entry in zone.get("questions", []):
            if "id" in q_entry:
                raw_qids.append(q_entry["id"])
            for alt in q_entry.get("alternatives", []):
                if "id" in alt:
                    raw_qids.append(alt["id"])

    # Convert qid strings to database PKs via question_map
    db_ids = [question_map[qid].id for qid in raw_qids if qid in question_map]

    a = Assessment(
        course_id=course_id,
        tid=adir.name,
        title=info.get("title", adir.name),
        type=info.get("type", "Homework"),
        number=str(info.get("number", "")),
        set_name=info.get("set", ""),
    )
    a.question_ids = db_ids
    db.add(a)
    db.flush()
    return a

def edit_course(db: Session, course_id: int, user_id: int, new_title: str) -> Course:
    """Update a course's title and name in the database and infoCourse.json.
    
    The physical directory path and Supermemory container_tag remain unchanged
    to preserve isolation and internal references.
    """
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user_id).first()
    if not course:
        raise ValueError(f"Course {course_id} not found or access denied.")

    # Generate new name from the title (matching create_course logic)
    new_slug = _slugify(new_title)
    new_name = new_slug.upper().replace("-", "_")

    # Update DB record (title and name)
    course.title = new_title
    course.name = new_name

    # Update infoCourse.json on disk
    course_dir = Path(course.path)
    info_path = course_dir / "infoCourse.json"
    
    if info_path.exists():
        info = _read_json(info_path)
        info["title"] = new_title
        info["name"] = new_name
        info_path.write_text(json.dumps(info, indent=2))

    db.commit()
    db.refresh(course)
    return course

def delete_course(db: Session, course_id: int, user_id: int) -> bool:
    """Delete a course from the database and permanently remove its directory."""
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user_id).first()
    if not course:
        raise ValueError(f"Course {course_id} not found or access denied.")

    course_dir = Path(course.path)

    # 1. Clear out dependent records (matching load_course cleanup style)
    db.query(Question).filter(Question.course_id == course.id).delete()
    db.query(Assessment).filter(Assessment.course_id == course.id).delete()
    
    # 2. Delete the course record
    db.delete(course)
    db.commit()

    # 3. Permanently remove the directory and all its contents
    if course_dir.exists() and course_dir.is_dir():
        shutil.rmtree(course_dir)

    return True
