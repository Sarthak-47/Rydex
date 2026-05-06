'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'

const STATS = [
  { value: '< 5 min', label: 'Payout latency' },
  { value: '5', label: 'Parametric triggers' },
  { value: '₹0', label: 'Claim filing cost' },
  { value: '99%', label: 'Auto-approval rate' },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: 'sensors',
    title: 'Trigger Detected',
    desc: 'Rainfall, AQI, heat, or traffic threshold breached in your zone. Rydex catches it in real time.',
  },
  {
    step: '02',
    icon: 'verified_user',
    title: 'AS Score Calculated',
    desc: 'Five independent signals validate your claim — device motion, network, platform activity, environment, and history.',
  },
  {
    step: '03',
    icon: 'payments',
    title: 'Payout Credited',
    desc: 'If score ≥ 75, your UPI account is credited instantly. No forms, no calls, no waiting.',
  },
]

const TIERS = [
  {
    name: 'Shield Basic',
    premium: '₹18–₹30',
    cap: '₹1,000 / week',
    desc: 'Day shift, low-disruption zones',
    highlight: false,
  },
  {
    name: 'Shield Plus',
    premium: '₹31–₹55',
    cap: '₹2,200 / week',
    desc: 'Mixed shift, flood-prone zones',
    highlight: true,
  },
  {
    name: 'Shield Storm',
    premium: '₹56–₹80',
    cap: '₹4,000 / week',
    desc: 'Night shift, monsoon corridors',
    highlight: false,
  },
]

const TRIGGERS = [
  { icon: '🌧️', label: 'Rainfall', threshold: '>50mm/day' },
  { icon: '💨', label: 'AQI Spike', threshold: '>300 AQI' },
  { icon: '🌡️', label: 'Extreme Heat', threshold: '>40°C' },
  { icon: '🚦', label: 'Traffic Jam', threshold: '<8km/h avg' },
  { icon: '🌊', label: 'Micro-Flood', threshold: 'Zone flooding' },
]

export default function LandingPage() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('rydex_token'))
  }, [])

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-white font-body">
      {/* Nav */}
      <header className="fixed top-0 w-full z-50 bg-background/70 backdrop-blur-xl border-b border-white/10 px-6 md:px-10 h-16 flex items-center justify-between">
        <img src="/rydex_dynamic_logo.png" alt="Rydex" style={{ width: 200, height: 'auto' }} />
        <nav className="flex items-center gap-4">
          {isLoggedIn ? (
            <button onClick={() => router.push('/dashboard')} className="btn-primary py-2 px-6 text-sm">
              Dashboard
            </button>
          ) : (
            <>
              <Link href="/login" className="text-white/60 hover:text-white text-sm font-bold transition-colors">
                Sign In
              </Link>
              <Link href="/register" className="btn-primary py-2 px-6 text-sm">
                Get Protected
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="pt-16">
        {/* Hero */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[var(--color-accent)]/10 blur-[140px] rounded-full" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-blue-600/5 blur-[100px] rounded-full" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 rounded-full px-5 py-2"
            >
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
              <span className="text-[var(--color-accent)] text-xs font-black uppercase tracking-widest">
                Income Protection for Gig Workers
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl font-headline font-black tracking-tighter leading-none uppercase"
            >
              Your income.
              <br />
              <span className="text-[var(--color-accent)]">Protected.</span>
              <br />
              Automatically.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed"
            >
              Rydex monitors rainfall, AQI, heat, and traffic in your zone. When a disruption threshold is crossed, your payout lands in your UPI account — in under 5 minutes, without you doing anything.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/register" className="btn-primary py-4 px-10 text-base font-black uppercase tracking-widest">
                Start Free — Get Protected
              </Link>
              <Link href="/login" className="btn-secondary py-4 px-10 text-base font-black uppercase tracking-widest">
                Sign In
              </Link>
            </motion.div>

            {/* Stats strip */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 max-w-2xl mx-auto"
            >
              {STATS.map(s => (
                <div key={s.label} className="card-premium rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black font-mono text-[var(--color-accent)]">{s.value}</p>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-1">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 px-6 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[var(--color-accent)] text-xs font-black uppercase tracking-widest mb-3">Zero Paperwork</p>
            <h2 className="text-4xl md:text-5xl font-headline font-black tracking-tighter uppercase">How it works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card-premium rounded-2xl p-7 space-y-4 relative overflow-hidden"
              >
                <span className="absolute top-4 right-5 text-5xl font-black font-mono text-white/5">{step.step}</span>
                <span className="material-symbols-outlined text-3xl text-[var(--color-accent)]">{step.icon}</span>
                <h3 className="text-lg font-black text-white">{step.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Triggers */}
        <section className="py-16 px-6 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[var(--color-accent)] text-xs font-black uppercase tracking-widest mb-3">Always Watching</p>
            <h2 className="text-4xl font-headline font-black tracking-tighter uppercase">5 Parametric Triggers</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {TRIGGERS.map(t => (
              <div key={t.label} className="card-premium rounded-2xl px-6 py-4 flex items-center gap-4">
                <span className="text-2xl">{t.icon}</span>
                <div>
                  <p className="text-sm font-black text-white">{t.label}</p>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{t.threshold}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 px-6 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[var(--color-accent)] text-xs font-black uppercase tracking-widest mb-3">Weekly Coverage</p>
            <h2 className="text-4xl md:text-5xl font-headline font-black tracking-tighter uppercase">Pick your shield</h2>
            <p className="text-white/40 mt-4 max-w-md mx-auto text-sm">Premium activates Monday, expires Sunday — aligned with platform payout cycles.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`card-premium rounded-2xl p-7 space-y-5 ${tier.highlight ? 'ring-1 ring-[var(--color-accent)]/50' : ''}`}
              >
                {tier.highlight && (
                  <span className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest bg-[var(--color-accent)]/10 px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <div>
                  <h3 className="text-lg font-black text-white">{tier.name}</h3>
                  <p className="text-white/40 text-xs font-bold mt-1">{tier.desc}</p>
                </div>
                <div>
                  <p className="text-3xl font-black font-mono text-[var(--color-accent)]">{tier.premium}</p>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mt-1">per week</p>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Coverage cap</p>
                  <p className="text-xl font-black font-mono text-white mt-1">{tier.cap}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/register" className="btn-primary py-4 px-12 text-base font-black uppercase tracking-widest">
              Get Protected Now
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-10 px-6 text-center text-white/30 text-xs font-bold uppercase tracking-widest">
          <p>© 2025 Rydex — MIT License</p>
          <p className="mt-2">
            <a href="https://github.com/Sarthak-47/Rydex" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-accent)] transition-colors">
              GitHub
            </a>
            {' · '}
            <Link href="/login" className="hover:text-[var(--color-accent)] transition-colors">Sign In</Link>
            {' · '}
            <Link href="/register" className="hover:text-[var(--color-accent)] transition-colors">Register</Link>
          </p>
        </footer>
      </main>
    </div>
  )
}
