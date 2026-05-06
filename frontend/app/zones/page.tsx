'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { analyticsApi, ZoneLossRatio, ForecastAlert } from '@/lib/api'

const TRIGGER_EMOJI: Record<string, string> = {
  rainfall: '🌧️', heat: '🌡️', aqi: '💨', traffic: '🚦', flood: '🌊',
}
const RISK_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
}

function getRiskLevel(floodRisk: number): 'high' | 'medium' | 'low' {
  if (floodRisk >= 0.7) return 'high'
  if (floodRisk >= 0.45) return 'medium'
  return 'low'
}

export default function ZonesPage() {
  const router = useRouter()
  const [zones, setZones] = useState<ZoneLossRatio[]>([])
  const [forecasts, setForecasts] = useState<ForecastAlert[]>([])
  const [selectedZone, setSelectedZone] = useState<ZoneLossRatio | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [lrRes, fcRes] = await Promise.all([
        analyticsApi.lossRatios(),
        analyticsApi.forecastAlerts(),
      ])
      setZones(lrRes.data.zones || [])
      setForecasts(fcRes.data.alerts || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('rydex_worker')
    if (!stored) { router.push('/login'); return }
    load()
  }, [router, load])

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

  const totalWorkers = zones.reduce((a, z) => a + z.worker_count, 0)
  const totalExposure = zones.reduce((a, z) => a + z.total_paid_rs, 0)
  const highRiskZones = zones.filter(z => getRiskLevel(z.flood_risk_index) === 'high').length

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-white font-body">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-white/10 px-5 md:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/analytics')}
            className="text-white/40 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <h1 className="text-base font-headline font-black text-white">Zone Impact Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-white/40 hover:text-white text-xs font-bold uppercase tracking-wider">
            Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 md:px-8 py-8 space-y-8">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Zones', value: zones.length, icon: 'location_on', color: 'text-blue-400' },
            { label: 'Enrolled Riders', value: totalWorkers, icon: 'groups', color: 'text-green-400' },
            { label: 'High Risk Zones', value: highRiskZones, icon: 'warning', color: 'text-red-400' },
          ].map(stat => (
            <div key={stat.label} className="card-premium rounded-2xl p-5">
              <span className={`material-symbols-outlined text-xl mb-2 block ${stat.color}`}>{stat.icon}</span>
              <p className="font-mono font-black text-2xl text-white">{stat.value}</p>
              <p className="text-white/40 text-xs font-bold mt-1 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Active forecast alerts across all zones */}
        {forecasts.length > 0 && (
          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">
              Active Forecast Alerts — All Zones
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {forecasts.slice(0, 6).map((alert, i) => (
                <motion.div
                  key={alert.alert_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card-premium rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{TRIGGER_EMOJI[alert.trigger_type] || '⚡'}</span>
                      <div>
                        <p className="text-xs font-black text-white capitalize">{alert.trigger_type}</p>
                        <p className="text-[10px] text-white/40 font-bold">{alert.zone_name}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      alert.severity === 'HIGH'
                        ? 'text-red-400 bg-red-500/10 border-red-500/30'
                        : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40 font-bold">{alert.probability_pct}% probability</span>
                    <span className="text-[var(--color-accent)] font-black">₹{Math.round(alert.expected_payout_per_worker_rs)}/rider</span>
                  </div>
                  <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-accent)] rounded-full"
                      style={{ width: `${alert.probability_pct}%` }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Zone grid */}
        <section>
          <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">
            Zone Risk Matrix
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {zones.map((zone, i) => {
              const risk = getRiskLevel(zone.flood_risk_index)
              const rc = RISK_COLOR[risk]
              const zoneForecasts = forecasts.filter(f => f.zone_id === zone.zone_id)
              const isSelected = selectedZone?.zone_id === zone.zone_id

              return (
                <motion.div
                  key={zone.zone_id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => setSelectedZone(isSelected ? null : zone)}
                  className={`card-premium rounded-2xl p-5 cursor-pointer transition-all ${
                    isSelected ? 'ring-1 ring-[var(--color-accent)]/50' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-headline font-black text-white">{zone.zone_name}</h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${rc.bg} ${rc.text} ${rc.border}`}>
                          {risk.toUpperCase()} RISK
                        </span>
                      </div>
                      <p className="text-xs text-white/40 font-bold">Zone factor: {zone.zone_factor}×</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black font-mono text-white">{zone.worker_count}</p>
                      <p className="text-[10px] text-white/40 font-bold">riders</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {[
                      { label: 'Loss Ratio', value: `${(zone.loss_ratio * 100).toFixed(1)}%` },
                      { label: 'Claims', value: zone.total_claims },
                      { label: 'Paid Out', value: `₹${Math.round(zone.total_paid_rs)}` },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm font-black text-white font-mono mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Flood risk bar */}
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${rc.text.replace('text-', 'bg-')}`}
                      style={{ width: `${zone.flood_risk_index * 100}%`, opacity: 0.7 }}
                    />
                  </div>
                  <p className="text-[10px] text-white/30 font-bold mt-1">
                    Flood risk: {(zone.flood_risk_index * 100).toFixed(0)}%
                  </p>

                  {/* Zone forecasts */}
                  {zoneForecasts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex gap-1.5 flex-wrap">
                      {zoneForecasts.map(f => (
                        <span key={f.alert_id} className="text-xs font-bold text-white/50">
                          {TRIGGER_EMOJI[f.trigger_type]} {f.trigger_type} in {f.expected_onset_hours_from_now.toFixed(1)}h
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded detail */}
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 pt-4 border-t border-white/10 space-y-2"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Approved Claims</p>
                          <p className="text-sm font-black text-green-400">{zone.approved_claims}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Flagged Claims</p>
                          <p className="text-sm font-black text-red-400">{zone.flagged_claims}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Avg Payout</p>
                          <p className="text-sm font-black text-white">₹{Math.round(zone.avg_payout_rs)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Total Premium</p>
                          <p className="text-sm font-black text-white">₹{Math.round(zone.total_premium_rs)}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
