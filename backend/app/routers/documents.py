import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Course, Document, User
from app.schemas import DocumentOut
from app.services import supermemory_service as sm

router = APIRouter(tags=["documents"])

ALLOWED_TYPES = {
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx"}


def _get_course(course_id: int, db: Session, user: User) -> Course:
    course = db.get(Course, course_id)
    if not course or course.user_id != user.id:
        raise HTTPException(404, "Course not found")
    if not course.container_tag:
        course.container_tag = f"course_{course.id}"
        db.commit()
    return course


@router.post("/courses/{course_id}/documents", response_model=DocumentOut)
async def upload_document(
    course_id: int,
    file: UploadFile,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    course = _get_course(course_id, db, user)

    # Validate file
    filename = file.filename or "unnamed"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(400, "Empty file")

    # Upload to Supermemory
    try:
        sm_id = sm.upload_document(file_bytes, filename, course.container_tag)
    except RuntimeError as e:
        raise HTTPException(500, str(e))
    except Exception as e:
        raise HTTPException(502, f"Supermemory upload failed: {e}")

    # Save to DB
    doc = Document(
        course_id=course.id,
        supermemory_id=sm_id,
        filename=filename,
        content_type=file.content_type or "",
        status="queued",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/courses/{course_id}/documents", response_model=list[DocumentOut])
def list_documents(
    course_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    course = _get_course(course_id, db, user)
    docs = db.query(Document).filter(Document.course_id == course.id).all()

    # Sync status from Supermemory for any docs not yet terminal
    _TERMINAL = {"done", "failed"}
    dirty = False
    for doc in docs:
        if doc.status not in _TERMINAL and doc.supermemory_id:
            try:
                doc.status = sm.get_document_status(doc.supermemory_id)
                dirty = True
            except Exception:
                doc.status = "failed"
                dirty = True
    if dirty:
        db.commit()

    return docs


@router.delete("/documents/{doc_id}")
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    course = db.get(Course, doc.course_id)
    if not course or course.user_id != user.id:
        raise HTTPException(404, "Document not found")

    # Delete from Supermemory
    if doc.supermemory_id:
        try:
            sm.delete_document(doc.supermemory_id)
        except Exception:
            logging.getLogger(__name__).exception(
                "Failed to delete doc %s from Supermemory", doc.supermemory_id
            )

    db.delete(doc)
    db.commit()
    return {"ok": True}
