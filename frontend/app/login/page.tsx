'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
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
      setError('Invalid phone or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-background text-on-background font-body min-h-screen overflow-hidden relative flex items-center justify-center">
      {/* Dynamic Background Pattern */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-[var(--color-accent)]/10 blur-[160px] rounded-full pointer-events-none"></div>
      
      <header className="fixed top-0 w-full z-50 bg-background/60 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-6 h-[88px]">
        <div className="flex items-center">
            <img src="/rydex_dynamic_logo.png" alt="Rydex Logo" style={{ width: '285px', height: 'auto', objectFit: 'contain' }} />
        </div>
        <Link href="/register" className="btn-secondary py-3 px-6 rounded-xl">Register</Link>
      </header>

      <main className="relative z-10 w-full max-w-xl px-6">
        <div className="text-center space-y-4 mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl font-headline font-black tracking-tighter text-on-background uppercase"
          >
            Sign In.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[var(--color-accent)] text-xs font-black uppercase tracking-widest"
          >
            Access your protection dashboard
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="card-premium p-8 relative overflow-hidden"
        >
          <form onSubmit={handleLogin} className="space-y-10 relative z-10">
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

            <div className="space-y-4">
              <label className="text-muted ml-2">Password</label>
              <input 
                className="input-premium" 
                placeholder="••••••••" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex justify-between items-center px-2">
                  <Link href="/register" className="text-[10px] font-black text-white/90 uppercase tracking-widest text-[var(--color-accent)] hover:underline">Create an account</Link>
                  <span className="text-[9px] text-white/40 font-black uppercase tracking-widest">SECURE LOGIN</span>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 bg-red-50 p-6 rounded-2xl border border-red-100">
                  <span className="material-symbols-outlined text-red-600">error</span>
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-tight">
                    {error}
                  </p>
              </motion.div>
            )}

            <button disabled={loading} type="submit" className="btn-primary w-full h-20 shadow-2xl">
              {loading ? <span className="material-symbols-outlined animate-spin font-bold">sync</span> : 'Sign In'}
            </button>

            <div className="pt-10 border-t border-white/10">
              <div className="flex justify-between items-center mb-8">
                <p className="text-[9px] text-white/40 uppercase tracking-widest font-black">Demo Logins</p>
                <div className="h-[1px] flex-1 bg-white/5/50 ml-6"></div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {[
                    { name: 'Salim (Bandra)', phone: '9820001001' },
                    { name: 'Priya (Andheri)', phone: '9820001002' },
                    { name: 'Arjun (Powai)', phone: '9820001003' },
                ].map((w) => (
                    <button
                      key={w.phone}
                      type="button"
                      onClick={() => { setPhone(w.phone); setPassword('demo1234') }}
                      className="w-full text-left p-5 rounded-2xl bg-white/5 hover:bg-white/10  transition-all border border-white/10 flex justify-between items-center group"
                    >
                      <span className="text-[10px] font-black text-white/90 uppercase tracking-widest leading-none">{w.name}</span>
                      <span className="font-mono text-xs opacity-40 group-hover:opacity-100 transition-opacity">+{w.phone}</span>
                    </button>
                ))}
              </div>
              <div className="mt-10 text-center">
                   <Link href="/admin" className="text-[10px] text-white/40 font-black uppercase tracking-widest hover:text-[var(--color-accent)] transition-all flex items-center justify-center gap-3">
                      Admin Login
                      <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
                   </Link>
              </div>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  )
}
