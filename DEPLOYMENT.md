# Deployment Guide

This guide covers deploying Rydex in production. The project ships with Docker Compose for local and self-hosted deployments.

---

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- A PostgreSQL 16 instance (or use the bundled `db` service)
- API keys for the external services you want to enable (all optional except `DATABASE_URL` and `JWT_SECRET`)

---

## Environment Setup

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

**Required:**
- `DATABASE_URL` — PostgreSQL connection string (overridden by Docker Compose if using the bundled db service)
- `JWT_SECRET` — Random 64-char string. Generate with `openssl rand -hex 32`

**Optional but recommended:**
- `OPENWEATHER_API_KEY` — Enables live 6-hour forecast alerts. Free tier at openweathermap.org
- `AQI_API_KEY` — Enables real AQI monitoring. Get at aqicn.org/data-platform/token
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — Test-mode UPI payouts. Sign up at razorpay.com
- `TWILIO_*` — OTP SMS for phone verification. Without this, OTP step is bypassed automatically

---

## Docker Compose (Recommended)

```bash
# Build and start all services (db, backend, frontend)
docker compose up --build -d

# Run database migrations and seed zones
docker compose exec backend alembic upgrade head
docker compose exec backend python -m db.seed

# View logs
docker compose logs -f backend
docker compose logs -f frontend
```

**Services:**
| Service | Port | Description |
|---|---|---|
| `frontend` | 3000 | Next.js worker app |
| `backend` | 8000 | FastAPI — API docs at /docs |
| `db` | 5432 | PostgreSQL 16 |

---

## Manual / VM Deployment

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head
python -m db.seed

# Start with gunicorn (production)
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=https://your-api-domain.com

npm install
npm run build
npm start
```

---

## Nginx Reverse Proxy (Example)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

---

## Scaling Notes

- The trigger monitor polls external APIs every 60 seconds in a background thread — only one instance should run this loop (use `TRIGGER_MONITOR_ENABLED=false` env var to disable on additional replicas)
- ML models (Random Forest, Isolation Forest) are trained on startup from the existing claim corpus; they warm up in ~2 seconds with an empty database
- PostgreSQL connection pooling is handled by SQLAlchemy — default pool size is 5; increase via `SQLALCHEMY_POOL_SIZE` if needed

---

## Health Check

```bash
curl http://localhost:8000/health
```

Returns:
```json
{
  "status": "ok",
  "has_weather_api": true,
  "has_payments": false,
  "has_sms": false
}
```

Use the `has_*` flags to confirm which optional integrations are active.
