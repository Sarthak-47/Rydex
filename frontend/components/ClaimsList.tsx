'use client'
import { useState, useEffect } from 'react'
import { claimsApi, payoutsApi, Claim, Payout } from '@/lib/api'
import ClaimModal from './ClaimModal'
import { motion } from 'framer-motion'

interface ClaimsListProps {
  workerId: string
  refreshTrigger?: number
}

export default function ClaimsList({ workerId, refreshTrigger }: ClaimsListProps) {
  const [claims, setClaims] = useState<Claim[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)

  const fetchData = async () => {
    try {
      const [claimsRes, payoutsRes] = await Promise.all([
        claimsApi.list(workerId),
        payoutsApi.list(workerId)
      ])
      setClaims(claimsRes.data)
      setPayouts(payoutsRes.data)
    } catch (err) {
      console.error("Failed to fetch ledger data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [workerId, refreshTrigger])

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 rounded-full border-4 border-white/20/10 border-t-[var(--color-accent)] animate-spin"></div>
        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Updating Registry...</p>
      </div>
    )
  }

  if (claims.length === 0 && payouts.length === 0) {
    return (
      <div className="py-24 px-6 text-center space-y-6 card-premium border-dashed">
        <div className="w-20 h-20 bg-[#060B19]/5 rounded-full mx-auto flex items-center justify-center text-white/40">
            <span className="material-symbols-outlined text-4xl">history</span>
        </div>
        <div>
            <h3 className="text-xl font-headline font-black text-white">No Activity Found</h3>
            <p className="text-muted text-sm mt-2 leading-relaxed max-w-xs mx-auto font-bold uppercase tracking-tight">Your automated settlements will appear here after a validated disruption.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
      <div className="flex justify-between items-center px-4">
        <h3 className="text-[11px] uppercase font-black tracking-widest text-white/60">Verification Log</h3>
        <span className="text-[10px] font-black text-[var(--color-accent)] bg-black/20 px-4 py-1.5 rounded-full border border-white/10">
          {claims.length + payouts.length} RECORDS
        </span>
      </div>

      {claims.length > 0 && (
        <div className="grid gap-6">
          {claims.map((claim) => (
            <motion.div
              layout
              key={claim.id}
              onClick={() => setSelectedClaim(claim)}
              className="card-premium p-8 cursor-pointer group hover:bg-[#10162A] relative overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[var(--color-accent)]/10 rounded-full blur-3xl group-hover:bg-white/10/10 transition-all duration-500"></div>
              
              <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-6">
                  <div
                    className={`w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 ${
                      claim.status === 'auto_approved' || claim.status === 'approved'
                        ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                        : claim.status === 'soft_hold'
                          ? 'bg-amber-500/5 text-amber-500'
                          : 'bg-red-500/5 text-red-500'
                    }`}
                  >
                    <span className="material-symbols-outlined text-3xl font-black">
                      {claim.status === 'auto_approved' || claim.status === 'approved' ? 'task_alt' : 'history_toggle_off'}
                    </span>
                  </div>
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                      <h4 className="text-xl font-black text-[var(--color-accent)] group-hover:text-[var(--color-accent)] transition-colors leading-none tracking-tighter">
                        Claim #{claim.id ? claim.id.substring(0, 8).toUpperCase() : 'N/A'}
                      </h4>
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-current transition-all duration-500 ${
                          claim.status === 'auto_approved' || claim.status === 'approved'
                            ? 'bg-white/10 text-white border-transparent'
                            : claim.status === 'soft_hold'
                              ? 'bg-amber-500 text-white border-transparent'
                              : 'bg-red-500 text-white border-transparent'
                        }`}
                      >
                        {(claim.status || 'processing').replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--color-accent)]/60 font-black uppercase tracking-wider">
                      {claim.created_at ? new Date(claim.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      }) : 'Awaiting Date'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-[var(--color-accent)] tracking-tighter group-hover:scale-105 transition-transform origin-right leading-none">
                    ₹{(claim.payout_amount_rs || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] font-black text-[var(--color-accent)] flex items-center justify-end gap-2 mt-3 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-sm">security</span>
                    {Math.round(claim.as_score || 0)}% Integrity
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${claim.resolved_at ? 'bg-white/10' : 'bg-amber-400 animate-pulse'}`}></div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-accent)]/70">
                      {claim.resolved_at ? 'Settlement Resolved' : 'Verification Pipeline'}
                    </span>
                </div>
                <span className="material-symbols-outlined text-[var(--color-accent)]/20 text-2xl group-hover:translate-x-2 group-hover:text-[var(--color-accent)] transition-all duration-500">arrow_forward_ios</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {payouts.length > 0 && (
        <div className="pt-10 space-y-6">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-[11px] uppercase font-black tracking-widest text-white/60">Settlement Stream</h3>
            <span className="text-[10px] font-black text-[var(--color-accent)] bg-black/20 px-4 py-1.5 rounded-full border border-white/10">
              {payouts.length} UNITS
            </span>
          </div>
          <div className="grid gap-6">
            {payouts.map((p) => (
              <div
                key={p.id}
                className="card-premium p-8 relative overflow-hidden group"
              >
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-[var(--color-accent)]/10 rounded-full blur-3xl group-hover:bg-white/10/10 transition-all duration-500"></div>
                
                <div className="flex flex-wrap sm:flex-nowrap justify-between items-center relative z-10 gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center transition-all duration-500 group-hover:scale-110">
                        <span className="material-symbols-outlined text-3xl font-black">payments</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-4 mb-2">
                        <p className="text-2xl font-black text-[var(--color-accent)] tracking-tighter leading-none">₹{p.amount_rs.toLocaleString()}</p>
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-transparent transition-all duration-500 ${
                            p.status === 'success' ? 'bg-white/10 text-white' : 'bg-amber-400 text-white'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--color-accent)]/60 font-black uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">qr_code_2</span>
                        {p.upi_ref || 'PENDING_SIG_AUTH'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black text-[var(--color-accent)] uppercase tracking-wider leading-none">
                      v3.0 Secure • {p.latency_seconds ?? 0}ms
                    </p>
                    <p className="text-[10px] text-[var(--color-accent)]/60 mt-3 uppercase font-black tracking-widest">
                      {p.initiated_at ? new Date(p.initiated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedClaim && (
        <ClaimModal 
          claim={selectedClaim} 
          onClose={() => setSelectedClaim(null)} 
        />
      )}
    </div>
  )
}
