from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.models import Claim, Worker, ClaimStatusEnum
from db.deps import get_db

router = APIRouter()


@router.get("")
def list_claims(worker_id: str, db: Session = Depends(get_db)):
    claims = (
        db.query(Claim)
        .filter(Claim.worker_id == worker_id)
        .order_by(Claim.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": c.id,
            "status": c.status.value,
            "as_score": c.as_score,
            "payout_amount_rs": c.payout_amount_rs,
            "disrupted_hours": c.disrupted_hours,
            "hourly_baseline_rs": c.hourly_baseline_rs,
            "as_multiplier": c.as_multiplier,
            "as_breakdown": {
                "signal_scores": (c.as_breakdown or {}).get("signal_scores", {}),
                "iso_anomaly_flag": (c.as_breakdown or {}).get("iso_anomaly_flag", False),
                "explanation": (c.as_breakdown or {}).get("explanation", ""),
            },
            "created_at": c.created_at.isoformat(),
            "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None,
        }
        for c in claims
    ]


@router.get("/admin/all")
def all_claims(db: Session = Depends(get_db)):
    from db.models import Worker, Zone
    
    claims = (
        db.query(Claim)
        .order_by(Claim.created_at.desc())
        .limit(100)
        .all()
    )
    
    result = []
    for c in claims:
        # Fetch worker separately to avoid join issues
        worker = db.get(Worker, c.worker_id)
        worker_name = worker.name if worker else c.worker_id
        worker_platform = worker.platform if worker else "unknown"
        
        zone_name = "Unknown"
        if worker and worker.zone_id:
            zone = db.get(Zone, worker.zone_id)
            zone_name = zone.name if zone else worker.zone_id
        
        result.append({
            "id": c.id,
            "worker_id": c.worker_id,
            "worker_name": worker_name,
            "worker_platform": worker_platform,
            "worker_zone": zone_name,
            "status": str(c.status.value) if hasattr(c.status, 'value') else str(c.status),
            "as_score": c.as_score,
            "payout_amount_rs": c.payout_amount_rs,
            "disrupted_hours": c.disrupted_hours,
            "as_breakdown": c.as_breakdown,
            "created_at": c.created_at.isoformat(),
            "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None,
        })
    
    return result

@router.get("/latest-legitimate")
def latest_legitimate(db: Session = Depends(get_db)):
    claim = (
        db.query(Claim)
        .filter(Claim.status == ClaimStatusEnum.auto_approved)
        .order_by(Claim.created_at.desc())
        .first()
    )
    if not claim:
        return None
    return {
        "worker_name": claim.worker.name,
        "as_score": claim.as_score,
        "payout_amount_rs": claim.payout_amount_rs,
        "status": claim.status,
        "signal_scores": claim.as_breakdown.get("signal_scores", {}),
        "iso_anomaly_flag": claim.as_breakdown.get("iso_anomaly_flag", False),
        "iso_score_raw": claim.as_breakdown.get("iso_score_raw", 0),
    }

@router.get("/latest-fraud")
def latest_fraud(db: Session = Depends(get_db)):
    claim = (
        db.query(Claim)
        .filter(Claim.status == ClaimStatusEnum.manual_review)
        .order_by(Claim.created_at.desc())
        .first()
    )
    if not claim:
        return None
    return {
        "worker_name": claim.worker.name,
        "as_score": claim.as_score,
        "payout_amount_rs": claim.payout_amount_rs,
        "status": claim.status,
        "signal_scores": claim.as_breakdown.get("signal_scores", {}),
        "iso_anomaly_flag": claim.as_breakdown.get("iso_anomaly_flag", False),
        "iso_score_raw": claim.as_breakdown.get("iso_score_raw", 0),
    }
