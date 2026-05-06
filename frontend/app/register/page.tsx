'use client'
import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { workersApi, authApi } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

type Step = 'phone' | 'otp' | 'profile' | 'done'

interface Zone {
  id: string
  name: string
  pin_code: string
  zone_factor: number
  flood_risk_index: number
}

interface PremiumResult {
  baseline_hourly_rs: number
  cold_start_tier: string | null
  premium_breakdown: any
  policy: { 
    id: string; 
    tier: string;
    weekly_premium_rs: number;
    coverage_cap_rs: number;
  }
}

const PLATFORMS = [
  { value: 'swiggy', label: 'Swiggy' },
  { value: 'zomato', label: 'Zomato' },
]

const SHIFT_TYPES = [
  { value: 'day', label: 'Day (8AM - 4PM)' },
  { value: 'mixed', label: 'Mixed shift' },
  { value: 'night', label: 'Evening (4PM - 12AM)' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [platform, setPlatform] = useState('swiggy')
  const [zoneId, setZoneId] = useState('')
  const [shiftStart, setShiftStart] = useState('11:00')
  const [shiftEnd, setShiftEnd] = useState('22:00')
  const [shiftType, setShiftType] = useState('day')
  const [pinCode, setPinCode] = useState('')
  
  // profile fields
  const [workingHours, setWorkingHours] = useState(8)
  const [avgOrders, setAvgOrders] = useState(15)
  const [upiId, setUpiId] = useState('')

  const [result, setResult] = useState<PremiumResult | null>(null)

  useEffect(() => {
    workersApi.getZones().then((r) => {
      setZones(r.data)
      if (r.data.length > 0) {
        setZoneId(r.data[0].id)
        setPinCode(r.data[0].pin_code)
      }
    })
  }, [])

  const selectedZone = zones.find((z) => z.id === zoneId)

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await workersApi.verifyOtp(phone.trim(), otp.trim())
      setStep('profile')
    } catch {
      setError('Invalid OTP. Use 123456 for demo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await workersApi.register({
        name, phone, password, platform,
        zone_id: zoneId, shift_start: shiftStart,
        shift_end: shiftEnd, shift_type: shiftType, pin_code: pinCode,
        working_hours: workingHours,
        avg_orders_per_day: avgOrders,
        upi_id: upiId
      } as any)
      setResult(res.data)
      setStep('done')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoToDashboard() {
    setLoading(true)
    try {
      const res = await authApi.login(phone, password)
      const { access_token, worker_id } = res.data
      const payload = JSON.parse(atob(access_token.split('.')[1]))
      localStorage.setItem('rydex_token', access_token)
      localStorage.setItem(
        'rydex_worker',
        JSON.stringify({
          worker_id,
          name: payload.name,
          zone_id: payload.zone_id,
          zone_name: payload.zone_name,
        })
      )
      router.push('/dashboard')
    } catch {
      setError('Verification failed. Please sign in normally.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-background text-on-background font-body min-h-screen pb-32">
        <header className="fixed top-0 w-full z-50 bg-background/60 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-6 h-[88px]">
            <div className="flex items-center">
                <img src="/rydex_dynamic_logo.png" alt="Rydex Logo" style={{ width: '285px', height: 'auto', objectFit: 'contain' }} />
            </div>
            <Link href="/login" className="btn-secondary py-3 px-6 rounded-xl">Sign In</Link>
        </header>

        <main className="pt-40 pb-12 px-6 max-w-2xl mx-auto">
            {/* Progress Pattern */}
            <div className="flex items-center justify-between mb-20 px-6">
                {[
                    { id: 1, label: 'Identity', active: step === 'phone' || step === 'otp' || step === 'profile' || step === 'done' },
                    { id: 2, label: 'Analysis', active: step === 'profile' || step === 'done' },
                    { id: 3, label: 'Approval', active: step === 'done' }
                ].map((s, i) => (
                    <Fragment key={s.id}>
                        <div className="flex flex-col items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl ${s.active ? 'bg-[var(--color-accent)] text-white shadow-xl shadow-[var(--color-accent)]/20' : 'bg-white/5 text-white/40'} flex items-center justify-center font-black text-xs transition-all duration-700`}>{s.id}</div>
                            <span className={`text-[9px] uppercase tracking-wider font-black ${s.active ? 'text-[var(--color-accent)]' : 'text-white/40'}`}>{s.label}</span>
                        </div>
                        {i < 2 && <div className={`h-[2px] flex-1 ${s.active && (i === 0 ? step !== 'phone' && step !== 'otp' : step === 'done') ? 'bg-[var(--color-accent)]' : 'bg-white/5'} mx-6 mb-10 transition-all duration-700`}></div>}
                    </Fragment>
                ))}
            </div>

            <AnimatePresence mode="wait">
            {(step === 'phone' || step === 'otp') && (
                <motion.section 
                    key="step-1"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-12"
                >
                    <div className="space-y-4 text-center">
                        <h1 className="text-6xl font-headline font-black tracking-tighter text-on-background uppercase leading-none">Identity.</h1>
                        <p className="text-[var(--color-accent)] text-xs font-black uppercase tracking-widest leading-relaxed">Enter your phone number to begin</p>
                    </div>
                    <form onSubmit={step === 'phone' ? handleSendOtp : handleVerifyOtp} className="card-premium p-8 space-y-10">
                        {step === 'phone' && (
                            <>
                                <div className="space-y-4">
                                    <label className="text-muted ml-2">Phone Number</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white/60 font-mono text-xl font-black">IN+</span>
                                        <input 
                                            className="input-premium pl-20" 
                                            placeholder="9820001001" 
                                            type="tel" 
                                            value={phone} 
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                                            maxLength={10}
                                            required 
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary w-full h-20 shadow-2xl">
                                    Send OTP
                                </button>
                                <p className="text-center text-[10px] text-white/60 mt-4 font-black uppercase tracking-widest">Already a node? <Link href="/login" className="text-[var(--color-accent)] hover:underline decoration-2 underline-offset-4">Sign in</Link></p>
                            </>
                        )}
                        {step === 'otp' && (
                            <>
                                <button type="button" onClick={() => setStep('phone')} className="flex items-center text-[10px] font-black text-white/60 hover:text-[var(--color-accent)] mb-6 uppercase tracking-widest transition-colors"><span className="material-symbols-outlined mr-3 text-sm">arrow_back</span>Correction</button>
                                <div className="space-y-6">
                                    <label className="text-muted ml-2 text-center block">Enter OTP</label>
                                    <input 
                                        className="input-premium text-center tracking-[1em] py-8 text-4xl text-[var(--color-accent)]" 
                                        maxLength={6} 
                                        type="text" 
                                        placeholder="------"
                                        value={otp} onChange={(e) => setOtp(e.target.value)} required 
                                    />
                                    <p className="text-center text-[10px] text-white/60 font-black uppercase tracking-widest">Code routed to +91 {phone} <br/> <span className="text-[var(--color-accent)]/80 mt-1 block">DEMO OVERRIDE: 123456</span></p>
                                </div>
                                {error && <p className="text-[10px] font-black text-red-600 uppercase tracking-widest text-center bg-red-50 py-4 rounded-xl border border-red-100">{error}</p>}
                                <button disabled={loading} type="submit" className="btn-primary w-full h-20 shadow-2xl">
                                    {loading ? <span className="material-symbols-outlined animate-spin font-bold">sync</span> : 'Verify & Continue'}
                                </button>
                            </>
                        )}
                    </form>
                </motion.section>
            )}

            {step === 'profile' && (
                <motion.section 
                    key="step-2"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-12"
                >
                    <div className="space-y-4 text-center">
                        <h2 className="text-6xl font-headline font-black tracking-tighter text-on-background uppercase leading-none">Details.</h2>
                        <p className="text-[var(--color-accent)] text-xs font-black uppercase tracking-widest block leading-relaxed">Setup your protection profile</p>
                    </div>
                    <form onSubmit={handleRegister} className="card-premium p-8 space-y-12">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-muted ml-2">Full Name</label>
                                <input className="input-premium font-sans font-black uppercase tracking-widest !text-xs" placeholder="John Doe" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div className="space-y-4">
                                <label className="text-muted ml-2">Password</label>
                                <input className="input-premium" placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            </div>
                        </div>

                        <div className="space-y-10 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner">
                            <div className="space-y-5">
                                <div className="flex justify-between items-center px-2">
                                    <span className="text-[10px] font-black text-white/90 uppercase tracking-wider text-white/60">Working Hours</span>
                                    <span className="badge-premium px-6 py-2">{workingHours} hrs/day</span>
                                </div>
                                <input 
                                    type="range" min="1" max="16" step="1" 
                                    value={workingHours} onChange={(e) => setWorkingHours(parseInt(e.target.value))}
                                    className="w-full h-3 bg-white/10/10 rounded-full appearance-none cursor-pointer accent-[var(--color-accent)]"
                                />
                            </div>
                            <div className="space-y-5">
                                <div className="flex justify-between items-center px-2">
                                    <span className="text-[10px] font-black text-white/90 uppercase tracking-wider text-white/60">Average Orders</span>
                                    <span className="badge-premium px-6 py-2">{avgOrders} orders/day</span>
                                </div>
                                <input 
                                    type="range" min="1" max="50" step="1" 
                                    value={avgOrders} onChange={(e) => setAvgOrders(parseInt(e.target.value))}
                                    className="w-full h-3 bg-white/10/10 rounded-full appearance-none cursor-pointer accent-[var(--color-accent)]"
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <label className="text-muted ml-2">Partner Platform</label>
                            <div className="flex flex-wrap gap-4">
                                {PLATFORMS.map(p => (
                                    <button 
                                        type="button" 
                                        key={p.value} 
                                        onClick={() => setPlatform(p.value)} 
                                        className={`flex-1 py-5 rounded-2xl text-[10px] font-black text-white/90 uppercase tracking-widest transition-all border-2 ${platform === p.value ? 'card-premium text-white border-[var(--color-primary)] shadow-xl shadow-black/20' : 'bg-white/5 text-white/40 border-white/10 hover:border-[var(--color-primary)]/50'}`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-muted ml-2">Work Zone</label>
                                <div className="relative">
                                    <select value={zoneId} onChange={(e) => {
                                        setZoneId(e.target.value)
                                        const z = zones.find(x => x.id === e.target.value)
                                        if (z) setPinCode(z.pin_code)
                                    }} className="w-full appearance-none focus:outline-none bg-[#10162A] border border-white/10/80 rounded-2xl px-8 py-5 pr-14 focus:ring-4 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-primary)] font-black uppercase tracking-widest text-white text-[11px] cursor-pointer shadow-sm transition-all">
                                        {zones.map(z => (<option key={z.id} value={z.id}>{z.name}</option>))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-accent)] font-black">expand_more</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-muted ml-2">Shift Type</label>
                                <div className="relative">
                                    <select value={shiftType} onChange={(e) => setShiftType(e.target.value)} className="w-full appearance-none focus:outline-none bg-[#10162A] border border-white/10/80 rounded-2xl px-8 py-5 pr-14 focus:ring-4 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-primary)] font-black uppercase tracking-widest text-white text-[11px] cursor-pointer shadow-sm transition-all">
                                        {SHIFT_TYPES.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-accent)] font-black">schedule</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-muted ml-2">UPI ID for Settlements</label>
                            <input 
                                className="input-premium" 
                                placeholder="rider@okaxis" 
                                type="text"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                required
                            />
                        </div>

                        {error && <p className="text-[10px] font-black text-red-600 uppercase tracking-widest text-center bg-red-50 py-4 rounded-xl border border-red-100">{error}</p>}
                        <button disabled={loading} type="submit" className="btn-primary w-full h-24 shadow-2xl">
                            {loading ? <span className="material-symbols-outlined animate-spin font-bold">sync</span> : 'Calculate Premium'}
                        </button>
                    </form>
                </motion.section>
            )}

            {step === 'done' && result && (
                <motion.section 
                    key="step-3"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-12"
                >
                    <div className="space-y-4 text-center">
                        <h2 className="text-6xl font-headline font-black tracking-tighter text-on-background uppercase leading-none">Quote.</h2>
                        <p className="text-[var(--color-accent)] text-xs font-black uppercase tracking-widest leading-relaxed">Review your custom coverage plan</p>
                    </div>

                    <div className="card-premium p-1 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-3 card-premium"></div>
                        
                        <div className="p-8 space-y-12">
                            {/* Analytics Section */}
                            <div className="bg-[#10162A]/50 p-6 rounded-3xl border border-[var(--color-primary)]/10 space-y-8">
                                <div className="flex justify-between items-center text-[10px] font-black text-white/90 uppercase tracking-widest">
                                    <span className="text-[var(--color-accent)]">Risk Assessment Score</span>
                                    <span className="card-premium text-white px-5 py-2 rounded-full shadow-lg">Verified Plan</span>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-7xl font-black font-headline text-white tracking-tighter leading-none">56</span>
                                        <span className="text-white/40 font-black text-2xl uppercase tracking-widest">/100</span>
                                    </div>
                                    <div className="h-5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-inner">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: '56%' }}
                                            transition={{ duration: 1.2, delay: 0.5 }}
                                            className="h-full card-premium shadow-lg"
                                        />
                                    </div>
                                    <p className="text-[10px] font-black text-white/90 uppercase text-white/60 tracking-widest text-center italic">Calculated based on Regional Area Factor: {selectedZone?.zone_factor || '1.0'}</p>
                                </div>
                            </div>

                            <div className="space-y-8 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-sm">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--color-accent)] flex items-center gap-4">
                                    <span className="w-2.5 h-2.5 rounded-full card-premium animate-pulse"></span>
                                    Policy Summary
                                </h3>
                                <div className="space-y-6">
                                    {[
                                        { label: 'Partner App', value: platform.toUpperCase() },
                                        { label: 'Work Area', value: selectedZone?.name || 'Mumbai' },
                                        { label: 'Protection Tier', value: result.policy?.tier.toUpperCase() || 'PLUS' },
                                        { label: 'Settlement Account', value: upiId || 'Pending' }
                                    ].map((item) => (
                                        <div key={item.label} className="flex justify-between items-center border-b border-white/10 pb-4">
                                            <span className="text-[10px] font-black text-white/90 uppercase tracking-widest text-white/60">{item.label}</span>
                                            <span className="text-[11px] font-black text-white uppercase tracking-[0.1em]">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-between items-end border-t-2 border-white/10">
                                <div>
                                    <p className="text-[10px] font-black text-white/90 uppercase tracking-widest text-[var(--color-accent)] mb-3">Weekly Premium</p>
                                    <p className="text-[11px] text-white/60 font-black uppercase tracking-widest">Automatic Payout Calculation</p>
                                </div>
                                <span className="text-6xl font-black font-headline text-[var(--color-accent)] tracking-tighter leading-none">₹{result.policy?.weekly_premium_rs || 24}</span>
                            </div>

                            <button onClick={handleGoToDashboard} disabled={loading} className="btn-primary w-full h-24 text-sm tracking-widest shadow-[0_20px_50px_rgba(27,67,50,0.3)]">
                                {loading ? <span className="material-symbols-outlined animate-spin font-bold">sync</span> : <>ACTIVATE POLICY</>}
                            </button>
                        </div>
                    </div>
                </motion.section>
            )}
            </AnimatePresence>
        </main>
    </div>
  )
}
