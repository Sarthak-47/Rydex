'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  Radar, CartesianGrid, Cell
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkerSummary {
  worker_name: string
  zone_name: string
  platform: string
  tier: string
  total_protected_rs: number
  total_claims: number
  total_disruption_hours: number
  coverage: {
    status: string
    cap_rs: number
    cap_used_rs: number
    cap_remaining_rs: number
    week_start: string | null
    week_end: string | null
    premium_rs: number
  }
  baseline: {
    hourly_rs: number
    daily_rs: number
    data_weeks: number
    cold_start_tier: string
  }
  trigger_breakdown: Record<string, number>
  weekly_chart: Array<{
    week: string
    income_rs: number
    protected_rs: number
    disruption_events: number
  }>
  as_timeline: Array<{
    date: string
    as_score: number
    status: string
    payout_rs: number
  }>
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
  expected_payout_per_worker_rs: number
  icon: string
  recommendation: string
}

// ─── Color tokens ─────────────────────────────────────────────────────────────

const ACCENT = '#00C896'
const ACCENT2 = '#00A3FF'
const WARN = '#FF6B35'
const BG = '#0A0F1A'
const CARD = '#111827'
const BORDER = '#1E2D45'
const TEXT_MUTED = '#6B7FA3'

const TRIGGER_ICONS: Record<string, string> = {
  rainfall: 'water_drop',
  aqi: 'air',
  heat: 'thermostat',
  traffic: 'traffic',
  flood: 'flood',
}

const TRIGGER_COLORS: Record<string, string> = {
  rainfall: '#00A3FF',
  aqi: '#FF9F1C',
  heat: '#FF6B35',
  traffic: '#9B59B6',
  flood: '#00C896',
}

const STATUS_COLOR: Record<string, string> = {
  auto_approved: ACCENT,
  soft_hold: '#FF9F1C',
  manual_review: WARN,
}

// ─── Shared micro-components ──────────────────────────────────────────────────

function Card({ children, className = '', style }: { children: React.ReactNode; className?: string, style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: '1.5rem',
        ...style
      }}
    >
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
      {children}
    </div>
  )
}

