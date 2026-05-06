from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.models import Policy, PolicyStatusEnum
from db.deps import get_db

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
