### If anything i think somethings wrong here but idk how to fix or read this code

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/courses/{course_id}/topics", tags=["topics"])


@router.get("", response_model=list[schemas.TopicOut])
def list_topics(course_id: int, db: Session = Depends(get_db)):
    return db.query(models.Topic).filter(
        models.Topic.course_id == course_id
    ).all()


@router.post("", response_model=schemas.TopicOut)
def create_topic(
    course_id: int,
    topic: schemas.TopicCreate,
    db: Session = Depends(get_db),
):
    new_topic = models.Topic(
        name=topic.name,
        course_id=course_id,
    )
    db.add(new_topic)
    db.commit()
    db.refresh(new_topic)
    return new_topic