from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Course, Question, Submission, User, Variant
from app.schemas import QuestionOut, SubmissionOut, SubmitRequest, VariantOut
from app.services.grader import grade_submission
from app.services.question_renderer import generate_variant

router = APIRouter(tags=["questions"])


def _check_question_access(q: Question | None, db: Session, user: User) -> Question:
    if not q:
        raise HTTPException(404, "Question not found")
    course = db.get(Course, q.course_id)
    if not course or course.user_id != user.id:
        raise HTTPException(404, "Question not found")
    return q


@router.get("/questions/{question_id}", response_model=QuestionOut)
def get_question(question_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.get(Question, question_id)
    _check_question_access(q, db, user)
    return q


@router.post("/questions/{question_id}/variant", response_model=VariantOut)
def create_variant(question_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = _check_question_access(db.get(Question, question_id), db, user)

    course = db.get(Course, q.course_id)
    result = generate_variant(
        question_dir=q.directory,
        course_path=course.path if course else "",
        question_html=q.question_html,
        stored_correct_answers=q.stored_correct_answers or None,
    )

    variant = Variant(question_id=q.id, user_id=user.id, seed=result["seed"])
    variant.params = result["params"]
    variant.correct_answers = result["correct_answers"]
    db.add(variant)
    db.commit()
    db.refresh(variant)

    return VariantOut(
        id=variant.id,
        question_id=variant.question_id,
        seed=variant.seed,
        params=variant.params,
        correct_answers={},
        rendered_html=result["rendered_html"],
        created_at=variant.created_at,
    )


@router.get("/variants/{variant_id}", response_model=VariantOut)
def get_variant(variant_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    v = db.get(Variant, variant_id)
    if not v or v.user_id != user.id:
        raise HTTPException(404, "Variant not found")

    q = db.get(Question, v.question_id)
    rendered_html = q.question_html if q else ""
    if q and v.params:
        import chevron
        try:
            rendered_html = chevron.render(q.question_html, {"params": v.params, "correct_answers": v.correct_answers})
        except Exception:
            pass

    return VariantOut(
        id=v.id,
        question_id=v.question_id,
        seed=v.seed,
        params=v.params,
        correct_answers={},
        rendered_html=rendered_html,
        created_at=v.created_at,
    )


@router.post("/variants/{variant_id}/submit", response_model=SubmissionOut)
def submit_answers(variant_id: int, req: SubmitRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    v = db.get(Variant, variant_id)
    if not v or v.user_id != user.id:
        raise HTTPException(404, "Variant not found")

    q = db.get(Question, v.question_id)
    course = db.get(Course, q.course_id) if q else None

    result = grade_submission(
        question_dir=q.directory if q else "",
        course_path=course.path if course else "",
        params=v.params,
        correct_answers=v.correct_answers,
        submitted_answers=req.submitted_answers,
    )

    sub = Submission(variant_id=v.id, user_id=user.id, score=result["score"])
    sub.submitted_answers = req.submitted_answers
    sub.feedback = result["feedback"]
    db.add(sub)
    db.commit()
    db.refresh(sub)

    return sub
