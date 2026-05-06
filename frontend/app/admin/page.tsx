'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { claimsApi, demoApi, Claim } from '@/lib/api'
import { motion } from 'framer-motion'

// Modern dynamic components for admin
import ClaimModal from '@/components/ClaimModal'
import TriggerMap from '@/components/TriggerMap'
import MLScatterPlot from '@/components/MLScatterPlot'
import BlockchainLedger from '@/components/BlockchainLedger'
// Phase 3 analytics panels
import { LossRatioPanel, FraudRingsPanel, SyndicateAlertQueue, ForecastPanel } from '@/components/AdminPhase3'
import AIAssistant from '@/components/AIAssistant'

interface AdminClaim extends Claim {
  worker_name?: string
}

const ZONES = [
  { id: 'zone-bandra',  label: 'Bandra West', risk: 0.82, factor: 1.35, pin: '400051' },
  { id: 'zone-dharavi', label: 'Dharavi–Sion', risk: 0.74, factor: 1.25, pin: '400017' },
  { id: 'zone-powai',   label: 'Powai', risk: 0.28, factor: 0.92, pin: '400092' },
  { id: 'zone-andheri', label: 'Andheri West', risk: 0.55, factor: 1.10, pin: '400058' },
  { id: 'zone-dadar',   label: 'Dadar', risk: 0.48, factor: 1.08, pin: '400016' },
]

const TRIGGERS = [
  { value: 'rainfall', label: 'Rainfall >50mm' },
  { value: 'aqi',      label: 'AQI >300'       },
  { value: 'heat',     label: 'Heat >40°C'     },
  { value: 'traffic',  label: 'Traffic <8km/h' },
  { value: 'flood',    label: 'Micro-flood'    },
]

