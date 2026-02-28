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


class CourseLoadRequest(BaseModel):
    path: str


class SubmitRequest(BaseModel):
    submitted_answers: dict[str, Any]


# -- Responses --


class CourseOut(BaseModel):
    id: int
    name: str
    title: str
    path: str

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
