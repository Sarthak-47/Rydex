"use client";

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis } from 'recharts';

export default function MLScatterPlot({ claims = [] }: { claims?: any[] }) {
  const data = claims.map((c: any, i: number) => ({
    id: c.id?.substring(0, 5) || i,
    disrupted_hours: (c.disrupted_hours || 12) + (Math.random() - 0.5),
    amount: (c.amount_rs || 500) + (Math.random() - 0.5) * 20,
    is_fraud: c.status === 'manual_review' || c.as_score < 45 ? 1 : 0
  }));

  const plotData = data.length > 0 ? data : Array.from({ length: 40 }).map((_, i) => ({
    id: `sim-${i}`,
    disrupted_hours: 8 + Math.random() * 40,
    amount: 200 + Math.random() * 2000,
    is_fraud: Math.random() > 0.95 ? 1 : 0
  }));

  return (
    <div className="card-premium p-6 w-full h-[500px] flex flex-col relative overflow-hidden group">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#060B19]/5 rounded-full blur-3xl group-hover:bg-[#060B19]/10 transition-all duration-700"></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start mb-10 z-10 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[var(--color-accent)]/10 rounded-xl">
                <span className="material-symbols-outlined text-[var(--color-accent)] text-xl">data_thresholding</span>
            </div>
            <h3 className="text-white font-black font-headline text-2xl tracking-tighter uppercase leading-none">
              Fraud Analysis
            </h3>
          </div>
          <p className="text-muted text-xs font-black uppercase tracking-wider">Real-time detection across processed claims</p>
        </div>
        <div className="flex gap-6 bg-[#10162A] p-4 rounded-2xl border border-white/10 shadow-inner">
          <div className="flex items-center gap-3">
             <div className="w-4 h-4 rounded-full bg-white/10 shadow-sm"></div>
             <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]/60">Normal</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-4 h-4 rounded-full bg-red-500 shadow-sm"></div>
             <span className="text-[10px] font-black uppercase tracking-widest text-white/60">High Risk</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0 z-10">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#1B4332" opacity={0.05} vertical={false} />
            <XAxis 
              type="number" 
              dataKey="disrupted_hours" 
              name="Hours" 
              tick={{ fill: 'rgba(255,255,255,0.5)', opacity: 0.8, fontSize: 10, fontWeight: 900 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              type="number" 
              dataKey="amount" 
              name="Payout" 
              tick={{ fill: 'rgba(255,255,255,0.5)', opacity: 0.8, fontSize: 10, fontWeight: 900 }}
              axisLine={false}
              tickLine={false}
            />
            <ZAxis type="number" range={[100, 600]} />
            <Tooltip 
              cursor={{ stroke: '#1B4332', strokeWidth: 2, strokeDasharray: '5 5', opacity: 0.2 }} 
              contentStyle={{ 
                backgroundColor: '#1B4332', 
                border: 'none', 
                borderRadius: '1.5rem', 
                color: 'white',
                padding: '1.5rem',
                boxShadow: '0 20px 40px rgba(27,67,50,0.2)'
              }}
              itemStyle={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}
            />
            <Scatter name="Claims" data={plotData} fill="var(--color-accent)">
              {plotData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.is_fraud === 1 ? '#F87171' : 'var(--color-accent)'} 
                  opacity={entry.is_fraud === 1 ? 1 : 0.4}
                  className="transition-all duration-500 hover:opacity-100 cursor-pointer"
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/70 border-t border-white/10/10 pt-6">
        <span>X: Hours</span>
        <span>Y: Amount (INR)</span>
      </div>
    </div>
  );
}
