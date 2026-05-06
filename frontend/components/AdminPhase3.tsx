'use client'
/**
 * Phase 3 admin components — imported and wired into the existing admin page.
 * Usage: add tabs 'loss', 'rings', 'syndicate', 'forecast' to the admin page's tab list,
 * then render the corresponding component.
 *
 * Drop this file at: frontend/components/AdminPhase3.tsx
 */

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Cell
} from 'recharts'

// ─── Shared design tokens ─────────────────────────────────────────────────────

const ACCENT = '#10B981' // Emerald
const ACCENT2 = '#38BDF8' // Sky Blue
const WARN = '#F59E0B' // Amber
const CRIT = '#EF4444' // Red
const BORDER = '#2A344A'
const MUTED = '#94A3B8'
const CARD_BG = '#10162A'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ZoneLossRatio {
  zone_id: string
  zone_name: string
  flood_risk_index: number
  worker_count: number
  total_premium_rs: number
  total_paid_rs: number
  loss_ratio: number
  approved_claims: number
  flagged_claims: number
  avg_payout_rs: number
  weekly_trend: Array<{ week: string; loss_ratio: number; premium_rs: number; paid_rs: number }>
}

interface FraudRingMember {
  worker_name: string
  as_score: number
  payout_rs: number
  status: string
  created_at: string
}

interface FraudRing {
  ring_id: string
  member_count: number
  avg_as_score: number
  total_claimed_rs: number
  risk_level: string
  recommended_action: string
  members: FraudRingMember[]
}

