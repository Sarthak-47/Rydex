from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional
import logging

from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.exc import UnknownHashError

from config import get_settings
from db.models import get_engine, get_session_factory, create_all_tables, Worker
from db.deps import init_db, get_db
from services.trigger_monitor import TriggerMonitor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rydex")

settings = get_settings()
engine = get_engine(settings.database_url)
SessionLocal = get_session_factory(engine)

pwd_ctx = CryptContext(schemes=["bcrypt", "sha256_crypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

_monitor: Optional[TriggerMonitor] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _monitor
    create_all_tables(engine)
    init_db(SessionLocal)
    from db.seed import seed as run_seed
    with SessionLocal() as session:
        run_seed(session)
    _monitor = TriggerMonitor(database_url=settings.database_url, poll_interval=60)
    _monitor.start()
    logger.info("Rydex backend started. Trigger monitor running.")
    yield
    if _monitor:
        _monitor.stop()


app = FastAPI(
    title="Rydex API",
    description="Parametric income protection for India's food delivery workforce",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_current_worker(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Worker:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        worker_id: str = payload.get("sub")
        if not worker_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    worker = db.get(Worker, worker_id)
    if not worker or not worker.is_active:
        raise HTTPException(status_code=401, detail="Worker not found")
    return worker


@app.post("/auth/token")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.phone == form.username).first()
    try:
        ok = bool(worker) and pwd_ctx.verify(form.password, worker.password_hash)
    except UnknownHashError:
        ok = False
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    # Include zone context in token for a clean demo UX (avoids extra profile API call)
    zone_name = worker.zone.name if worker.zone else None
    token = create_token(
        {
            "sub": worker.id,
            "name": worker.name,
            "zone_id": worker.zone_id,
            "zone_name": zone_name,
        }
    )
    return {"access_token": token, "token_type": "bearer", "worker_id": worker.id, "name": worker.name}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "demo_mode": settings.demo_mode,
        "trigger_monitor": "running" if (_monitor and _monitor.is_alive()) else "stopped",
        "timestamp": datetime.utcnow().isoformat(),
    }


from routers import workers, policies, claims, payouts, demo, trigger_events, analytics  # noqa: E402

app.include_router(workers.router, prefix="/workers", tags=["Workers"])
app.include_router(policies.router, prefix="/policies", tags=["Policies"])
app.include_router(claims.router, prefix="/claims", tags=["Claims"])
app.include_router(payouts.router, prefix="/payouts", tags=["Payouts"])
app.include_router(trigger_events.router, prefix="/trigger-events", tags=["Trigger Events"])
app.include_router(demo.router, prefix="/demo", tags=["Demo"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
