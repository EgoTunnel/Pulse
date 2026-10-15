export function WaitingScreen({ title, subtitle, compact }: { title: string; subtitle?: string; compact?: boolean }): JSX.Element {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-slate-50 px-6 text-center ${compact ? 'py-24' : 'min-h-screen'}`}
      role="status"
      aria-live="polite"
    >
      <div aria-hidden="true" className="mb-6 h-10 w-10 animate-pulse rounded-full bg-pulse-400" />
      <h1 className="mb-1 text-xl font-semibold text-slate-800">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}
