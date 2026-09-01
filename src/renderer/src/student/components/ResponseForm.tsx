import { useState } from 'react'
import type { ResponseValue, Slide } from '@shared/types'
import { LIKERT_LEVELS } from '@shared/types'

interface Props {
  slide: Slide
  responsesOpen: boolean
  onSubmit: (value: ResponseValue) => Promise<{ ok: true } | { ok: false; error: string }>
}

const bigButton =
  'w-full rounded-2xl border-2 px-5 py-4 text-left text-lg font-medium transition active:scale-[0.98] disabled:opacity-50'
const idleButton = 'border-slate-200 bg-white text-slate-800'
const selectedButton = 'border-pulse-500 bg-pulse-500 text-white'

function Shell({ children, submitted }: { children: React.ReactNode; submitted: boolean }): JSX.Element {
  return (
    <div className="relative" role="group" aria-labelledby="question-heading">
      {children}
      <div role="status" aria-live="polite">
        {submitted && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-sm font-medium text-emerald-700">
            ✓ Response received
          </div>
        )}
      </div>
    </div>
  )
}

function ErrorMessage({ error }: { error: string | null }): JSX.Element | null {
  if (!error) return null
  return (
    <p role="alert" className="mt-3 text-sm text-red-600">
      {error}
    </p>
  )
}

