import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse

from app.auth import get_current_user
from app.database import get_db
from app.models import Course, User
from app.schemas import GenerateRequest, GenerateResponse, QuestionOut
from app.services.question_generator import generate_questions, generate_questions_stream
from app.services import supermemory_service as sm

log = logging.getLogger(__name__)
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

    num = min(max(req.num_questions, 1), 20)

    try:
        questions, context_chunks = generate_questions(
            prompt=req.prompt,
            course=course,
            db=db,
            topics=req.topics,
            num_questions=num,
        )
    except (ValueError, RuntimeError) as e:
        raise HTTPException(502, f"Question generation failed: {e}")

    db.commit()

    questions_out = [QuestionOut.model_validate(q) for q in questions]

    # Deduplicate context
    seen = set()
    unique_context = []
    for c in context_chunks:
        if c not in seen:
            seen.add(c)
            unique_context.append(c)

    return GenerateResponse(questions=questions_out, context_used=unique_context[:5])


@router.post("/courses/{course_id}/generate/stream")
def generate_stream(
    course_id: int,
    req: GenerateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """SSE endpoint that streams progress events during question generation."""
    course = db.get(Course, course_id)
    if not course or course.user_id != user.id:
        raise HTTPException(404, "Course not found")

    if not course.container_tag:
        course.container_tag = f"course_{course.id}"
        db.commit()

    if not req.prompt.strip():
        raise HTTPException(400, "Prompt cannot be empty")

    num = min(max(req.num_questions, 1), 20)

    def event_generator():
        try:
            for event_type, data in generate_questions_stream(
                prompt=req.prompt,
                course=course,
                db=db,
                user_id=user.id,
                topics=req.topics,
                num_questions=num,
            ):
                yield f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
        except Exception as e:
            log.exception("Stream generation failed")
            yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
        finally:
            db.commit()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


class SearchTestRequest(BaseModel):
    query: str


@router.post("/courses/{course_id}/search-test")
def search_test(
    course_id: int,
    req: SearchTestRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Diagnostic endpoint: test Supermemory search without generating a question."""
    course = db.get(Course, course_id)
    if not course or course.user_id != user.id:
        raise HTTPException(404, "Course not found")

    tag = course.container_tag or f"course_{course.id}"
    try:
        chunks = sm.search(req.query, tag, limit=5)
    except Exception as e:
        return {"error": str(e), "container_tag": tag, "chunks": []}

    return {
        "container_tag": tag,
        "query": req.query,
        "num_chunks": len(chunks),
        "chunks": [c[:200] for c in chunks],
    }
