'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { claimsApi, ClaimTransparency } from '@/lib/api'

const STATUS_COLOR = {
  pass: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', icon: 'check_circle' },
  warn: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: 'warning' },
  fail: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', icon: 'cancel' },
}

export default function ClaimTransparencyPage() {
  const router = useRouter()
  const params = useParams()
  const claimId = params.id as string

  const [data, setData] = useState<ClaimTransparency | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAppeal, setShowAppeal] = useState(false)
  const [appealText, setAppealText] = useState('')
  const [appealPhone, setAppealPhone] = useState('')
  const [appealLoading, setAppealLoading] = useState(false)
  const [appealSubmitted, setAppealSubmitted] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await claimsApi.getTransparency(claimId)
      setData(res.data)
    } catch {
      setError('Could not load claim details. Please check the claim ID.')
    } finally {
      setLoading(false)
    }
  }, [claimId])

  useEffect(() => {
    const stored = localStorage.getItem('rydex_worker')
    if (!stored) { router.push('/login'); return }
    load()
  }, [router, load])

  async function handleAppeal(e: React.FormEvent) {
    e.preventDefault()
    setAppealLoading(true)
    try {
      await claimsApi.submitAppeal(claimId, appealText, appealPhone)
      setAppealSubmitted(true)
      setShowAppeal(false)
    } catch {
      setError('Appeal submission failed. Please try again.')
    } finally {
      setAppealLoading(false)
    }
  }

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

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] text-white">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-red-400 text-5xl block">error</span>
          <p className="text-white/60 font-bold">{error}</p>
          <button onClick={() => router.push('/dashboard')} className="btn-secondary mt-4">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const scoreColor = data.as_score >= 75 ? 'text-green-400' : data.as_score >= 45 ? 'text-yellow-400' : 'text-red-400'
  const statusLabel = data.status === 'auto_approved' || data.status === 'approved' ? 'Approved' : 'Flagged'
  const statusColor = data.status === 'auto_approved' || data.status === 'approved' ? 'text-green-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-white font-body">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-white/10 px-5 md:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-white/40 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <h1 className="text-base font-headline font-black text-white">Claim Transparency</h1>
        </div>
        <span className="text-[10px] font-mono text-white/30">{claimId.substring(0, 12).toUpperCase()}...</span>
      </header>

      <main className="max-w-3xl mx-auto px-5 md:px-8 py-8 space-y-6">
        {/* Summary card */}
        <div className="card-premium rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">Claim Decision</p>
              <p className={`text-2xl font-black font-headline ${statusColor}`}>{statusLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">Payout</p>
              <p className="text-2xl font-black font-mono text-white">₹{Math.round(data.payout_amount_rs)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5 pt-4 border-t border-white/10">
            <div>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Hours Disrupted</p>
              <p className="text-lg font-black font-mono mt-0.5">{data.disrupted_hours.toFixed(1)}h</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Hourly Rate</p>
              <p className="text-lg font-black font-mono mt-0.5">₹{Math.round(data.hourly_baseline_rs)}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">AS Multiplier</p>
              <p className="text-lg font-black font-mono mt-0.5">{data.as_multiplier.toFixed(2)}×</p>
            </div>
          </div>

          <p className="text-sm text-white/60 leading-relaxed bg-white/5 rounded-xl p-4">
            {data.decision_reason}
          </p>

          {data.iso_anomaly_flag && (
            <div className="mt-4 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <span className="material-symbols-outlined text-red-400">gpp_bad</span>
              <p className="text-sm text-red-400 font-bold">Isolation Forest anomaly flag raised — claim referred to manual review.</p>
            </div>
          )}
        </div>

        {/* AS Score */}
        <div className="card-premium rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/40">Authenticity Score</h2>
            <span className={`text-3xl font-black font-mono ${scoreColor}`}>{data.as_score}<span className="text-lg text-white/30">/100</span></span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-6">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data.as_score}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${data.as_score >= 75 ? 'bg-green-400' : data.as_score >= 45 ? 'bg-yellow-400' : 'bg-red-400'}`}
            />
          </div>

          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Signal Breakdown</h3>
          <div className="space-y-3">
            {data.signals.map((sig) => {
              const sc = STATUS_COLOR[sig.status]
              return (
                <div key={sig.key} className={`rounded-xl p-4 border ${sc.bg} ${sc.border}`}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-sm ${sc.text}`}>{sc.icon}</span>
                      <p className="text-sm font-bold text-white">{sig.label}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-black font-mono ${sc.text}`}>{sig.score.toFixed(0)}</p>
                      <p className="text-[10px] text-white/30 font-bold">{sig.weight_pct}% weight</p>
                    </div>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${sig.status === 'pass' ? 'bg-green-400' : sig.status === 'warn' ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(sig.score, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-white/40 font-bold mt-1.5">Contribution: {sig.contribution.toFixed(1)} pts</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Appeal section */}
        {data.appeal_eligible && !appealSubmitted && (
          <div className="card-premium rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Dispute This Decision</h2>
                <p className="text-sm text-white/60">You are eligible to appeal this claim. Provide context and we'll review.</p>
              </div>
              <button
                onClick={() => setShowAppeal(!showAppeal)}
                className="btn-secondary py-2 px-5 text-xs"
              >
                {showAppeal ? 'Cancel' : 'File Appeal'}
              </button>
            </div>

            <AnimatePresence>
              {showAppeal && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAppeal}
                  className="space-y-4 pt-4 border-t border-white/10 overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Explanation</label>
                    <textarea
                      className="input-premium w-full min-h-[100px] resize-none"
                      placeholder="Describe what happened during the disruption period..."
                      value={appealText}
                      onChange={(e) => setAppealText(e.target.value)}
                      required
                      minLength={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Contact Phone (optional)</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white/40 font-mono text-sm font-black">IN+</span>
                      <input
                        className="input-premium pl-16"
                        placeholder="9820001234"
                        type="tel"
                        value={appealPhone}
                        onChange={(e) => setAppealPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        maxLength={10}
                      />
                    </div>
                  </div>
                  {error && (
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">{error}</p>
                  )}
                  <button disabled={appealLoading} type="submit" className="btn-primary w-full h-14">
                    {appealLoading
                      ? <span className="material-symbols-outlined animate-spin">sync</span>
                      : 'Submit Appeal'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        )}

        {appealSubmitted && (
          <div className="card-premium rounded-2xl p-6 flex items-center gap-4 bg-green-500/5 border border-green-500/20">
            <span className="material-symbols-outlined text-green-400 text-2xl">check_circle</span>
            <div>
              <p className="text-sm font-black text-green-400">Appeal submitted successfully</p>
              <p className="text-[11px] text-white/40 font-bold">Our team will review your case within 48 hours.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
