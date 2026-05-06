"use client";

import { motion } from "framer-motion";

export default function BlockchainLedger({ payouts = [] }: { payouts?: any[] }) {
  const generateHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(12, '0') + Math.random().toString(16).substring(2, 14);
  };

  const ledgerData = payouts.map(p => ({
    ...p,
    mockHash: `${generateHash(p.id + (p.amount_rs || 0))}`.toUpperCase()
  }));

  return (
    <div className="bg-[var(--color-surface)] text-white border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col font-body text-sm max-h-[600px]">
      <div className="bg-white/5 px-6 py-6 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-[var(--color-accent)] font-black uppercase tracking-widest text-[11px] flex items-center gap-4">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full card-premium"></div>
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full card-premium animate-ping opacity-30"></div>
          </div>
          Payout Records
        </h3>
        <span className="text-white/40 text-[10px] font-black uppercase tracking-wider bg-black/5 px-4 py-1.5 rounded-full">Secure Records</span>
      </div>
      
      <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-5 no-scrollbar bg-[var(--color-surface)]">
        {ledgerData.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center text-[var(--color-accent)]/20">
                <span className="material-symbols-outlined text-4xl">sync</span>
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-white/40">Waiting for payouts...</p>
          </div>
        ) : (
          ledgerData.map((p, index) => (
            <motion.div 
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/5 border border-white/10 px-8 py-6 rounded-[2.25rem] flex flex-wrap md:flex-nowrap items-center justify-between relative group hover:bg-black/5 transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-black/10 overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 card-premium opacity-10 group-hover:opacity-40 transition-opacity"></div>
              
              {/* Transaction ID & Status */}
              <div className="flex-1 flex flex-col gap-2 min-w-[220px] mb-4 md:mb-0">
                <span className="text-white/60 font-black text-[9px] uppercase tracking-wider leading-none">Transaction ID</span>
                <span className="text-[var(--color-accent)] font-mono text-[12px] font-black tracking-tight truncate">#{p.mockHash.substring(0, 20)}</span>
              </div>

              {/* Payout Amount */}
              <div className="flex-1 flex flex-col gap-2 min-w-[150px] mb-4 md:mb-0">
                <span className="text-white/60 font-black text-[9px] uppercase tracking-wider leading-none">Amount</span>
                <span className="text-white text-xl font-black font-headline tracking-tighter leading-none">₹{(p.amount_rs || 0).toLocaleString()}</span>
              </div>

              {/* Reference ID */}
              <div className="flex-1 flex flex-col gap-2 min-w-[200px] hidden lg:flex">
                <span className="text-white/60 font-black text-[9px] uppercase tracking-wider leading-none">Reference</span>
                <span className="text-white/80 font-black text-[11px] font-mono leading-none">{p.upi_ref || 'SIG_PENDING'}</span>
              </div>

              {/* Status & Speed */}
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end gap-2 hidden sm:flex text-right">
                    <span className="text-white/60 font-black text-[9px] uppercase tracking-wider leading-none">Speed</span>
                    <span className="text-[var(--color-accent)] font-black text-[12px] font-mono tracking-tighter leading-none">{p.latency_seconds}ms</span>
                </div>
                <div className={`px-6 py-2.5 rounded-full text-[10px] font-black border tracking-widest shadow-sm min-w-[100px] text-center transition-all duration-500 ${p.status === 'success' ? 'card-premium text-white border-transparent' : 'bg-black/10 text-white/40 border-black/5'}`}>
                  {p.status === 'success' ? 'SETTLED' : 'PENDING'}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
      <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/40">
          <span>Auto-Sync Active</span>
          <span>Zone 4</span>
      </div>
    </div>
  );
}
