from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import create_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models import Submission, User
from app.schemas import AuthResponse, LoginRequest, RegisterRequest, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if len(req.username.strip()) < 2:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Username must be at least 2 characters")
    if len(req.password) < 4:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password must be at least 4 characters")

    existing = db.query(User).filter(User.username == req.username.strip()).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already taken")

    user = User(username=req.username.strip(), password_hash=hash_password(req.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(token=create_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username.strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password")

    return AuthResponse(token=create_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.get("/streak")
def get_streak(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return the user's current streak and a 28-day submission heatmap.

    Response: {
      current_streak: int,
      days: [{ date: "YYYY-MM-DD", count: int }, ...]   # last 28 days, oldest first
    }
    """
    today = date.today()
    start = today - timedelta(days=27)  # 28 days including today

    # Count submissions per day for the last 28 days
    rows = (
        db.query(
            func.date(Submission.submitted_at).label("day"),
            func.count().label("cnt"),
        )
        .filter(
            Submission.user_id == user.id,
            Submission.submitted_at >= datetime(start.year, start.month, start.day, tzinfo=timezone.utc),
        )
        .group_by(func.date(Submission.submitted_at))
        .all()
    )

    counts: dict[str, int] = {}
    for row in rows:
        day_val = row.day
        # SQLite returns date as string, Postgres returns date object
        if isinstance(day_val, str):
            key = day_val
        else:
            key = day_val.isoformat()
        counts[key] = row.cnt

    # Build 28-day array
    days = []
    for i in range(28):
        d = start + timedelta(days=i)
        days.append({"date": d.isoformat(), "count": counts.get(d.isoformat(), 0)})

    # Calculate current streak (consecutive days with submissions, counting back from today)
    streak = 0
    for i in range(28):
        d = today - timedelta(days=i)
        if counts.get(d.isoformat(), 0) > 0:
            streak += 1
        else:
            break

    return {"current_streak": streak, "days": days}
