export function WaitingScreen({ title, subtitle }: { title: string; subtitle?: string }): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center" role="status" aria-live="polite">
      <div aria-hidden="true" className="mb-6 h-10 w-10 animate-pulse rounded-full bg-pulse-400" />
      <h1 className="mb-1 text-xl font-semibold text-slate-800">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}
