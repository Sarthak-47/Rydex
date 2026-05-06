"""
Trigger monitor — dedicated daemon thread, separate from FastAPI's request loop.
Polls external APIs every 60 seconds. On threshold breach, writes TriggerEvent
and initiates the claim pipeline for all eligible workers in the affected zone.
"""
import threading
import time
import uuid
import logging
import httpx
from datetime import datetime, timedelta

from config import get_settings
from db.models import (
    get_engine, get_session_factory,
    TriggerEvent, TriggerTypeEnum, Worker, Policy, PolicyStatusEnum, Zone,
)

logger = logging.getLogger("rydex.trigger_monitor")
settings = get_settings()

_active_triggers: dict = {}
_lock = threading.Lock()


class TriggerMonitor(threading.Thread):
    def __init__(self, database_url: str, poll_interval: int = 60):
        super().__init__(daemon=True, name="TriggerMonitor")
        self.poll_interval = poll_interval
        self._database_url = database_url
        engine = get_engine(database_url)
        self.SessionLocal = get_session_factory(engine)
        self._stop_event = threading.Event()

    def stop(self):
        self._stop_event.set()

    def run(self):
        logger.info("Trigger monitor started (interval=%ds)", self.poll_interval)
        while not self._stop_event.is_set():
            try:
                self._poll_cycle()
            except Exception as exc:
                logger.error("Poll cycle error: %s", exc, exc_info=True)
            self._stop_event.wait(self.poll_interval)

    def _poll_cycle(self):
        with self.SessionLocal() as session:
            zones = session.query(Zone).all()
            for zone in zones:
                self._check_weather(zone, session)
                self._check_aqi(zone, session)
            session.commit()

    def _check_weather(self, zone: Zone, session):
        if not settings.has_weather_api():
            return
        try:
            url = (
                f"https://api.openweathermap.org/data/2.5/weather"
                f"?lat={zone.lat}&lon={zone.lng}"
                f"&appid={settings.openweather_api_key}&units=metric"
            )
            r = httpx.get(url, timeout=10)
            r.raise_for_status()
            data = r.json()

            dt = data.get("dt", 0)
            if datetime.utcfromtimestamp(dt) < datetime.utcnow() - timedelta(minutes=90):
                logger.warning("Stale weather data for zone %s, skipping", zone.name)
                return

            rain_1h = data.get("rain", {}).get("1h", 0.0)
            rain_daily = rain_1h * 24
            temp = data.get("main", {}).get("temp", 0.0)

            if rain_daily >= settings.rainfall_threshold_mm:
                self._fire_trigger(
                    zone, TriggerTypeEnum.rainfall,
                    threshold_value=rain_daily,
                    threshold_limit=settings.rainfall_threshold_mm,
                    raw_api_data=data, session=session,
                )
            if temp >= settings.heat_threshold_celsius:
                self._fire_trigger(
                    zone, TriggerTypeEnum.heat,
                    threshold_value=temp,
                    threshold_limit=settings.heat_threshold_celsius,
                    raw_api_data=data, session=session,
                )
        except httpx.HTTPError as e:
            logger.warning("Weather API error for zone %s: %s", zone.name, e)

    def _check_aqi(self, zone: Zone, session):
        if not settings.has_weather_api():
            return
        try:
            url = (
                f"https://api.openweathermap.org/data/2.5/air_pollution"
                f"?lat={zone.lat}&lon={zone.lng}"
                f"&appid={settings.openweather_api_key}"
            )
            r = httpx.get(url, timeout=10)
            r.raise_for_status()
            data = r.json()
            aqi_owm = data["list"][0]["main"]["aqi"]
            aqi_cpcb = {1: 30, 2: 75, 3: 150, 4: 280, 5: 380}.get(aqi_owm, 0)
            if aqi_cpcb >= settings.aqi_threshold:
                self._fire_trigger(
                    zone, TriggerTypeEnum.aqi,
                    threshold_value=aqi_cpcb,
                    threshold_limit=settings.aqi_threshold,
                    raw_api_data=data, session=session,
                )
        except httpx.HTTPError as e:
            logger.warning("AQI API error for zone %s: %s", zone.name, e)

    def _fire_trigger(
        self, zone, trigger_type, threshold_value,
        threshold_limit, raw_api_data, session,
        duration_minutes=90,
    ):
        key = f"{zone.id}:{trigger_type}"
        with _lock:
            if key in _active_triggers:
                return
            _active_triggers[key] = datetime.utcnow()

        logger.info("TRIGGER FIRED: %s in %s (value=%.1f)", trigger_type, zone.name, threshold_value)

        event = TriggerEvent(
            id=str(uuid.uuid4()),
            zone_id=zone.id,
            trigger_type=trigger_type,
            threshold_value=threshold_value,
            threshold_limit=threshold_limit,
            duration_minutes=duration_minutes,
            raw_api_data=raw_api_data,
        )
        session.add(event)
        session.flush()

        eligible_workers = (
            session.query(Worker)
            .join(Policy, Policy.worker_id == Worker.id)
            .filter(
                Worker.zone_id == zone.id,
                Worker.is_active == True,
                Policy.status == PolicyStatusEnum.active,
            )
            .all()
        )

        logger.info("%d eligible workers for trigger %s", len(eligible_workers), event.id)

        from services.claim_processor import process_claim
        for worker in eligible_workers:
            try:
                nested = session.begin_nested()
                process_claim(worker=worker, trigger_event=event, session=session)
                nested.commit()
            except Exception as e:
                logger.error("Claim processing failed for worker %s: %s", worker.id, e, exc_info=True)
                try:
                    nested.rollback()
                except Exception:
                    pass

        def _expire():
            time.sleep(duration_minutes * 60)
            with _lock:
                _active_triggers.pop(key, None)

        threading.Thread(target=_expire, daemon=True).start()
