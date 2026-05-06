from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.deps import get_db
from db.models import TriggerEvent, Zone

router = APIRouter()


@router.get("")
def list_trigger_events(zone_id: str, db: Session = Depends(get_db)):
    zone = db.get(Zone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    events = (
        db.query(TriggerEvent)
        .filter(TriggerEvent.zone_id == zone_id)
        .order_by(TriggerEvent.triggered_at.desc())
        .limit(30)
        .all()
    )

    return [
        {
            "id": e.id,
            "zone_id": e.zone_id,
            "zone_name": zone.name,
            "trigger_type": e.trigger_type.value,
            "triggered_at": e.triggered_at.isoformat(),
            "threshold_value": e.threshold_value,
            "threshold_limit": e.threshold_limit,
            "duration_minutes": e.duration_minutes,
            "is_demo": bool(e.is_demo),
        }
        for e in events
    ]

