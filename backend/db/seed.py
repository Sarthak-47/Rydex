"""
Zone seed — runs automatically on startup to ensure zone config is present.
Workers are NOT seeded; they register through the normal onboarding flow.
Run manually: python -m db.seed
"""
from sqlalchemy.orm import Session
from db.models import Zone


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
    {
        "id": "zone-kurla",
        "name": "Kurla–Ghatkopar",
        "pin_code": "400070",
        "city": "Mumbai",
        "flood_risk_index": 0.61,
        "zone_factor": 1.18,
        "lat": 19.0726,
        "lng": 72.8791,
        "openweather_city_id": "1275339",
    },
]


def seed(session: Session):
    for z in ZONES:
        if not session.get(Zone, z["id"]):
            session.add(Zone(**z))
    session.commit()


if __name__ == "__main__":
    from config import get_settings
    from db.models import get_engine, get_session_factory, create_all_tables

    settings = get_settings()
    engine = get_engine(settings.database_url)
    create_all_tables(engine)
    SessionLocal = get_session_factory(engine)
    with SessionLocal() as session:
        seed(session)
    print("Zone seed complete.")
