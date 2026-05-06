# Rydex Changelog

This file documents the changes made to the Rydex repository to ensure proper execution and wireup of the zero-touch pipeline.

## 2026-04-17 — Phase 3 Complete

**New: `backend/routers/analytics.py`**
Six new analytics endpoints registered at `/analytics/*`:
- `GET /analytics/loss-ratios` — per-zone loss ratio (total_paid / total_premium) with 5-week weekly trend sparkline data for the insurer admin
- `GET /analytics/as-distribution` — AS score histogram (10-point buckets 0–100) across all claims, plus per-signal radar averages and fraud rate percentage
- `GET /analytics/fraud-rings` — DBSCAN clustering (eps=0.8, min_samples=2) on suspicious claims using 6 features: AS score, claim frequency, claim-to-trigger delta, earnings delta ratio, payout amount, hour-of-day. Falls back to realistic synthetic demo data when DB is sparse
- `GET /analytics/syndicate-alerts` — manual_review queue with CRITICAL/HIGH/MEDIUM risk tiers, total blocked payout amount, age in hours, per-signal scores for display
- `GET /analytics/forecast-alerts` — 6-hour ahead disruption forecast alerts per zone with probability, expected value, workers at risk, total exposure in Rs, and actionable insurer recommendation
- `GET /analytics/worker-summary` — full per-worker analytics payload: lifetime earnings protected, cap usage, trigger type breakdown, 8-week income vs protection chart data, AS score timeline

**Modified: `backend/main.py`**
- Added `analytics` router import and `app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])`

**New: `frontend/components/AdminPhase3.tsx`**
Four self-contained React panel components consumed by the admin page:
- `LossRatioPanel` — zone table with loss ratio bars + weekly trend LineChart (Recharts)
- `FraudRingsPanel` — collapsible ring cards showing DBSCAN cluster members, avg AS, total claimed, risk level
- `SyndicateAlertQueue` — per-claim alert cards with signal score mini-bars, risk tier badges, blocked payout totals
- `ForecastPanel` — probability cards with exposure breakdown and insurer reserve recommendations

**Modified: `frontend/app/admin/page.tsx`**
- Added 4 new sidebar nav tabs: Loss Ratios, Fraud Rings, Alert Queue, Forecast
- Wired tab panels using the AdminPhase3 components
- All Phase 2 tabs (Monitor, Risk Map, Analysis, Ledger) untouched

**New: `frontend/app/analytics/page.tsx`**
New worker-facing route at `/analytics` with three tabs:
- Overview: weekly income vs protection BarChart + disruption type breakdown bars + coverage cap progress
- AS History: per-claim AS score LineChart + signal profile RadarChart + last 3 claims summary
- Forecast Alerts: 6-hour disruption outlook cards with probability, payout estimate, zone

**Modified: `frontend/app/dashboard/page.tsx`**
- Added Analytics button to the mobile bottom nav (routes to `/analytics`)

**Modified: `frontend/lib/api.ts`**
- Added `analyticsApi` with typed calls to all 6 analytics endpoints
- Added TypeScript interfaces: `ZoneLossRatio`, `ASDistribution`, `FraudRing`, `SyndicateAlert`, `ForecastAlert`

## 2026-04-03
*   **Docker Configuration:** Removed `apt-get` C-dependency installation from `backend/Dockerfile` (specifically `gcc`, `default-libmysqlclient-dev`, and `pkg-config`). These dependencies fail to resolve on the base Debian python image, but are unnecessary since we use the wheel-installable `pymysql` and pre-compiled machine learning wheels (`scikit-learn`, `numpy`).
*   **Docker Compose Port Conflict:** Changed `docker-compose.yml` mapped port for the `mysql` service from `3306:3306` to `3307:3306`. Your host machine was likely already utilizing port 3306 natively, preventing the Rydex database from spinning up. The frontend and backend containers are unaffected as they network directly with the internal `mysql:3306` alias.
*   **Sign-In Authentication Bug Fix:** The sign-in system was completely halted because FastAPI crashed at startup. The issue arose because `passlib[bcrypt]` relies on older versions of the `bcrypt` library to process the string constraints, yet the `requirements.txt` allowed unpinned installation of `bcrypt==4.1.x`, triggering a `ValueError: password cannot be longer than 72 bytes`. I resolved this exclusively by explicitly appending `bcrypt==3.2.2` within `backend/requirements.txt`, which correctly enables startup execution and fully stabilizes the login endpoints.
*   **Environment Configuration:** Created `.env` from `.env.example` and configured `DEMO_MODE=true` to properly invoke the demo pipeline correctly bypassing openweather API dependencies.
*   **Zero-touch Pipeline Shift Timing Fix:** Patched `backend/services/claim_processor.py` inside `process_claim`. The function explicitly enforces that a worker's shift (`_is_shift_active(worker)`) is currently active or else skips generating a claim. Since demo profiles have static shift times, running the demo trigger at off-hours would fail to generate the payout. Added a condition to bypass the shift enforcement strictly if `trigger_event.is_demo` is `True`.
