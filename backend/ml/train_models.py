"""
Train both ML models on synthetic data and save as .pkl files.
Run once at Docker build time via Dockerfile CMD, or manually: python ml/train_models.py
"""
import os
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

DEFAULT_MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
N = 2000


# ─────────────────────────────────────────────
# 1. RANDOM FOREST — Premium risk scoring
#    Input features → Risk Score (0.5–1.5)
#    We frame as a 3-class problem: low/medium/high risk
#    then map to a continuous multiplier for the formula.
# ─────────────────────────────────────────────

def generate_rf_data(n: int):
    """
    Features:
      0: disruption_days        (int 0–8, past 8 weeks with >20% income drop)
      1: zone_flood_risk        (float 0–1)
      2: shift_type             (0=day, 1=mixed, 2=night)
      3: weekly_income_variance (float, std dev of weekly earnings over 8 weeks)
      4: seasonal_flag          (0 or 1 — 1 during June–September)
    Target: 0=low, 1=medium, 2=high risk
    """
    disruption_days = np.random.randint(0, 9, n)
    zone_flood_risk = np.random.uniform(0, 1, n)
    shift_type = np.random.choice([0, 1, 2], n, p=[0.5, 0.3, 0.2])
    income_variance = np.random.uniform(100, 1500, n)
    seasonal_flag = np.random.choice([0, 1], n, p=[0.67, 0.33])

    X = np.column_stack([
        disruption_days,
        zone_flood_risk,
        shift_type,
        income_variance,
        seasonal_flag,
    ])

    # Risk label: weighted sum with thresholds
    risk_raw = (
        disruption_days * 0.35
        + zone_flood_risk * 3.0
        + shift_type * 0.5
        + (income_variance / 1500) * 1.5
        + seasonal_flag * 1.0
    )
    # 3 classes: low < 2.0, medium 2.0–3.5, high > 3.5
    y = np.digitize(risk_raw, bins=[2.0, 3.5])

    return X, y


# ─────────────────────────────────────────────
# 2. ISOLATION FOREST — Fraud / anomaly detection
#    Input features → anomaly score
#    contamination=0.03 (3% expected anomalies)
# ─────────────────────────────────────────────

def generate_iso_data(n: int):
    """
    Features per claim event:
      0: claim_to_trigger_delta_mins  — mins between trigger fire and claim (legitimate: >0, fraud: <5)
      1: location_consistency         — 0–1 (1=perfect match, 0=mismatch)
      2: device_motion_score          — 0–1 (1=active riding signature)
      3: platform_activity_score      — 0–1 (1=high dispatch activity)
      4: earnings_delta_ratio         — (claimed - baseline) / baseline (legitimate: <0.3)
      5: claim_frequency_7d           — claims in last 7 days for this worker
      6: network_stability_score      — 0–1 (1=stable outdoor network)
    """
    # Legitimate claims (97%)
    n_legit = int(n * 0.97)
    legit = np.column_stack([
        np.random.uniform(5, 120, n_legit),     # claim_to_trigger_delta: 5–120 mins
        np.random.uniform(0.7, 1.0, n_legit),   # location_consistency: high
        np.random.uniform(0.5, 1.0, n_legit),   # device_motion: active
        np.random.uniform(0.4, 1.0, n_legit),   # platform_activity: moderate–high
        np.random.uniform(-0.2, 0.25, n_legit), # earnings_delta: within tolerance
        np.random.randint(0, 3, n_legit).astype(float),  # claim_freq: low
        np.random.uniform(0.4, 1.0, n_legit),   # network_stability: moderate–high
    ])

    # Fraudulent claims (3%)
    n_fraud = n - n_legit
    fraud = np.column_stack([
        np.random.uniform(0, 1, n_fraud),         # feature 0: delta_mins (fraud: 0–1)
        np.random.uniform(0.6, 1.0, n_fraud),     # feature 1: 1-device_motion (fraud: high = stationary)
        np.random.uniform(0.0, 0.1, n_fraud),     # feature 2: device_motion (fraud: near 0)
        np.random.uniform(0.0, 0.1, n_fraud),     # feature 3: platform_activity (fraud: near 0)
        np.random.uniform(1.5, 3.0, n_fraud),     # feature 4: earnings_delta (fraud: heavily inflated)
        np.random.uniform(5, 10, n_fraud),        # feature 5: claim_frequency (fraud: very high)
        np.random.uniform(0.0, 0.15, n_fraud),    # feature 6: network_stability (fraud: near 0)
    ])

    return np.vstack([legit, fraud])


def train_all_models(models_dir: str | None = None) -> str:
    """
    Train & persist all required ML artifacts.

    Returns the models_dir used.
    """
    np.random.seed(42)
    out_dir = models_dir or DEFAULT_MODELS_DIR
    os.makedirs(out_dir, exist_ok=True)

    # Random Forest
    X_rf, y_rf = generate_rf_data(N)
    rf_pipeline = Pipeline(
        [
            (
                "clf",
                RandomForestClassifier(
                    n_estimators=100,
                    max_depth=8,
                    min_samples_split=10,
                    class_weight="balanced",
                    random_state=42,
                ),
            )
        ]
    )
    rf_pipeline.fit(X_rf, y_rf)
    rf_path = os.path.join(out_dir, "premium_rf.pkl")
    joblib.dump(rf_pipeline, rf_path)
    print(f"Random Forest saved → {rf_path}")

    # Quick accuracy check (informational)
    from sklearn.model_selection import cross_val_score

    scores = cross_val_score(rf_pipeline, X_rf, y_rf, cv=5)
    print(f"RF cross-val accuracy: {scores.mean():.3f} ± {scores.std():.3f}")

    # Isolation Forest
    X_iso = generate_iso_data(N)
    iso_pipeline = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "iso",
                IsolationForest(
                    n_estimators=200,
                    contamination=0.03,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    iso_pipeline.fit(X_iso)
    iso_path = os.path.join(out_dir, "fraud_iso.pkl")
    joblib.dump(iso_pipeline, iso_path)
    print(f"Isolation Forest saved → {iso_path}")

    # AS scaler (used by some variants / kept for completeness)
    scaler = StandardScaler()
    scaler.fit(X_iso)
    scaler_path = os.path.join(out_dir, "as_scaler.pkl")
    joblib.dump(scaler, scaler_path)
    print(f"AS scaler saved → {scaler_path}")

    print("\nAll models trained and saved. Ready for inference.")
    return out_dir


if __name__ == "__main__":
    train_all_models()
