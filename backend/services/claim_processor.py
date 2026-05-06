"""
Claim processor — the zero-touch heart of Rydex.
Called by trigger_monitor for each eligible worker when a trigger fires.
"""
import uuid
import logging
import random
from datetime import datetime

from db.models import (
    Worker, Policy, PolicyStatusEnum, TriggerEvent,
    Claim, ClaimStatusEnum, Payout, BaselineSnapshot
)
from services.as_engine import compute_as_score, ASInput
from services.baseline import get_current_baseline

logger = logging.getLogger("rydex.claim_processor")


def process_claim(worker: Worker, trigger_event: TriggerEvent, session) -> Claim | None:
    """
    Full zero-touch claim pipeline:
    1. Validate eligibility (active policy, shift active, cap not exhausted)
    2. Get current baseline
    3. Compute AS score
    4. Route: auto-approve / soft-hold / manual review
    5. Calculate payout (enforce coverage cap)
    6. Initiate UPI payout (Razorpay mock)
    7. Persist claim + payout records
    """
    started_at = datetime.utcnow()

    # Step 1: Get active policy, check cap
    policy = (
        session.query(Policy)
        .filter(
            Policy.worker_id == worker.id,
            Policy.status == PolicyStatusEnum.active,
        )
        .order_by(Policy.created_at.desc())
        .first()
    )
    if not policy:
        logger.info("No active policy for worker %s — skipping", worker.id)
        return None

    cap_remaining = policy.coverage_cap_rs - policy.amount_paid_rs
    if cap_remaining <= 0:
        logger.info("Worker %s has exhausted coverage cap — skipping", worker.id)
        return None

    # Check shift is currently active (bypass for demo triggers)
    if not _is_shift_active(worker, trigger_event):
        logger.info("Worker %s shift not active — skipping", worker.id)
        return None

    # Step 2: Baseline
    baseline = get_current_baseline(worker.id, session)
    if not baseline:
        logger.warning("No baseline for worker %s — skipping", worker.id)
        return None

    # Step 3: Compute AS score
    # In production: device_motion, network, and platform signals come from
    # the mobile SDK and platform API. For demo: simulate with realistic values.
    as_input = _build_as_input(worker, trigger_event, baseline, session)
    as_result = compute_as_score(as_input)

    logger.info(
        "AS score for worker %s: %.1f → %s",
        worker.id, as_result.as_score, as_result.decision
    )

    # Step 4: Route claim status
    status_map = {
        "auto_approved": ClaimStatusEnum.auto_approved,
        "soft_hold":     ClaimStatusEnum.soft_hold,
        "manual_review": ClaimStatusEnum.manual_review,
    }
    claim_status = status_map[as_result.decision]

    # Step 5: Payout calculation
    disrupted_hours = trigger_event.duration_minutes / 60
    raw_payout = baseline.hourly_baseline_rs * disrupted_hours * as_result.as_multiplier
    # Enforce coverage cap
    payout_amount = min(raw_payout, cap_remaining)
    payout_amount = round(payout_amount, 2)

    # Step 6: Persist claim
    claim = Claim(
        id=str(uuid.uuid4()),
        worker_id=worker.id,
        policy_id=policy.id,
        trigger_event_id=trigger_event.id,
        as_score=as_result.as_score,
        as_breakdown={
            "signal_scores": as_result.signal_scores,
            "iso_anomaly_flag": as_result.iso_anomaly_flag,
            "iso_score_raw": as_result.iso_score_raw,
            "explanation": as_result.explanation,
        },
        status=claim_status,
        disrupted_hours=round(disrupted_hours, 2),
        hourly_baseline_rs=baseline.hourly_baseline_rs,
        as_multiplier=as_result.as_multiplier,
        payout_amount_rs=payout_amount,
        cap_remaining_before=cap_remaining,
        notes=as_result.explanation,
    )
    session.add(claim)
    session.flush()

    # Update policy running total (only for approved/soft-hold)
    if claim_status in (ClaimStatusEnum.auto_approved, ClaimStatusEnum.soft_hold):
        policy.amount_paid_rs = round(policy.amount_paid_rs + payout_amount, 2)
        session.flush()

    # Step 7: Initiate payout (auto-approve only; soft-hold pending confirmation)
    if claim_status == ClaimStatusEnum.auto_approved:
        payout = _initiate_payout(claim, session, started_at)
        logger.info(
            "PAYOUT COMPLETE: Rs.%.2f → worker %s | latency %ds | ref %s",
            payout_amount, worker.id, payout.latency_seconds, payout.upi_ref
        )
    else:
        logger.info(
            "Claim %s in %s — payout pending review", claim.id, claim_status
        )

    return claim


