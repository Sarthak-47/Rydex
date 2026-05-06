# Rydex — Parametric Income Protection for India's Food Delivery Workforce

> "Traditional insurance settles claims in weeks. A Mumbai delivery rider loses income in hours."

**Guidewire DEVTrails 2026 | Persona: Food Delivery (Swiggy / Zomato)**

*Rydex — from "ride" + "index." A system that indexes a rider's income against the real world and pays out before the damage compounds.*

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Product Overview](#2-product-overview)
3. [Persona & Use Cases](#3-persona--use-cases)
4. [System Architecture](#4-system-architecture)
5. [AI/ML Pipeline](#5-aiml-pipeline)
6. [Parametric Trigger Engine](#6-parametric-trigger-engine)
7. [Income Baseline Modeling](#7-income-baseline-modeling)
8. [Anti-Fraud Architecture](#8-anti-fraud-architecture)
9. [Adversarial Defense & Anti-Spoofing Strategy](#9-adversarial-defense--anti-spoofing-strategy)
10. [Pricing Model](#10-pricing-model)
11. [Tech Stack](#11-tech-stack)
12. [Development Roadmap](#12-development-roadmap)
13. [Deliverables](#13-deliverables)
14. [Future Scope](#14-future-scope)
15. [Constraints & Exclusions](#15-constraints--exclusions)

---

## 1. Problem Statement

India's food delivery workforce — delivery riders working for Swiggy and Zomato — forms the operational backbone of urban food logistics. These workers earn on a daily or weekly basis, making their livelihoods acutely sensitive to environmental and infrastructural disruptions. A monsoon downpour, an AQI hazard warning, or a flooded arterial road doesn't just make work harder — it directly eliminates the economic window within which a rider can earn.

Mumbai, in particular, is ground zero for this problem. The city's flood-prone geography, chronic traffic congestion, and extreme seasonal weather create recurring disruption events that compress a rider's effective earning hours to a fraction of their shift.

**The Gap:**

| Disruption Type | Duration | Estimated Income Loss (per worker) |
|---|---|---|
| Heavy rainfall (>50mm/day) | 2 – 5 hrs | Rs. 300 – Rs. 700 |
| Severe AQI spike (>300) | 1 – 3 hrs | Rs. 150 – Rs. 420 |
| Extreme heat (>40°C) | 2 – 4 hrs | Rs. 280 – Rs. 560 |
| Arterial road flooding | 3 – 6 hrs | Rs. 420 – Rs. 900 |
| Traffic stagnation event | 1.5 – 3 hrs | Rs. 200 – Rs. 480 |

Across a disruption-heavy week, this translates to a **20–30% income loss** — entirely uncompensated by any existing product. Traditional indemnity insurance requires receipts, documentation, and adjuster review; it was never designed for income that exists in dispatch records, not bank statements. Parametric products that do exist operate at city scale over day-long windows — misaligned with the hour-by-hour economic reality of a delivery rider in Dharavi or Bandra.

**Rydex is built to close this gap.**

---

## 2. Product Overview

Rydex is an AI-powered parametric income protection platform built exclusively for food delivery workers on Swiggy and Zomato. It monitors real-world conditions — weather, air quality, traffic — in real time, compares them against a worker's established income baseline, and automatically triggers payouts when a qualifying disruption is detected. Workers never file a claim. Workers never wait.

The product is deliberately framed not as insurance but as **income protection** — a financial tool that works in the background while the rider focuses on working.

### Core Differentiation

| Dimension | Conventional Insurance | Rydex |
|---|---|---|
| Payout model | Indemnity (loss proven, then paid) | Parametric (threshold breached → auto-payout) |
| Claim initiation | Worker-initiated, manual | Fully automated, zero-touch |
| Trigger scope | Policy event (accident, hospitalization) | Environmental and operational disruptions |
| Geographic resolution | City-level or state-level | Pin-code and neighborhood-level |
| Fraud defense | Document verification | Multi-signal Authenticity Score (AS) |
| Pricing logic | Fixed premium by tier | Dynamic — Risk Score × Seasonal Factor × Base Rate |
| Income measurement | Self-declared | Baseline-modeled from platform activity history |

### How It Works — In 60 Seconds

```
Monday 09:00   Worker's income baseline is calculated from the past 4 weeks of platform activity.
               Premium is assessed for the week. Policy activates automatically.

Tuesday 14:00  Rainfall in pin code 400051 (Bandra West) reaches 58mm/day.
               Platform order volume in the area drops 70% over 90 minutes.

Tuesday 14:08  Rydex trigger engine detects threshold breach.
               Multi-signal validation: Weather confirmed. Traffic corroborated. Worker location active.
               Authenticity Score: 91/100 (clean). Claim auto-approved.

Tuesday 14:12  Rs. 340 credited to worker's UPI. No action required from worker.
```

> Rydex doesn't ask *"did something happen?"* — it asks *"did income get impacted?"* and acts instantly.

---

## 3. Persona & Use Cases

### Primary Persona

**Salim, 29 | Swiggy Delivery Rider | Dharavi–Bandra Corridor, Mumbai**

- Shift: 11am – 10pm (split shift, 6 days/week)
- Average weekly income: Rs. 4,200 – Rs. 5,800
- Operating zones: Pin codes 400017, 400050, 400051
- Dependency: Platform order dispatch + outdoor riding conditions
- Primary disruption risk: Monsoon flooding (June–September), chronic traffic stagnation
- Current safety net: None

---

### Use Case 1 — Monsoon Rainfall Trigger

```
Context   : Tuesday, 2:15pm. Rainfall reaches 61mm/day in Bandra West (pin 400051).
            Platform order volume drops 68% over 75 minutes. Salim's GPS shows
            he has been stationary or in low-activity state for 55 minutes.

Rydex     : Rainfall threshold (>50mm/day) breached. Multi-signal check: weather confirmed,
            traffic API shows arterial flooding, activity log shows dispatch cessation.
            Authenticity Score: 89. Claim auto-initiated.
            Payout: 1.25hrs × Rs. 280/hr baseline × 97% = Rs. 340.

Outcome   : Rs. 340 credited to Salim's UPI in 4 minutes. No action required.
```

### Use Case 2 — Severe AQI Spike

```
Context   : Thursday, 6:30pm. Construction activity and traffic pollution push AQI
            in the Dharavi–Sion corridor to 318 (Severe category) for 80 continuous minutes.
            Salim's shift is active. His zone matches the affected radius.

Rydex     : AQI trigger (>300) fires. Duration validation: 80 minutes exceeds
            minimum 60-minute hold. Behavioral check: activity consistent with
            disrupted working conditions. Authenticity Score: 85.

Outcome   : Rs. 280 disbursed for the 80-minute protection window.
```

### Use Case 3 — Traffic Stagnation Event

```
Context   : Saturday, 7:45pm. A water main breach on Western Express Highway causes
            a 2.5-hour gridlock across 6 pin codes. Salim's delivery time per order
            increases 310%. Platform completion rate in his zone drops 55%.

Rydex     : Traffic stagnation trigger fires (API: avg speed <8km/hr for >90 mins,
            zone-wide). Corroboration: 19 of 23 enrolled riders in affected zone
            also show matching disruption signals. Batch validated as genuine event.

Outcome   : Rs. 480 disbursed. Platform notified for loss-ratio reconciliation.
```

### Use Case 4 — Heatwave Event

```
Context   : Wednesday, 1:00pm. Temperature in the Kurla–Ghatkopar corridor reaches
            42°C and stays above threshold for 110 continuous minutes. Salim reduces
            his active riding hours. Platform shows a 40% drop in order acceptance
            from workers in the zone.

Rydex     : Heat trigger (>40°C for ≥90 mins) fires. Activity log confirms reduced
            dispatch acceptance consistent with heat-related work impairment.
            Environmental + activity signal alignment confirmed. Authenticity Score: 82.

Outcome   : Rs. 210 disbursed for the protected window. Payout reflects reduced
            — not eliminated — earning capacity during the heat event.
```

### Use Case 5 — Earnings Manipulation Attempt (Fraud)

```
Context   : Salim notices a storm forecast for next Thursday. In the 4 days prior,
            he artificially inflates his activity — logging sessions even when idle,
            accepting and cancelling orders — to push his apparent earnings baseline
            up by 2.4× his 4-week rolling average.

Rydex     : Baseline engine detects spike. Earnings in the pre-disruption window
            exceed 2× the rolling baseline — flagged as anomalous. Isolation Forest
            model confirms the pattern matches earnings manipulation signature.
            Payout is calculated against the honest 4-week baseline, not the
            inflated figure. Anomaly logged against worker profile.

Outcome   : Payout issued at baseline rate (Rs. 285/hr), not the inflated rate
            (Rs. 680/hr). Worker receives Rs. 340 instead of the Rs. 810 the
            manipulation was designed to generate. No harsh rejection — the system
            self-corrects silently.
```

### Use Case 6 — Timing Manipulation Attempt (Fraud)

```
Context   : Priya, a Zomato rider with no prior activity in the Andheri zone, logs
            into the Rydex app 8 minutes before a confirmed rainfall trigger fires.
            She has no dispatch history in this zone for the past 3 weeks and her
            shift declaration was made 11 minutes before the trigger window opened.

Rydex     : Eligibility validation checks behavioral history. No prior activity in
            declared zone. Shift declared within 15 minutes of trigger — flagged.
            Isolation Forest model identifies timing pattern consistent with
            opportunistic enrollment. Authenticity Score: 31.

Outcome   : Claim routed to manual review queue. Reviewer determines ineligibility.
            Payout withheld. Worker notified that shift declarations must be made
            at least 60 minutes before a disruption window to be eligible.
```

### Use Case 7 — Genuine Increased Effort (Fairness Case)

```
Context   : Arjun, a Blinkit rider, works slightly harder than usual this week —
            his earnings are 22% above his 4-week rolling baseline. On Friday, a
            heavy rainfall trigger fires during his active shift. His AS score is 91.

Rydex     : Earnings within ±25% tolerance band — no anomaly flagged. Isolation
            Forest model confirms behavioral pattern is consistent with genuine
            increased effort (more hours, more orders), not manipulation.
            Claim auto-approved at full rate.

Outcome   : Rs. 395 disbursed. No penalty applied for working harder than average.
            The system is explicitly designed to reward genuine workers, not
            penalize them for exceeding their own baseline.
```

### Use Case 8 — GPS Spoofing Attempt (Anti-Spoofing)

```
Context   : A worker uses a consumer GPS spoofing tool to fake their location inside
            pin code 400051 (Bandra West) during a live rainfall trigger. Their
            actual device is stationary indoors 9km away.

Rydex     : Authenticity Score pipeline runs. Device motion: accelerometer shows
            zero vibration, no riding signature. Network: IP geolocation places
            device 9km from declared zone; VPN fingerprint detected. Platform
            activity: no dispatch requests accepted or declined during trigger
            window — inconsistent with an active rider in a disrupted zone.
            Environmental correlation: microclimate data for declared zone matches
            trigger; but device-level sensor data does not correlate with outdoor
            storm exposure. AS score: 19.

Outcome   : Claim flagged. Routed to manual review. Payout held. Third GPS
            spoofing flag for this worker triggers permanent AS baseline downgrade
            and insurer notification.
```

---

## 4. System Architecture

### End-to-End System Flow

```
Signals → Trigger Engine → Multi-Signal Validation → ML Decision → Authenticity Score → Payout
```

> **Target payout latency: < 5 minutes from disruption confirmation to UPI credit.**

The event-driven architecture allows horizontal scaling across cities by independently processing signals and claims at the pin-code level — adding a new city requires only a new zone configuration, not a new pipeline.

### 4.1 High-Level Architecture

```
+------------------+        +----------------------+        +-------------------+
|                  |        |                      |        |                   |
|   Worker PWA     +------->+   Rydex Core API     +------->+  ML Services      |
|   (React/Next)   |        |   (FastAPI / Python) |        |  (Python/FastAPI) |
|                  |        |                      |        |                   |
+------------------+        +----------+-----------+        +--------+----------+
                                        |                            |
                             +----------v-----------+      +---------v----------+
                             |                      |      |                    |
                             |   PostgreSQL         |      |  Random Forest     |
                             |   (Workers, Policies,|      |  Isolation Forest  |
                             |    Claims, Events)   |      |  Baseline Model    |
                             |                      |      |                    |
                             +----------+-----------+      +--------------------+
                                        |
                +----------+------------+------------+-----------+
                |           |                        |           |
    +-----------v--+  +-----v---------+  +-----------v--+  +----v----------+
    |  Premium     |  |  Trigger      |  |  Claim       |  |  Anti-Spoof  |
    |  Engine      |  |  Monitor      |  |  Processor   |  |  Engine (AS) |
    +-----------+--+  +-----+---------+  +-----------+--+  +----+----------+
                |            |                       |           |
    +-----------v------------v-----------------------v-----------v----------+
    |                        External Integrations                          |
    |   OpenWeatherMap API  |  AQI API  |  Traffic API  |  Razorpay (test)  |
    +-----------------------------------------------------------------------+
```

### 4.2 Data Flow — Trigger to Payout

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
  ├── Worker location in affected pin code?
  ├── Shift declared active?
  ├── Platform activity consistent with disruption?
  └── Behavioral pattern within baseline tolerance?
       │
       ▼
Authenticity Score (AS) Calculation
  ├── AS ≥ 75 → Auto-approve
  ├── AS 45–74 → Soft Hold (2-hour validation window)
  └── AS < 45 → Manual review queue
       │
       ▼
Payout Calculation
  Payout = Hourly Baseline × Disrupted Hours × AS Multiplier
       │
       ▼
Razorpay / UPI Disbursal (target: < 5 minutes)
```

---

## 5. AI/ML Pipeline

### 5.1 Risk Scoring — Random Forest Classifier

The premium engine uses a Random Forest model trained on synthetic worker profiles to assign a weekly risk score for each enrolled worker. The score determines the base premium for the week.

**Input Features:**

| Feature | Source | Description |
|---|---|---|
| Historical disruption days | Platform activity log | Number of days with income drop > 20% in past 8 weeks |
| Zone flood risk index | IMD + city GIS data | Pin-code-level historical flood frequency score |
| Shift pattern (day/night/mixed) | Worker declaration | Night + weekend workers score higher |
| Weekly income variance | Platform earnings API | Standard deviation of weekly earnings over 8 weeks |
| Seasonal multiplier | Calendar | Monsoon months (June–September) apply 1.3× base risk |

**Output:** Risk Score (0.0 – 1.0), mapped to premium tier.

### 5.2 Income Baseline Model

Each worker's income baseline is computed from 4 weeks of platform activity data:

```
Hourly Baseline = (Sum of weekly earnings over 4 weeks) ÷ (Total active hours over 4 weeks)

Daily Baseline  = Hourly Baseline × Declared shift hours

Tolerance Band  = Daily Baseline ± 25%
```

The tolerance band prevents manipulation: a worker who artificially inflates earnings in the weeks before a disruption will find their payout calculated against the honest 4-week average, not the inflated figure.

### 5.3 Fraud Detection — Isolation Forest

Rydex uses an Isolation Forest model for unsupervised anomaly detection across all claim events. This model operates without labeled fraud data — it learns the statistical shape of legitimate claims and flags deviations.

**Features evaluated per claim:**

- Claim timestamp relative to trigger window
- Worker-reported location vs. GPS trail consistency
- Accelerometer and device motion data during claimed disruption
- Network stability during claim period
- Delta between claimed income loss and baseline prediction
- Historical claim frequency for this worker

Isolation Forest assigns an anomaly score; combined with behavioral signals, this feeds into the Authenticity Score (AS) pipeline.

---

## 6. Parametric Trigger Engine

Triggers are evaluated continuously and require both a threshold breach **and** a persistence duration to avoid false positives from transient fluctuations. A spike that clears in 5 minutes does not constitute a disruption event — sustained impairment does.

### 6.1 Trigger Definitions

Rydex monitors five parametric triggers in real time. Each trigger requires a threshold breach of defined duration before a claim window opens.

| Trigger | Threshold | Minimum Duration | Data Source |
|---|---|---|---|
| Heavy Rainfall | > 50mm/day | Ongoing within shift window | OpenWeatherMap API |
| Severe AQI | AQI > 300 | ≥ 60 continuous minutes | AQI / CPCB API |
| Extreme Heat | > 40°C | ≥ 90 continuous minutes | OpenWeatherMap API |
| Traffic Stagnation | Avg speed < 8km/hr, zone-wide | ≥ 90 continuous minutes | Traffic / HERE API |
| Micro-Flood Event | Pin-code-level flooding confirmed | ≥ 120 minutes | IMD + Traffic correlation |

### 6.2 Multi-Signal Validation

A trigger threshold breach alone does not initiate a claim. Three conditions must be met simultaneously:

1. **Environmental signal confirmed** — API data meets threshold requirements.
2. **Worker location in affected zone** — GPS or declared zone matches disrupted pin codes.
3. **Activity signal consistent with disruption** — Platform dispatch data or device motion indicates working conditions are genuinely impaired, not merely that the worker chose not to work.

The third condition is critical for fairness and fraud resistance. A worker who logs off voluntarily during light rain does not receive a payout. A worker who remains active but sees order volume collapse due to platform-side disruption does.

---

## 7. Income Baseline Modeling

### 7.1 Why Baseline, Not Self-Declaration

Self-declared income is the most common manipulation vector in gig worker insurance. Rydex does not ask workers to declare their income at enrollment. Instead, the system derives a baseline from observable platform activity signals over a rolling 4-week window.

Real-time earnings are also an unreliable anchor — they are highly volatile and easily manipulated in the days before a known disruption event. By anchoring payouts to a rolling historical baseline, Rydex ensures stability, prevents short-term gaming, and aligns payouts with genuine earning capacity rather than momentary spikes.

### 7.2 Baseline Computation

```
Step 1: Collect earnings and hours data from platform API (or worker-uploaded earnings screenshot)
        for the 4 most recent complete weeks.

Step 2: Compute Hourly Baseline = Total Earnings ÷ Total Active Hours

Step 3: Apply Tolerance Band = Hourly Baseline × [0.75, 1.25]
        — Any payout calculation that would fall outside this band is capped at the ceiling.

Step 4: Recalculate every Monday before policy activation for the new week.
```

### 7.3 Payout Calculation

```
Payout = Hourly Baseline × Disrupted Hours × Authenticity Multiplier

Where:
  Hourly Baseline     = 4-week rolling average hourly earnings
  Disrupted Hours     = Duration of confirmed trigger window within active shift
  Authenticity Mult.  = 1.00 (AS ≥ 75), 0.90 (AS 60–74), or 0.75 (AS 45–59)
```

**Example:** Salim's hourly baseline is Rs. 285. A 1.5-hour rainfall trigger fires during his shift. Authenticity Score is 89.

```
Payout = Rs. 285 × 1.5 × 1.00 = Rs. 427
```

---

## 8. Anti-Fraud Architecture

### 8.1 Threat Model

Rydex's primary fraud vectors and corresponding defenses:

| Threat | Attack Vector | Defense |
|---|---|---|
| Earnings inflation | Inflating activity in weeks before enrollment | 4-week rolling baseline recalculated weekly; single-week spikes smoothed out |
| Shift declaration fraud | Declaring a shift active when not working | Device motion + platform activity corroboration required |
| GPS spoofing | Faking location inside a disrupted zone | Multi-signal Authenticity Score (see Section 9) |
| Coordinated ring fraud | Group of workers filing simultaneous fake claims | DBSCAN clustering on claim timestamps, device IDs, and network signatures |
| Timing manipulation | Filing claims just inside trigger windows | Minimum duration hold on all triggers; timestamp validation against API data |

### 8.2 Three-Tier Decision Engine

Every claim that reaches the payout stage passes through the Authenticity Score (AS) pipeline:

| AS Range | Decision | Action |
|---|---|---|
| 75 – 100 | Clean | Auto-approve, instant payout |
| 45 – 74 | Soft Hold | 2-hour validation window; worker prompted for lightweight confirmation |
| 0 – 44 | Flag | Manual review queue; payout held; reviewer contacts worker within 4 hours |

### 8.3 Fraud Ring Detection — DBSCAN Clustering

For syndicate-scale fraud (coordinated claims from a group of workers), Rydex applies DBSCAN clustering across:

- Claim timestamps (within a ±15-minute window)
- Device fingerprints (OS, hardware ID hash)
- Network signatures (IP range, carrier)
- GPS trail shape (similar movement patterns)

A cluster of 5 or more workers with matching signals across 3 or more of these dimensions triggers a syndicate alert. All claims in the cluster are moved to manual review; the insurer dashboard surfaces the alert immediately.

---

## 8.4 System Guarantees

| Guarantee | Specification |
|---|---|
| No claims required | Every payout is fully automated — workers never initiate or submit a claim |
| Payout decision speed | Decision reached within minutes of disruption confirmation; UPI credit within 5 minutes |
| Fraud-resistant | All claims evaluated through multi-signal AS pipeline before approval |
| Fairness ensured | ±25% tolerance band and behavioral modeling protect genuine workers from false flags |
| No overnight holds | Soft Hold SLA is 2 hours maximum — no worker waits until the next day for a decision |
| Single anomaly protection | One unusual claim does not permanently affect a worker's AS baseline; minimum 3 independent anomalies required |

---

## 9. Adversarial Defense & Anti-Spoofing Strategy

> **Authenticity Score (AS)** is a composite 0–100 score derived from device, behavioral, environmental, and platform signals to determine the validity of a claim — independent of GPS location data.

### 9.1 The Problem with GPS-Only Verification

A system that relies solely on GPS location to verify a worker's presence in a disrupted zone is trivially exploitable. Consumer-grade GPS spoofing tools are freely available and require no technical expertise. Rydex's defense is designed with the assumption that GPS data is always potentially untrusted.

### 9.2 The Authenticity Score (AS)

The Authenticity Score is a composite 0–100 score derived from five independent signal classes. No single signal can pass or fail a claim — the score emerges from the combination.

| Signal Class | Signals Used | Weight |
|---|---|---|
| Device Motion | Accelerometer data, gyroscope, vibration patterns consistent with riding | 25% |
| Network Conditions | Carrier signal strength, network stability, IP geolocation | 20% |
| Platform Activity | Order dispatch history, app interaction logs during trigger window | 30% |
| Environmental Correlation | Does worker's local microclimate data match claimed disruption? | 15% |
| Behavioral History | Worker's historical claim frequency, AS score trend | 10% |

### 9.3 Signal Descriptions

**Device Motion:** A rider on a motorcycle in heavy rain has a specific accelerometer signature — low forward acceleration, irregular micro-vibrations from slowing and stopping, absence of the smooth motion pattern of indoor or stationary device use. A spoofed location on a stationary device fails this check.

**Network Conditions:** Spoofing tools typically operate via VPN or emulator environments. These leave identifiable network signatures. Poor cellular signal consistent with outdoor storm conditions correlates positively with a genuine claim.

**Platform Activity:** The most powerful signal. If a worker's platform shows that dispatch requests dropped to near-zero in their zone during the trigger window — and the worker's app session data confirms they were attempting to accept orders — this is strong corroboration that they were genuinely impacted.

**Environmental Correlation:** Real-time microclimate data from the nearest weather station is cross-referenced with the worker's declared zone. A worker 4km from the nearest measurement point in a genuinely affected zone will still show correlated conditions. A spoofed location in a zone where conditions do not match the API data will fail.

### 9.4 Soft Hold UX — Worker-Facing Language

When a claim enters a Soft Hold, the notification is deliberately non-accusatory:

> "Your claim for the disruption (2:15pm – 3:45pm) is being processed. Our system sometimes requests a quick location check when network conditions are unstable during heavy rain. Tap below — it takes 10 seconds and releases your payout immediately."

**Worker Protection Commitments:**

| Commitment | Specification |
|---|---|
| Language policy | The word "fraud" is never used in worker-facing communications |
| Soft Hold resolution SLA | 2 hours maximum — no worker waits overnight for a decision |
| Appeal turnaround | Human reviewer responds within 4 hours of appeal submission |
| Flag escalation threshold | A single anomalous claim does not permanently raise a worker's AS baseline; minimum 3 independent anomalies required |
| Compensation for delays | Soft Hold claims that are ultimately approved receive full payout plus Rs. 10 credit toward the next week's premium |

---

## 10. Pricing Model

### Coverage Tiers

| Tier | Weekly Premium | Coverage Cap | Target Worker Profile |
|---|---|---|---|
| Shield Basic | Rs. 18 – Rs. 30 | Rs. 1,000 / week | Day shift, low-disruption zones, stable earnings history |
| Shield Plus | Rs. 31 – Rs. 55 | Rs. 2,200 / week | Mixed shift, flood-prone zones, moderate earnings variance |
| Shield Storm | Rs. 56 – Rs. 80 | Rs. 4,000 / week | Night / monsoon-season workers, high-risk corridors |

The Random Forest risk model assigns a score that determines a worker's eligible tier range. Within the range, the worker selects their coverage level. Premium activates Monday 00:00 IST and expires Sunday 23:59 IST.

### Premium Calculation Formula

```
Weekly Premium = Base Rate × Risk Score × Seasonal Multiplier × Zone Factor

Where:
  Base Rate           = Rs. 20 (Shield Basic) / Rs. 40 (Shield Plus) / Rs. 65 (Shield Storm)
  Risk Score          = 0.5 – 1.5, output of Random Forest model
  Seasonal Multiplier = 1.3 (June–September monsoon) / 1.0 (all other months)
  Zone Factor         = 1.0 – 1.4 based on pin-code historical flood frequency index
```

### Why Weekly

Swiggy and Zomato disburse partner earnings on a weekly cycle. Rydex's policy window is synchronized with this cadence deliberately — not for convenience, but because it aligns with how workers already think about income. A monthly commitment creates an access barrier for workers with irregular earnings. A weekly cycle means that if a worker has a bad disruption week, they can see their protection reflected in the same financial period where they felt the loss.

---

## 11. Tech Stack

### Component Map

| Component | Technology | Rationale |
|---|---|---|
| Worker PWA | React + Next.js 14 + TypeScript | Mobile-first, installable, offline-capable for low-connectivity zones |
| Core API | Python (FastAPI) | Rapid ML integration; async performance for real-time trigger polling |
| Risk & Baseline Engine | Python + scikit-learn (Random Forest) | Mature ML ecosystem; interpretable model output for insurer audit |
| Fraud / Anti-Spoofing Engine | Python + scikit-learn (Isolation Forest + DBSCAN) | Unsupervised anomaly detection — no labeled fraud data required at launch |
| Database | PostgreSQL | Relational structure appropriate for policy, claim, and worker data; audit-friendly |
| Weather / AQI Data | OpenWeatherMap API + CPCB AQI endpoint | Current conditions, 7-day forecast, air pollution data |
| Traffic Data | HERE Traffic API (or mock equivalent) | Real-time zone-level speed and congestion data |
| Payment | Razorpay Test Mode + UPI Simulator | Demonstrates instant disbursement without live funds |
| Authentication | JWT + OTP (mocked SMS gateway) | Stateless auth aligned with mobile-first UX |

### Service Interaction Map

```
+-------------------+        REST        +---------------------+
|  Worker PWA       +<------------------>+  Core API (FastAPI) |
+-------------------+                    +----------+----------+
                                                    |
                              +---------------------+---------------------+
                              |                     |                     |
                    +---------v--------+  +---------v--------+  +--------v---------+
                    |  Premium Engine  |  |  Trigger Monitor |  |  Claim Processor |
                    | (Random Forest)  |  |  (async polling) |  |  (FastAPI svc)   |
                    +--------+---------+  +---------+--------+  +--------+---------+
                             |                      |                    |
                    +--------v---------+  +---------v--------+  +--------v---------+
                    |  PostgreSQL      |  |  External APIs   |  |  AS Engine       |
                    |  (Primary store) |  |  OpenWeatherMap  |  |  (Isolation      |
                    |                  |  |  AQI / Traffic   |  |   Forest + DBSCAN|
                    +------------------+  +------------------+  +------------------+
```

---

## 12. Development Roadmap

### Phase 1 — Ideation and Foundation (March 4 – 20) [Complete]

- [x] Persona research and income-loss quantification for Mumbai food delivery context
- [x] Product framing defined (parametric income protection, not indemnity insurance)
- [x] 5 parametric triggers defined, thresholds calibrated against Mumbai climate data
- [x] AI pricing and baseline model architecture designed
- [x] Anti-fraud and adversarial anti-spoofing architecture designed
- [x] Tech stack finalized
- [x] Repository and README established

### Phase 2 — Automation and Protection (March 21 – April 4)

- [x] Worker registration and onboarding flow with zone and shift declaration
- [x] Income baseline computation engine — 4-week rolling model with tolerance band
- [x] Weekly premium engine — Random Forest risk scoring with 5 input features
- [x] 5 parametric triggers connected to mock/live APIs with multi-signal validation
- [x] AS scoring pipeline — device motion, network, platform activity, environmental, behavioral signals
- [x] Claim auto-initiation and Soft Hold UX flow
- [x] Razorpay test mode + UPI simulator integration for sub-5-minute payout demo
- [x] Policy management module (Monday activation, Sunday expiry)

### Phase 3 — Scale and Optimise (April 5 – 17)

- [x] Full 3-layer fraud detection with fraud ring detection (DBSCAN clustering)
- [x] Worker dashboard — earnings protected, active coverage, disruption history
- [x] Insurer admin dashboard — loss ratios, AS distribution, syndicate alert queue
- [x] 6-hour ahead disruption push alerts based on forecast API data
- [x] Final demo build — simulated live disruption, AS scoring, auto-payout walkthrough
- [ ] Final pitch deck (PDF)

---

## 13. Deliverables

| Deliverable | Description | Target Phase |
|---|---|---|
| Persona-optimized onboarding | Food delivery specific registration with zone declaration and shift profile | Phase 2 |
| AI risk profiling | Random Forest weekly premium engine with 5-variable scoring | Phase 2 |
| Income baseline engine | 4-week rolling baseline with ±25% tolerance band | Phase 2 |
| Dynamic weekly policy | Per-worker policy creation, Monday activation cycle | Phase 2 |
| 5 parametric triggers | Automated income-loss triggers via API integration with multi-signal validation | Phase 2 |
| Micro-payout disbursement | Mock Razorpay / UPI simulator with sub-5-minute payout | Phase 2 |
| Anti-spoofing AS engine | 5-class signal scoring via Isolation Forest model | Phase 2 |
| Fraud ring detection system | DBSCAN clustering on claim timestamp, device fingerprint, and network signals | Phase 3 |
| Worker analytics dashboard | Earnings protected, coverage status, disruption event history | Phase 3 |
| Insurer admin dashboard | Loss ratios, AS distribution, syndicate alert queue | Phase 3 |
| 5-minute demo video | Live disruption simulation with automated claim and payout walkthrough | Phase 3 |
| Final pitch deck | Persona, ML architecture, fraud strategy, business model viability | Phase 3 |

---

## 14. Future Scope

Rydex's Phase 1 and Phase 2 architecture is deliberately scoped to a single city (Mumbai) and a single persona (Swiggy / Zomato delivery riders). The following expansions are planned as validated follow-on phases:

| Initiative | Description | Dependency |
|---|---|---|
| Multi-city rollout | Expand trigger calibration and zone risk indices to Delhi, Bengaluru, Chennai, and Hyderabad | Phase 3 completion + city-level GIS data partnerships |
| Platform API integration | Direct Swiggy / Zomato earnings API integration to replace screenshot-based baseline input | Platform partnership agreements |
| Expanded trigger library | Add fog visibility trigger, waterlogging severity index, and cyclone watch trigger for coastal cities | IMD API access + coastal city pilot |
| Advanced ML models | Replace Random Forest with gradient boosting ensemble; add LSTM-based disruption forecasting for 6-hour ahead premium adjustment | Labeled historical claim data from Phase 2–3 |
| Real-time insurer dashboard | Live loss ratio monitoring, AS distribution heatmaps, syndicate alert feed for insurer partners | Phase 3 admin portal |
| Worker financial tools | Weekly earnings summary, disruption history, projected income forecast, in-app savings nudge | Post-launch product extension |
| B2B white-label offering | Rydex engine licensed to insurance carriers as a parametric payout infrastructure layer | Commercial partnerships |

---

## 15. Constraints & Exclusions

The following are explicitly excluded per the DEVTrails 2026 problem statement and are not present anywhere in Rydex's architecture or payout logic:

| Excluded Category | Notes |
|---|---|
| Health insurance | No medical bill coverage of any kind |
| Life insurance | No death or disability benefit |
| Accident coverage | No personal injury or hospitalization payout |
| Vehicle repair | No coverage for bike, scooter, or vehicle damage |
| Monthly or daily pricing | Strictly weekly policy cycles only |
| Subjective income claims | All payouts are derived from modeled baselines, never self-declared figures |

### Assumptions & Known Limitations

| Limitation | Notes |
|---|---|
| External API dependency | Payout accuracy depends on the correctness and uptime of OpenWeatherMap, AQI, and Traffic APIs; degraded API data may delay trigger detection |
| Baseline cold-start | New workers require 2–4 weeks of platform activity data before a reliable income baseline can be established; onboarding week uses a zone-average proxy baseline |
| Platform data consistency | Earnings and dispatch data is assumed to be available and consistent; the current implementation uses a mocked platform API pending real integration agreements |
| GPS as supporting signal | While GPS is not the primary validation signal, it is still used as one input; persistent GPS failures in certain zones may reduce AS score accuracy |

---

**Pitch Deck:** [https://github.com/Sarthak-47/Rydex-Guidewire.git](https://drive.google.com/file/d/13nRarKxjw0FOds82DMw-NVlIhT_PW7jG/view?usp=drive_link)
**Repository:** https://github.com/Sarthak-47/Rydex-Guidewire.git
**Hackathon:** Guidewire DEVTrails 2026
**Phase 1 Submission:** March 20, 2026

---

*Rydex — Income protection that moves as fast as the gig economy does.*
