import json
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    courses: Mapped[list["Course"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    variants: Mapped[list["Variant"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    path: Mapped[str] = mapped_column(String, nullable=False)

    container_tag: Mapped[str] = mapped_column(String, default="")

    user: Mapped["User"] = relationship(back_populates="courses")
    assessments: Mapped[list["Assessment"]] = relationship(back_populates="course", cascade="all, delete-orphan")
    questions: Mapped[list["Question"]] = relationship(back_populates="course", cascade="all, delete-orphan")
    documents: Mapped[list["Document"]] = relationship(back_populates="course", cascade="all, delete-orphan")
    topics: Mapped[list["Topic"]] = relationship(back_populates="course", cascade="all, delete-orphan")

class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    tid: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, default="Homework")
    number: Mapped[str] = mapped_column(String, default="")
    set_name: Mapped[str] = mapped_column(String, default="")
    _question_ids: Mapped[str] = mapped_column("question_ids", Text, default="[]")

    course: Mapped["Course"] = relationship(back_populates="assessments")

    @property
    def question_ids(self) -> list[str]:
        return json.loads(self._question_ids)

    @question_ids.setter
    def question_ids(self, value: list[str]):
        self._question_ids = json.dumps(value)


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    qid: Mapped[str] = mapped_column(String, nullable=False)
    uuid: Mapped[str] = mapped_column(String, default="")
    title: Mapped[str] = mapped_column(String, nullable=False)
    topic: Mapped[str] = mapped_column(String, default="")
    _tags: Mapped[str] = mapped_column("tags", Text, default="[]")
    question_html: Mapped[str] = mapped_column(Text, default="")
    _stored_correct_answers: Mapped[str] = mapped_column("stored_correct_answers", Text, default="{}")
    has_server_py: Mapped[bool] = mapped_column(Boolean, default=False)
    single_variant: Mapped[bool] = mapped_column(Boolean, default=False)
    directory: Mapped[str] = mapped_column(String, default="")

    course: Mapped["Course"] = relationship(back_populates="questions")
    variants: Mapped[list["Variant"]] = relationship(back_populates="question", cascade="all, delete-orphan")
    topic: Mapped["Topic"] = relationship(back_populates="questions")
    
    @property
    def tags(self) -> list[str]:
        return json.loads(self._tags)

    @tags.setter
    def tags(self, value: list[str]):
        self._tags = json.dumps(value)

    @property
    def stored_correct_answers(self) -> dict:
        return json.loads(self._stored_correct_answers)

    @stored_correct_answers.setter
    def stored_correct_answers(self, value: dict):
        self._stored_correct_answers = json.dumps(value)

class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)

    course: Mapped["Course"] = relationship(back_populates="topics")
    questions: Mapped[list["Question"]] = relationship(
        back_populates="topic",
        cascade="all, delete-orphan"
    )

class Variant(Base):
    __tablename__ = "variants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    seed: Mapped[int] = mapped_column(Integer, default=0)
    _params: Mapped[str] = mapped_column("params", Text, default="{}")
    _correct_answers: Mapped[str] = mapped_column("correct_answers", Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    question: Mapped["Question"] = relationship(back_populates="variants")
    user: Mapped["User"] = relationship(back_populates="variants")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="variant", cascade="all, delete-orphan")

    @property
    def params(self) -> dict:
        return json.loads(self._params)

    @params.setter
    def params(self, value: dict):
        self._params = json.dumps(value)

    @property
    def correct_answers(self) -> dict:
        return json.loads(self._correct_answers)

    @correct_answers.setter
    def correct_answers(self, value: dict):
        self._correct_answers = json.dumps(value)


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    variant_id: Mapped[int] = mapped_column(ForeignKey("variants.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    _submitted_answers: Mapped[str] = mapped_column("submitted_answers", Text, default="{}")
    score: Mapped[float] = mapped_column(Float, nullable=True)
    _feedback: Mapped[str] = mapped_column("feedback", Text, default="{}")
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    variant: Mapped["Variant"] = relationship(back_populates="submissions")
    user: Mapped["User"] = relationship(back_populates="submissions")

    @property
    def submitted_answers(self) -> dict:
        return json.loads(self._submitted_answers)

    @submitted_answers.setter
    def submitted_answers(self, value: dict):
        self._submitted_answers = json.dumps(value)

    @property
    def feedback(self) -> dict:
        return json.loads(self._feedback)

    @feedback.setter
    def feedback(self, value: dict):
        self._feedback = json.dumps(value)


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    supermemory_id: Mapped[str] = mapped_column(String, default="")
    filename: Mapped[str] = mapped_column(String, nullable=False)
    content_type: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="processing")
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    course: Mapped["Course"] = relationship(back_populates="documents")