export function ResponseForm({ slide, responsesOpen, onSubmit }: Props): JSX.Element {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(value: ResponseValue): Promise<void> {
    setError(null)
    const result = await onSubmit(value)
    if (result.ok) setSubmitted(true)
    else setError(result.error)
  }

  const disabled = !responsesOpen

  switch (slide.type) {
    case 'multipleChoice':
    case 'poll': {
      const [selected, setSelected] = useState<string | null>(null)
      return (
        <Shell submitted={submitted}>
          <div className="space-y-3">
            {slide.options.map((opt) => (
              <button
                key={opt.id}
                disabled={disabled}
                aria-pressed={selected === opt.id}
                onClick={() => {
                  setSelected(opt.id)
                  send({ kind: 'choice', optionId: opt.id })
                }}
                className={`${bigButton} ${selected === opt.id ? selectedButton : idleButton}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <ErrorMessage error={error} />
        </Shell>
      )
    }
    case 'multipleSelect': {
      const [selected, setSelected] = useState<string[]>([])
      return (
        <Shell submitted={submitted}>
          <div className="space-y-3">
            {slide.options.map((opt) => {
              const isSelected = selected.includes(opt.id)
              return (
                <button
                  key={opt.id}
                  disabled={disabled}
                  aria-pressed={isSelected}
                  onClick={() => setSelected((prev) => (isSelected ? prev.filter((id) => id !== opt.id) : [...prev, opt.id]))}
                  className={`${bigButton} ${isSelected ? selectedButton : idleButton}`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          <button
            disabled={disabled || selected.length === 0}
            onClick={() => send({ kind: 'choices', optionIds: selected })}
            className="mt-4 w-full rounded-2xl bg-pulse-600 py-4 text-lg font-semibold text-white disabled:opacity-40"
          >
            Submit
          </button>
          <ErrorMessage error={error} />
        </Shell>
      )
    }
    case 'trueFalse': {
      const [selected, setSelected] = useState<boolean | null>(null)
      return (
        <Shell submitted={submitted}>
          <div className="grid grid-cols-2 gap-3">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                disabled={disabled}
                aria-pressed={selected === v}
                onClick={() => {
                  setSelected(v)
                  send({ kind: 'boolean', value: v })
                }}
                className={`${bigButton} text-center ${selected === v ? selectedButton : idleButton}`}
              >
                {v ? 'True' : 'False'}
              </button>
            ))}
          </div>
          <ErrorMessage error={error} />
        </Shell>
      )
    }
    case 'rating': {
      const [value, setValue] = useState<number | null>(null)
      const options = Array.from({ length: slide.max - slide.min + 1 }, (_, i) => slide.min + i)
      return (
        <Shell submitted={submitted}>
          <div className="mb-2 flex justify-between text-xs text-slate-500" aria-hidden="true">
            <span>{slide.minLabel}</span>
            <span>{slide.maxLabel}</span>
          </div>
          <div className="flex gap-2">
            {options.map((n) => (
              <button
                key={n}
                disabled={disabled}
                aria-pressed={value === n}
                aria-label={n === slide.min && slide.minLabel ? `${n} — ${slide.minLabel}` : n === slide.max && slide.maxLabel ? `${n} — ${slide.maxLabel}` : String(n)}
                onClick={() => {
                  setValue(n)
                  send({ kind: 'rating', value: n })
                }}
                className={`flex-1 rounded-xl border-2 py-4 text-lg font-semibold ${value === n ? selectedButton : idleButton}`}
              >
                {n}
              </button>
            ))}
          </div>
          <ErrorMessage error={error} />
        </Shell>
      )
    }
    case 'likert': {
      const [value, setValue] = useState<number | null>(null)
      return (
        <Shell submitted={submitted}>
          <div className="space-y-3">
            {LIKERT_LEVELS.map((label, i) => (
              <button
                key={label}
                disabled={disabled}
                aria-pressed={value === i}
                onClick={() => {
                  setValue(i)
                  send({ kind: 'likert', value: i as 0 | 1 | 2 | 3 | 4 })
                }}
                className={`${bigButton} text-center ${value === i ? selectedButton : idleButton}`}
              >
                {label}
              </button>
            ))}
          </div>
          <ErrorMessage error={error} />
        </Shell>
      )
    }
    case 'wordCloud': {
      const [words, setWords] = useState<string[]>(Array(slide.maxWordsPerStudent).fill(''))
      return (
        <Shell submitted={submitted}>
          <div className="space-y-3">
            {words.map((w, i) => (
              <div key={i}>
                <label htmlFor={`word-${i}`} className="sr-only">
                  Word {i + 1}
                </label>
                <input
                  id={`word-${i}`}
                  disabled={disabled}
                  value={w}
                  onChange={(e) => {
                    const next = [...words]
                    next[i] = e.target.value
                    setWords(next)
                  }}
                  placeholder={`Word ${i + 1}`}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-lg outline-none focus:border-pulse-500"
                />
              </div>
            ))}
          </div>
          <button
            disabled={disabled || words.every((w) => !w.trim())}
            onClick={() => send({ kind: 'words', words: words.filter((w) => w.trim()) })}
            className="mt-4 w-full rounded-2xl bg-pulse-600 py-4 text-lg font-semibold text-white disabled:opacity-40"
          >
            Submit
          </button>
          <ErrorMessage error={error} />
        </Shell>
      )
    }
    case 'shortAnswer':
    case 'openResponse': {
      const [text, setText] = useState('')
      const long = slide.type === 'openResponse'
      return (
        <Shell submitted={submitted}>
          <label htmlFor="answer-text" className="sr-only">
            Your answer
          </label>
          <textarea
            id="answer-text"
            disabled={disabled}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={long ? 6 : 3}
            maxLength={long ? 2000 : 280}
            placeholder="Type your answer…"
            className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-lg outline-none focus:border-pulse-500"
          />
          <button
            disabled={disabled || !text.trim()}
            onClick={() => send({ kind: 'text', text: text.trim() })}
            className="mt-4 w-full rounded-2xl bg-pulse-600 py-4 text-lg font-semibold text-white disabled:opacity-40"
          >
            Submit
          </button>
          <ErrorMessage error={error} />
        </Shell>
      )
    }
    case 'ranking': {
      const [order, setOrder] = useState(slide.options.map((o) => o.id))
      function move(i: number, dir: -1 | 1): void {
        const next = [...order]
        const j = i + dir
        if (j < 0 || j >= next.length) return
        ;[next[i], next[j]] = [next[j], next[i]]
        setOrder(next)
      }
      return (
        <Shell submitted={submitted}>
          <ol className="space-y-2">
            {order.map((id, i) => {
              const opt = slide.options.find((o) => o.id === id)!
              return (
                <li key={id} className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-3">
                  <span className="w-5 text-sm font-semibold text-slate-400" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-base font-medium text-slate-800">{opt.label}</span>
                  <button
                    disabled={disabled || i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={`Move ${opt.label} up`}
                    className="rounded-lg px-2 py-1 text-slate-500 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    disabled={disabled || i === order.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={`Move ${opt.label} down`}
                    className="rounded-lg px-2 py-1 text-slate-500 disabled:opacity-30"
                  >
                    ↓
                  </button>
                </li>
              )
            })}
          </ol>
          <button
            disabled={disabled}
            onClick={() => send({ kind: 'ranking', optionIds: order })}
            className="mt-4 w-full rounded-2xl bg-pulse-600 py-4 text-lg font-semibold text-white disabled:opacity-40"
          >
            Submit ranking
          </button>
          <ErrorMessage error={error} />
        </Shell>
      )
    }
    case 'numeric': {
      const [value, setValue] = useState('')
      return (
        <Shell submitted={submitted}>
          <div className="flex items-center gap-2">
            <label htmlFor="numeric-answer" className="sr-only">
              Your answer{slide.unit ? ` (${slide.unit})` : ''}
            </label>
            <input
              id="numeric-answer"
              disabled={disabled}
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-2xl font-semibold outline-none focus:border-pulse-500"
            />
            {slide.unit && (
              <span className="text-lg text-slate-500" aria-hidden="true">
                {slide.unit}
              </span>
            )}
          </div>
          <button
            disabled={disabled || value.trim() === ''}
            onClick={() => send({ kind: 'numeric', value: Number(value) })}
            className="mt-4 w-full rounded-2xl bg-pulse-600 py-4 text-lg font-semibold text-white disabled:opacity-40"
          >
            Submit
          </button>
          <ErrorMessage error={error} />
        </Shell>
      )
    }
    case 'qna': {
      const [text, setText] = useState('')
      return (
        <Shell submitted={false}>
          <label htmlFor="qna-text" className="sr-only">
            Your question
          </label>
          <textarea
            id="qna-text"
            disabled={disabled}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Ask your question…"
            className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-lg outline-none focus:border-pulse-500"
          />
          <button
            disabled={disabled || !text.trim()}
            onClick={async () => {
              await send({ kind: 'question', text: text.trim() })
              setText('')
            }}
            className="mt-4 w-full rounded-2xl bg-pulse-600 py-4 text-lg font-semibold text-white disabled:opacity-40"
          >
            Send question
          </button>
          <div role="status" aria-live="polite">
            {submitted && (
              <p className="mt-3 text-center text-sm font-medium text-emerald-700">Sent! You can ask another question.</p>
            )}
          </div>
          <ErrorMessage error={error} />
        </Shell>
      )
    }
    default:
      return <></>
  }
}
