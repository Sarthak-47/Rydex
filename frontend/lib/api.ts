import axios from 'axios'

const API_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
    : (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('rydex_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('rydex_token')
      localStorage.removeItem('rydex_worker')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (phone: string, password: string) =>
    api.post('/auth/token', new URLSearchParams({ username: phone, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
}

// ── Workers ───────────────────────────────────────────────────────────────────
export const workersApi = {
  register: (data: RegisterPayload) => api.post('/workers/register', data),
  verifyOtp: (phone: string, otp: string) => api.post('/workers/verify-otp', { phone, otp }),
  getZones: () => api.get('/workers/zones'),
}

// ── Policies ──────────────────────────────────────────────────────────────────
export const policiesApi = {
  getActive: (workerId: string) => api.get(`/policies/active?worker_id=${workerId}`),
}

// ── Claims ────────────────────────────────────────────────────────────────────
export const claimsApi = {
  list: (workerId: string) => api.get(`/claims?worker_id=${workerId}`),
  adminAll: () => api.get('/claims/admin/all'),
}

// ── Payouts ───────────────────────────────────────────────────────────────────
export const payoutsApi = {
  list: (workerId: string) => api.get(`/payouts?worker_id=${workerId}`),
}

// ── Trigger Events ─────────────────────────────────────────────────────────────
export const triggerEventsApi = {
  list: (zoneId: string) => api.get(`/trigger-events?zone_id=${zoneId}`),
}

// ── Demo ──────────────────────────────────────────────────────────────────────
export const demoApi = {
  fireTrigger: (zoneId: string, triggerType: string, durationMinutes = 90) =>
    api.post('/demo/fire-trigger', {
      zone_id: zoneId,
      trigger_type: triggerType,
      duration_minutes: durationMinutes,
    }),
  fireFraudCase: (zoneId: string, durationMinutes = 90) =>
    api.post('/demo/fire-fraud-case', {
      zone_id: zoneId,
      duration_minutes: durationMinutes,
    }),
  resetDemoData: () => api.delete('/demo/reset-demo-data'),
  getScenario: () => api.get('/demo/scenario'),
}

// ── Analytics (Phase 3) ───────────────────────────────────────────────────────
export const analyticsApi = {
  lossRatios: () => api.get('/analytics/loss-ratios'),
  asDistribution: () => api.get('/analytics/as-distribution'),
  fraudRings: () => api.get('/analytics/fraud-rings'),
  syndicateAlerts: () => api.get('/analytics/syndicate-alerts'),
  forecastAlerts: (zoneId?: string) =>
    api.get(`/analytics/forecast-alerts${zoneId ? `?zone_id=${zoneId}` : ''}`),
  workerSummary: (workerId: string) =>
    api.get(`/analytics/worker-summary?worker_id=${workerId}`),
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface RegisterPayload {
  name: string
  phone: string
  password: string
  platform: string
  zone_id: string
  shift_start: string
  shift_end: string
  shift_type: string
  pin_code: string
}

export interface Policy {
  id: string
  tier: string
  weekly_premium_rs: number
  coverage_cap_rs: number
  amount_paid_rs: number
  cap_remaining_rs: number
  risk_score: number
  zone_factor: number
  seasonal_multiplier: number
  week_start: string
  week_end: string
  status: string
}

export interface Claim {
  id: string
  worker_id?: string
  worker_name?: string
  status: string
  as_score: number
  payout_amount_rs: number
  disrupted_hours: number
  hourly_baseline_rs: number
  as_multiplier: number
  as_breakdown: {
    signal_scores: Record<string, number>
    iso_anomaly_flag: boolean
    explanation: string
  }
  created_at: string
  resolved_at: string | null
}

export interface Payout {
  id: string
  amount_rs: number
  upi_ref: string
  status: string
  latency_seconds: number
  initiated_at: string
  completed_at: string | null
}

export interface TriggerEvent {
  id: string
  zone_id: string
  zone_name: string
  trigger_type: string
  triggered_at: string
  threshold_value: number
  threshold_limit: number
  duration_minutes: number
  is_demo: boolean
}

// ── Analytics Types ───────────────────────────────────────────────────────────
export interface ZoneLossRatio {
  zone_id: string
  zone_name: string
  flood_risk_index: number
  zone_factor: number
  worker_count: number
  total_premium_rs: number
  total_paid_rs: number
  loss_ratio: number
  approved_claims: number
  flagged_claims: number
  total_claims: number
  avg_payout_rs: number
  weekly_trend: Array<{
    week: string
    loss_ratio: number
    premium_rs: number
    paid_rs: number
  }>
}

export interface ASDistribution {
  buckets: Array<{ range: string; count: number; label: string }>
  signal_averages: Record<string, number>
  total_claims: number
  mean_as_score: number
  approved_count: number
  flagged_count: number
  fraud_rate_pct: number
  avg_approved_as: number
  avg_flagged_as: number
}

export interface FraudRing {
  ring_id: string
  member_count: number
  avg_as_score: number
  total_claimed_rs: number
  risk_level: string
  recommended_action: string
  members: Array<{
    worker_name: string
    as_score: number
    payout_rs: number
    status: string
    created_at: string
  }>
}

export interface SyndicateAlert {
  claim_id: string
  worker_id: string
  worker_name: string
  zone_name: string
  as_score: number
  iso_anomaly_flag: boolean
  payout_blocked_rs: number
  age_hours: number
  risk_tier: string
  explanation: string
  signal_scores: Record<string, number>
}

export interface ForecastAlert {
  alert_id: string
  zone_id: string
  zone_name: string
  trigger_type: string
  severity: string
  probability_pct: number
  expected_value: number
  threshold: number
  unit: string
  expected_onset_utc: string
  expected_onset_hours_from_now: number
  expected_duration_mins: number
  expected_payout_per_worker_rs: number
  workers_at_risk: number
  total_exposure_rs: number
  icon: string
  recommendation: string
}
