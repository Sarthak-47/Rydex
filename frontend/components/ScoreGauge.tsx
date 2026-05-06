"use client";

import { motion } from "framer-motion";

export default function ScoreGauge({ value }: { value: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center justify-center p-6 card-premium w-full max-w-sm mx-auto group">
      <h3 className="text-white/60 font-black uppercase tracking-widest text-[10px] mb-10 group-hover:text-[var(--color-accent)] transition-colors cursor-help" title="Reflects your remaining coverage weekly cap.">Shield Status</h3>
      <div className="relative flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
        {/* Background Circle */}
        <svg width="200" height="200" className="transform -rotate-90">
          <circle
            cx="100"
            cy="100"
            r="80"
            stroke="currentColor"
            strokeWidth="16"
            fill="transparent"
            className="text-[var(--color-accent)]/20"
          />
          {/* Animated Progress Circle */}
          <motion.circle
            cx="100"
            cy="100"
            r="80"
            stroke="currentColor"
            strokeWidth="16"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 80}
            initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
            animate={{ strokeDashoffset: (2 * Math.PI * 80) - (value / 100) * (2 * Math.PI * 80) }}
            transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
            strokeLinecap="round"
            className={value > 70 ? "text-[var(--color-accent)]" : value > 40 ? "text-[var(--color-accent)]" : "text-red-400"}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <motion.span 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-6xl font-black text-white tracking-tighter"
          >
            {value}%
          </motion.span>
          <span className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1">Integrity</span>
        </div>
      </div>
      <div className="mt-10 text-center space-y-3">
        <p className="text-sm font-black text-white uppercase tracking-tight">
            {value >= 90 ? "Maximum Protection" : value >= 50 ? "Active Verification" : "Limit Approaching"}
        </p>
        <p className="text-[11px] text-white/60 font-bold uppercase tracking-widest">
            {value >= 90 ? "Full auto-settle active" : "Standard verification rules"}
        </p>
      </div>
    </div>
  );
}
