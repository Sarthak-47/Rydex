"""
Seed script — run once after DB creation.
Populates: 5 Mumbai zones, 3 demo workers (Salim, Priya, Arjun), baselines, one active policy.
Usage: python -m db.seed
"""
import uuid
import json
from datetime import datetime, timedelta
from passlib.context import CryptContext
from passlib.exc import UnknownHashError
from sqlalchemy.orm import Session

from db.models import Worker, Zone, BaselineSnapshot, Policy, TierEnum, PolicyStatusEnum
from services.premium import compute_premium
from services.baseline import compute_baseline

pwd_ctx = CryptContext(schemes=["bcrypt", "sha256_crypt"], deprecated="auto")

ZONES = [
    {
        "id": "zone-bandra",
        "name": "Bandra West",
        "pin_code": "400051",
        "city": "Mumbai",
        "flood_risk_index": 0.82,
        "zone_factor": 1.35,
        "lat": 19.0596,
        "lng": 72.8295,
        "openweather_city_id": "1275339",
    },
    {
        "id": "zone-dharavi",
        "name": "Dharavi–Sion",
        "pin_code": "400017",
        "city": "Mumbai",
        "flood_risk_index": 0.74,
        "zone_factor": 1.25,
        "lat": 19.0437,
        "lng": 72.8554,
        "openweather_city_id": "1275339",
    },
    {
        "id": "zone-powai",
        "name": "Powai",
        "pin_code": "400092",
        "city": "Mumbai",
        "flood_risk_index": 0.28,
        "zone_factor": 0.92,
        "lat": 19.1197,
        "lng": 72.9051,
        "openweather_city_id": "1275339",
    },
    {
        "id": "zone-andheri",
        "name": "Andheri West",
        "pin_code": "400058",
        "city": "Mumbai",
        "flood_risk_index": 0.55,
        "zone_factor": 1.10,
        "lat": 19.1197,
        "lng": 72.8466,
        "openweather_city_id": "1275339",
    },
    {
        "id": "zone-dadar",
        "name": "Dadar",
        "pin_code": "400016",
        "city": "Mumbai",
        "flood_risk_index": 0.48,
        "zone_factor": 1.08,
        "lat": 19.0176,
        "lng": 72.8426,
        "openweather_city_id": "1275339",
    },
]

WORKERS = [
    {
        "id": "worker-salim",
        "name": "Salim Khan",
        "phone": "9820001001",
        "platform": "swiggy",
        "pin_code": "400051",
        "zone_id": "zone-bandra",
        "shift_start": "11:00",
        "shift_end": "22:00",
        "shift_type": "day",
        "password": "demo1234",
        "working_hours": 9,
        "avg_orders_per_day": 18,
        "upi_id": "salim@okaxis",
        # 4 weeks earnings (Rs.) — realistic Swiggy rider
        "weekly_earnings": [4800, 5100, 4650, 5200],
        "weekly_hours": [42, 44, 40, 45],
    },
    {
        "id": "worker-priya",
        "name": "Priya Sharma",
        "phone": "9820001002",
        "platform": "zomato",
        "pin_code": "400058",
        "zone_id": "zone-andheri",
        "shift_start": "18:00",
        "shift_end": "02:00",
        "shift_type": "night",
        "password": "demo1234",
        "working_hours": 8,
        "avg_orders_per_day": 12,
        "upi_id": "priya@okicici",
        "weekly_earnings": [3900, 4100, 3750, 4200],
        "weekly_hours": [35, 37, 34, 38],
    },
    {
        "id": "worker-arjun",
        "name": "Arjun Nair",
        "phone": "9820001003",
        "platform": "blinkit",
        "pin_code": "400092",
        "zone_id": "zone-powai",
        "shift_start": "09:00",
        "shift_end": "21:00",
        "shift_type": "day",
        "password": "demo1234",
        "working_hours": 10,
        "avg_orders_per_day": 25,
        "upi_id": "arjun@okpaytm",
        "weekly_earnings": [5500, 5800, 5200, 6100],
        "weekly_hours": [48, 50, 46, 52],
    },
    {
        "id": "worker-fraud-demo",
        "name": "Demo Fraud Profile",
        "phone": "9820009999",
        "platform": "swiggy",
        "pin_code": "400051",
        "zone_id": "zone-bandra",
        "shift_start": "00:00",
        "shift_end": "23:59",
        "shift_type": "mixed",
        "password": "demo1234",
        "working_hours": 4,
        "avg_orders_per_day": 5,
        "upi_id": "fraud@okaxis",
        "weekly_earnings": [800, 12000, 200, 9500],
        "weekly_hours": [8, 45, 3, 42],
    },
]


