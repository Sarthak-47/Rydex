'use client'
import { Claim } from '@/lib/api'
import { motion } from 'framer-motion'

interface ClaimModalProps {
  claim: Claim
  onClose: () => void
}

export default function ClaimModal({ claim, onClose }: ClaimModalProps) {
  const { as_breakdown, as_score, status } = claim
  const signals = as_breakdown?.signal_scores || {}
  const as_mult = claim.as_multiplier ?? 1
  
  const signalConfig = [
    { key: 'device_motion',      label: 'Telemetry Data',      icon: 'edgesensor_low' },
    { key: 'network_conditions',  label: 'Network Integrity',   icon: 'wifi_tethering' },
    { key: 'platform_activity',   label: 'Activity logs',       icon: 'work_history' },
    { key: 'environmental',      label: 'Weather Oracle',      icon: 'thermostat' },
    { key: 'behavioral_history',  label: 'Session History',     icon: 'history' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-[var(--color-background)]/80 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="bg-[var(--color-surface)] text-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-500 relative">
        {/* Header */}
        <div className="p-6 bg-[var(--color-surface)] flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#10162A]/50 rounded-2xl">
              <span className="material-symbols-outlined text-[var(--color-accent)] text-2xl font-bold">analytics</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase font-headline leading-none">Verification Analysis</h2>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-wider mt-1">Ref: RYD-{claim.id.substring(0,8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-black/10 transition-all duration-300">
            <span className="material-symbols-outlined text-xl font-bold">close</span>
          </button>
        </div>

        <div className="p-6 space-y-10 overflow-y-auto max-h-[75vh] no-scrollbar">
          {/* Main Score Ring & Status */}
          <div className="flex items-center gap-6 bg-white/5 p-8 rounded-2xl border border-white/10 shadow-inner">
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-[var(--color-accent)]/10" />
                    <motion.circle 
                        cx="48" 
                        cy="48" 
                        r="44" 
                        stroke="currentColor" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray={276} 
                        initial={{ strokeDashoffset: 276 }}
                        animate={{ strokeDashoffset: 276 - (276 * (as_score || 0)) / 100 }}
                        className={`transition-all duration-1000 delay-500 ${as_score >= 75 ? 'text-[var(--color-accent)]' : as_score >= 45 ? 'text-[var(--color-accent)]' : 'text-red-400'}`} 
                        strokeLinecap="round" 
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-white leading-none">{Math.round(as_score || 0)}%</span>
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border ${status === 'auto_approved' || status === 'approved' ? 'card-premium text-white' : 'bg-red-500 text-white'}`}>
                    {status.replace('_', ' ')}
                </div>
                <p className="text-[12px] text-white/60 font-bold leading-relaxed">
                    {as_breakdown?.explanation || "System verified environmental metrics against policy thresholds."}
                </p>
            </div>
          </div>

          {/* Component Bars */}
          <div className="space-y-6">
            <div className="grid gap-6">
              {signalConfig.map((sig) => (
                <div key={sig.key} className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-lg text-[var(--color-accent)] opacity-40">{sig.icon}</span>
                        <span className="text-white/40">{sig.label}</span>
                    </div>
                    <span className="text-white font-mono">{Math.round(signals[sig.key] || 0)}%</span>
                  </div>
                  <div className="h-3 w-full bg-white/10/5 rounded-full overflow-hidden border border-white/10">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${signals[sig.key] || 0}%` }}
                        transition={{ duration: 1.2, delay: 0.8 }}
                        className={`h-full shadow-sm ${signals[sig.key] >= 80 ? 'card-premium' : signals[sig.key] >= 50 ? 'bg-[var(--color-accent)]' : 'bg-red-400'}`} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="card-premium p-8 rounded-2xl flex items-center justify-between text-white shadow-xl shadow-black/20">
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-2xl">verified</span>
                </div>
                <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-white/60">Verified</p>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">Data Layer v4.1</p>
                </div>
             </div>
             <span className="material-symbols-outlined text-white/40 text-3xl">task_alt</span>
          </div>

          <div className="bg-white/5 p-8 rounded-2xl border border-white/10 font-mono">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Payout Formula</p>
            <p className="text-[12px] font-black text-[var(--color-accent)] leading-relaxed italic uppercase tracking-tighter">₹{claim.hourly_baseline_rs}/hr × {claim.disrupted_hours}hr × {(claim.as_multiplier || 1).toFixed(2)} = ₹{claim.payout_amount_rs.toLocaleString()}</p>
          </div>
        </div>

        <div className="p-8 bg-[var(--color-surface)] border-t border-white/10">
          <button onClick={onClose} className="btn-primary w-full py-6 text-[12px]">
            Confirm & Exit
          </button>
        </div>
      </div>
    </div>
  )
}
