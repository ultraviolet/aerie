from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Assessment, Course, Question, User
from app.schemas import AssessmentDetailOut, AssessmentOut, QuestionOut

router = APIRouter(tags=["assessments"])


@router.get("/courses/{course_id}/assessments", response_model=list[AssessmentOut])
def list_assessments(course_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    course = db.get(Course, course_id)
    if not course or course.user_id != user.id:
        raise HTTPException(404, "Course not found")
    return db.query(Assessment).filter(Assessment.course_id == course_id).all()


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
