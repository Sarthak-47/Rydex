import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-white flex items-center justify-center px-6">
      <div className="text-center space-y-6">
        <p className="text-[140px] font-black font-mono text-white/5 leading-none select-none">404</p>
        <div className="-mt-10 space-y-3">
          <h1 className="text-3xl font-headline font-black uppercase tracking-tighter">Zone not found</h1>
          <p className="text-white/40 text-sm font-bold max-w-xs mx-auto leading-relaxed">
            This route does not exist on the Rydex network.
          </p>
        </div>
        <div className="flex gap-3 justify-center pt-2">
          <Link
            href="/"
            className="btn-secondary py-3 px-8 text-sm font-black uppercase tracking-widest"
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            className="btn-primary py-3 px-8 text-sm font-black uppercase tracking-widest"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
