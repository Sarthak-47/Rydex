from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.models import Payout, Claim
from db.deps import get_db

router = APIRouter()


@router.get("")
def list_payouts(worker_id: str, db: Session = Depends(get_db)):
    payouts = (
        db.query(Payout)
        .join(Claim, Claim.id == Payout.claim_id)
        .filter(Claim.worker_id == worker_id)
        .order_by(Payout.initiated_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": p.id,
            "amount_rs": p.amount_rs,
            "upi_ref": p.upi_ref,
            "status": p.status,
            "latency_seconds": p.latency_seconds,
            "initiated_at": p.initiated_at.isoformat(),
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
        }
        for p in payouts
    ]


@router.get("/admin/all")
def all_payouts(db: Session = Depends(get_db)):
    payouts = db.query(Payout).order_by(Payout.initiated_at.desc()).limit(100).all()
    return [
        {
            "id": p.id,
            "claim_id": p.claim_id,
            "worker_id": p.claim.worker_id,
            "worker_name": p.claim.worker.name,
            "amount_rs": p.amount_rs,
            "upi_ref": p.upi_ref,
            "status": p.status,
            "latency_seconds": p.latency_seconds,
            "initiated_at": p.initiated_at.isoformat(),
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
        }
        for p in payouts
    ]
