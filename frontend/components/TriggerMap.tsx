"use client";

import dynamic from "next/dynamic";

// Wrapper with dynamic import for SSR
const MapWrapper = dynamic(() => import("./MapContent"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-[var(--color-accent)]/10 flex flex-col items-center justify-center gap-4 animate-pulse">
      <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]/40">Gathering map data...</p>
    </div>
  )
});

export default function TriggerMap({ recentClaims = [] }: { recentClaims?: any[] }) {
  return (
    <div className="h-full w-full relative z-10 group">
      <MapWrapper recentClaims={recentClaims} />
      
      {/* Visual Overlays */}
      <div className="absolute top-8 right-8 z-[1000] flex flex-col gap-3">
        <div className="bg-white/5/90 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-2xl">
          <h5 className="text-[10px] font-black uppercase tracking-wider text-[var(--color-accent)] mb-4">Legend</h5>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-white/10"></div>
              <span className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest">Settled</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#F87171]"></div>
              <span className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest">High Risk</span>
            </div>
          </div>
        </div>
        <div className="bg-white/10 text-white px-5 py-3 rounded-2xl flex items-center justify-center shadow-xl">
           <span className="text-[9px] font-black uppercase tracking-widest">Mumbai Metro Area</span>
        </div>
      </div>
    </div>
  );
}
