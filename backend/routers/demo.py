import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from config import get_settings
from services.trigger_monitor import fire_demo_trigger, fire_demo_fraud_case

logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()


class DemoTriggerRequest(BaseModel):
    zone_id: str = "zone-bandra"
    trigger_type: str = "rainfall"
    duration_minutes: int = 90


@router.post("/fire-trigger")
def fire_trigger(req: DemoTriggerRequest):
    logger.info(f"FIRE TRIGGER REQUEST: zone={req.zone_id}, type={req.trigger_type}")
    """
    Demo endpoint — manually fires a parametric trigger for a given zone.
    Used for the 2-minute demo video to simulate a live disruption event.
    """
    if not settings.demo_mode:
        raise HTTPException(status_code=403, detail="Demo mode is disabled")

    try:
        result = fire_demo_trigger(
            zone_id=req.zone_id,
            trigger_type=req.trigger_type,
            database_url=settings.database_url,
            duration_minutes=req.duration_minutes,
        )
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"Demo trigger error: {e}\n{tb}")
        raise HTTPException(status_code=500, detail=f"Trigger failed: {str(e)}")


@router.post("/fire-fraud-case")
def fire_fraud_case(req: DemoTriggerRequest):
    logger.info(f"FIRE FRAUD CASE REQUEST: zone={req.zone_id}")
    if not settings.demo_mode:
        raise HTTPException(status_code=403, detail="Demo mode is disabled")

    try:
        result = fire_demo_fraud_case(
            zone_id=req.zone_id,
            database_url=settings.database_url,
            duration_minutes=req.duration_minutes,
        )
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except Exception as e:
        logger.error(f"Demo fraud error: {e}")
        raise HTTPException(status_code=500, detail=f"Fraud trigger failed: {str(e)}")


@router.get("/scenario")
def get_demo_scenario():
    return {
        "title": "Rydex live demo — Salim, Bandra West, monsoon rainfall",
        "steps": [
            {"step": 1, "action": "Login as Salim", "endpoint": "POST /auth/token",
             "body": {"username": "9820001001", "password": "demo1234"}},
            {"step": 2, "action": "View active policy + premium breakdown",
             "endpoint": "GET /policies/active?worker_id=worker-salim"},
            {"step": 3, "action": "Fire rainfall trigger for Bandra",
             "endpoint": "POST /demo/fire-trigger",
             "body": {"zone_id": "zone-bandra", "trigger_type": "rainfall"}},
            {"step": 4, "action": "Watch claim auto-created",
             "endpoint": "GET /claims?worker_id=worker-salim"},
            {"step": 5, "action": "Confirm UPI payout",
             "endpoint": "GET /payouts?worker_id=worker-salim"},
        ],
        "demo_workers": [
            {"name": "Salim Khan",   "phone": "9820001001", "zone": "Bandra West",  "tier": "Shield Basic"},
            {"name": "Priya Sharma", "phone": "9820001002", "zone": "Andheri West", "tier": "Shield Storm"},
            {"name": "Arjun Nair",   "phone": "9820001003", "zone": "Powai",        "tier": "Shield Basic"},
        ],
    }


from fastapi import Depends
from sqlalchemy.orm import Session
from db.deps import get_db



@router.delete("/reset-demo-data")
def reset_demo_data(db: Session = Depends(get_db)):
    """
    Deletes ALL claims and payouts from the database.
    Resets policy amount_paid_rs to 0.
    Used to clean up after repeated demo button presses.
    """
    from db.models import Payout, Claim, Policy
    
    # Delete payouts first (foreign key dependency)
    db.query(Payout).delete(synchronize_session=False)
    
    # Delete all claims
    db.query(Claim).delete(synchronize_session=False)
    
    # Reset all policy running totals
    db.query(Policy).update({"amount_paid_rs": 0.0}, synchronize_session=False)
    
    db.commit()
    return {"status": "reset complete", "message": "All claims and payouts deleted. Policies reset."}