export default function AdminPage() {
  const router = useRouter()
  const [claims, setClaims] = useState<AdminClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [triggerZone, setTriggerZone] = useState('zone-bandra')
  const [triggerType, setTriggerType] = useState('rainfall')
  const [triggerLoading, setTriggerLoading] = useState(false)
  const [triggerStatus, setTriggerStatus] = useState<'idle' | 'syncing' | 'verifying' | 'approved' | 'payout'>('idle')
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
    } catch (e) {
      console.error('Error fetching admin claims:', e)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClaims()
    const t = setInterval(fetchClaims, 5000)
    return () => clearInterval(t)
  }, [fetchClaims])

  const handleFire = async () => {
    setTriggerLoading(true)
    setTriggerStatus('syncing')
    try {
      await demoApi.fireTrigger(triggerZone, triggerType)
      
      setTimeout(() => setTriggerStatus('verifying'), 1200)
      setTimeout(() => setTriggerStatus('approved'), 2800)
      setTimeout(() => setTriggerStatus('payout'), 4200)
      
      let polls = 0
      const fastPoll = setInterval(() => {
        fetchClaims()
        polls++
        if (polls >= 4) clearInterval(fastPoll)
      }, 2500)

      setTimeout(() => {
        setTriggerStatus('idle')
        setTriggerLoading(false)
      }, 6000)
    } catch {
      setTriggerStatus('idle')
      setTriggerLoading(false)
      alert('Simulation error')
    }
  }

  const handleFireAnomaly = async () => {
    setTriggerLoading(true)
    setTriggerStatus('syncing')
    try {
      await demoApi.fireFraudCase(triggerZone)
      setTimeout(() => setTriggerStatus('verifying'), 1000)
      
      let polls = 0
      const fastPoll = setInterval(() => {
        fetchClaims()
        polls++
        if (polls >= 4) clearInterval(fastPoll)
      }, 2000)

      setTimeout(() => {
        setTriggerStatus('idle')
        setTriggerLoading(false)
      }, 5000)
    } catch {
      setTriggerStatus('idle')
      setTriggerLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('rydex_token')
    localStorage.removeItem('rydex_admin')
    router.push('/login')
  }

  const totalPaid = claims.reduce((a, c) => a + (c.payout_amount_rs || 0), 0)
  const autoApprovedCount = claims.filter((c) => c.status === 'auto_approved' || c.status === 'approved').length
  const autoApprovedPct = claims.length ? Math.round((autoApprovedCount / claims.length) * 100) : 0
  
  const asBuckets = [
    { label: 'Low', count: claims.filter((c) => c.as_score < 45).length },
    { label: 'Mid', count: claims.filter((c) => c.as_score >= 45 && c.as_score < 75).length },
    { label: 'High', count: claims.filter((c) => c.as_score >= 75).length },
  ]
  const maxBucket = Math.max(...asBuckets.map((b) => b.count), 1)
  
  const activeNodesCount = new Set(claims.filter(c => c.worker_id).map(c => c.worker_id)).size || 1
  const avgConfidence = claims.length 
    ? Math.round(claims.reduce((acc, c) => acc + (c.as_score || 0), 0) / claims.length) 
    : 99

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#10162A]">
         <span className="material-symbols-outlined animate-spin text-4xl text-[var(--color-accent)] font-black">sync</span>
      </div>
    )
  }

  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col md:flex-row">
      {/* Sidebar Pattern */}
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
                { id: 'ml', icon: 'data_thresholding', label: 'Analysis' },
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
                        : 'text-white/40 hover:text-[var(--color-accent)] hover:bg-white/5/5'
                    }`}
                >
                    <span className="material-symbols-outlined">{tab.icon}</span>
                    <span className="text-xs tracking-wider font-bold uppercase">{tab.label}</span>
                </button>
            ))}
        </nav>
        <div className="p-6 border-t border-white/10 bg-black/20 mt-auto">
            <button 
                onClick={logout}
                className="w-full btn-danger py-4"
            >
                <span className="material-symbols-outlined text-lg">logout</span>
                Logout
            </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 min-w-0 flex flex-col md:pl-72">
        <header className="md:hidden fixed top-0 w-full z-50 flex justify-between items-center px-6 h-20 card-premium border-b border-white/10 shadow-sm">
            <div className="flex items-center justify-center h-full">
                <img src="/rydex_dynamic_logo.png" alt="Rydex Logo" style={{ width: '240px', height: 'auto', objectFit: 'contain' }} />
            </div>
            <button onClick={logout} className="text-white hover:text-[var(--color-accent)]"><span className="material-symbols-outlined">logout</span></button>
        </header>

        <main className="pb-32 pt-16 md:pt-16 px-6 md:px-8 max-w-7xl w-full mx-auto">
            {activeTab === 'feed' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                        {/* Simulation Engine */}
                        <div className="xl:col-span-8 space-y-12">
                            <section>
                                <h1 className="text-4xl font-headline font-black tracking-tighter mb-4 uppercase">Admin Dashboard</h1>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-black/20 px-5 py-2 rounded-full border border-white/10 shadow-sm">
                                      <span className="animate-pulse h-2 w-2 rounded-full bg-[var(--color-accent)]"></span>
                                      <span className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest">System Online</span>
                                    </div>
                                    <span className="badge-premium">{activeNodesCount} Active Workers</span>
                                </div>
                            </section>

                            <section className="card-premium text-white rounded-3xl p-8 border border-white/10 shadow-2xl space-y-10">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-white/40">Disruption Simulator</h4>
                                    <span className="material-symbols-outlined text-white/20">psychology</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Select Zone</label>
                                        <select value={triggerZone} onChange={(e) => setTriggerZone(e.target.value)} className="input-premium appearance-none cursor-pointer pr-14 !font-sans !font-black !text-sm !uppercase !tracking-widest">
                                           {ZONES.map((z) => (<option key={z.id} value={z.id}>{z.label}</option>))}
                                        </select>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Trigger Type</label>
                                        <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className="input-premium appearance-none cursor-pointer pr-14 !font-sans !font-black !text-sm !uppercase !tracking-widest">
                                           {TRIGGERS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                                    <button onClick={handleFire} disabled={triggerLoading} className="btn-primary h-20 shadow-2xl">
                                        {triggerLoading ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Simulate Trigger'}
                                    </button>
                                    <button onClick={handleFireAnomaly} disabled={triggerLoading} className="btn-danger h-20">
                                        {triggerLoading ? <span className="material-symbols-outlined animate-spin text-red-500">sync</span> : (
                                          <>
                                            <span className="material-symbols-outlined">warning</span>
                                            Force Fraud Case
                                          </>
                                        )}
                                    </button>
                                </div>
                                
                                <div className="pt-10 border-t border-white/10">
                                     <div className="grid grid-cols-3 gap-6">
                                         <div>
                                             <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-2">Confidence</p>
                                             <p className="text-2xl font-black font-mono text-white">{avgConfidence}%</p>
                                         </div>
                                         <div>
                                             <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-2">Throughput</p>
                                             <p className="text-2xl font-black font-mono text-white">{(claims.length / 5).toFixed(1)}/min</p>
                                         </div>
                                         <div>
                                             <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-2">Precision</p>
                                             <p className="text-2xl font-black font-mono text-white">99.9%</p>
                                         </div>
                                     </div>
                                </div>
                            </section>
                        </div>

                        {/* Network Stats Sidebar */}
                        <div className="xl:col-span-4 space-y-10">
                             <div className="card-premium rounded-3xl p-6 text-white shadow-2xl shadow-black/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5/5 rounded-full blur-3xl"></div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-10">Stats Overview</p>
                                <div className="space-y-12">
                                    <div>
                                        <p className="text-4xl font-black font-headline tracking-tighter leading-none mb-4">₹{totalPaid.toLocaleString()}</p>
                                        <p className="text-[11px] uppercase font-black text-white/40 tracking-wider">Total Payouts</p>
                                    </div>
                                    <div className="space-y-4">
                                         <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-white/60">
                                            <span>Auto-Approval Rate</span>
                                            <span>{autoApprovedPct}%</span>
                                         </div>
                                         <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                                            <div className="h-full bg-[var(--color-accent)] shadow-lg" style={{ width: `${autoApprovedPct}%` }}></div>
                                         </div>
                                    </div>
                                </div>
                             </div>

                             <div className="card-premium rounded-3xl p-6 text-white shadow-2xl shadow-black/20 relative overflow-hidden mt-10">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-8 italic">Anomaly Detection Distribution</h4>
                                <div className="flex items-end gap-6 h-40 px-2 border-b border-white/10 pb-4">
                                    {asBuckets.map((b, i) => (
                                        <div key={b.label} className="flex-1 flex flex-col justify-end items-center h-full group">
                                            <div className={`w-full rounded-xl transition-all duration-700 ${i === 0 ? 'bg-red-400' : i === 1 ? 'bg-amber-400' : 'bg-emerald-400'} shadow-lg`} style={{ height: `${Math.max(15, (b.count / maxBucket) * 100)}%` }}></div>
                                            <span className="mt-4 text-[9px] font-black text-white/60 uppercase tracking-widest">{b.label}</span>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Live Stream Panel */}
                    <section className="space-y-10">
                        <div className="flex items-center justify-between px-4">
                            <h4 className="text-3xl font-headline font-black tracking-tighter uppercase text-on-background">Live Claims Feed</h4>
                            <div className="badge-premium px-8 flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-ping"></span>
                                Live Monitoring Node v0.8
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {claims.length === 0 ? (
                                <div className="col-span-full py-32 text-center card-premium bg-transparent border-dashed">
                                     <span className="material-symbols-outlined text-[var(--color-accent)]/10 text-8xl mb-8">security</span>
                                     <p className="text-muted tracking-widest">Synchronizing Network Streams...</p>
                                </div>
                            ) : (
                                [...claims].reverse().slice(0, 16).map((c) => {
                                    const isRecent = highlightIds.has(c.id);
                                    const scoreCol = c.as_score >= 75 ? 'text-[var(--color-accent)]' : c.as_score >= 45 ? 'text-amber-500' : 'text-red-400';
                                    const scoreBg = c.as_score >= 75 ? 'bg-[var(--color-accent)]/10' : c.as_score >= 45 ? 'bg-amber-500/10' : 'bg-red-500/10';
                                    
                                    return (
                                        <motion.div 
                                          layout
                                          initial={{ opacity: 0, scale: 0.95 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          key={c.id} 
                                          onClick={() => setSelectedClaim(c)}
                                          className={`group p-8 card-premium text-white rounded-2xl border border-white/20 shadow-xl transition-all hover:shadow-2xl hover:shadow-black/40 cursor-pointer relative overflow-hidden ${isRecent ? 'ring-4 ring-[var(--color-accent)]/80 scale-[1.02] shadow-2xl z-10' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-8">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${scoreBg} ${scoreCol} transition-transform group-hover:scale-110`}>
                                                    <span className="material-symbols-outlined text-2xl font-black">token</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-white tracking-tighter">₹{(c.payout_amount_rs || 0).toLocaleString()}</p>
                                                    <p className="text-[10px] font-black text-white/40 uppercase mt-2">Audit-v3</p>
                                                </div>
                                            </div>
                                            <h5 className="text-[12px] font-black uppercase tracking-wider mb-8 truncate text-white/80 group-hover:text-[var(--color-accent)] transition-colors">
                                                {c.worker_name || `RID-${c.id.substring(0,6).toUpperCase()}`}
                                            </h5>
                                            <div className="flex items-center justify-between pt-6 border-t border-white/10">
                                                <span className={`text-[10px] font-black font-mono px-4 py-1.5 rounded-full ${scoreBg} ${scoreCol} border border-current/10`}>{c.as_score || 0} Score</span>
                                                <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${c.status === 'auto_approved' ? 'text-amber-500' : 'text-red-500'}`}>
                                                    <span className={`w-2 h-2 rounded-full bg-current ${isRecent ? 'animate-ping' : ''}`}></span>
                                                    {c.status === 'auto_approved' ? 'Resolved' : 'Review'}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })
                            )}
                        </div>
                    </section>
                </motion.div>
            )}

            {activeTab === 'map' && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-12">
                   <div className="flex justify-between items-end px-4">
                      <div className="space-y-3">
                          <h2 className="text-4xl font-headline font-black text-on-background tracking-tighter uppercase leading-none">Global Risk Map</h2>
                          <p className="text-muted">Real-time trigger monitoring and localization</p>
                      </div>
                      <div className="badge-premium px-6 py-3 shadow-xl">
                         Admin Ops v0.4
                      </div>
                   </div>
                   <div className="rounded-3xl flex-1 min-h-[500px] h-[60vh] overflow-hidden shadow-2xl shadow-[#1B4332]/10 border border-white/10 relative">
                      <TriggerMap recentClaims={claims} />
                   </div>
                   <div className="card-premium p-6 flex flex-wrap gap-6 items-center justify-between bg-white/5/5 border-dashed border-white/10">
                      <div className="flex items-center gap-6">
                         <div className="w-16 h-16 rounded-3xl card-premium flex items-center justify-center text-white shadow-xl">
                            <span className="material-symbols-outlined text-3xl font-black">hub</span>
                         </div>
                         <div>
                            <p className="text-[12px] font-black uppercase text-white tracking-widest">Status Monitoring Active</p>
                            <p className="text-muted italic text-[var(--color-accent)]/80">Monitoring 5 hyper-zones across Mumbai metropolitan area.</p>
                         </div>
                      </div>
                      <button className="btn-primary" onClick={() => setActiveTab('feed')}>Refresh Monitor</button>
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
                    upi_ref: c.status === 'auto_approved' ? `RYD-SETTLED-${c.id.substring(0, 6).toUpperCase()}` : 'SIG_PENDING'
                  }))
                } 
              />
            )}

            {/* ── Phase 3 Tabs ─────────────────────────────────────────── */}
            {activeTab === 'loss' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="px-4">
                  <h2 className="text-4xl font-headline font-black tracking-tighter uppercase text-on-background mb-2">Loss Ratios</h2>
                  <p className="text-muted text-sm">Premium collected vs claims paid — per zone with weekly trend</p>
                </div>
                <div className="px-4"><LossRatioPanel /></div>
              </motion.div>
            )}

            {activeTab === 'rings' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="px-4">
                  <h2 className="text-4xl font-headline font-black tracking-tighter uppercase text-on-background mb-2">Fraud Ring Detection</h2>
                  <p className="text-muted text-sm">DBSCAN clustering on claim signals — coordinated fraud identification</p>
                </div>
                <div className="px-4"><FraudRingsPanel /></div>
              </motion.div>
            )}

            {activeTab === 'syndicate' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="px-4">
                  <h2 className="text-4xl font-headline font-black tracking-tighter uppercase text-on-background mb-2">Syndicate Alert Queue</h2>
                  <p className="text-muted text-sm">Claims in manual review — Isolation Forest anomaly flags awaiting insurer action</p>
                </div>
                <div className="px-4"><SyndicateAlertQueue /></div>
              </motion.div>
            )}

            {activeTab === 'forecast' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="px-4">
                  <h2 className="text-4xl font-headline font-black tracking-tighter uppercase text-on-background mb-2">6-Hour Forecast Alerts</h2>
                  <p className="text-muted text-sm">Disruption outlook across Mumbai zones — pre-reserve exposure buffer</p>
                </div>
                <div className="px-4"><ForecastPanel /></div>
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
