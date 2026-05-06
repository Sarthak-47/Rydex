from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Enum,
    ForeignKey, Text, JSON, create_engine
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.sql import func
from datetime import datetime
import enum
import os

Base = declarative_base()


class TierEnum(str, enum.Enum):
    basic = "basic"
    plus = "plus"
    storm = "storm"


class PolicyStatusEnum(str, enum.Enum):
    active = "active"
    expired = "expired"
    suspended = "suspended"


class ClaimStatusEnum(str, enum.Enum):
    auto_approved = "auto_approved"
    soft_hold = "soft_hold"
    manual_review = "manual_review"
    rejected = "rejected"


class TriggerTypeEnum(str, enum.Enum):
    rainfall = "rainfall"
    aqi = "aqi"
    heat = "heat"
    traffic = "traffic"
    flood = "flood"


class Worker(Base):
    __tablename__ = "workers"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(15), unique=True, nullable=False)
    platform = Column(String(20), nullable=False)  # swiggy / zomato / blinkit
    pin_code = Column(String(10), nullable=False)
    zone_id = Column(String(36), ForeignKey("zones.id"), nullable=False)
    shift_start = Column(String(5), nullable=False)   # "11:00"
    shift_end = Column(String(5), nullable=False)     # "22:00"
    shift_type = Column(String(20), nullable=False)   # day / night / mixed
    working_hours = Column(Integer, nullable=True, default=8)
    avg_orders_per_day = Column(Integer, nullable=True, default=15)
    upi_id = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    zone = relationship("Zone", back_populates="workers")
    policies = relationship("Policy", back_populates="worker")
    baseline_snapshots = relationship("BaselineSnapshot", back_populates="worker")
    claims = relationship("Claim", back_populates="worker")


class Zone(Base):
    __tablename__ = "zones"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    pin_code = Column(String(10), nullable=False)
    city = Column(String(50), nullable=False, default="Mumbai")
    flood_risk_index = Column(Float, nullable=False)   # 0.0 – 1.0
    zone_factor = Column(Float, nullable=False)         # 0.9 – 1.4
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    openweather_city_id = Column(String(20), nullable=True)

    workers = relationship("Worker", back_populates="zone")
    trigger_events = relationship("TriggerEvent", back_populates="zone")


class BaselineSnapshot(Base):
    __tablename__ = "baseline_snapshots"

    id = Column(String(36), primary_key=True)
    worker_id = Column(String(36), ForeignKey("workers.id"), nullable=False)
    computed_at = Column(DateTime, default=func.now())
    week_start = Column(DateTime, nullable=False)
    hourly_baseline_rs = Column(Float, nullable=False)
    daily_baseline_rs = Column(Float, nullable=False)
    tolerance_lower = Column(Float, nullable=False)
    tolerance_upper = Column(Float, nullable=False)
    data_weeks_available = Column(Integer, nullable=False)  # 0,1,2,3,4
    cold_start_tier = Column(String(20), nullable=True)     # worker/zone/city
    raw_earnings_json = Column(JSON, nullable=True)

    worker = relationship("Worker", back_populates="baseline_snapshots")


class Policy(Base):
    __tablename__ = "policies"

    id = Column(String(36), primary_key=True)
    worker_id = Column(String(36), ForeignKey("workers.id"), nullable=False)
    baseline_snapshot_id = Column(String(36), ForeignKey("baseline_snapshots.id"), nullable=True)
    tier = Column(Enum(TierEnum), nullable=False)
    weekly_premium_rs = Column(Float, nullable=False)
    coverage_cap_rs = Column(Integer, nullable=False)
    risk_score = Column(Float, nullable=False)
    zone_factor = Column(Float, nullable=False)
    seasonal_multiplier = Column(Float, nullable=False)
    status = Column(Enum(PolicyStatusEnum), default=PolicyStatusEnum.active)
    week_start = Column(DateTime, nullable=False)
    week_end = Column(DateTime, nullable=False)
    amount_paid_rs = Column(Float, default=0.0)   # running total this week
    created_at = Column(DateTime, default=func.now())

    worker = relationship("Worker", back_populates="policies")
    claims = relationship("Claim", back_populates="policy")


class TriggerEvent(Base):
    __tablename__ = "trigger_events"

    id = Column(String(36), primary_key=True)
    zone_id = Column(String(36), ForeignKey("zones.id"), nullable=False)
    trigger_type = Column(Enum(TriggerTypeEnum), nullable=False)
    triggered_at = Column(DateTime, default=func.now())
    resolved_at = Column(DateTime, nullable=True)
    threshold_value = Column(Float, nullable=False)   # actual reading
    threshold_limit = Column(Float, nullable=False)   # configured threshold
    duration_minutes = Column(Integer, default=0)
    raw_api_data = Column(JSON, nullable=True)
    is_demo = Column(Boolean, default=False)

    zone = relationship("Zone", back_populates="trigger_events")
    claims = relationship("Claim", back_populates="trigger_event")


class Claim(Base):
    __tablename__ = "claims"

    id = Column(String(36), primary_key=True)
    worker_id = Column(String(36), ForeignKey("workers.id"), nullable=False)
    policy_id = Column(String(36), ForeignKey("policies.id"), nullable=False)
    trigger_event_id = Column(String(36), ForeignKey("trigger_events.id"), nullable=False)
    as_score = Column(Float, nullable=False)
    as_breakdown = Column(JSON, nullable=True)        # per-signal scores
    status = Column(Enum(ClaimStatusEnum), nullable=False)
    disrupted_hours = Column(Float, nullable=False)
    hourly_baseline_rs = Column(Float, nullable=False)
    as_multiplier = Column(Float, nullable=False)
    payout_amount_rs = Column(Float, nullable=False)
    cap_remaining_before = Column(Float, nullable=False)
    created_at = Column(DateTime, default=func.now())
    resolved_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    worker = relationship("Worker", back_populates="claims")
    policy = relationship("Policy", back_populates="claims")
    trigger_event = relationship("TriggerEvent", back_populates="claims")
    payout = relationship("Payout", back_populates="claim", uselist=False)


class Payout(Base):
    __tablename__ = "payouts"

    id = Column(String(36), primary_key=True)
    claim_id = Column(String(36), ForeignKey("claims.id"), unique=True, nullable=False)
    amount_rs = Column(Float, nullable=False)
    upi_ref = Column(String(100), nullable=True)
    razorpay_payout_id = Column(String(100), nullable=True)
    status = Column(String(20), default="pending")   # pending/success/failed
    initiated_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)
    latency_seconds = Column(Integer, nullable=True)

    claim = relationship("Claim", back_populates="payout")


def get_engine(database_url: str):
    return create_engine(database_url, echo=False)


def get_session_factory(engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_all_tables(engine):
    Base.metadata.create_all(bind=engine)
