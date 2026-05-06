from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import uuid
import logging

from db.models import Claim, Worker, Zone, ClaimStatusEnum
from db.deps import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("")
def list_claims(worker_id: str, db: Session = Depends(get_db)):
    claims = (
        db.query(Claim)
        .filter(Claim.worker_id == worker_id)
        .order_by(Claim.created_at.desc())
        .limit(50)
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


@router.get("/{claim_id}/transparency")
def claim_transparency(claim_id: str, db: Session = Depends(get_db)):
    """
    Returns the full AS score breakdown for a specific claim so the worker
    can see exactly why it was approved, soft-held, or flagged.
    """
    claim = db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    bd = claim.as_breakdown or {}
    signal_scores = bd.get("signal_scores", {})

    signal_labels = {
        "device_motion": "Device Motion",
        "network_conditions": "Network Conditions",
        "platform_activity": "Platform Activity",
        "environmental": "Environmental Match",
        "behavioral_history": "Behavioral History",
    }

    signal_weights = {
        "device_motion": 0.25,
        "network_conditions": 0.20,
        "platform_activity": 0.30,
        "environmental": 0.15,
        "behavioral_history": 0.10,
    }

    signals = []
    for key, label in signal_labels.items():
        raw = signal_scores.get(key, 0)
        score = round(raw * 100, 1)
        weight = signal_weights.get(key, 0)
        signals.append({
            "key": key,
            "label": label,
            "score": score,
            "weight_pct": round(weight * 100),
            "contribution": round(score * weight, 1),
            "status": "pass" if score >= 60 else "warn" if score >= 40 else "fail",
        })

    decision_reason = _build_decision_reason(claim, bd, signals)

    return {
        "claim_id": claim.id,
        "as_score": claim.as_score,
        "status": claim.status.value,
        "payout_amount_rs": claim.payout_amount_rs,
        "disrupted_hours": claim.disrupted_hours,
        "hourly_baseline_rs": claim.hourly_baseline_rs,
        "as_multiplier": claim.as_multiplier,
        "signals": signals,
        "iso_anomaly_flag": bd.get("iso_anomaly_flag", False),
        "iso_score_raw": bd.get("iso_score_raw", 0),
        "decision_reason": decision_reason,
        "appeal_eligible": claim.status == ClaimStatusEnum.manual_review,
        "created_at": claim.created_at.isoformat(),
        "resolved_at": claim.resolved_at.isoformat() if claim.resolved_at else None,
    }


def _build_decision_reason(claim, bd, signals) -> str:
    score = claim.as_score
    if claim.status == ClaimStatusEnum.auto_approved:
        passing = [s["label"] for s in signals if s["status"] == "pass"]
        return (
            f"Claim auto-approved with Authenticity Score {score}/100. "
            f"All signals passed: {', '.join(passing)}."
        )
    elif claim.status == ClaimStatusEnum.soft_hold:
        weak = [s["label"] for s in signals if s["status"] in ("warn", "fail")]
        return (
            f"Claim placed on Soft Hold (score {score}/100). "
            f"Signals needing verification: {', '.join(weak)}. "
            f"This resolves automatically within 2 hours."
        )
    elif claim.status == ClaimStatusEnum.manual_review:
        failing = [s["label"] for s in signals if s["status"] == "fail"]
        iso = " Anomalous activity pattern detected." if bd.get("iso_anomaly_flag") else ""
        return (
            f"Claim flagged for manual review (score {score}/100).{iso} "
            f"Failed signals: {', '.join(failing) if failing else 'Multiple signals below threshold'}. "
            f"A reviewer will contact you within 4 hours."
        )
    return f"Claim status: {claim.status.value}. Score: {score}/100."


class AppealRequest(BaseModel):
    explanation: str
    contact_phone: str = ""


@router.post("/{claim_id}/appeal")
def submit_appeal(claim_id: str, req: AppealRequest, db: Session = Depends(get_db)):
    """
    Worker submits an appeal for a flagged/rejected claim.
    Stores the appeal explanation against the claim for reviewer action.
    """
    claim = db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.status not in (ClaimStatusEnum.manual_review, ClaimStatusEnum.soft_hold):
        raise HTTPException(
            status_code=400,
            detail="Appeals can only be submitted for claims in manual review or soft hold.",
        )
    if not req.explanation or len(req.explanation.strip()) < 10:
        raise HTTPException(status_code=400, detail="Explanation must be at least 10 characters.")

    bd = claim.as_breakdown or {}
    bd["appeal"] = {
        "submitted_at": datetime.utcnow().isoformat(),
        "explanation": req.explanation.strip(),
        "contact_phone": req.contact_phone,
        "appeal_id": str(uuid.uuid4()),
    }
    claim.as_breakdown = bd
    db.commit()

    return {
        "status": "appeal_submitted",
        "claim_id": claim_id,
        "appeal_id": bd["appeal"]["appeal_id"],
        "message": "Your appeal has been submitted. A reviewer will respond within 4 hours.",
    }


@router.get("/admin/all")
def all_claims(db: Session = Depends(get_db)):
    claims = (
        db.query(Claim)
        .order_by(Claim.created_at.desc())
        .limit(100)
        .all()
    )
    result = []
    for c in claims:
        worker = db.get(Worker, c.worker_id)
        zone_name = "Unknown"
        if worker and worker.zone_id:
            zone = db.get(Zone, worker.zone_id)
            zone_name = zone.name if zone else worker.zone_id
        result.append({
            "id": c.id,
            "worker_id": c.worker_id,
            "worker_name": worker.name if worker else c.worker_id,
            "worker_platform": worker.platform if worker else "unknown",
            "worker_zone": zone_name,
            "status": c.status.value,
            "as_score": c.as_score,
            "payout_amount_rs": c.payout_amount_rs,
            "disrupted_hours": c.disrupted_hours,
            "as_breakdown": c.as_breakdown,
            "created_at": c.created_at.isoformat(),
            "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None,
        })
    return result
