from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "prairie.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models import Assessment, Course, Document, Question, Submission, User, Variant  # noqa: F401

    Base.metadata.create_all(bind=engine)

    # Add columns that may not exist yet (safe for SQLite)
    _migrate_add_column("courses", "topics", "TEXT DEFAULT '[]'")


def _migrate_add_column(table: str, column: str, col_type: str):
    """Add a column to an existing table if it doesn't already exist."""
    from sqlalchemy import text

    with engine.connect() as conn:
        try:
            conn.execute(text(f"SELECT {column} FROM {table} LIMIT 1"))
        except Exception:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
            conn.commit()
