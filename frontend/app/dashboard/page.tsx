'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { policiesApi, claimsApi, payoutsApi, triggerEventsApi, analyticsApi, Policy, Claim, Payout, TriggerEvent, ForecastAlert } from '@/lib/api'
import ClaimsList from '@/components/ClaimsList'
import ScoreGauge from '@/components/ScoreGauge'

const TRIGGER_ICONS: Record<string, string> = {
  rainfall: '🌧️', heat: '🌡️', aqi: '💨', traffic: '🚦', flood: '🌊',
}
const TRIGGER_COLORS: Record<string, string> = {
  rainfall: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  heat: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
  aqi: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
  traffic: 'from-red-500/20 to-red-600/10 border-red-500/30',
  flood: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
}
const SEVERITY_COLORS: Record<string, string> = {
  HIGH: 'text-red-400 bg-red-500/10 border-red-500/30',
  MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  LOW: 'text-green-400 bg-green-500/10 border-green-500/30',
}

export default function DashboardPage() {
  const router = useRouter()
  const [worker, setWorker] = useState<{ worker_id: string; name: string; zone_id?: string; zone_name?: string } | null>(null)
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [claims, setClaims] = useState<Claim[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [triggerEvents, setTriggerEvents] = useState<TriggerEvent[]>([])
  const [forecastAlerts, setForecastAlerts] = useState<ForecastAlert[]>([])
  const [zoneImpact, setZoneImpact] = useState<{ affected_workers: number; avg_impact_rs: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview')
  const [refreshLedger, setRefreshLedger] = useState(0)

  const fetchAll = useCallback(async (workerId: string, zoneId?: string) => {
    try {
      const [p, c, pay] = await Promise.all([
        policiesApi.getActive(workerId),
        claimsApi.list(workerId),
        payoutsApi.list(workerId),
      ])
      setPolicy(p.data)
      setClaims(c.data)
      setPayouts(pay.data)

      if (zoneId) {
        const [te, fc] = await Promise.all([
          triggerEventsApi.list(zoneId),
          analyticsApi.forecastAlerts(zoneId),
        ])
        setTriggerEvents(te.data)
        const alerts: ForecastAlert[] = fc.data?.alerts || []
        setForecastAlerts(alerts.filter((a: ForecastAlert) => a.zone_id === zoneId).slice(0, 3))
        const workerCount = alerts.find((a: ForecastAlert) => a.zone_id === zoneId)?.workers_at_risk || 0
        const avgImpact = alerts.find((a: ForecastAlert) => a.zone_id === zoneId)?.expected_payout_per_worker_rs || 0
        if (workerCount > 0) setZoneImpact({ affected_workers: workerCount, avg_impact_rs: avgImpact })
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('rydex_worker')
    if (!stored) { router.push('/login'); return }
    const w = JSON.parse(stored)
    setWorker(w)
    fetchAll(w.worker_id, w.zone_id)
  }, [router, fetchAll])

  function logout() {
    localStorage.removeItem('rydex_token')
    localStorage.removeItem('rydex_worker')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-2 border-[var(--color-accent)] border-t-transparent rounded-full"
          />
          <p className="text-white/40 text-xs font-black uppercase tracking-widest">Loading your shield...</p>
        </div>
      </div>
    )
  }

  const capUsedPct = policy ? Math.round((policy.amount_paid_rs / policy.coverage_cap_rs) * 100) : 0
  const tierLabel = { basic: 'Basic Shield', plus: 'Advanced Shield', storm: 'Storm Shield' }[policy?.tier || ''] || 'Shield'
  const protectedThisWeek = payouts.filter(p => p.status === 'success').reduce((a, p) => a + (p.amount_rs || 0), 0)
  const hoursCovered = claims.reduce((a, c) => a + (c.disrupted_hours || 0), 0)
  const claimsApproved = claims.filter(c => c.status === 'auto_approved').length
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  const navItems = [
    { id: 'overview' as const, icon: 'security', label: 'Overview' },
    { id: 'history' as const, icon: 'receipt_long', label: 'History' },
  ]

  return (
    <div className="bg-background font-body text-on-background min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50 card-premium border-r border-white/10 shadow-2xl">
        <div className="flex items-center justify-center h-20 border-b border-white/10 px-6">
          <img src="/rydex_dynamic_logo.png" alt="Rydex" className="h-10 object-contain" />
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                activeTab === item.id
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => router.push('/analytics')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold text-white/60 hover:text-white hover:bg-white/5"
          >
            <span className="material-symbols-outlined text-xl">bar_chart</span>
            <span>Analytics</span>
          </button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-sm font-bold"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col md:pl-64">
        {/* Mobile header */}
        <header className="md:hidden fixed top-0 w-full z-50 flex justify-between items-center px-5 h-16 bg-background/90 backdrop-blur-xl border-b border-white/10">
          <img src="/rydex_dynamic_logo.png" alt="Rydex" className="h-8 object-contain" />
          <button onClick={logout} className="text-white/60 hover:text-white">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </header>

        <main className="pt-20 md:pt-8 pb-28 md:pb-10 px-5 md:px-8 max-w-6xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-headline font-black tracking-tight text-white">
                      {greeting}, {worker?.name?.split(' ')[0] || 'Rider'}
                    </h1>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 text-[var(--color-accent)] text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                        Policy Active
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-bold">
                        {worker?.zone_name || 'Mumbai'}
                      </span>
                    </div>
                  </div>
                  <ScoreGauge value={100 - capUsedPct} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Protected', value: `₹${Math.round(protectedThisWeek).toLocaleString()}`, icon: 'payments', color: 'text-green-400' },
                    { label: 'Hours Covered', value: `${hoursCovered.toFixed(1)}h`, icon: 'timer_off', color: 'text-blue-400' },
                    { label: 'Claims', value: claimsApproved, icon: 'task_alt', color: 'text-purple-400' },
                  ].map(stat => (
                    <div key={stat.label} className="card-premium p-4 md:p-5">
                      <span className={`material-symbols-outlined text-xl mb-2 block ${stat.color}`}>{stat.icon}</span>
                      <p className="font-mono font-black text-xl text-white">{stat.value}</p>
                      <p className="text-white/40 text-xs font-bold mt-1 uppercase tracking-wider">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Predictive Alerts + Triggers */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Predictive Alerts */}
                    {forecastAlerts.length > 0 && (
                      <section>
                        <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">
                          Upcoming Disruptions
                        </h2>
                        <div className="space-y-3">
                          {forecastAlerts.map((alert, i) => (
                            <motion.div
                              key={alert.alert_id}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.08 }}
                              className={`rounded-2xl border bg-gradient-to-r p-4 ${TRIGGER_COLORS[alert.trigger_type] || 'from-white/5 to-white/0 border-white/10'}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{TRIGGER_ICONS[alert.trigger_type] || '⚡'}</span>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-sm font-black text-white capitalize">{alert.trigger_type} forecast</p>
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[alert.severity] || ''}`}>
                                        {alert.severity}
                                      </span>
                                    </div>
                                    <p className="text-xs text-white/50 font-bold">
                                      In ~{alert.expected_onset_hours_from_now.toFixed(1)}h · {alert.expected_duration_mins}min · {alert.probability_pct}% probability
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-black text-white">₹{Math.round(alert.expected_payout_per_worker_rs)}</p>
                                  <p className="text-[10px] text-white/40 font-bold">est. payout</p>
                                </div>
                              </div>
                              <p className="text-xs text-white/50 mt-2 font-medium">
                                💡 {alert.recommendation.split('.')[0]}.
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Zone Impact */}
                    {zoneImpact && (
                      <div className="card-premium p-4 flex items-center justify-between rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[var(--color-accent)] text-lg">groups</span>
                          </div>
                          <div>
                            <p className="text-sm font-black text-white">Zone Impact</p>
                            <p className="text-xs text-white/40 font-bold">{worker?.zone_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-white">{zoneImpact.affected_workers}</p>
                          <p className="text-xs text-white/40 font-bold">riders at risk</p>
                        </div>
                        <button
                          onClick={() => router.push('/analytics')}
                          className="ml-4 text-[var(--color-accent)] hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                      </div>
                    )}

                    {/* Recent Trigger Events */}
                    <section>
                      <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">
                        Live Trigger Events
                      </h2>
                      <div className="card-premium rounded-2xl overflow-hidden">
                        {triggerEvents.length === 0 ? (
                          <div className="p-8 text-center">
                            <span className="material-symbols-outlined text-3xl text-white/20 mb-2 block">sensors</span>
                            <p className="text-xs text-white/30 font-bold uppercase tracking-widest">No active triggers</p>
                          </div>
                        ) : (
                          triggerEvents.slice(0, 4).map((ev, i) => (
                            <div key={ev.id} className={`p-4 flex items-center justify-between ${i < triggerEvents.length - 1 ? 'border-b border-white/5' : ''}`}>
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{TRIGGER_ICONS[ev.trigger_type] || '⚡'}</span>
                                <div>
                                  <p className="text-sm font-black text-white capitalize">{ev.trigger_type}</p>
                                  <p className="text-xs text-white/40 font-bold">
                                    {ev.triggered_at ? new Date(ev.triggered_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-black px-3 py-1 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                                Verified
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </div>

                  {/* Right: Policy Card + Payouts */}
                  <div className="space-y-5">
                    {policy && (
                      <div className="card-premium rounded-2xl p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1">Active Policy</p>
                            <h3 className="text-xl font-headline font-black text-white">{tierLabel}</h3>
                          </div>
                          <span className="material-symbols-outlined text-[var(--color-accent)] text-2xl">shield</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {[
                            { label: 'Weekly Cap', value: `₹${policy.coverage_cap_rs.toLocaleString()}` },
                            { label: 'Premium', value: `₹${policy.weekly_premium_rs}` },
                            { label: 'Used', value: `₹${Math.round(policy.amount_paid_rs).toLocaleString()}` },
                            { label: 'Remaining', value: `₹${Math.round(policy.cap_remaining_rs).toLocaleString()}` },
                          ].map(item => (
                            <div key={item.label}>
                              <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{item.label}</p>
                              <p className="font-mono font-black text-white text-sm mt-0.5">{item.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(100 - capUsedPct, 2)}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full bg-[var(--color-accent)] rounded-full"
                          />
                        </div>
                        <p className="text-[10px] text-white/30 font-bold mt-1.5 text-right">{100 - capUsedPct}% remaining</p>
                      </div>
                    )}

                    {/* Recent Payouts */}
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Recent Payouts</h2>
                      <div className="space-y-2">
                        {payouts.length === 0 ? (
                          <div className="card-premium rounded-2xl p-6 text-center">
                            <p className="text-xs text-white/30 font-bold">No payouts yet</p>
                          </div>
                        ) : (
                          payouts.slice(0, 3).map(p => (
                            <div key={p.id} className="card-premium rounded-xl p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-green-400 text-base">payments</span>
                                </div>
                                <div>
                                  <p className="font-mono font-black text-white text-sm">₹{p.amount_rs.toLocaleString()}</p>
                                  <p className="text-[10px] text-white/40 font-bold">UPI • {p.status}</p>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-green-400">✓</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && worker && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h1 className="text-2xl font-headline font-black text-white">Claims History</h1>
                <ClaimsList workerId={worker.worker_id} refreshTrigger={refreshLedger} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Mobile nav */}
        <nav className="md:hidden fixed bottom-0 w-full z-50 bg-background/95 backdrop-blur-xl border-t border-white/10">
          <div className="flex justify-around items-center h-16">
            {[
              { id: 'overview' as const, icon: 'security', label: 'Overview' },
              { id: 'history' as const, icon: 'receipt_long', label: 'History' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-[var(--color-accent)]' : 'text-white/40'}`}
              >
                <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => router.push('/analytics')}
              className="flex flex-col items-center gap-1 text-white/40 transition-all"
            >
              <span className="material-symbols-outlined text-2xl">bar_chart</span>
              <span className="text-[10px] font-black uppercase tracking-wider">Analytics</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}
