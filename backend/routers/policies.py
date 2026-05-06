import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db.models import Policy, PolicyStatusEnum, Worker, Zone, BaselineSnapshot
from db.deps import get_db
from services.premium import compute_premium

router = APIRouter()


@router.get("/active")
def get_active_policy(worker_id: str, db: Session = Depends(get_db)):
    policy = (
        db.query(Policy)
        .filter(Policy.worker_id == worker_id, Policy.status == PolicyStatusEnum.active)
        .order_by(Policy.created_at.desc())
        .first()
    )
    if not policy:
        raise HTTPException(status_code=404, detail="No active policy")

    return {
        "id": policy.id,
        "tier": policy.tier.value,
        "weekly_premium_rs": policy.weekly_premium_rs,
        "coverage_cap_rs": policy.coverage_cap_rs,
        "amount_paid_rs": policy.amount_paid_rs,
        "cap_remaining_rs": policy.coverage_cap_rs - policy.amount_paid_rs,
        "risk_score": policy.risk_score,
        "zone_factor": policy.zone_factor,
        "seasonal_multiplier": policy.seasonal_multiplier,
        "week_start": policy.week_start.isoformat(),
        "week_end": policy.week_end.isoformat(),
        "status": policy.status.value,
    }


class PurchaseRequest(BaseModel):
    worker_id: str


@router.post("/purchase")
def purchase_policy(req: PurchaseRequest, db: Session = Depends(get_db)):
    existing = (
        db.query(Policy)
        .filter(Policy.worker_id == req.worker_id, Policy.status == PolicyStatusEnum.active)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="An active policy already exists for this week")

    worker = db.get(Worker, req.worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    zone = db.get(Zone, worker.zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    baseline = (
        db.query(BaselineSnapshot)
        .filter(BaselineSnapshot.worker_id == req.worker_id)
        .order_by(BaselineSnapshot.created_at.desc())
        .first()
    )
    if not baseline:
        raise HTTPException(
            status_code=400,
            detail="No baseline data available — complete at least one work week first",
        )

    premium_result = compute_premium(worker, zone, baseline)

    now = datetime.utcnow()
    week_start = (now - timedelta(days=now.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
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
    db.commit()
    db.refresh(policy)

    return {
        "id": policy.id,
        "tier": policy.tier.value,
        "weekly_premium_rs": policy.weekly_premium_rs,
        "coverage_cap_rs": policy.coverage_cap_rs,
        "amount_paid_rs": 0.0,
        "cap_remaining_rs": float(policy.coverage_cap_rs),
        "risk_score": policy.risk_score,
        "zone_factor": policy.zone_factor,
        "seasonal_multiplier": policy.seasonal_multiplier,
        "week_start": policy.week_start.isoformat(),
        "week_end": policy.week_end.isoformat(),
        "status": policy.status.value,
        "ai_insight": premium_result.get("ai_insight", ""),
    }
