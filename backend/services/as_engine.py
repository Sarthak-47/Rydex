"""
Authenticity Score (AS) engine.
Computes a 0–100 composite score from 5 signal classes.
Uses Isolation Forest for anomaly detection.
"""
import os
import joblib
import numpy as np
from dataclasses import dataclass
from typing import Optional

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "ml", "models")

_iso_model = None


def _load_iso():
    global _iso_model
    if _iso_model is None:
        path = os.path.join(MODELS_DIR, "fraud_iso.pkl")
        if not os.path.exists(path):
            # Fallback for demo robustness (e.g. missing volumes / first run outside Docker)
            from ml.train_models import train_all_models
            os.makedirs(MODELS_DIR, exist_ok=True)
            train_all_models(models_dir=MODELS_DIR)
        _iso_model = joblib.load(path)
    return _iso_model


SIGNAL_WEIGHTS = {
    "device_motion":       0.25,
    "network_conditions":  0.20,
    "platform_activity":   0.30,
    "environmental":       0.15,
    "behavioral_history":  0.10,
}


@dataclass
class ASInput:
    # Device motion (0–1): 1 = strong riding signature
    device_motion_score: float

    # Network (0–1): 1 = outdoor, stable, no VPN
    network_stability_score: float

    # Platform (0–1): 1 = active dispatch attempts in trigger window
    platform_activity_score: float

    # Environmental (0–1): 1 = microclimate matches trigger conditions
    environmental_correlation_score: float

    # Behavioral history (0–1): 1 = clean history, no prior anomalies
    behavioral_history_score: float

    # Additional context for Isolation Forest features
    claim_to_trigger_delta_mins: float    # how soon after trigger was claim auto-created
    earnings_delta_ratio: float            # (current - baseline) / baseline
    claim_frequency_7d: int               # claims in last 7 days


@dataclass
class ASResult:
    as_score: float                   # 0–100
    decision: str                     # auto_approved / soft_hold / manual_review
    as_multiplier: float              # 1.00 / 0.90 / 0.75
    signal_scores: dict
    iso_anomaly_flag: bool
    iso_score_raw: float
    explanation: str


def compute_as_score(inp: ASInput) -> ASResult:
    iso = _load_iso()

    # Weighted composite (0–100 scale)
    raw_score = (
        inp.device_motion_score       * SIGNAL_WEIGHTS["device_motion"]
        + inp.network_stability_score * SIGNAL_WEIGHTS["network_conditions"]
        + inp.platform_activity_score * SIGNAL_WEIGHTS["platform_activity"]
        + inp.environmental_correlation_score * SIGNAL_WEIGHTS["environmental"]
        + inp.behavioral_history_score * SIGNAL_WEIGHTS["behavioral_history"]
    )
    weighted_score = round(raw_score * 100, 1)

    # Isolation Forest anomaly detection
    features = np.array([[
        inp.claim_to_trigger_delta_mins,
        1.0 - inp.device_motion_score,          # rephrased as location_consistency proxy
        inp.device_motion_score,
        inp.platform_activity_score,
        inp.earnings_delta_ratio,
        float(inp.claim_frequency_7d),
        inp.network_stability_score,
    ]])

    iso_pred = int(iso.predict(features)[0])          # 1=normal, -1=anomaly
    iso_score_raw = float(iso.decision_function(features)[0])
    iso_anomaly = bool(iso_pred == -1)

    import logging
    logger = logging.getLogger("rydex.as_engine")
    logger.info(
        "AS Engine: weighted=%.1f, iso_pred=%d, iso_score=%.4f, anomaly=%s",
        weighted_score, iso_pred, iso_score_raw, iso_anomaly
    )

    # If Isolation Forest flags anomaly, apply a penalty
    if iso_anomaly:
        penalty = min(25, abs(iso_score_raw) * 30)
        final_score = max(0, weighted_score - penalty)
    else:
        final_score = weighted_score

    final_score = round(final_score, 1)

    # Decision routing
    if final_score >= 75:
        decision = "auto_approved"
        multiplier = 1.00
    elif final_score >= 45:
        decision = "soft_hold"
        multiplier = 0.90 if final_score >= 60 else 0.75
    else:
        decision = "manual_review"
        multiplier = 0.75

    signal_scores = {
        "device_motion":      round(inp.device_motion_score * 100, 1),
        "network_conditions": round(inp.network_stability_score * 100, 1),
        "platform_activity":  round(inp.platform_activity_score * 100, 1),
        "environmental":      round(inp.environmental_correlation_score * 100, 1),
        "behavioral_history": round(inp.behavioral_history_score * 100, 1),
    }

    explanation = _build_explanation(
        final_score, decision, signal_scores, iso_anomaly, iso_score_raw
    )

    return ASResult(
        as_score=final_score,
        decision=decision,
        as_multiplier=multiplier,
        signal_scores=signal_scores,
        iso_anomaly_flag=iso_anomaly,
        iso_score_raw=round(iso_score_raw, 4),
        explanation=explanation,
    )


def _build_explanation(score, decision, signals, iso_anomaly, iso_raw) -> str:
    weakest = min(signals, key=signals.get)
    strongest = max(signals, key=signals.get)

    lines = [f"AS Score: {score}/100 → {decision.replace('_', ' ').title()}."]
    lines.append(f"Strongest signal: {strongest} ({signals[strongest]}/100).")
    if signals[weakest] < 60:
        lines.append(f"Weakest signal: {weakest} ({signals[weakest]}/100).")
    if iso_anomaly:
        lines.append(f"Isolation Forest flagged a behavioral anomaly (score: {iso_raw:.3f}).")
    return " ".join(lines)