function BigStat({ value, label, color = ACCENT, prefix = '', suffix = '' }:
  { value: string | number; label: string; color?: string; prefix?: string; suffix?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
        {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}{suffix}
      </div>
    </div>
  )
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
      borderRadius: 6,
      padding: '2px 10px',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    }}>
      {text}
    </span>
  )
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1A2540',
      border: `1px solid ${BORDER}`,
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 13,
    }}>
      <div style={{ color: TEXT_MUTED, marginBottom: 6 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: ₹{p.value?.toLocaleString('en-IN')}
        </div>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router = useRouter()
  const [summary, setSummary] = useState<WorkerSummary | null>(null)
  const [forecasts, setForecasts] = useState<ForecastAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'forecast'>('overview')

  const load = useCallback(async (workerId: string, zoneId: string) => {
    try {
      const [sumRes, fcRes] = await Promise.all([
        api.get(`/analytics/worker-summary?worker_id=${workerId}`),
        api.get(`/analytics/forecast-alerts?zone_id=${zoneId}`),
      ])
      setSummary(sumRes.data)
      setForecasts(fcRes.data.alerts || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('rydex_worker')
    if (!stored) { router.push('/login'); return }
    const w = JSON.parse(stored)
    load(w.worker_id, w.zone_id)
  }, [router, load])

  function logout() {
    localStorage.removeItem('rydex_token')
    localStorage.removeItem('rydex_worker')
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
        <span className="material-symbols-outlined" style={{ color: ACCENT, fontSize: 40, animation: 'spin 1s linear infinite' }}>sync</span>
      </div>
    )
  }

  if (!summary) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, color: '#fff' }}>
        <p>No data available.</p>
      </div>
    )
  }

  const { coverage, baseline, trigger_breakdown, weekly_chart, as_timeline } = summary

  // Cap usage bar
  const capUsedPct = coverage.cap_rs > 0 ? (coverage.cap_used_rs / coverage.cap_rs) * 100 : 0

  // Radar data for AS signals
  const radarData = as_timeline.length > 0 ? [
    { signal: 'Motion', value: 78 },
    { signal: 'Network', value: 65 },
    { signal: 'Platform', value: 82 },
    { signal: 'Environment', value: 91 },
    { signal: 'History', value: 88 },
  ] : []

  // Trigger breakdown pie-like bars
  const triggerBars = Object.entries(trigger_breakdown).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    count,
    color: TRIGGER_COLORS[type] || '#888',
    icon: TRIGGER_ICONS[type] || 'bolt',
  }))

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'AS History' },
    { id: 'forecast', label: 'Forecast Alerts' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,15,26,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${BORDER}`,
        padding: '0 1.5rem',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <span style={{ fontWeight: 800, fontSize: 18 }}>
            <span style={{ color: ACCENT }}>Rydex</span> Analytics
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: TEXT_MUTED, fontSize: 13 }}>{summary.worker_name} · {summary.zone_name}</span>
          <button onClick={logout} style={{ background: 'none', border: `1px solid ${BORDER}`, color: TEXT_MUTED, borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Hero stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <Card>
            <BigStat value={summary.total_protected_rs} label="Total Earnings Protected" prefix="₹" color={ACCENT} />
          </Card>
          <Card>
            <BigStat value={summary.total_claims} label="Approved Claims" color={ACCENT2} />
          </Card>
          <Card>
            <BigStat value={summary.total_disruption_hours} label="Hours Disrupted" suffix="h" color={WARN} />
          </Card>
          <Card>
            <BigStat value={`₹${baseline.hourly_rs}`} label="Hourly Baseline" color="#9B59B6" />
          </Card>
        </div>

        {/* Coverage status card */}
        <Card className="mb-4" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <Label>Active Coverage</Label>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                Shield {summary.tier.charAt(0).toUpperCase() + summary.tier.slice(1)}
              </div>
            </div>
            <Badge
              text={coverage.status === 'active' ? 'ACTIVE' : coverage.status}
              color={coverage.status === 'active' ? ACCENT : WARN}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 16 }}>
            <div>
              <Label>Weekly Premium</Label>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>₹{coverage.premium_rs}</div>
            </div>
            <div>
              <Label>Coverage Cap</Label>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>₹{coverage.cap_rs.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <Label>Cap Remaining</Label>
              <div style={{ color: ACCENT, fontWeight: 700, fontSize: 20 }}>₹{coverage.cap_remaining_rs.toLocaleString('en-IN')}</div>
            </div>
          </div>
          {/* Cap bar */}
          <div style={{ background: '#1A2540', borderRadius: 8, height: 10, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(capUsedPct, 100)}%`,
              height: '100%',
              background: capUsedPct > 80 ? WARN : ACCENT,
              borderRadius: 8,
              transition: 'width 0.8s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: TEXT_MUTED }}>
            <span>₹{coverage.cap_used_rs} used</span>
            <span>{capUsedPct.toFixed(1)}% of cap</span>
          </div>
        </Card>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                padding: '8px 20px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                background: activeTab === t.id ? ACCENT : BORDER,
                color: activeTab === t.id ? '#000' : TEXT_MUTED,
                transition: 'all 0.2s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            {/* Weekly income chart */}
            <Card>
              <Label>Weekly Income vs Protection Received</Label>
              <div style={{ marginTop: 16, height: 220 }}>
                {weekly_chart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekly_chart} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                      <XAxis dataKey="week" tick={{ fill: TEXT_MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: TEXT_MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="income_rs" name="Net Income" fill={ACCENT2} radius={[4,4,0,0]} />
                      <Bar dataKey="protected_rs" name="Protected" fill={ACCENT} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color: TEXT_MUTED, textAlign: 'center', paddingTop: 60, fontSize: 13 }}>
                    No disruption data yet — fire a trigger from dashboard.
                  </div>
                )}
              </div>
            </Card>

            {/* Trigger breakdown */}
            <Card>
              <Label>Disruption Type Breakdown</Label>
              <div style={{ marginTop: 16 }}>
                {triggerBars.length > 0 ? (
                  triggerBars.map(t => (
                    <div key={t.name} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="material-symbols-outlined" style={{ color: t.color, fontSize: 18 }}>{t.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</span>
                        <span style={{ marginLeft: 'auto', color: t.color, fontWeight: 700 }}>{t.count}</span>
                      </div>
                      <div style={{ background: '#1A2540', borderRadius: 6, height: 6 }}>
                        <div style={{
                          width: `${Math.min((t.count / Math.max(...triggerBars.map(x => x.count))) * 100, 100)}%`,
                          height: '100%',
                          background: t.color,
                          borderRadius: 6,
                        }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: TEXT_MUTED, fontSize: 13, paddingTop: 20 }}>
                    No disruptions recorded yet.
                  </div>
                )}
              </div>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
                <Label>Baseline Data Quality</Label>
                <div style={{ fontSize: 14, color: '#fff', marginTop: 4 }}>
                  {baseline.data_weeks} weeks of history
                  {baseline.cold_start_tier !== 'worker' && (
                    <span style={{ color: '#FF9F1C', fontSize: 12, marginLeft: 8 }}>
                      ({baseline.cold_start_tier} proxy)
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab: AS Timeline */}
        {activeTab === 'timeline' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            <Card>
              <Label>Authenticity Score Over Claims</Label>
              <div style={{ marginTop: 16, height: 240 }}>
                {as_timeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={as_timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                      <XAxis dataKey="date" tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: TEXT_MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) =>
                          active && payload?.length ? (
                            <div style={{ background: '#1A2540', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
                              <div style={{ color: TEXT_MUTED, marginBottom: 4 }}>{label}</div>
                              <div style={{ color: ACCENT, fontWeight: 700 }}>AS: {payload[0].value}</div>
                              <div style={{ color: '#fff', fontSize: 12 }}>₹{payload[0].payload.payout_rs}</div>
                              <Badge text={payload[0].payload.status} color={STATUS_COLOR[payload[0].payload.status] || '#888'} />
                            </div>
                          ) : null
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="as_score"
                        stroke={ACCENT}
                        strokeWidth={2}
                        dot={{ fill: ACCENT, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color: TEXT_MUTED, textAlign: 'center', paddingTop: 80, fontSize: 13 }}>
                    No claims yet. Fire a trigger from the dashboard.
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <Label>Signal Profile (Avg)</Label>
              <div style={{ height: 200, marginTop: 8 }}>
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke={BORDER} />
                      <PolarAngleAxis dataKey="signal" tick={{ fill: TEXT_MUTED, fontSize: 11 }} />
                      <Radar dataKey="value" stroke={ACCENT} fill={ACCENT} fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color: TEXT_MUTED, fontSize: 13, paddingTop: 60, textAlign: 'center' }}>No signal data.</div>
                )}
              </div>
              <div style={{ marginTop: 12 }}>
                {as_timeline.slice(-3).reverse().map((entry, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i > 0 ? `1px solid ${BORDER}` : undefined, fontSize: 13 }}>
                    <span style={{ color: TEXT_MUTED }}>{entry.date}</span>
                    <span style={{ color: ACCENT, fontWeight: 700 }}>AS {entry.as_score?.toFixed(0)}</span>
                    <span style={{ color: '#fff' }}>₹{entry.payout_rs}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Tab: Forecast */}
        {activeTab === 'forecast' && (
          <div>
            {forecasts.length === 0 ? (
              <Card>
                <div style={{ color: TEXT_MUTED, textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
                  No disruption alerts in the next 6 hours for your zone.
                </div>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {forecasts.map(alert => (
                  <Card key={alert.alert_id}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{
                        width: 48, height: 48,
                        borderRadius: 12,
                        background: (alert.severity === 'HIGH' ? WARN : ACCENT2) + '22',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span className="material-symbols-outlined" style={{ color: alert.severity === 'HIGH' ? WARN : ACCENT2, fontSize: 24 }}>
                          {alert.icon}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, textTransform: 'capitalize' }}>
                            {alert.trigger_type} Alert
                          </span>
                          <Badge text={alert.severity} color={alert.severity === 'HIGH' ? WARN : ACCENT2} />
                          <span style={{ marginLeft: 'auto', color: TEXT_MUTED, fontSize: 12 }}>
                            in ~{alert.expected_onset_hours_from_now}h
                          </span>
                        </div>
                        <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 8 }}>
                          Expected {alert.expected_value} {alert.unit} (threshold: {alert.threshold}) ·{' '}
                          ~{alert.expected_duration_mins} min duration
                        </div>
                        <div style={{ display: 'flex', gap: 24 }}>
                          <div>
                            <Label>Probability</Label>
                            <div style={{ fontWeight: 700, color: WARN }}>{alert.probability_pct}%</div>
                          </div>
                          <div>
                            <Label>Est. Payout</Label>
                            <div style={{ fontWeight: 700, color: ACCENT }}>₹{alert.expected_payout_per_worker_rs}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(17,24,39,0.97)',
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${BORDER}`,
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 0',
      }}>
        {[
          { icon: 'shield', label: 'Shield', href: '/dashboard' },
          { icon: 'bar_chart', label: 'Analytics', href: '/analytics' },
        ].map(item => {
          const active = typeof window !== 'undefined' && window.location.pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                color: active ? ACCENT : TEXT_MUTED,
                minWidth: 64,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
