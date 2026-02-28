from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.auth import get_current_user
from app.database import get_db
from app.models import Course, User
from app.schemas import CourseLoadRequest, CourseOut
from app.services.course_loader import load_course

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

@router.post("/load", response_model=CourseOut)
def load_course_from_path(
    req: CourseLoadRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        # This calls your service that looks for infoCourse.json
        course = load_course(db, req.path, user.id)
        if not course:
            raise HTTPException(status_code=500, detail="Course loaded but not returned")
        return course
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Log the actual error to your terminal so you can see why it failed
        print(f"Error loading course: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during scan")