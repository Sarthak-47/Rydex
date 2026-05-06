"""
Baseline engine — computes a worker's hourly income baseline from platform activity history.
Implements 3-tier cold-start fallback as per architecture notes.
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from db.models import Worker, BaselineSnapshot, Zone

# City-wide median hourly rate (Rs.) — used as tier-3 cold start
CITY_MEDIAN_HOURLY = 118.0
CITY_MEDIAN_BY_PLATFORM = {
    "swiggy": 122.0,
    "zomato": 115.0,
    "blinkit": 128.0,
}

# Zone medians (Rs./hr) — used as tier-2 cold start
ZONE_MEDIAN_HOURLY = {
    "zone-bandra":  125.0,
    "zone-dharavi": 112.0,
    "zone-powai":   132.0,
    "zone-andheri": 118.0,
    "zone-dadar":   116.0,
}


def compute_baseline(
    worker: Worker,
    session: Session,
    reference_date: Optional[datetime] = None,
) -> BaselineSnapshot:
    """
    Compute and persist a new baseline snapshot for the given worker.

    Tier selection:
      Tier 1 (best):   Worker has ≥4 weeks of data    → use own rolling average
      Tier 2:          Worker has 1–3 weeks of data   → blend own data with zone median
      Tier 3 (cold):   Worker has 0 weeks of data     → use zone median (or city if zone unavailable)
    """
    if reference_date is None:
        reference_date = datetime.utcnow()

    week_start = _get_week_start(reference_date)
    four_weeks_ago = week_start - timedelta(weeks=4)

    # Pull previous snapshots ordered by recency
    previous = (
        session.query(BaselineSnapshot)
        .filter(
            BaselineSnapshot.worker_id == worker.id,
            BaselineSnapshot.week_start >= four_weeks_ago,
        )
        .order_by(BaselineSnapshot.week_start.desc())
        .all()
    )

    weeks_available = len(previous)

    if weeks_available >= 4:
        # Tier 1 — full 4-week rolling average
        hourly = _weighted_mean([s.hourly_baseline_rs for s in previous])
        cold_start_tier = None

    elif weeks_available >= 1:
        # Tier 2 — blend worker data with zone median
        worker_hourly = _weighted_mean([s.hourly_baseline_rs for s in previous])
        zone_median = ZONE_MEDIAN_HOURLY.get(worker.zone_id, CITY_MEDIAN_HOURLY)
        # Weight worker data proportionally: 1 week = 25%, 2 = 50%, 3 = 75%
        worker_weight = weeks_available / 4
        hourly = worker_hourly * worker_weight + zone_median * (1 - worker_weight)
        cold_start_tier = f"zone_blend_{weeks_available}w"

    else:
        # Tier 3 — zone or city median only
        hourly = ZONE_MEDIAN_HOURLY.get(
            worker.zone_id,
            CITY_MEDIAN_BY_PLATFORM.get(worker.platform, CITY_MEDIAN_HOURLY)
        )
        cold_start_tier = "zone_median" if worker.zone_id in ZONE_MEDIAN_HOURLY else "city_median"

    hourly = round(hourly, 2)
    shift_hours = _shift_duration_hours(worker.shift_start, worker.shift_end)
    daily = round(hourly * shift_hours, 2)
    tolerance = 0.25

    snapshot = BaselineSnapshot(
        id=str(uuid.uuid4()),
        worker_id=worker.id,
        week_start=week_start,
        hourly_baseline_rs=hourly,
        daily_baseline_rs=daily,
        tolerance_lower=round(hourly * (1 - tolerance), 2),
        tolerance_upper=round(hourly * (1 + tolerance), 2),
        data_weeks_available=weeks_available,
        cold_start_tier=cold_start_tier,
        raw_earnings_json=_summarise_previous(previous),
    )
    session.add(snapshot)
    session.flush()
    return snapshot


def get_current_baseline(worker_id: str, session: Session) -> Optional[BaselineSnapshot]:
    """Return the most recent baseline snapshot for a worker."""
    week_start = _get_week_start(datetime.utcnow())
    snap = (
        session.query(BaselineSnapshot)
        .filter(
            BaselineSnapshot.worker_id == worker_id,
            BaselineSnapshot.week_start == week_start,
        )
        .order_by(BaselineSnapshot.computed_at.desc())
        .first()
    )
    if snap:
        return snap
    # Demo robustness: if a prior seed used local time and week_start differs,
    # fall back to the latest snapshot rather than skipping claim processing.
    return (
        session.query(BaselineSnapshot)
        .filter(BaselineSnapshot.worker_id == worker_id)
        .order_by(BaselineSnapshot.week_start.desc(), BaselineSnapshot.computed_at.desc())
        .first()
    )


def clamp_to_baseline(claimed_hourly: float, snapshot: BaselineSnapshot) -> float:
    """Clamp a payout hourly rate to within the ±25% tolerance band."""
    return max(snapshot.tolerance_lower, min(snapshot.tolerance_upper, claimed_hourly))


# ── helpers ──────────────────────────────────────────────────────────────────

def _get_week_start(dt: datetime) -> datetime:
    """Return Monday 00:00:00 of the week containing dt."""
    return (dt - timedelta(days=dt.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )


def _weighted_mean(values: list[float]) -> float:
    """Simple equal-weight mean — recency weighting can be added later."""
    return sum(values) / len(values) if values else CITY_MEDIAN_HOURLY


def _shift_duration_hours(start: str, end: str) -> float:
    """Parse 'HH:MM' strings and return duration in hours, handling overnight shifts."""
    sh, sm = map(int, start.split(":"))
    eh, em = map(int, end.split(":"))
    start_mins = sh * 60 + sm
    end_mins = eh * 60 + em
    if end_mins <= start_mins:  # overnight
        end_mins += 24 * 60
    return round((end_mins - start_mins) / 60, 2)


def _summarise_previous(snapshots: list[BaselineSnapshot]) -> dict:
    return {
        "weeks": [
            {
                "week_start": s.week_start.isoformat(),
                "hourly_baseline_rs": s.hourly_baseline_rs,
                "data_weeks_available": s.data_weeks_available,
            }
            for s in snapshots
        ]
    }
