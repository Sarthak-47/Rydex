'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { policiesApi, claimsApi, payoutsApi, demoApi, triggerEventsApi, Policy, Claim, Payout, TriggerEvent } from '@/lib/api'
import ClaimsList from '@/components/ClaimsList'
import ScoreGauge from '@/components/ScoreGauge'
import AIAssistant from '@/components/AIAssistant'
import { motion } from 'framer-motion'

export default function DashboardPage() {
  const router = useRouter()
  const [worker, setWorker] = useState<{ worker_id: string; name: string; zone_id?: string; zone_name?: string } | null>(null)
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [claims, setClaims] = useState<Claim[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [triggerEvents, setTriggerEvents] = useState<TriggerEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [triggerLoading, setTriggerLoading] = useState(false)
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null)
  const [refreshLedger, setRefreshLedger] = useState(0)
  const [activeTab, setActiveTab] = useState('shield')
  const [processing, setProcessing] = useState(false)
  const [flashPolicyActive, setFlashPolicyActive] = useState(false)
  const [flashPolicyLoading, setFlashPolicyLoading] = useState(false)
  const [oracleTaskCompleted, setOracleTaskCompleted] = useState(false)
  const [oracleLoading, setOracleLoading] = useState(false)

  const fetchAll = useCallback(async (workerId: string) => {
    try {
      const [p, c, pay] = await Promise.all([
        policiesApi.getActive(workerId),
        claimsApi.list(workerId),
        payoutsApi.list(workerId),
      ])
      setPolicy(p.data)
      setClaims(c.data)
      setPayouts(pay.data)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTriggerEvents = useCallback(async (zoneId?: string) => {
    if (!zoneId) return
    try {
      const r = await triggerEventsApi.list(zoneId)
      setTriggerEvents(r.data)
    } catch {
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('rydex_worker')
    if (!stored) { router.push('/login'); return }
    const w = JSON.parse(stored)
    setWorker(w)
    fetchAll(w.worker_id)
    fetchTriggerEvents(w.zone_id)
  }, [router, fetchAll, fetchTriggerEvents])

  function logout() {
    localStorage.removeItem('rydex_token')
    localStorage.removeItem('rydex_worker')
    router.push('/login')
  }

  async function fireDemoTrigger() {
    setTriggerLoading(true)
    setProcessing(true)
    setTriggerStatus('Initiating Claim Verification...')
    try {
      await demoApi.fireTrigger(worker?.zone_id || 'zone-bandra', 'rainfall')

      const started = Date.now()
      const poll = async () => {
        if (!worker) return
        try {
          const [p, c, pay] = await Promise.all([
            policiesApi.getActive(worker.worker_id),
            claimsApi.list(worker.worker_id),
            payoutsApi.list(worker.worker_id),
          ])
          setPolicy(p.data)
          setClaims(c.data)
          setPayouts(pay.data)
          setRefreshLedger((prev) => prev + 1)
          await fetchTriggerEvents(worker.zone_id)

          const hasClaim = (c.data?.length ?? 0) > 0
          const hasPayout = (pay.data?.length ?? 0) > 0
          if (hasClaim || hasPayout) {
            setTriggerStatus('✅ Settlement routed to UPI.')
            setTimeout(() => setTriggerStatus(null), 3500)
            setProcessing(false)
            return
          }
        } catch {
        }
        if (Date.now() - started >= 15000) {
          setTriggerStatus('✅ Settlement Pending Verification.')
          setTimeout(() => setTriggerStatus(null), 3500)
          setProcessing(false)
          return
        }
        setTimeout(poll, 3000)
      }
      setTimeout(poll, 1200)
    } catch {
      setTriggerStatus('❌ Connection error.')
      setTimeout(() => setTriggerStatus(null), 3000)
      setProcessing(false)
    } finally {
      setTriggerLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
         <span className="material-symbols-outlined animate-spin text-4xl text-[var(--color-accent)]">sync</span>
      </div>
    )
  }

  const capUsedPct = policy
    ? Math.round((policy.amount_paid_rs / policy.coverage_cap_rs) * 100)
    : 0

  const tierLabel = policy?.tier === 'basic' ? 'Basic Shield' : policy?.tier === 'plus' ? 'Advanced Shield' : 'Storm Shield'
  const protectedThisWeek = payouts.filter((p) => p.status === 'success').reduce((a, p) => a + (p.amount_rs || 0), 0)
  const hoursCovered = claims.reduce((a, c) => a + (c.disrupted_hours || 0), 0)
  const claimsApproved = claims.filter((c) => c.status === 'auto_approved' || c.status === 'approved').length

  const currentTrigger = triggerEvents.length > 0 ? triggerEvents[0].trigger_type : 'rainfall';
  const triggerLabels: Record<string, string> = { rainfall: 'heavy rainfall', heat: 'extreme heat', aqi: 'severe AQI', traffic: 'traffic stagnation', flood: 'waterlogging' };
  const triggerIcons: Record<string, string> = { rainfall: 'thunderstorm', heat: 'thermostat', aqi: 'air', traffic: 'traffic', flood: 'flood' };
  const flashShieldNames: Record<string, string> = { rainfall: 'Storm Shield', heat: 'Heatwave Shield', aqi: 'Smog Shield', traffic: 'Gridlock Shield', flood: 'Flood Shield' };
  const activeLabel = triggerLabels[currentTrigger] || 'disruption';
  const activeIcon = triggerIcons[currentTrigger] || 'warning';
  const activeShieldName = flashShieldNames[currentTrigger] || 'Flash Shield';

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="bg-background font-body text-on-background min-h-screen flex flex-col md:flex-row">
        {/* Sidebar Pattern */}
        <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 z-50 card-premium border-r border-white/10 shadow-2xl shadow-black/20 text-white">
            <div className="flex items-center justify-center h-[88px] border-b border-white/10">
                <img src="/rydex_dynamic_logo.png" alt="Rydex Logo" style={{ width: '285px', height: 'auto', objectFit: 'contain' }} />
            </div>
            <nav className="flex-1 px-6 py-6 space-y-3">
                {[
                    { id: 'shield', icon: 'security', label: 'Dashboard' },
                    { id: 'ledger', icon: 'payments', label: 'History' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all group ${
                            activeTab === item.id 
                            ? 'bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/20' 
                            : 'text-white/70 hover:bg-white/5/5 hover:text-[var(--color-accent)]'
                        }`}
                    >
                        <span className={`material-symbols-outlined ${activeTab === item.id ? 'font-bold' : ''}`}>{item.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">{item.label}</span>
                    </button>
                ))}
            </nav>
            <div className="p-6 border-t border-white/10">
                <button 
                    onClick={logout}
                    className="w-full flex items-center gap-4 px-6 py-4 rounded-xl text-red-600 hover:bg-red-50 transition-all font-black text-[10px] uppercase tracking-widest"
                >
                    <span className="material-symbols-outlined">logout</span>
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:pl-72">
            <header className="md:hidden fixed top-0 w-full z-50 flex justify-between items-center px-6 h-20 card-premium/90 backdrop-blur-xl border-b border-white/10 shadow-sm">
                <div className="flex items-center justify-center h-full">
                    <img src="/rydex_dynamic_logo.png" alt="Rydex Logo" style={{ width: '240px', height: 'auto', objectFit: 'contain' }} />
                </div>
                <button onClick={logout} className="text-white/60 hover:text-white"><span className="material-symbols-outlined">logout</span></button>
            </header>

            <main className="pt-28 md:pt-16 pb-32 md:pb-16 px-6 md:px-8 max-w-7xl w-full mx-auto">
            {activeTab === 'shield' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column */}
                  <div className="lg:col-span-8 space-y-10">
                    <section className="space-y-4">
                        <h1 className="text-4xl md:text-6xl font-headline font-black tracking-tighter text-on-background">
                          {greeting}, {worker?.name?.split(' ')[0] || 'Rider'}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/20 shadow-sm text-[var(--color-accent)]">
                                <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>verified_user</span>
                                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-accent)]">Policy Active</span>
                            </div>
                            <span className="badge-premium">{worker?.zone_name || 'Mumbai Central'} Zone</span>
                            <span className="badge-premium">{hoursCovered.toFixed(1)}h Covered</span>
                        </div>
                    </section>

                    {/* Stats Grid Pattern */}
                    <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {[
                        { label: 'Protected Income', value: `₹${Math.round(protectedThisWeek).toLocaleString()}`, icon: 'payments' },
                        { label: 'Disrupted Hours', value: hoursCovered.toFixed(1), icon: 'timer_off' },
                        { label: 'Approved Claims', value: claimsApproved, icon: 'task_alt' }
                      ].map((stat) => (
                        <div key={stat.label} className="card-premium p-6">
                          <p className="text-white/80 font-black uppercase tracking-widest text-[10px] mb-3">{stat.label}</p>
                          <div className="flex items-end justify-between">
                            <p className="font-mono text-2xl font-black text-white leading-none">{stat.value}</p>
                            <span className="material-symbols-outlined text-white/60 text-xl">{stat.icon}</span>
                          </div>
                        </div>
                      ))}
                    </section>

                    {/* Main Interaction Pattern */}
                    <section>
                        <button 
                            onClick={fireDemoTrigger} 
                            disabled={triggerLoading || !!triggerStatus}
                            className="w-full text-left card-premium p-6 flex items-start gap-8 group relative overflow-hidden"
                        >
                            <div className="bg-white/5/5 p-8 rounded-2xl flex-shrink-0 group-hover:bg-white/5 text-[var(--color-accent)] group-hover:text-white transition-all duration-500 text-white">
                                {triggerLoading || (triggerStatus && !triggerStatus.includes('✅')) ? (
                                    <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
                                ) : (
                                    <span className="material-symbols-outlined text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>thunderstorm</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-headline font-black text-white text-2xl tracking-tighter uppercase">Claim Payout</h3>
                                    <span className={`badge-premium px-6 ${triggerStatus ? 'bg-[var(--color-accent)] text-white animate-bounce border-transparent' : ''}`}>
                                        {triggerStatus ? 'Processing' : 'Online'}
                                    </span>
                                </div>
                                <p className={`text-md leading-relaxed font-bold ${triggerStatus ? 'text-[var(--color-accent)]' : 'text-white/60'}`}>
                                    {triggerStatus ? triggerStatus : "Initiate an automated claim based on verified disruption events in your current zone."}
                                </p>
                            </div>
                        </button>
                    </section>

                    {/* Peer-to-Peer Oracle Task Widget */}
                    <section className="bg-white/5/5 rounded-2xl p-8 mt-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-6">
                                <div className="bg-[var(--color-accent)] w-14 h-14 rounded-full flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined text-2xl font-black">satellite_alt</span>
                                </div>
                                <div>
                                    <h4 className="text-white font-headline font-black text-xl uppercase tracking-tighter">P2P Network Task</h4>
                                    <p className="text-white/60 text-xs font-bold mt-1">Verify {activeLabel} in {worker?.zone_name || 'Bandra West'}</p>
                                </div>
                            </div>
                            <div className="w-full md:w-auto">
                                {oracleTaskCompleted ? (
                                    <div className="bg-white/5 border border-white/20 px-6 py-3 rounded-full flex gap-3 justify-center items-center">
                                        <span className="material-symbols-outlined text-[var(--color-accent)]">check_circle</span>
                                        <span className="text-[var(--color-accent)] font-black uppercase text-xs tracking-widest">Verified • ₹10 Earned</span>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => {
                                            setOracleLoading(true);
                                            setTimeout(() => {
                                                setOracleLoading(false);
                                                setOracleTaskCompleted(true);
                                            }, 1500);
                                        }}
                                        disabled={oracleLoading}
                                        className="w-full md:w-auto bg-white/5 text-white hover:bg-[var(--color-accent)] px-8 py-3 rounded-full font-black uppercase text-xs tracking-widest transition-all"
                                    >
                                        {oracleLoading ? 'Confirming...' : 'Verify & Earn ₹10'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>

                {/* Sub-sections Pattern */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16 pb-20">
                  <section className="space-y-8">
                      <div className="flex justify-between items-center px-4">
                          <h3 className="text-muted">Live Updates</h3>
                          <span className="material-symbols-outlined text-[var(--color-accent)] animate-pulse">analytics</span>
                      </div>
                      <div className="card-premium overflow-hidden border-none pb-0">
                          {triggerEvents.length === 0 ? (
                            <div className="p-8 text-center text-[10px] text-white/60 font-black uppercase tracking-widest italic">
                              Awaiting network trigger...
                            </div>
                          ) : (
                            triggerEvents.slice(0, 5).map((ev, i) => (
                              <div key={ev.id} className={`p-8 flex items-center justify-between group hover:bg-white/5 transition-all ${i !== triggerEvents.slice(0, 5).length - 1 ? 'border-b border-white/10' : ''}`}>
                                  <div className="flex items-center gap-6">
                                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${ev.is_demo ? 'bg-white/5/5 text-white' : 'card-premium text-white'}`}>
                                        <span className="material-symbols-outlined font-bold">sensors</span>
                                      </div>
                                      <div>
                                          <p className="text-xs font-black text-white uppercase tracking-widest">{ev.trigger_type}</p>
                                          <p className="text-[10px] text-white/40 font-black uppercase mt-1">
                                            {ev.triggered_at ? new Date(ev.triggered_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                                          </p>
                                      </div>
                                  </div>
                                  <span className="badge-premium">Node Verified</span>
                              </div>
                            ))
                          )}
                      </div>
                  </section>

                  <section className="space-y-8">
                      <div className="flex justify-between items-center px-4">
                          <h3 className="text-muted">Recent Payouts</h3>
                          <span className="text-[var(--color-accent)] text-[10px] font-black uppercase tracking-widest">{payouts.length} Total</span>
                      </div>
                      <div className="space-y-6">
                          {payouts.length === 0 ? (
                              <div className="p-8 text-center text-[10px] text-white/40 font-black uppercase tracking-widest card-premium">Zero transactions.</div>
                          ) : (
                              payouts.slice(0, 4).map(p => (
                                  <div key={p.id} className="card-premium p-6 flex items-center justify-between group cursor-pointer border-b-2">
                                      <div className="flex items-center gap-6">
                                          <div className="h-14 w-14 rounded-xl bg-white/5/5 flex items-center justify-center group-hover:bg-white/5 text-[var(--color-accent)] group-hover:text-white transition-all duration-500">
                                              <span className="material-symbols-outlined text-2xl font-black">payments</span>
                                          </div>
                                          <div>
                                              <p className="font-mono font-black text-white text-xl leading-none mb-2">₹{p.amount_rs.toLocaleString()}</p>
                                              <p className="text-[9px] text-white font-black uppercase tracking-widest bg-white/5/5 px-3 py-1 rounded-full inline-block">SUCCESS</p>
                                          </div>
                                      </div>
                                      <span className="material-symbols-outlined text-white/40 group-hover:text-[var(--color-accent)] group-hover:translate-x-1 transition-all">arrow_forward</span>
                                  </div>
                              ))
                          )}
                      </div>
                  </section>
                </div>
                  </div>

                  {/* Right Column / Sidebar Stats */}
                  <div className="lg:col-span-4 space-y-10">
                    <ScoreGauge value={100 - capUsedPct} />
                    
                    {policy && (
                        <section className="card-premium rounded-3xl p-6 shadow-2xl shadow-black/20 overflow-hidden relative text-white">
                            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5/5 rounded-full blur-3xl"></div>
                            <div className="flex justify-between items-start mb-10 relative">
                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase tracking-widest font-black text-white/40">Active Policy</p>
                                    <h2 className="text-4xl font-headline font-black leading-none">{tierLabel}</h2>
                                </div>
                                <span className="material-symbols-outlined text-white text-4xl opacity-40">shield</span>
                            </div>
                            <div className="grid grid-cols-2 gap-8 mb-10 relative">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Weekly Cap</p>
                                    <p className="font-mono text-2xl font-black">₹{policy.coverage_cap_rs.toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Premium</p>
                                    <p className="font-mono text-2xl font-black">₹{policy.weekly_premium_rs}</p>
                                </div>
                            </div>
                            <div className="space-y-4 relative">
                                <div className="flex justify-between items-end mb-2">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Remaining Benefit</p>
                                    <p className="font-mono text-sm font-black">₹{policy.cap_remaining_rs.toLocaleString()}</p>
                                </div>
                                <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(100 - capUsedPct, 5)}%` }}
                                        transition={{ duration: 1 }}
                                        className="h-full bg-white/5 transition-all shadow-[0_0_20px_rgba(255,255,255,0.4)]" 
                                    />
                                </div>
                            </div>
                        </section>
                    )}
                    
                    {/* Flash Policies Widget */}
                    <section className="bg-gradient-to-br from-white/10 to-white/5 rounded-3xl p-6 border border-white/10 shadow-xl relative overflow-hidden text-white mt-6">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent)] opacity-10 rounded-full blur-2xl"></div>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-[10px] uppercase tracking-widest font-black text-white/60 mb-2">Flash Coverage</p>
                                <h3 className="text-2xl font-headline font-black leading-none">{activeShieldName}</h3>
                            </div>
                            <span className="material-symbols-outlined text-[var(--color-accent)] text-4xl">{activeIcon}</span>
                        </div>
                        <p className="text-sm text-white/80 mb-8 font-bold leading-relaxed">
                            {activeLabel.charAt(0).toUpperCase() + activeLabel.slice(1)} forecasted in {worker?.zone_name || 'your zone'}. Augment your coverage for the next 4 hours.
                        </p>
                        <button 
                            onClick={() => {
                                setFlashPolicyLoading(true);
                                setTimeout(() => {
                                    setFlashPolicyLoading(false);
                                    setFlashPolicyActive(true);
                                }, 1500);
                            }}
                            disabled={flashPolicyActive || flashPolicyLoading}
                            className={`w-full py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all ${
                                flashPolicyActive 
                                ? 'bg-white/5/5 text-[var(--color-accent)] border border-[var(--color-accent)]/30' 
                                : 'bg-[var(--color-accent)] text-white hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            {flashPolicyLoading ? (
                                <span className="flex items-center justify-center gap-2"><span className="material-symbols-outlined animate-spin text-lg">sync</span> Processing...</span>
                            ) : flashPolicyActive ? (
                                <span className="flex items-center justify-center gap-2"><span className="material-symbols-outlined text-lg">check_circle</span> Shield Active</span>
                            ) : (
                                "Buy 4-hr Cover • ₹5"
                            )}
                        </button>
                    </section>
                  </div>
                </div>

              </motion.div>
            )}

            {activeTab === 'ledger' && worker && (
              <div className="space-y-12 pb-24">
                {processing && (
                  <div className="card-premium text-white rounded-2xl p-6 flex items-center gap-8 shadow-2xl animate-pulse">
                    <span className="material-symbols-outlined animate-spin text-4xl text-[var(--color-accent)]">sync</span>
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest">Processing Payout…</p>
                      <p className="text-[11px] text-white/60 font-bold uppercase tracking-[0.1em] mt-1">Verifying trigger events • Routing UPI payout</p>
                    </div>
                  </div>
                )}
                <ClaimsList workerId={worker.worker_id} refreshTrigger={refreshLedger} />
                
                <section className="p-6 mt-12 bg-white/5/5 rounded-2xl border-dashed border-white/10 relative overflow-hidden">
                    <div className="flex items-center gap-6 mb-6 relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-black/20 flex items-center justify-center text-[var(--color-accent)] shadow-xl">
                            <span className="material-symbols-outlined text-3xl font-black">verified</span>
                        </div>
                        <div>
                            <h4 className="text-xl font-headline font-black text-white tracking-tighter uppercase leading-none">Account Security</h4>
                            <p className="text-[var(--color-accent)] mt-2 text-xs font-black uppercase tracking-widest">Active Zone: {worker?.zone_name || 'Mumbai'}</p>
                        </div>
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed font-bold relative z-10">
                        All historical settlements are logged on the immutable ledger. Payouts are triggered by validated disruption events without requiring manual claim filing.
                    </p>
                </section>
              </div>
            )}

        </main>

            {/* Mobile Nav Pattern */}
            <nav className="md:hidden fixed bottom-0 w-full z-50 rounded-t-[3.5rem] card-premium/90 backdrop-blur-3xl border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.2)]">
                <div className="flex justify-around items-center h-28 pb-6">
                    {[
                        { id: 'ledger', icon: 'payments', label: 'History' },
                        { id: 'shield', icon: 'security', label: 'Shield' },
                        { id: 'analytics', icon: 'bar_chart', label: 'Analytics' }
                    ].map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => {
                              if (item.id === 'analytics') { router.push('/analytics'); return; }
                              setActiveTab(item.id)
                            }}
                            className={`flex flex-col items-center justify-center transition-all px-8 ${activeTab === item.id ? 'text-[var(--color-accent)]' : 'text-white/60'}`}
                        >
                            <span className={`material-symbols-outlined mb-2 ${activeTab === item.id ? 'font-black scale-125' : ''}`} style={{fontSize: "28px"}}>{item.icon}</span>
                            <span className="text-[9px] uppercase tracking-widest font-black">{item.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
        <AIAssistant />
    </div>
  )
}
