import type { ResultsData, Slide } from '@shared/types'
import { LIKERT_LEVELS } from '@shared/types'

interface Props {
  slide: Slide
  data: ResultsData
  responseCount: number
  revealed: boolean
}

const BAR_COLORS = ['bg-pulse-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-cyan-500']

export function ResultsView({ slide, data, responseCount, revealed }: Props): JSX.Element {
  if (!revealed) {
    return (
      <div className="flex flex-col items-center gap-2 text-slate-300">
        <div className="text-4xl font-semibold text-white">{responseCount}</div>
        <div className="text-sm uppercase tracking-wide text-slate-400">
          {responseCount === 1 ? 'response received' : 'responses received'}
        </div>
        <div className="mt-2 text-sm text-slate-500">Results are hidden until you reveal them.</div>
      </div>
    )
  }

  switch (data.kind) {
    case 'choice':
      return <ChoiceBars data={data.counts} slide={slide} total={responseCount} />
    case 'boolean': {
      const counts: Record<string, number> = { True: data.counts.true, False: data.counts.false }
      return <LabeledBars counts={counts} total={responseCount} />
    }
    case 'rating': {
      const counts: Record<string, number> = {}
      for (const [k, v] of Object.entries(data.counts)) counts[k] = v
      return (
        <div className="w-full max-w-3xl">
          <LabeledBars counts={counts} total={responseCount} />
          <p className="mt-4 text-center text-sm text-slate-400">Average: {data.average.toFixed(2)}</p>
        </div>
      )
    }
    case 'likert': {
      const counts: Record<string, number> = {}
      LIKERT_LEVELS.forEach((label, i) => (counts[label] = data.counts[i] ?? 0))
      return <LabeledBars counts={counts} total={responseCount} />
    }
    case 'words':
      return <WordCloud words={data.words} />
    case 'text':
      return (
        <div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
          {data.entries.length === 0 && <p className="text-slate-400">No responses yet.</p>}
          {data.entries.map((entry) => (
            <div key={entry.id} className="rounded-xl bg-white/10 p-4 text-left text-white">
              {entry.text}
            </div>
          ))}
        </div>
      )
    case 'ranking': {
      const rankSlide = slide.type === 'ranking' ? slide : null
      const entries = Object.entries(data.averageRank).sort((a, b) => a[1] - b[1] || 0)
      return (
        <div className="w-full max-w-2xl space-y-2">
          {entries.map(([optionId, avg], i) => {
            const label = rankSlide?.options.find((o) => o.id === optionId)?.label ?? optionId
            return (
              <div key={optionId} className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3 text-white">
                <span className="text-lg font-semibold text-pulse-300">#{i + 1}</span>
                <span className="flex-1">{label}</span>
                <span className="text-sm text-slate-300">avg rank {avg.toFixed(1)}</span>
              </div>
            )
          })}
        </div>
      )
    }
    case 'numeric':
      return (
        <div className="grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
          <Stat label="Average" value={data.average.toFixed(1)} />
          <Stat label="Median" value={data.median.toFixed(1)} />
          <Stat label="Min" value={String(data.min)} />
          <Stat label="Max" value={String(data.max)} />
        </div>
      )
    case 'questions':
      return (
        <div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
          {data.entries.length === 0 && <p className="text-slate-400">No questions yet.</p>}
          {[...data.entries].reverse().map((q) => (
            <div key={q.id} className="rounded-xl bg-white/10 p-4 text-left text-white">
              {q.text}
            </div>
          ))}
        </div>
      )
  }
}

function ChoiceBars({ data, slide, total }: { data: Record<string, number>; slide: Slide; total: number }): JSX.Element {
  const options = 'options' in slide ? slide.options : []
  const counts: Record<string, number> = {}
  for (const opt of options) counts[opt.label] = data[opt.id] ?? 0
  const correctId = 'correctOptionId' in slide ? slide.correctOptionId : undefined
  const correctIds = 'correctOptionIds' in slide ? slide.correctOptionIds : undefined
  const correctLabels = new Set(
    options.filter((o) => o.id === correctId || correctIds?.includes(o.id)).map((o) => o.label)
  )
  return <LabeledBars counts={counts} total={total} highlight={correctLabels.size > 0 ? correctLabels : undefined} />
}

function LabeledBars({
  counts,
  total,
  highlight
}: {
  counts: Record<string, number>
  total: number
  highlight?: Set<string>
}): JSX.Element {
  const max = Math.max(1, ...Object.values(counts))
  return (
    <div className="w-full max-w-3xl space-y-3">
      {Object.entries(counts).map(([label, count], i) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        const isCorrect = highlight?.has(label)
        return (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between text-sm text-slate-200">
              <span className="flex items-center gap-2">
                {label}
                {isCorrect && <span className="text-emerald-400">✓ correct</span>}
              </span>
              <span className="text-slate-400">
                {count} · {pct}%
              </span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${isCorrect ? 'bg-emerald-500' : BAR_COLORS[i % BAR_COLORS.length]} transition-all duration-500`}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WordCloud({ words }: { words: { text: string; count: number }[] }): JSX.Element {
  if (words.length === 0) return <p className="text-slate-400">No words yet.</p>
  const max = Math.max(...words.map((w) => w.count))
  return (
    <div className="flex max-w-4xl flex-wrap items-center justify-center gap-x-4 gap-y-2">
      {words.map((w) => {
        const scale = 1 + (w.count / max) * 2.2
        return (
          <span
            key={w.text}
            className="font-semibold text-white"
            style={{ fontSize: `${scale}rem`, opacity: 0.55 + (w.count / max) * 0.45 }}
          >
            {w.text}
          </span>
        )
      })}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <div className="text-4xl font-semibold text-white">{value}</div>
      <div className="text-sm uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  )
}
