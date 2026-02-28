from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.auth import get_current_user
from app.database import get_db
from app.models import Course, User
from app.schemas import CourseCreateRequest, CourseOut
from app.services.course_loader import create_course

router = APIRouter(prefix="/courses", tags=["courses"])

@router.get("/", response_model=list[CourseOut])
def list_courses(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Course).filter(Course.user_id == user.id).all()

@router.get("/{course_id}", response_model=CourseOut)
def get_course(course_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@router.post("/", response_model=CourseOut)
def create_course_endpoint(
    req: CourseCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    try:
        course = create_course(db, req.title.strip(), user.id)
        return course
    except Exception as e:
        print(f"Error creating course: {e}")
        raise HTTPException(status_code=500, detail=str(e))