interface SyndicateAlert {
  claim_id: string
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

interface ForecastAlert {
  alert_id: string
  zone_name: string
  trigger_type: string
  severity: string
  probability_pct: number
  expected_value: number
  threshold: number
  unit: string
  expected_onset_hours_from_now: number
  expected_duration_mins: number
  workers_at_risk: number
  total_exposure_rs: number
  icon: string
  recommendation: string
}

// ─── Loss Ratio Panel ─────────────────────────────────────────────────────────

export function LossRatioPanel() {
  const [data, setData] = useState<{
    zones: ZoneLossRatio[]
    aggregate: { total_premium_rs: number; total_paid_rs: number; loss_ratio: number; total_claims: number; total_workers: number }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ZoneLossRatio | null>(null)

  useEffect(() => {
    api.get('/analytics/loss-ratios').then(r => {
      setData(r.data)
      if (r.data.zones?.length) setSelected(r.data.zones[0])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (!data) return null

  const { zones, aggregate } = data

  const lrColor = (lr: number) => lr > 0.8 ? CRIT : lr > 0.6 ? WARN : ACCENT

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Aggregate hero */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Portfolio Loss Ratio', value: (aggregate.loss_ratio * 100).toFixed(1) + '%', color: lrColor(aggregate.loss_ratio) },
          { label: 'Total Premiums Collected', value: '₹' + aggregate.total_premium_rs.toLocaleString('en-IN'), color: ACCENT },
          { label: 'Total Paid Out', value: '₹' + aggregate.total_paid_rs.toLocaleString('en-IN'), color: ACCENT2 },
          { label: 'Total Claims', value: aggregate.total_claims, color: '#fff' },
        ].map(s => (
          <div key={s.label} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px' }}>
            <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 26, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Zone table + sparkline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Table */}
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Zone Loss Ratios
          </div>
          {zones.map(z => (
            <div
              key={z.zone_id}
              onClick={() => setSelected(z)}
              style={{
                padding: '14px 20px',
                borderBottom: `1px solid ${BORDER}`,
                cursor: 'pointer',
                background: selected?.zone_id === z.zone_id ? 'rgba(0,200,150,0.07)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'background 0.2s',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{z.zone_name}</div>
                <div style={{ color: MUTED, fontSize: 12 }}>{z.worker_count} workers · {z.approved_claims} claims</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: lrColor(z.loss_ratio), fontWeight: 800, fontSize: 18 }}>{(z.loss_ratio * 100).toFixed(0)}%</div>
                <div style={{ color: MUTED, fontSize: 11 }}>loss ratio</div>
              </div>
              {/* Bar */}
              <div style={{ width: 60, background: '#0C1222', borderRadius: 4, height: 8, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
                <div style={{ width: `${Math.max(0, Math.min(100, z.loss_ratio * 100))}%`, height: '100%', background: lrColor(z.loss_ratio), borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Weekly trend sparkline */}
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <div style={{ color: MUTED, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            {selected?.zone_name ?? 'Zone'} — Weekly Loss Ratio Trend
          </div>
          <div style={{ height: 160 }}>
            {selected && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selected.weekly_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} opacity={0.5} />
                  <XAxis dataKey="week" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => (v * 100).toFixed(0) + '%'} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: any) => `${(Number(v) * 100).toFixed(1)}%`} contentStyle={{ background: '#0C1222', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="loss_ratio" stroke={ACCENT} strokeWidth={2} dot={{ fill: ACCENT, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          {selected && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
              {[
                { label: 'Avg Payout', value: '₹' + selected.avg_payout_rs, color: ACCENT },
                { label: 'Flagged', value: selected.flagged_claims, color: WARN },
                { label: 'Flood Risk', value: (selected.flood_risk_index * 100).toFixed(0) + '%', color: ACCENT2 },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
                  <div style={{ color: s.color, fontWeight: 800, fontSize: 18, marginTop: 2 }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Fraud Rings Panel ────────────────────────────────────────────────────────

export function FraudRingsPanel() {
  const [data, setData] = useState<{
    rings_detected: number
    noise_claims: number
    total_suspicious_claims: number
    rings: FraudRing[]
    algorithm: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    api.get('/analytics/fraud-rings').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (!data) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Fraud Rings Detected', value: data.rings_detected, color: CRIT },
          { label: 'Suspicious Claims', value: data.total_suspicious_claims, color: WARN },
          { label: 'Noise / Isolated', value: data.noise_claims, color: MUTED },
        ].map(s => (
          <div key={s.label} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
            <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 32, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ color: MUTED, fontSize: 12, fontStyle: 'italic' }}>
        Algorithm: {data.algorithm}
      </div>

      {/* Ring cards */}
      {data.rings.map(ring => {
        const isExpanded = expanded === ring.ring_id
        const riskColor = ring.risk_level === 'HIGH' ? CRIT : WARN

        return (
          <div key={ring.ring_id} style={{ background: CARD_BG, border: `1px solid ${riskColor}44`, borderRadius: 16, overflow: 'hidden' }}>
            <div
              onClick={() => setExpanded(isExpanded ? null : ring.ring_id)}
              style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: riskColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: riskColor, fontSize: 20 }}>groups</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
                    Ring #{ring.ring_id.split('_')[1]} — {ring.member_count} members
                  </span>
                  <span style={{ background: riskColor + '22', color: riskColor, border: `1px solid ${riskColor}44`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {ring.risk_level}
                  </span>
                </div>
                <div style={{ color: MUTED, fontSize: 13, marginTop: 2 }}>
                  Avg AS: {ring.avg_as_score.toFixed(1)} · Total claimed: ₹{ring.total_claimed_rs.toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ color: MUTED, fontSize: 13, fontStyle: 'italic', maxWidth: 220, textAlign: 'right' }}>
                {ring.recommended_action}
              </div>
              <span className="material-symbols-outlined" style={{ color: MUTED, fontSize: 20 }}>
                {isExpanded ? 'expand_less' : 'expand_more'}
              </span>
            </div>

            {isExpanded && (
              <div style={{ borderTop: `1px solid ${BORDER}`, padding: '16px 22px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {ring.members.map((m, i) => (
                    <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{m.worker_name}</div>
                      <div style={{ color: CRIT, fontWeight: 700, fontSize: 18, margin: '4px 0' }}>AS {m.as_score?.toFixed(0)}</div>
                      <div style={{ color: MUTED, fontSize: 12 }}>₹{m.payout_rs?.toLocaleString('en-IN') ?? 0} claimed</div>
                      <div style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>
                        {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Syndicate Alert Queue ────────────────────────────────────────────────────

export function SyndicateAlertQueue() {
  const [data, setData] = useState<{
    queue_depth: number
    total_blocked_rs: number
    critical_count: number
    high_count: number
    alerts: SyndicateAlert[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analytics/syndicate-alerts').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (!data) return null

  const tierColor = (t: string) => t === 'CRITICAL' ? CRIT : t === 'HIGH' ? WARN : '#FF9F1C'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Queue Depth', value: data.queue_depth, color: WARN },
          { label: 'Blocked Payouts', value: '₹' + data.total_blocked_rs.toLocaleString('en-IN'), color: CRIT },
          { label: 'Critical', value: data.critical_count, color: CRIT },
          { label: 'High', value: data.high_count, color: WARN },
        ].map(s => (
          <div key={s.label} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
            <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 26, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {data.alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: MUTED, fontSize: 14 }}>
          Queue empty — no workers in manual review.
          <br />
          <span style={{ fontSize: 12 }}>Fire a fraud case from the Trigger Engine tab to populate.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.alerts.map(alert => (
            <div key={alert.claim_id} style={{ background: CARD_BG, border: `1px solid ${tierColor(alert.risk_tier)}44`, borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: tierColor(alert.risk_tier) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: tierColor(alert.risk_tier), fontSize: 22 }}>gpp_bad</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{alert.worker_name}</span>
                    <span style={{ background: tierColor(alert.risk_tier) + '22', color: tierColor(alert.risk_tier), border: `1px solid ${tierColor(alert.risk_tier)}44`, borderRadius: 5, padding: '1px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {alert.risk_tier}
                    </span>
                    <span style={{ color: MUTED, fontSize: 12, marginLeft: 'auto' }}>
                      {alert.zone_name} · {alert.age_hours}h ago
                    </span>
                  </div>
                  <div style={{ color: MUTED, fontSize: 13, marginBottom: 8 }}>
                    AS Score: <span style={{ color: CRIT, fontWeight: 700 }}>{alert.as_score?.toFixed(0)}</span> ·{' '}
                    Blocked: <span style={{ color: WARN, fontWeight: 700 }}>₹{alert.payout_blocked_rs}</span> ·{' '}
                    {alert.explanation}
                  </div>
                  {/* Signal scores mini-bars */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    {Object.entries(alert.signal_scores || {}).map(([sig, val]) => (
                      <div key={sig} style={{ flex: 1, minWidth: 50 }}>
                        <div style={{ color: MUTED, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
                          {sig.split('_')[0]}
                        </div>
                        <div style={{ background: '#0C1222', borderRadius: 4, height: 6, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
                          <div style={{
                            width: `${Math.max(0, Math.min(100, Math.round(val as number)))}%`,
                            height: '100%',
                            background: (val as number) < 40 ? CRIT : (val as number) < 70 ? WARN : ACCENT,
                            borderRadius: 4,
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Forecast Panel ───────────────────────────────────────────────────────────

export function ForecastPanel() {
  const [data, setData] = useState<{
    generated_at: string
    alert_count: number
    total_exposure_rs: number
    alerts: ForecastAlert[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analytics/forecast-alerts').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (!data) return null

  const TRIGGER_ICONS: Record<string, string> = {
    rainfall: 'water_drop', aqi: 'air', heat: 'thermostat', traffic: 'traffic', flood: 'flood'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {[
          { label: '6-hr Alert Count', value: data.alert_count, color: WARN },
          { label: 'Total Risk Exposure', value: '₹' + data.total_exposure_rs.toLocaleString('en-IN'), color: CRIT },
          { label: 'Data Source', value: 'OWM Forecast API', color: MUTED },
        ].map(s => (
          <div key={s.label} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
            <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Alert cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {data.alerts.map(alert => {
          const sevColor = alert.severity === 'HIGH' ? WARN : ACCENT2
          return (
            <div key={alert.alert_id} style={{ background: CARD_BG, border: `1px solid ${sevColor}44`, borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: sevColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: sevColor, fontSize: 22 }}>
                    {TRIGGER_ICONS[alert.trigger_type] || 'bolt'}
                  </span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', textTransform: 'capitalize' }}>
                    {alert.trigger_type} — {alert.zone_name}
                  </div>
                  <div style={{ color: MUTED, fontSize: 12 }}>in ~{alert.expected_onset_hours_from_now}h</div>
                </div>
                <span style={{ marginLeft: 'auto', background: sevColor + '22', color: sevColor, border: `1px solid ${sevColor}44`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {alert.severity}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                <Stat label="Probability" value={alert.probability_pct + '%'} color={WARN} />
                <Stat label="Workers at Risk" value={alert.workers_at_risk} color="#fff" />
                <Stat label="Exposure" value={'₹' + Math.round(alert.total_exposure_rs).toLocaleString('en-IN')} color={CRIT} />
              </div>

              {/* Probability bar */}
              <div style={{ background: '#0C1222', borderRadius: 6, height: 6, marginBottom: 10, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
                <div style={{ width: alert.probability_pct + '%', height: '100%', background: alert.probability_pct > 70 ? WARN : ACCENT2, borderRadius: 6 }} />
              </div>

              <div style={{ color: MUTED, fontSize: 12, lineHeight: 1.5 }}>{alert.recommendation}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div>
      <div style={{ color: MUTED, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{label}</div>
      <div style={{ color, fontWeight: 700, fontSize: 14 }}>{value}</div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <span className="material-symbols-outlined animate-spin" style={{ color: ACCENT, fontSize: 36 }}>sync</span>
    </div>
  )
}