def _compute_baseline(weekly_earnings, weekly_hours, zone_id, city_hourly=118.0):
    total_earnings = sum(weekly_earnings)
    total_hours = sum(weekly_hours)
    hourly = total_earnings / total_hours
    daily = hourly * 9  # average 9hr shift

    weeks = len(weekly_earnings)
    if weeks >= 4:
        cold_start_tier = None
    elif weeks >= 2:
        cold_start_tier = "worker_partial"
    elif weeks >= 1:
        cold_start_tier = "zone_median"
    else:
        cold_start_tier = "city_median"
        hourly = city_hourly

    return {
        "hourly_baseline_rs": round(hourly, 2),
        "daily_baseline_rs": round(daily, 2),
        "tolerance_lower": round(hourly * 0.75, 2),
        "tolerance_upper": round(hourly * 1.25, 2),
        "data_weeks_available": weeks,
        "cold_start_tier": cold_start_tier,
        "raw_earnings_json": {
            "weekly_earnings": weekly_earnings,
            "weekly_hours": weekly_hours,
        },
    }


def _upsert_demo_policy(session: Session, worker: Worker, zone: Zone, baseline: BaselineSnapshot, week_start, week_end):
    """
    Ensure demo workers always have a policy whose fields match the premium engine's formula.
    This keeps the judge-facing premium line consistent across reruns.
    """
    prem = compute_premium(worker, zone, baseline)
    tier: TierEnum = prem["tier"]

    policy = (
        session.query(Policy)
        .filter(Policy.worker_id == worker.id, Policy.status == PolicyStatusEnum.active)
        .order_by(Policy.created_at.desc())
        .first()
    )
    if not policy:
        policy = Policy(
            id=str(uuid.uuid4()),
            worker_id=worker.id,
            baseline_snapshot_id=baseline.id,
            status=PolicyStatusEnum.active,
            week_start=week_start,
            week_end=week_end,
            amount_paid_rs=0.0,
        )
        session.add(policy)

    policy.baseline_snapshot_id = baseline.id
    policy.tier = tier
    policy.weekly_premium_rs = prem["weekly_premium_rs"]
    policy.coverage_cap_rs = prem["coverage_cap_rs"]
    policy.risk_score = prem["breakdown"]["risk_score"]
    policy.zone_factor = zone.zone_factor
    policy.seasonal_multiplier = prem["breakdown"]["seasonal_multiplier"]
    policy.week_start = week_start
    policy.week_end = week_end
    session.add(policy)


def seed(session: Session):
    # Zones
    for z in ZONES:
        if not session.get(Zone, z["id"]):
            session.add(Zone(**z))
    session.flush()

    week_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    # rewind to last Monday
    week_start -= timedelta(days=week_start.weekday())
    week_end = week_start + timedelta(days=7) - timedelta(seconds=1)

    for w in WORKERS:
        existing = session.get(Worker, w["id"])
        if existing:
            # If the demo DB volume already contains these workers (e.g. from an older seed),
            # ensure their password hashes are in a supported format so login doesn't 500.
            needs_rehash = False
            try:
                needs_rehash = not pwd_ctx.identify(existing.password_hash)
            except (UnknownHashError, TypeError):
                needs_rehash = True

            if needs_rehash:
                existing.password_hash = pwd_ctx.hash(w["password"])
                session.add(existing)
            # Ensure baseline/policy exist and are aligned with premium engine
            zone = session.get(Zone, w["zone_id"])
            latest_baseline = (
                session.query(BaselineSnapshot)
                .filter(BaselineSnapshot.worker_id == w["id"])
                .order_by(BaselineSnapshot.week_start.desc(), BaselineSnapshot.computed_at.desc())
                .first()
            )
            if zone and not latest_baseline:
                latest_baseline = compute_baseline(existing, session)
            if zone and latest_baseline:
                _upsert_demo_policy(session, existing, zone, latest_baseline, week_start, week_end)
            continue

        if not existing:
            worker = Worker(
                id=w["id"],
                name=w["name"],
                phone=w["phone"],
                platform=w["platform"],
                pin_code=w["pin_code"],
                zone_id=w["zone_id"],
                shift_start=w["shift_start"],
                shift_end=w["shift_end"],
                shift_type=w["shift_type"],
                working_hours=w.get("working_hours", 8),
                avg_orders_per_day=w.get("avg_orders_per_day", 15),
                upi_id=w.get("upi_id", ""),
                password_hash=pwd_ctx.hash(w["password"]),
            )
            session.add(worker)
            session.flush()

            bl_data = _compute_baseline(w["weekly_earnings"], w["weekly_hours"], w["zone_id"])
            bl_id = str(uuid.uuid4())
            baseline = BaselineSnapshot(
                id=bl_id,
                worker_id=w["id"],
                week_start=week_start,
                **bl_data,
            )
            session.add(baseline)
            session.flush()

            zone = session.get(Zone, w["zone_id"])
            if zone:
                _upsert_demo_policy(session, worker, zone, baseline, week_start, week_end)

    session.commit()
    print("Seed complete. Workers: Salim (swiggy/bandra), Priya (zomato/andheri), Arjun (blinkit/powai)")
    print("Login: phone=9820001001, password=demo1234")


if __name__ == "__main__":
    from config import get_settings
    from db.models import get_engine, get_session_factory, create_all_tables

    settings = get_settings()
    engine = get_engine(settings.database_url)
    create_all_tables(engine)
    SessionLocal = get_session_factory(engine)
    with SessionLocal() as session:
        seed(session)