def _initiate_payout(claim: Claim, session, started_at: datetime) -> Payout:
    """
    Mock Razorpay / UPI payout.
    In production: call Razorpay Payout API with fund account ID.
    Demo: simulate 15–45 second processing latency.
    """
    # Simulate realistic latency
    sim_latency = random.randint(15, 45)
    completed_at = datetime.utcnow()
    actual_latency = int((completed_at - started_at).total_seconds()) + sim_latency

    upi_ref = f"RYDEX{uuid.uuid4().hex[:10].upper()}"
    razorpay_id = f"pout_{uuid.uuid4().hex[:18]}"

    payout = Payout(
        id=str(uuid.uuid4()),
        claim_id=claim.id,
        amount_rs=claim.payout_amount_rs,
        upi_ref=upi_ref,
        razorpay_payout_id=razorpay_id,
        status="success",
        completed_at=completed_at,
        latency_seconds=actual_latency,
    )
    session.add(payout)
    session.flush()

    claim.resolved_at = completed_at
    return payout


def _is_shift_active(worker: Worker, trigger_event: TriggerEvent) -> bool:
    """Check if current UTC time (converted to IST) falls within the worker's shift."""
    if trigger_event.is_demo:
        return True  # always eligible during demo
    from datetime import timezone, timedelta
    ist_offset = timedelta(hours=5, minutes=30)
    now_ist = datetime.utcnow() + ist_offset
    current_mins = now_ist.hour * 60 + now_ist.minute

    sh, sm = map(int, worker.shift_start.split(":"))
    eh, em = map(int, worker.shift_end.split(":"))
    start_mins = sh * 60 + sm
    end_mins = eh * 60 + em

    if end_mins < start_mins:  # overnight shift
        return current_mins >= start_mins or current_mins <= end_mins
    return start_mins <= current_mins <= end_mins


def _build_as_input(
    worker: Worker,
    trigger_event: TriggerEvent,
    baseline: BaselineSnapshot,
    session,
) -> ASInput:
    """
    Build AS input signals.
    In production: pull from mobile SDK telemetry and platform API.
    For demo: generate realistic values based on trigger type and worker profile.
    """
    # Simulated realistic values for a genuine worker during a disruption
    # These would come from real device/platform data in production
    is_demo = trigger_event.is_demo
    raw = trigger_event.raw_api_data or {}

    # Fraud demo worker — returns signals that Isolation Forest will flag
    if worker.id == "worker-fraud-demo":
        return ASInput(
            device_motion_score=0.04,           # stationary device
            network_stability_score=0.09,       # VPN detected
            platform_activity_score=0.06,       # no dispatch activity
            environmental_correlation_score=0.38, # location mismatch
            behavioral_history_score=0.22,      # prior anomalies
            claim_to_trigger_delta_mins=0.4,    # filed impossibly fast
            earnings_delta_ratio=2.1,           # 210% above baseline
            claim_frequency_7d=7,               # 7 claims in 7 days
        )

    # All other workers — realistic signals for genuine disruption
    if is_demo:
        return ASInput(
            device_motion_score=round(random.uniform(0.72, 0.92), 3),
            network_stability_score=round(random.uniform(0.55, 0.78), 3),
            platform_activity_score=round(random.uniform(0.60, 0.85), 3),
            environmental_correlation_score=round(random.uniform(0.78, 0.95), 3),
            behavioral_history_score=round(random.uniform(0.80, 0.98), 3),
            claim_to_trigger_delta_mins=round(random.uniform(0.5, 3.0), 2),
            earnings_delta_ratio=round(random.uniform(-0.10, 0.20), 3),
            claim_frequency_7d=random.randint(0, 2),
        )

    # For live mode: base values on trigger type characteristics
    trigger_type = trigger_event.trigger_type.value
    base_motion = 0.70 if trigger_type == "heat" else 0.78
    return ASInput(
        device_motion_score=round(random.uniform(base_motion - 0.1, base_motion + 0.1), 3),
        network_stability_score=round(random.uniform(0.5, 0.8), 3),
        platform_activity_score=round(random.uniform(0.55, 0.82), 3),
        environmental_correlation_score=round(random.uniform(0.75, 0.95), 3),
        behavioral_history_score=round(random.uniform(0.75, 0.95), 3),
        claim_to_trigger_delta_mins=round(random.uniform(0.3, 5.0), 2),
        earnings_delta_ratio=round(random.uniform(-0.15, 0.20), 3),
        claim_frequency_7d=random.randint(0, 2),
    )
