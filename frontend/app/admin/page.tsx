'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { claimsApi, Claim } from '@/lib/api'
import { motion } from 'framer-motion'

import ClaimModal from '@/components/ClaimModal'
import TriggerMap from '@/components/TriggerMap'
import MLScatterPlot from '@/components/MLScatterPlot'
import BlockchainLedger from '@/components/BlockchainLedger'
import { LossRatioPanel, FraudRingsPanel, SyndicateAlertQueue, ForecastPanel } from '@/components/AdminPhase3'
import AIAssistant from '@/components/AIAssistant'

interface AdminClaim extends Claim {
  worker_name?: string
}

export default function AdminPage() {
  const router = useRouter()
  const [claims, setClaims] = useState<AdminClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClaim, setSelectedClaim] = useState<AdminClaim | null>(null)
  const prevIdsRef = useRef<Set<string>>(new Set())
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('feed')

  const fetchClaims = useCallback(async () => {
    try {
      const r = await claimsApi.adminAll()
      const next = r.data as AdminClaim[]

      const nextIds = new Set(next.map((c) => c.id))
      const prev = prevIdsRef.current
      const newlyArrived = next.filter((c) => !prev.has(c.id)).map((c) => c.id)
      prevIdsRef.current = nextIds

      if (newlyArrived.length > 0) {
        setHighlightIds(new Set(newlyArrived))
        setTimeout(() => setHighlightIds(new Set()), 2500)
      }

      setClaims(next)
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClaims()
    const t = setInterval(fetchClaims, 5000)
    return () => clearInterval(t)
  }, [fetchClaims])

  const logout = () => {
    localStorage.removeItem('rydex_token')
    localStorage.removeItem('rydex_admin')
    router.push('/login')
  }

  const totalPaid = claims.reduce((a, c) => a + (c.payout_amount_rs || 0), 0)
  const autoApprovedCount = claims.filter((c) => c.status === 'auto_approved' || c.status === 'approved').length
  const autoApprovedPct = claims.length ? Math.round((autoApprovedCount / claims.length) * 100) : 0
  const flaggedCount = claims.filter((c) => c.status === 'flagged').length

  const asBuckets = [
    { label: 'Low', count: claims.filter((c) => c.as_score < 45).length },
    { label: 'Mid', count: claims.filter((c) => c.as_score >= 45 && c.as_score < 75).length },
    { label: 'High', count: claims.filter((c) => c.as_score >= 75).length },
  ]
  const maxBucket = Math.max(...asBuckets.map((b) => b.count), 1)

  const activeNodesCount = new Set(claims.filter(c => c.worker_id).map(c => c.worker_id)).size || 0
  const avgAS = claims.length
    ? Math.round(claims.reduce((acc, c) => acc + (c.as_score || 0), 0) / claims.length)
    : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#10162A]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 z-50 card-premium border-r border-white/10 shadow-2xl shadow-black/20 text-white">
        <div className="flex items-center justify-center h-[88px] border-b border-white/10">
          <img src="/rydex_dynamic_logo.png" alt="Rydex Logo" style={{ width: '285px', height: 'auto', objectFit: 'contain' }} />
        </div>
        <div className="px-8 py-6 border-b border-white/10 bg-black/10">
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mb-2">Total Disbursed</p>
          <p className="text-4xl font-black text-[var(--color-accent)] font-mono leading-none tracking-tighter">₹{totalPaid.toLocaleString()}</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-3 no-scrollbar">
          {[
            { id: 'feed', icon: 'analytics', label: 'Monitor' },
            { id: 'map', icon: 'map', label: 'Risk Map' },
            { id: 'ml', icon: 'data_thresholding', label: 'ML Analysis' },
            { id: 'ledger', icon: 'account_balance', label: 'Ledger' },
            { id: 'loss', icon: 'price_change', label: 'Loss Ratios' },
            { id: 'rings', icon: 'group_off', label: 'Fraud Rings' },
            { id: 'syndicate', icon: 'gpp_bad', label: 'Alert Queue' },
            { id: 'forecast', icon: 'cloud_upload', label: 'Forecast' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-[var(--color-accent)] text-white shadow-xl shadow-[var(--color-accent)]/20'
                  : 'text-white/40 hover:text-[var(--color-accent)] hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined">{tab.icon}</span>
              <span className="text-xs tracking-wider font-bold uppercase">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-white/10 bg-black/20 mt-auto">
          <button onClick={logout} className="w-full btn-danger py-4">
            <span className="material-symbols-outlined text-lg">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col md:pl-72">
        <header className="md:hidden fixed top-0 w-full z-50 flex justify-between items-center px-6 h-20 card-premium border-b border-white/10 shadow-sm">
          <img src="/rydex_dynamic_logo.png" alt="Rydex Logo" style={{ width: '240px', height: 'auto', objectFit: 'contain' }} />
          <button onClick={logout} className="text-white hover:text-[var(--color-accent)]">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </header>

        <main className="pb-32 pt-16 md:pt-10 px-6 md:px-8 max-w-7xl w-full mx-auto">
          {activeTab === 'feed' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              {/* Header */}
              <section className="pt-4">
                <h1 className="text-4xl font-headline font-black tracking-tighter mb-3 uppercase">Admin Dashboard</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-black/20 px-5 py-2 rounded-full border border-white/10">
                    <span className="animate-pulse h-2 w-2 rounded-full bg-[var(--color-accent)]"></span>
                    <span className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest">Live Monitoring</span>
                  </div>
                  <span className="badge-premium">{activeNodesCount} Active Workers</span>
                  <span className="badge-premium">{claims.length} Claims</span>
                </div>
              </section>

              {/* KPI strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Paid Out', value: `₹${totalPaid.toLocaleString()}`, icon: 'payments', color: 'text-green-400' },
                  { label: 'Auto-Approved', value: `${autoApprovedPct}%`, icon: 'verified', color: 'text-blue-400' },
                  { label: 'Flagged Claims', value: flaggedCount, icon: 'flag', color: 'text-red-400' },
                  { label: 'Avg AS Score', value: avgAS, icon: 'monitoring', color: 'text-[var(--color-accent)]' },
                ].map(stat => (
                  <div key={stat.label} className="card-premium rounded-2xl p-5">
                    <span className={`material-symbols-outlined text-xl mb-2 block ${stat.color}`}>{stat.icon}</span>
                    <p className={`font-mono font-black text-2xl ${stat.color}`}>{stat.value}</p>
                    <p className="text-white/40 text-[10px] font-bold mt-1 uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* Claims feed */}
                <div className="xl:col-span-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-2xl font-headline font-black tracking-tighter uppercase">Live Claims Feed</h4>
                    <div className="badge-premium px-6 flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-ping"></span>
                      Auto-refresh 5s
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {claims.length === 0 ? (
                      <div className="col-span-full py-24 text-center card-premium border-dashed">
                        <span className="material-symbols-outlined text-white/10 text-6xl mb-4 block">shield</span>
                        <p className="text-white/40 text-sm font-bold uppercase tracking-widest">No claims yet — system is ready</p>
                      </div>
                    ) : (
                      [...claims].reverse().slice(0, 12).map((c) => {
                        const isRecent = highlightIds.has(c.id)
                        const scoreCol = c.as_score >= 75 ? 'text-[var(--color-accent)]' : c.as_score >= 45 ? 'text-amber-500' : 'text-red-400'
                        const scoreBg = c.as_score >= 75 ? 'bg-[var(--color-accent)]/10' : c.as_score >= 45 ? 'bg-amber-500/10' : 'bg-red-500/10'

                        return (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={c.id}
                            onClick={() => setSelectedClaim(c)}
                            className={`group p-6 card-premium text-white rounded-2xl border border-white/10 cursor-pointer transition-all hover:bg-white/5 ${isRecent ? 'ring-2 ring-[var(--color-accent)]/60' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${scoreBg}`}>
                                <span className={`material-symbols-outlined text-lg ${scoreCol}`}>token</span>
                              </div>
                              <p className="text-lg font-black text-white tracking-tighter">₹{(c.payout_amount_rs || 0).toLocaleString()}</p>
                            </div>
                            <p className="text-xs font-black uppercase tracking-wider mb-3 truncate text-white/70 group-hover:text-white transition-colors">
                              {c.worker_name || `RID-${c.id.substring(0, 6).toUpperCase()}`}
                            </p>
                            <div className="flex items-center justify-between pt-3 border-t border-white/10">
                              <span className={`text-[10px] font-black font-mono px-3 py-1 rounded-full ${scoreBg} ${scoreCol}`}>{c.as_score || 0} AS</span>
                              <span className={`text-[10px] font-black uppercase tracking-wider ${c.status === 'auto_approved' || c.status === 'approved' ? 'text-green-400' : 'text-red-400'}`}>
                                {c.status === 'auto_approved' || c.status === 'approved' ? 'Approved' : 'Flagged'}
                              </span>
                            </div>
                          </motion.div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Sidebar stats */}
                <div className="xl:col-span-4 space-y-6">
                  <div className="card-premium rounded-2xl p-6 text-white">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-6">Auto-Approval Rate</p>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-black">
                        <span className="text-white/60">{autoApprovedCount} approved</span>
                        <span className="text-[var(--color-accent)]">{autoApprovedPct}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-accent)] rounded-full" style={{ width: `${autoApprovedPct}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="card-premium rounded-2xl p-6 text-white">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-6">AS Score Distribution</p>
                    <div className="flex items-end gap-4 h-28">
                      {asBuckets.map((b, i) => (
                        <div key={b.label} className="flex-1 flex flex-col justify-end items-center h-full">
                          <div
                            className={`w-full rounded-lg ${i === 0 ? 'bg-red-400' : i === 1 ? 'bg-amber-400' : 'bg-[var(--color-accent)]'}`}
                            style={{ height: `${Math.max(10, (b.count / maxBucket) * 100)}%` }}
                          />
                          <span className="mt-2 text-[9px] font-black text-white/40 uppercase tracking-wider">{b.label}</span>
                          <span className="text-[10px] font-mono font-black text-white">{b.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'map' && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
              <div>
                <h2 className="text-4xl font-headline font-black text-on-background tracking-tighter uppercase mb-2">Risk Map</h2>
                <p className="text-white/40 text-sm">Real-time trigger monitoring across Mumbai zones</p>
              </div>
              <div className="rounded-3xl min-h-[500px] h-[60vh] overflow-hidden shadow-2xl border border-white/10">
                <TriggerMap recentClaims={claims} />
              </div>
            </motion.div>
          )}

          {activeTab === 'ml' && <MLScatterPlot claims={claims} />}

          {activeTab === 'ledger' && (
            <BlockchainLedger
              payouts={claims
                .filter(c => (c.payout_amount_rs || 0) > 0)
                .map((c, i) => ({
                  id: c.id,
                  amount_rs: c.payout_amount_rs,
                  status: c.status === 'auto_approved' ? 'success' : 'pending',
                  latency_seconds: (i * 2) % 60 + 10,
                  upi_ref: c.status === 'auto_approved' ? `RYD-${c.id.substring(0, 6).toUpperCase()}` : 'PENDING',
                }))}
            />
          )}

          {activeTab === 'loss' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div>
                <h2 className="text-4xl font-headline font-black tracking-tighter uppercase text-on-background mb-2">Loss Ratios</h2>
                <p className="text-white/40 text-sm">Premium collected vs claims paid — per zone with weekly trend</p>
              </div>
              <LossRatioPanel />
            </motion.div>
          )}

          {activeTab === 'rings' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div>
                <h2 className="text-4xl font-headline font-black tracking-tighter uppercase text-on-background mb-2">Fraud Ring Detection</h2>
                <p className="text-white/40 text-sm">DBSCAN clustering on claim signals — coordinated fraud identification</p>
              </div>
              <FraudRingsPanel />
            </motion.div>
          )}

          {activeTab === 'syndicate' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div>
                <h2 className="text-4xl font-headline font-black tracking-tighter uppercase text-on-background mb-2">Syndicate Alert Queue</h2>
                <p className="text-white/40 text-sm">Claims in manual review — Isolation Forest anomaly flags</p>
              </div>
              <SyndicateAlertQueue />
            </motion.div>
          )}

          {activeTab === 'forecast' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div>
                <h2 className="text-4xl font-headline font-black tracking-tighter uppercase text-on-background mb-2">6-Hour Forecast Alerts</h2>
                <p className="text-white/40 text-sm">Disruption outlook across Mumbai zones — pre-reserve exposure buffer</p>
              </div>
              <ForecastPanel />
            </motion.div>
          )}

          {selectedClaim && (
            <ClaimModal
              claim={selectedClaim}
              onClose={() => setSelectedClaim(null)}
            />
          )}
        </main>
      </div>
      <AIAssistant />
    </div>
  )
}
