from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Assessment, Course, Question, Submission, User, Variant
from app.schemas import AssessmentDetailOut, AssessmentOut, QuestionOut

router = APIRouter(tags=["assessments"])


def _assessment_score(assessment: Assessment, user_id: int, db: Session) -> int | None:
    """Compute the user's score percentage for an assessment (best per question, averaged).
    Returns an int 0-100, or None if no submissions exist."""
    qids = assessment.question_ids
    if not qids:
        return None

    questions = (
        db.query(Question)
        .filter(Question.course_id == assessment.course_id, Question.qid.in_(qids))
        .all()
    )
    if not questions:
        return None

    scores: list[float] = []
    for q in questions:
        # Best score across all variants/submissions for this question
        best = (
            db.query(func.max(Submission.score))
            .join(Variant, Submission.variant_id == Variant.id)
            .filter(Variant.question_id == q.id, Submission.user_id == user_id)
            .scalar()
        )
        if best is not None:
            scores.append(best)

    if not scores:
        return None
    return round(sum(scores) / len(questions) * 100)


def _last_submission_time(assessment: Assessment, user_id: int, db: Session):
    """Get the most recent submission time for any question in this assessment."""
    qids = assessment.question_ids
    if not qids:
        return None
    q_ids = [
        r[0]
        for r in db.query(Question.id)
        .filter(Question.course_id == assessment.course_id, Question.qid.in_(qids))
        .all()
    ]
    if not q_ids:
        return None
    return (
        db.query(func.max(Submission.submitted_at))
        .join(Variant, Submission.variant_id == Variant.id)
        .filter(Variant.question_id.in_(q_ids), Submission.user_id == user_id)
        .scalar()
    )


@router.get("/courses/{course_id}/assessments", response_model=list[AssessmentOut])
def list_assessments(course_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    course = db.get(Course, course_id)
    if not course or course.user_id != user.id:
        raise HTTPException(404, "Course not found")
    assessments = db.query(Assessment).filter(Assessment.course_id == course_id).all()
    result = []
    for a in assessments:
        out = AssessmentOut.model_validate(a)
        out.score_pct = _assessment_score(a, user.id, db)
        result.append(out)
    return result


@router.get("/assessments/recent")
def recent_assessments(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Return assessments the user has interacted with, most recent first, with scores."""
    # Get all courses owned by user
    courses = db.query(Course).filter(Course.user_id == user.id).all()
    if not courses:
        return []

    items = []
    for course in courses:
        assessments = db.query(Assessment).filter(Assessment.course_id == course.id).all()
        for a in assessments:
            last_sub = _last_submission_time(a, user.id, db)
            if last_sub is None:
                continue  # User hasn't attempted this assessment
            score = _assessment_score(a, user.id, db)
            items.append({
                "assessment_id": a.id,
                "course_id": course.id,
                "course_title": course.title or course.name,
                "title": a.title,
                "score_pct": score,
                "last_submitted_at": last_sub.isoformat() if last_sub else None,
            })

    items.sort(key=lambda x: x["last_submitted_at"] or "", reverse=True)
    return items[:10]


@router.get("/assessments/{assessment_id}/scores")
def assessment_scores(assessment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Return best score per question for this user in the assessment."""
    a = db.get(Assessment, assessment_id)
    if not a:
        raise HTTPException(404, "Assessment not found")
    course = db.get(Course, a.course_id)
    if not course or course.user_id != user.id:
        raise HTTPException(404, "Assessment not found")

    qids = a.question_ids
    questions = (
        db.query(Question)
        .filter(Question.course_id == a.course_id, Question.qid.in_(qids))
        .all()
        if qids
        else []
    )

    scores: dict[int, float | None] = {}
    for q in questions:
        best = (
            db.query(func.max(Submission.score))
            .join(Variant, Submission.variant_id == Variant.id)
            .filter(Variant.question_id == q.id, Submission.user_id == user.id)
            .scalar()
        )
        scores[q.id] = best

    return {"scores": scores}


@router.get("/assessments/{assessment_id}", response_model=AssessmentDetailOut)
def get_assessment(assessment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    a = db.get(Assessment, assessment_id)
    if not a:
        raise HTTPException(404, "Assessment not found")

    course = db.get(Course, a.course_id)
    if not course or course.user_id != user.id:
        raise HTTPException(404, "Assessment not found")

    qids = a.question_ids
    questions = (
        db.query(Question)
        .filter(Question.course_id == a.course_id, Question.qid.in_(qids))
        .all()
        if qids
        else []
    )

    q_by_qid = {q.qid: q for q in questions}
    ordered = [q_by_qid[qid] for qid in qids if qid in q_by_qid]

    return AssessmentDetailOut(assessment=a, questions=ordered)
