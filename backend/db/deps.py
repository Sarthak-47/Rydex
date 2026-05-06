"""
Shared database session dependency.
All routers import get_db from here — never from main.py.
"""
from sqlalchemy.orm import Session
from typing import Generator

# These are set once at app startup in main.py lifespan
_SessionLocal = None


def init_db(session_factory):
    global _SessionLocal
    _SessionLocal = session_factory


def get_db() -> Generator[Session, None, None]:
    if _SessionLocal is None:
        raise RuntimeError("Database not initialised — call init_db() first")
    with _SessionLocal() as session:
        yield session
