from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from datetime import datetime, timedelta
import uuid

from db.models import Worker, Zone, Policy, PolicyStatusEnum, TierEnum
from db.deps import get_db
from services.baseline import compute_baseline
from services.premium import compute_premium

router = APIRouter()
pwd_ctx = CryptContext(schemes=["bcrypt", "sha256_crypt"], deprecated="auto")


class RegisterRequest(BaseModel):
    name: str
    phone: str
    password: str
    platform: str
    zone_id: str
    shift_start: str
    shift_end: str
    shift_type: str
    pin_code: str
    working_hours: int = 8
    avg_orders_per_day: int = 15
    upi_id: str = ""


class OTPVerifyRequest(BaseModel):
    phone: str
    otp: str


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(Worker).filter(Worker.phone == req.phone).first()
    if existing:
        raise HTTPException(status_code=409, detail="Phone already registered")

    zone = db.get(Zone, req.zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    worker = Worker(
        id=str(uuid.uuid4()),
        name=req.name,
        phone=req.phone,
        platform=req.platform,
        pin_code=req.pin_code,
        zone_id=req.zone_id,
        shift_start=req.shift_start,
        shift_end=req.shift_end,
        shift_type=req.shift_type,
        working_hours=req.working_hours,
        avg_orders_per_day=req.avg_orders_per_day,
        upi_id=req.upi_id,
        password_hash=pwd_ctx.hash(req.password),
    )
    db.add(worker)
    db.flush()

    baseline = compute_baseline(worker, db)
    premium_result = compute_premium(worker, zone, baseline)

    now = datetime.utcnow()
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=7) - timedelta(seconds=1)

    tier = premium_result["tier"]
    policy = Policy(
        id=str(uuid.uuid4()),
        worker_id=worker.id,
        baseline_snapshot_id=baseline.id,
        tier=tier,
        weekly_premium_rs=premium_result["weekly_premium_rs"],
        coverage_cap_rs=premium_result["coverage_cap_rs"],
        risk_score=premium_result["breakdown"]["risk_score"],
        zone_factor=zone.zone_factor,
        seasonal_multiplier=premium_result["breakdown"]["seasonal_multiplier"],
        status=PolicyStatusEnum.active,
        week_start=week_start,
        week_end=week_end,
        amount_paid_rs=0.0,
    )
    db.add(policy)
    db.flush()

    # Verify the policy was created correctly
    assert policy.status == PolicyStatusEnum.active
    assert policy.worker_id == worker.id

    db.commit()

    return {
        "worker_id": worker.id,
        "name": worker.name,
        "zone": zone.name,
        "baseline_hourly_rs": baseline.hourly_baseline_rs,
        "cold_start_tier": baseline.cold_start_tier,
        "policy": {
            "id": policy.id,
            "tier": str(tier.value),
            "weekly_premium_rs": policy.weekly_premium_rs,
            "coverage_cap_rs": policy.coverage_cap_rs,
            "status": "active",
            "week_start": week_start.isoformat(),
        },
        "premium_breakdown": premium_result["breakdown"],
        "ai_insight": premium_result["ai_insight"],
    }


@router.post("/verify-otp")
def verify_otp(req: OTPVerifyRequest):
    if req.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP")
    return {"verified": True}


@router.get("/zones")
def list_zones(db: Session = Depends(get_db)):
    zones = db.query(Zone).all()
    return [
        {
            "id": z.id,
            "name": z.name,
            "pin_code": z.pin_code,
            "zone_factor": z.zone_factor,
            "flood_risk_index": z.flood_risk_index,
        }
        for z in zones
    ]


@router.get("/debug/all-workers")
def debug_all_workers(db: Session = Depends(get_db)):
    workers = db.query(Worker).all()
    return [
        {
            "id": w.id,
            "name": w.name,
            "zone_id": w.zone_id,
            "zone_name": w.zone.name if w.zone else None,
            "policies": [
                {
                    "id": p.id,
                    "status": p.status,
                    "tier": p.tier,
                    "week_start": p.week_start.isoformat(),
                    "week_end": p.week_end.isoformat(),
                    "amount_paid_rs": p.amount_paid_rs,
                }
                for p in w.policies
            ]
        }
        for w in workers
    ]
