'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface WorkerSession {
  worker_id: string
  name: string
  token: string
}

interface AuthCtx {
  session: WorkerSession | null
  login: (token: string, workerId: string, name: string) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthCtx>({
  session: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<WorkerSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('rydex_token')
    const worker = localStorage.getItem('rydex_worker')
    if (token && worker) {
      setSession({ token, ...JSON.parse(worker) })
    }
    setIsLoading(false)
  }, [])

  const login = (token: string, workerId: string, name: string) => {
    localStorage.setItem('rydex_token', token)
    localStorage.setItem('rydex_worker', JSON.stringify({ worker_id: workerId, name }))
    setSession({ token, worker_id: workerId, name })
    router.push('/dashboard')
  }

  const logout = () => {
    localStorage.removeItem('rydex_token')
    localStorage.removeItem('rydex_worker')
    setSession(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ session, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
