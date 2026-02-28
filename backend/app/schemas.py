from datetime import datetime
from typing import Any

from pydantic import BaseModel


# -- Auth --


class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    username: str

    model_config = {"from_attributes": True}


# -- Requests --


class CourseCreateRequest(BaseModel):
    title: str


class SubmitRequest(BaseModel):
    submitted_answers: dict[str, Any]


# -- Responses --


class CourseOut(BaseModel):
    id: int
    name: str           # Stored title
    path: str           # URL path
    container_tag: str  # Auto-generated slug
    # created_at: Optional[datetime] = None # Add if you have this in DB
    topics: list[str] = []

    model_config = {"from_attributes": True}


class AssessmentOut(BaseModel):
    id: int
    course_id: int
    tid: str
    title: str
    type: str
    number: str
    set_name: str
    question_ids: list[str]
    score_pct: int | None = None

    model_config = {"from_attributes": True}


class QuestionOut(BaseModel):
    id: int
    course_id: int
    qid: str
    title: str
    topic: str
    tags: list[str]
    has_server_py: bool
    single_variant: bool

    model_config = {"from_attributes": True}


class VariantOut(BaseModel):
    id: int
    question_id: int
    seed: int
    params: dict[str, Any]
    correct_answers: dict[str, Any]
    rendered_html: str = ""
    created_at: datetime

    model_config = {"from_attributes": True}


class SubmissionOut(BaseModel):
    id: int
    variant_id: int
    submitted_answers: dict[str, Any]
    score: float | None
    feedback: dict[str, Any]
    submitted_at: datetime

    model_config = {"from_attributes": True}


class AssessmentDetailOut(BaseModel):
    assessment: AssessmentOut
    questions: list[QuestionOut]


# -- Documents --


class DocumentOut(BaseModel):
    id: int
    course_id: int
    supermemory_id: str
    filename: str
    content_type: str
    status: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


# -- Question Generation --


class GenerateRequest(BaseModel):
    prompt: str
    topics: list[str] = []
    num_questions: int = 5


class GenerateResponse(BaseModel):
    questions: list[QuestionOut]
    context_used: list[str] = []
