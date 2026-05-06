export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Loading profile</p>
      </div>
    </div>
  )
}
