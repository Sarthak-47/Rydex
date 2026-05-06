'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { analyticsApi } from '@/lib/api'

interface WorkerSummary {
  worker_id: string
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

const PLATFORM_LABELS: Record<string, string> = {
  swiggy: 'Swiggy', zomato: 'Zomato', blinkit: 'Blinkit',
  dunzo: 'Dunzo', instamart: 'Instamart', other: 'Other',
}
const TRIGGER_EMOJI: Record<string, string> = {
  rainfall: '🌧️', heat: '🌡️', aqi: '💨', traffic: '🚦', flood: '🌊',
}
const TIER_COLORS: Record<string, string> = {
  basic: 'text-blue-400', plus: 'text-[var(--color-accent)]', storm: 'text-purple-400', none: 'text-white/30',
}

export default function ProfilePage() {
  const router = useRouter()
  const [summary, setSummary] = useState<WorkerSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (workerId: string) => {
    try {
      const res = await analyticsApi.workerSummary(workerId)
      setSummary(res.data)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('rydex_worker')
    if (!stored) { router.push('/login'); return }
    const { worker_id } = JSON.parse(stored)
    load(worker_id)
  }, [router, load])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] text-white">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-white/20 text-5xl block">person_off</span>
          <p className="text-white/40 font-bold text-sm">Profile data unavailable</p>
          <button onClick={() => router.push('/dashboard')} className="btn-secondary">Back</button>
        </div>
      </div>
    )
  }

  const capUsedPct = summary.coverage.cap_rs > 0
    ? Math.min(100, (summary.coverage.cap_used_rs / summary.coverage.cap_rs) * 100)
    : 0
  const tierLabel = summary.tier === 'none' ? 'No Policy' : `Shield ${summary.tier.charAt(0).toUpperCase() + summary.tier.slice(1)}`
  const tierColor = TIER_COLORS[summary.tier] || 'text-white'
  const maxChart = Math.max(...summary.weekly_chart.map(w => w.income_rs + w.protected_rs), 1)

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-white font-body">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-white/10 px-5 md:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <h1 className="text-base font-headline font-black text-white">My Profile</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 md:px-8 py-8 space-y-6">

        {/* Worker identity card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-premium rounded-2xl p-6 flex items-start justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-[var(--color-accent)]">person</span>
            </div>
            <div>
              <h2 className="text-xl font-headline font-black text-white">{summary.worker_name}</h2>
              <p className="text-sm text-white/40 font-bold">{summary.zone_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full">
                  {PLATFORM_LABELS[summary.platform] || summary.platform}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-wider ${tierColor}`}>
                  {tierLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Lifetime Protected</p>
            <p className="text-3xl font-black font-mono text-[var(--color-accent)] mt-0.5">
              ₹{Math.round(summary.total_protected_rs).toLocaleString('en-IN')}
            </p>
          </div>
        </motion.div>

        {/* Lifetime stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Claims Paid', value: summary.total_claims, icon: 'task_alt', color: 'text-green-400' },
            { label: 'Hours Disrupted', value: `${summary.total_disruption_hours.toFixed(1)}h`, icon: 'schedule', color: 'text-yellow-400' },
            { label: 'Hourly Baseline', value: `₹${Math.round(summary.baseline.hourly_rs)}`, icon: 'trending_up', color: 'text-[var(--color-accent)]' },
          ].map(stat => (
            <div key={stat.label} className="card-premium rounded-2xl p-5">
              <span className={`material-symbols-outlined text-xl mb-2 block ${stat.color}`}>{stat.icon}</span>
              <p className={`font-mono font-black text-2xl ${stat.color}`}>{stat.value}</p>
              <p className="text-white/40 text-[10px] font-bold mt-1 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Current coverage */}
        {summary.coverage.status !== 'no_policy' && (
          <div className="card-premium rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Current Coverage</h3>
              <span className="text-[10px] font-black text-green-400 bg-green-500/10 border border-green-500/30 px-3 py-1 rounded-full uppercase tracking-widest">
                Active
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Weekly Premium</p>
                <p className="text-xl font-black font-mono text-white mt-0.5">₹{Math.round(summary.coverage.premium_rs)}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Coverage Cap</p>
                <p className="text-xl font-black font-mono text-white mt-0.5">₹{summary.coverage.cap_rs.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-white/40">Used: ₹{Math.round(summary.coverage.cap_used_rs).toLocaleString('en-IN')}</span>
                <span className="text-[var(--color-accent)]">Remaining: ₹{Math.round(summary.coverage.cap_remaining_rs).toLocaleString('en-IN')}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${capUsedPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-[var(--color-accent)] rounded-full"
                />
              </div>
            </div>
            {summary.coverage.week_end && (
              <p className="text-[10px] text-white/30 font-bold">
                Expires {new Date(summary.coverage.week_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        )}

        {/* Weekly protection chart */}
        {summary.weekly_chart.length > 0 && (
          <div className="card-premium rounded-2xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-6">8-Week Earnings vs Protection</h3>
            <div className="flex items-end gap-2 h-32">
              {summary.weekly_chart.map((week, i) => {
                const incomeH = maxChart > 0 ? (week.income_rs / maxChart) * 100 : 0
                const protH = maxChart > 0 ? (week.protected_rs / maxChart) * 100 : 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                    <div className="w-full flex flex-col items-center gap-0.5 justify-end h-full">
                      {week.protected_rs > 0 && (
                        <div
                          className="w-full bg-[var(--color-accent)] rounded-t-sm opacity-90"
                          style={{ height: `${protH}%` }}
                          title={`Protected: ₹${Math.round(week.protected_rs)}`}
                        />
                      )}
                      <div
                        className="w-full bg-white/20 rounded-t-sm"
                        style={{ height: `${Math.max(4, incomeH)}%` }}
                        title={`Income: ₹${Math.round(week.income_rs)}`}
                      />
                    </div>
                    <p className="text-[8px] text-white/30 font-bold mt-1 truncate w-full text-center">{week.week.split(' ')[0]}</p>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-white/20" />
                <span className="text-[10px] text-white/30 font-bold">Estimated income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[var(--color-accent)]" />
                <span className="text-[10px] text-white/30 font-bold">Rydex payout</span>
              </div>
            </div>
          </div>
        )}

        {/* Disruption type breakdown */}
        {Object.keys(summary.trigger_breakdown).length > 0 && (
          <div className="card-premium rounded-2xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-4">Disruptions by Type</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(summary.trigger_breakdown).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                  <span className="text-lg">{TRIGGER_EMOJI[type] || '⚡'}</span>
                  <div>
                    <p className="text-xs font-black text-white capitalize">{type}</p>
                    <p className="text-[10px] text-white/40 font-bold">{count} event{count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AS score timeline */}
        {summary.as_timeline.length > 0 && (
          <div className="card-premium rounded-2xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-4">Recent Claim History</h3>
            <div className="space-y-2">
              {summary.as_timeline.slice(-10).reverse().map((entry, i) => {
                const scoreColor = entry.as_score >= 75 ? 'text-green-400' : entry.as_score >= 45 ? 'text-yellow-400' : 'text-red-400'
                const scoreBg = entry.as_score >= 75 ? 'bg-green-500/10' : entry.as_score >= 45 ? 'bg-yellow-500/10' : 'bg-red-500/10'
                return (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${scoreBg} ${scoreColor}`}>
                        AS {Math.round(entry.as_score)}
                      </span>
                      <span className="text-[11px] text-white/40 font-bold">{entry.date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold uppercase ${
                        entry.status === 'auto_approved' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {entry.status === 'auto_approved' ? 'Approved' : entry.status.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-black font-mono text-white">₹{Math.round(entry.payout_rs)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
