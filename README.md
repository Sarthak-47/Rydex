# Rydex — Parametric Income Protection for India's Gig Workforce

> "Traditional insurance settles claims in weeks. A Mumbai delivery rider loses income in hours."

*Rydex — from "ride" + "index." A system that indexes a rider's income against the real world and pays out before the damage compounds.*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://postgresql.org)

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Product Overview](#2-product-overview)
3. [Quick Start](#3-quick-start)
4. [System Architecture](#4-system-architecture)
5. [AI/ML Pipeline](#5-aiml-pipeline)
6. [Parametric Trigger Engine](#6-parametric-trigger-engine)
7. [Income Baseline Modeling](#7-income-baseline-modeling)
8. [Anti-Fraud Architecture](#8-anti-fraud-architecture)
9. [Claim Transparency System](#9-claim-transparency-system)
10. [Pricing Model](#10-pricing-model)
11. [Tech Stack](#11-tech-stack)
12. [Features](#12-features)
13. [Future Scope](#13-future-scope)
14. [Team](#14-team)

---

## 1. Problem Statement

India's food delivery workforce — riders working for Swiggy, Zomato, Blinkit, and Dunzo — forms the operational backbone of urban food logistics. These workers earn on a daily or weekly basis, making their livelihoods acutely sensitive to environmental and infrastructural disruptions. A monsoon downpour, an AQI hazard warning, or a flooded arterial road doesn't just make work harder — it directly eliminates the economic window within which a rider can earn.

Mumbai is ground zero for this problem. The city's flood-prone geography, chronic traffic congestion, and extreme seasonal weather create recurring disruption events that compress a rider's effective earning hours to a fraction of their shift.

**Estimated income loss per disruption event:**

| Disruption Type | Duration | Income Loss (per worker) |
|---|---|---|
| Heavy rainfall (>50mm/day) | 2–5 hrs | ₹300–₹700 |
| Severe AQI spike (>300) | 1–3 hrs | ₹150–₹420 |
| Extreme heat (>40°C) | 2–4 hrs | ₹280–₹560 |
| Arterial road flooding | 3–6 hrs | ₹420–₹900 |
| Traffic stagnation event | 1.5–3 hrs | ₹200–₹480 |

Across a disruption-heavy week this translates to a **20–30% income loss** — entirely uncompensated by any existing product.

---

## 2. Product Overview

Rydex is an AI-powered parametric income protection platform for food delivery workers. It monitors real-world conditions — weather, air quality, traffic — and automatically triggers payouts when a qualifying disruption is detected. **Workers never file a claim. Workers never wait.**

### How It Works

```
Monday 09:00   Worker's income baseline is calculated from the past 4 weeks of activity.
               Premium assessed for the week. Policy activates automatically.

Tuesday 14:00  Rainfall in Bandra West reaches 58mm/day.
               Platform order volume in the area drops 70% over 90 minutes.

Tuesday 14:08  Rydex trigger engine detects threshold breach.
               Multi-signal validation: weather + traffic confirmed.
               Authenticity Score: 91/100 → claim auto-approved.

Tuesday 14:12  ₹340 credited to worker's UPI. Zero action required.
```

### Core Differentiators

| Dimension | Conventional Insurance | Rydex |
|---|---|---|
| Payout model | Indemnity (loss proven, then paid) | Parametric (threshold → auto-payout) |
| Claim initiation | Worker-initiated, manual | Fully automated, zero-touch |
| Fraud defense | Document verification | Multi-signal Authenticity Score (AS) |
| Pricing logic | Fixed tier | Dynamic — Risk Score × Seasonal Factor × Zone Factor |
| Income measurement | Self-declared | Modeled from platform activity baseline |

---

## 3. Quick Start

### Prerequisites

- Docker + Docker Compose (recommended), **or** Python 3.11+ and Node.js 20+
- PostgreSQL 16 (auto-provisioned via Docker)

### Option A — Docker Compose (recommended)

```bash
git clone https://github.com/Sarthak-47/Rydex.git
cd Rydex

# Copy and fill in your API keys
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL, JWT_SECRET
# See .env.example for signup links for each optional API

cp frontend/.env.local.example frontend/.env.local

docker compose up --build
```

Frontend: http://localhost:3000  
Backend API: http://localhost:8000  
API docs: http://localhost:8000/docs

### Option B — Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp ../.env.example ../.env
# Edit .env with your values

alembic upgrade head          # run migrations
python -m db.seed             # seed zones (no demo workers)
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Random 32+ char secret |
| `OPENWEATHER_API_KEY` | No | Enables live forecast alerts (free tier works) |
| `AQI_API_KEY` | No | Enables real AQI monitoring |
| `TRAFFIC_API_KEY` | No | Enables real traffic stagnation triggers |
| `RAZORPAY_KEY_ID/SECRET` | No | Enables test-mode UPI payouts |
| `TWILIO_*` | No | Enables OTP SMS for phone verification |

Features degrade gracefully when optional keys are absent — the system runs fully without them using simulation fallbacks.

---

## 4. System Architecture

### End-to-End Flow

```
Signals → Trigger Engine → Multi-Signal Validation → ML Decision → Authenticity Score → Payout
```

**Target payout latency: < 5 minutes from disruption confirmation to UPI credit.**

### High-Level Architecture

```
+------------------+        +----------------------+        +-------------------+
|                  |        |                      |        |                   |
|   Worker PWA     +------->+   Rydex Core API     +------->+  ML Services      |
|   (Next.js 14)   |        |   (FastAPI / Python) |        |  (scikit-learn)   |
|                  |        |                      |        |                   |
+------------------+        +----------+-----------+        +--------+----------+
                                        |                            |
                             +----------v-----------+      +---------v----------+
                             |                      |      |                    |
                             |   PostgreSQL 16      |      |  Random Forest     |
                             |   Workers, Policies, |      |  Isolation Forest  |
                             |   Claims, Events     |      |  DBSCAN Clustering |
                             |                      |      |                    |
                             +----------+-----------+      +--------------------+
                                        |
                +----------+------------+------------+-----------+
                |           |                        |           |
    +-----------v--+  +-----v---------+  +-----------v--+  +----v----------+
    |  Premium     |  |  Trigger      |  |  Claim       |  |  Anti-Fraud  |
    |  Engine      |  |  Monitor      |  |  Processor   |  |  Engine (AS) |
    +-----------+--+  +-----+---------+  +-----------+--+  +----+----------+
                |            |                       |           |
    +-----------v------------v-----------------------v-----------v----------+
    |                        External Integrations                          |
    |   OpenWeatherMap API  |  AQI API  |  Traffic API  |  Razorpay (UPI)  |
    +-----------------------------------------------------------------------+
```

### Data Flow — Trigger to Payout

```
Real-World Event
       │
       ▼
External API Polling (60-second intervals)
       │
       ▼
Trigger Threshold Evaluation
  ├── Rainfall > 50mm/day?
  ├── AQI > 300 for > 60 mins?
  ├── Temperature > 40°C?
  └── Traffic avg speed < 8km/hr for > 90 mins?
       │
       ▼ (if threshold breached)
Multi-Signal Validation
  ├── Worker location in affected zone?
  ├── Shift declared active?
  └── Platform activity consistent with disruption?
       │
       ▼
Authenticity Score (AS) Calculation
  ├── AS ≥ 75 → Auto-approve → instant payout
  ├── AS 45–74 → Soft Hold (2-hour validation window)
  └── AS < 45 → Manual review queue
       │
       ▼
Payout = Hourly Baseline × Disrupted Hours × AS Multiplier
       │
       ▼
Razorpay / UPI Disbursal
```

---

## 5. AI/ML Pipeline

### 5.1 Risk Scoring — Random Forest Classifier

The premium engine uses a Random Forest model to assign a weekly risk score per worker.

**Input Features:**

| Feature | Description |
|---|---|
| Historical disruption days | Days with income drop >20% in past 8 weeks |
| Zone flood risk index | Pin-code historical flood frequency |
| Shift pattern | Night/weekend workers score higher |
| Weekly income variance | Std deviation of earnings over 8 weeks |
| Seasonal multiplier | Monsoon months apply 1.3× base risk |

### 5.2 Income Baseline Model

```
Hourly Baseline = (Total earnings, 4 weeks) ÷ (Total active hours, 4 weeks)
Tolerance Band  = Baseline ± 25%
```

Workers who inflate earnings before a disruption receive payouts at baseline rate, not the inflated figure.

### 5.3 Fraud Detection — Isolation Forest + DBSCAN

- **Isolation Forest**: Unsupervised anomaly detection — learns the statistical shape of legitimate claims and flags deviations. No labeled fraud data required.
- **DBSCAN Clustering**: Detects coordinated fraud rings by clustering claim timestamps, device fingerprints, network signatures, and location patterns.

---

## 6. Parametric Trigger Engine

| Trigger | Threshold | Min Duration | Data Source |
|---|---|---|---|
| Heavy Rainfall | >50mm/day | Ongoing within shift | OpenWeatherMap |
| Severe AQI | AQI >300 | ≥60 min continuous | AQI / CPCB API |
| Extreme Heat | >40°C | ≥90 min continuous | OpenWeatherMap |
| Traffic Stagnation | Avg speed <8km/hr | ≥90 min, zone-wide | Traffic API |
| Micro-Flood | Pin-code flooding confirmed | ≥120 min | IMD + Traffic correlation |

All thresholds are configurable via environment variables (see `.env.example`).

---

## 7. Income Baseline Modeling

### Payout Formula

```
Payout = Hourly Baseline × Disrupted Hours × Authenticity Multiplier

Where:
  Hourly Baseline     = 4-week rolling average hourly earnings
  Disrupted Hours     = Duration of confirmed trigger within active shift
  Authenticity Mult.  = 1.00 (AS ≥ 75) | 0.90 (AS 60–74) | 0.75 (AS 45–59)
```

---

## 8. Anti-Fraud Architecture

### Three-Tier Decision Engine

| AS Range | Decision | Action |
|---|---|---|
| 75–100 | Clean | Auto-approve, instant payout |
| 45–74 | Soft Hold | 2-hour validation window |
| 0–44 | Flag | Manual review; payout held |

### Authenticity Score (AS) — 5 Signal Classes

| Signal Class | Signals | Weight |
|---|---|---|
| Device Motion | Accelerometer, gyroscope, riding signature | 25% |
| Network Conditions | Carrier signal, IP geolocation, VPN detection | 20% |
| Platform Activity | Dispatch history, app interaction during trigger | 30% |
| Environmental Correlation | Microclimate vs. claimed zone | 15% |
| Behavioral History | Historical claim frequency, AS score trend | 10% |

---

## 9. Claim Transparency System

Every claim exposes a full breakdown of its Authenticity Score signals at `/claims/{id}`:

- Per-signal score, weight, and contribution in points
- Pass / Warn / Fail status for each signal
- Plain-language decision reason
- Isolation Forest anomaly flag (if raised)
- In-page appeal form for eligible claims

Workers can access their claim transparency report directly from the dashboard history.

---

## 10. Pricing Model

| Tier | Weekly Premium | Coverage Cap |
|---|---|---|
| Shield Basic | ₹18–₹30 | ₹1,000/week |
| Shield Plus | ₹31–₹55 | ₹2,200/week |
| Shield Storm | ₹56–₹80 | ₹4,000/week |

```
Weekly Premium = Base Rate × Risk Score × Seasonal Multiplier × Zone Factor
```

---

## 11. Tech Stack

| Component | Technology |
|---|---|
| Worker PWA | Next.js 14, TypeScript, Tailwind CSS, Framer Motion |
| Core API | Python, FastAPI, SQLAlchemy, Pydantic |
| ML Models | scikit-learn (Random Forest, Isolation Forest, DBSCAN) |
| Database | PostgreSQL 16 |
| Weather Data | OpenWeatherMap API (5-day/3h forecast + current) |
| AQI Data | AQI API / CPCB endpoint |
| Traffic Data | HERE / TomTom Traffic API |
| Payments | Razorpay UPI (test mode) |
| Authentication | JWT + Twilio OTP (optional) |
| Infrastructure | Docker Compose |

---

## 12. Features

### Worker App
- Registration with zone selection, shift profile, and UPI ID
- Active policy card with weekly cap, premium, and coverage remaining
- Trigger event feed — verified disruption events with timestamps
- **Predictive Alerts** — 6-hour ahead forecast for upcoming disruptions in your zone
- Claims history with full **Transparency Report** per claim (AS signal breakdown + appeal)

### Insurer Admin Dashboard
- Live claims feed with real-time auto-refresh
- Trigger Map — geographic view of active disruptions
- ML Scatter Plot — AS score distribution across all claims
- Loss Ratio analytics — premium vs. paid per zone with weekly trend
- **Fraud Ring Detection** — DBSCAN clustering of coordinated fraud
- **Syndicate Alert Queue** — Isolation Forest flagged claims
- 6-hour Forecast Panel — total exposure across all zones

### Analytics
- Zone Impact Dashboard — flood risk, loss ratio, worker count per zone
- AS Score Distribution histogram
- Forecast exposure calculator

---

## 13. Future Scope

| Initiative | Description |
|---|---|
| Multi-city rollout | Expand to Delhi, Bengaluru, Chennai, Hyderabad |
| Platform API integration | Direct Swiggy/Zomato earnings API for baseline |
| Expanded trigger library | Fog, cyclone watch, waterlogging severity index |
| LSTM forecasting | 6-hour ahead premium adjustment from disruption prediction |
| B2B white-label | License engine to insurance carriers as payout infrastructure |

---

## 14. Team

| Member | Role | GitHub |
|---|---|---|
| Aniruddha Mookerjee | DevOps & Infrastructure | [@aniruddhamookerjee](https://github.com/aniruddhamookerjee) |
| Sarthak Singh | Backend & ML | [@Sarthak-47](https://github.com/Sarthak-47) |
| Pratistha Chaira | Frontend — Dashboard & Analytics | [@pratistha09](https://github.com/pratistha09) |
| Manas Jangid | Frontend — Auth, Profile & Admin | [@Manas-Jangid](https://github.com/Manas-Jangid) |
| Rishita Asthana | QA, Docs & Forecast Integration | [@rishitasthana](https://github.com/rishitasthana) |

---

**Repository:** https://github.com/Sarthak-47/Rydex  
**License:** MIT

*Rydex — income protection that moves as fast as the gig economy does.*
