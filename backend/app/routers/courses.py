from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Course, User
from app.schemas import CourseLoadRequest, CourseOut
from app.services.course_loader import load_course

router = APIRouter(tags=["courses"])


@router.get("/courses", response_model=list[CourseOut])
def list_courses(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Course).filter(Course.user_id == user.id).all()


@router.get("/courses/{course_id}", response_model=CourseOut)
def get_course(course_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    course = db.get(Course, course_id)
    if not course or course.user_id != user.id:
        raise HTTPException(404, "Course not found")
    return course


@router.post("/courses/load", response_model=CourseOut)
def load_course_from_path(
    req: CourseLoadRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        course = load_course(db, req.path, user.id)
    except FileNotFoundError as e:
        raise HTTPException(400, str(e))
    return course
