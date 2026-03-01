import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# Make our app logs visible (uvicorn defaults to WARNING)
logging.basicConfig(level=logging.INFO)
logging.getLogger("app").setLevel(logging.DEBUG)

from app.database import init_db
from app.routers import assessments, auth, courses, documents, generate, questions


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="prAIrie", version="0.1.0", lifespan=lifespan)

_cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(courses.router, prefix="/api")
app.include_router(assessments.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(generate.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
