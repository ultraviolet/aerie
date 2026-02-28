from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Course, User
from app.schemas import GenerateRequest, GenerateResponse, QuestionOut
from app.services.question_generator import generate_question

router = APIRouter(tags=["generate"])


@router.post("/courses/{course_id}/generate", response_model=GenerateResponse)
def generate(
    course_id: int,
    req: GenerateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    course = db.get(Course, course_id)
    if not course or course.user_id != user.id:
        raise HTTPException(404, "Course not found")

    if not course.container_tag:
        course.container_tag = f"course_{course.id}"
        db.commit()

    if not req.prompt.strip():
        raise HTTPException(400, "Prompt cannot be empty")

    questions_out: list[QuestionOut] = []
    all_context: list[str] = []

    for _ in range(min(req.num_questions, 5)):
        try:
            question, _correct_answers, context_chunks = generate_question(
                prompt=req.prompt,
                course=course,
                db=db,
                topic=req.topic,
            )
            questions_out.append(QuestionOut.model_validate(question))
            all_context.extend(context_chunks)
        except (ValueError, RuntimeError) as e:
            raise HTTPException(502, f"Question generation failed: {e}")

    db.commit()

    # Deduplicate context
    seen = set()
    unique_context = []
    for c in all_context:
        if c not in seen:
            seen.add(c)
            unique_context.append(c)

    return GenerateResponse(questions=questions_out, context_used=unique_context[:5])
