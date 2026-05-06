# Rydex — Parametric Income Protection

> Guidewire DEVTrails 2026 | Phase 2 submission

## Quick start (Docker)

```bash
git clone https://github.com/Sarthak-47/Rydex-Guidewire.git
cd Rydex-Guidewire

# Add your OpenWeatherMap key (free tier works)
cp .env.example .env
# Edit .env and set OPENWEATHER_API_KEY=your_key

docker compose up --build
```

- Worker PWA → http://localhost:3000
- Insurer admin → http://localhost:3000/admin
- API docs → http://localhost:8000/docs

## Demo walkthrough

### Demo accounts
| Worker | Phone | Zone | Tier |
|--------|-------|------|------|
| Salim Khan | 9820001001 | Bandra West | Shield Basic |
| Priya Sharma | 9820001002 | Andheri West | Shield Storm |
| Arjun Nair | 9820001003 | Powai | Shield Basic |

Password: `demo1234` for all accounts.

### 2-minute demo script

1. **Login** as Salim → see active policy + premium breakdown with zone factor
2. **Fire trigger** → click "Fire rainfall trigger" on dashboard
3. **Watch** claim auto-created with AS score in ~3 seconds
4. **Confirm payout** → ₹340 credited with UPI reference

### Manual trigger (API)
```bash
curl -X POST http://localhost:8000/demo/fire-trigger \
  -H "Content-Type: application/json" \
  -d '{"zone_id": "zone-bandra", "trigger_type": "rainfall", "duration_minutes": 90}'
```

## Architecture

```
Worker PWA (Next.js 14)  →  FastAPI Core API  →  MySQL 8
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
              Baseline Engine  Trigger Monitor  AS Engine
              (4-week rolling) (own thread)    (Iso Forest)
                    │               │               │
              Premium Engine    Claim Processor  Payout
              (Random Forest)   (zero-touch)    (Razorpay mock)
```

## Phase 2 deliverables

| Deliverable | Status |
|-------------|--------|
| Registration + onboarding | ✅ |
| Insurance policy management | ✅ |
| Dynamic premium calculation (Random Forest + zone factor) | ✅ |
| Claims management (zero-touch, AS pipeline) | ✅ |
| 5 parametric triggers | ✅ |
| Isolation Forest fraud detection (contamination=0.03) | ✅ |
| Coverage cap enforcement | ✅ |
| 3-tier cold-start baseline | ✅ |
| API degraded-mode handling | ✅ |
| Trigger monitor as separate thread | ✅ |

## ML models

- `premium_rf.pkl` — Random Forest (100 trees), trained on 2,000 synthetic worker profiles. Features: disruption days, zone flood risk, shift type, income variance, seasonal flag.
- `fraud_iso.pkl` — Isolation Forest (200 trees, contamination=0.03), trained on 1,940 legitimate + 60 fraud claim patterns.

Models are pre-trained at Docker build time and loaded at startup.
