import type { ChangeEvent } from 'react'
import type { ChoiceOption, RevealPolicy, Slide } from '@shared/types'
import { isInteractiveSlide } from '@shared/types'
import type { SlideAlign, SlideStyle, SlideTextSize } from '@shared/theme'
import { COLOR_SWATCHES } from '@shared/theme'
import { makeId } from '@shared/id'
import { useEditorStore } from '../store'

interface Props {
  slide: Slide
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-pulse-400'

function ImagePicker({ value, onChange }: { value?: string; onChange: (dataUrl: string) => void }): JSX.Element {
  function handleFile(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange(String(reader.result))
    reader.readAsDataURL(file)
  }
  return (
    <div className="space-y-2">
      {value && <img src={value} className="h-24 w-full rounded-lg object-cover" />}
      <input type="file" accept="image/*" onChange={handleFile} className="block w-full text-xs text-slate-300" />
    </div>
  )
}

function OptionsEditor({
  options,
  onChange
}: {
  options: ChoiceOption[]
  onChange: (options: ChoiceOption[]) => void
}): JSX.Element {
  return (
    <div className="space-y-2">
      {options.map((opt, i) => (
        <div key={opt.id} className="flex items-center gap-2">
          <label htmlFor={`option-${opt.id}`} className="sr-only">
            Option {i + 1}
          </label>
          <input
            id={`option-${opt.id}`}
            value={opt.label}
            onChange={(e) => {
              const next = [...options]
              next[i] = { ...opt, label: e.target.value }
              onChange(next)
            }}
            className={inputClass}
          />
          {options.length > 2 && (
            <button
              onClick={() => onChange(options.filter((o) => o.id !== opt.id))}
              aria-label={`Remove option ${i + 1}${opt.label ? `: ${opt.label}` : ''}`}
              className="rounded-md px-2 py-1 text-xs text-slate-500 hover:text-red-400"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => onChange([...options, { id: makeId(), label: `Option ${options.length + 1}` }])}
        className="text-xs font-medium text-pulse-400 hover:text-pulse-300"
      >
        + Add option
      </button>
    </div>
  )
}

function RevealPolicyToggle({ value, onChange }: { value: RevealPolicy; onChange: (v: RevealPolicy) => void }): JSX.Element {
  return (
    <Field label="When are results shown?">
      <div className="flex gap-2">
        {(['live', 'onReveal'] as RevealPolicy[]).map((policy) => (
          <button
            key={policy}
            onClick={() => onChange(policy)}
            aria-pressed={value === policy}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${
              value === policy ? 'border-pulse-400 bg-pulse-500/20 text-white' : 'border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {policy === 'live' ? 'Live, as they arrive' : 'Only when I reveal'}
          </button>
        ))}
      </div>
    </Field>
  )
}

function SlideAppearance({ slide, patch }: { slide: Slide; patch: (p: Partial<Slide>) => void }): JSX.Element {
  const style: SlideStyle = slide.style ?? {}
  const setStyle = (p: Partial<SlideStyle>): void => patch({ style: { ...style, ...p } })
  const pill = (active: boolean): string =>
    `flex-1 rounded-lg border px-3 py-1.5 text-xs ${active ? 'border-pulse-400 bg-pulse-500/20 text-white' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`

  return (
    <details className="rounded-lg border border-slate-800 p-3" open={!!slide.style}>
      <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-slate-400">Slide appearance</summary>
      <div className="mt-3 space-y-4">
        <div>
          <span className="mb-1 block text-xs text-slate-400">Background</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => setStyle({ background: undefined })} aria-pressed={!style.background} className={`rounded-md border px-2 py-1 text-xs ${!style.background ? 'border-pulse-400 text-white' : 'border-slate-700 text-slate-400'}`}>
              Theme
            </button>
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => setStyle({ background: c })}
                aria-pressed={style.background === c}
                aria-label={`Background ${c}`}
                className={`h-6 w-6 rounded-md border-2 ${style.background === c ? 'border-pulse-400' : 'border-slate-700'}`}
                style={{ background: c }}
              />
            ))}
            <label className="flex items-center gap-1 text-xs text-slate-400">
              <span className="sr-only">Custom background color</span>
              <input
                type="color"
                value={style.background ?? '#1e293b'}
                onChange={(e) => setStyle({ background: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border border-slate-700 bg-transparent"
              />
              Custom
            </label>
          </div>
        </div>
        <div>
          <span className="mb-1 block text-xs text-slate-400">Alignment</span>
          <div className="flex gap-2">
            {(['center', 'left'] as SlideAlign[]).map((a) => (
              <button key={a} onClick={() => setStyle({ align: a })} aria-pressed={(style.align ?? 'center') === a} className={pill((style.align ?? 'center') === a)}>
                {a === 'center' ? 'Centered' : 'Left-aligned'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1 block text-xs text-slate-400">Text size</span>
          <div className="flex gap-2">
            {(['sm', 'md', 'lg'] as SlideTextSize[]).map((s) => (
              <button key={s} onClick={() => setStyle({ textSize: s })} aria-pressed={(style.textSize ?? 'md') === s} className={pill((style.textSize ?? 'md') === s)}>
                {s === 'sm' ? 'Smaller' : s === 'md' ? 'Normal' : 'Larger'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </details>
  )
}

export function SlideInspector({ slide }: Props): JSX.Element {
  const updateSlide = useEditorStore((s) => s.updateSlide)
  const patch = (p: Partial<Slide>): void => updateSlide(slide.id, p)

  return (
    <div className="space-y-4">
      {renderFields(slide, patch)}
      <SlideAppearance slide={slide} patch={patch} />
      <Field label="Speaker notes">
        <textarea
          value={slide.notes ?? ''}
          onChange={(e) => patch({ notes: e.target.value })}
          rows={3}
          className={inputClass}
          placeholder="Only you see this"
        />
      </Field>
    </div>
  )
}

function renderFields(slide: Slide, patch: (p: Partial<Slide>) => void): JSX.Element {
  switch (slide.type) {
    case 'title':
      return (
        <>
          <Field label="Title">
            <input value={slide.title} onChange={(e) => patch({ title: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Subtitle">
            <input value={slide.subtitle ?? ''} onChange={(e) => patch({ subtitle: e.target.value })} className={inputClass} />
          </Field>
        </>
      )
    case 'text':
      return (
        <>
          <Field label="Heading">
            <input value={slide.heading ?? ''} onChange={(e) => patch({ heading: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Body">
            <textarea value={slide.body} onChange={(e) => patch({ body: e.target.value })} rows={6} className={inputClass} />
          </Field>
        </>
      )
    case 'image':
      return (
        <>
          <Field label="Image">
            <ImagePicker value={slide.imageDataUrl} onChange={(d) => patch({ imageDataUrl: d })} />
          </Field>
          <Field label="Caption">
            <input value={slide.caption ?? ''} onChange={(e) => patch({ caption: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Alt text (for screen readers)">
            <input
              value={slide.altText ?? ''}
              onChange={(e) => patch({ altText: e.target.value })}
              className={inputClass}
              placeholder="Describe what's in the image"
            />
          </Field>
        </>
      )
    case 'imageText':
      return (
        <>
          <Field label="Image">
            <ImagePicker value={slide.imageDataUrl} onChange={(d) => patch({ imageDataUrl: d })} />
          </Field>
          <Field label="Alt text (for screen readers)">
            <input
              value={slide.altText ?? ''}
              onChange={(e) => patch({ altText: e.target.value })}
              className={inputClass}
              placeholder="Describe what's in the image"
            />
          </Field>
          <Field label="Image position">
            <div className="flex gap-2">
              {(['left', 'right'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => patch({ imagePosition: pos })}
                  aria-pressed={slide.imagePosition === pos}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs capitalize ${
                    slide.imagePosition === pos ? 'border-pulse-400 bg-pulse-500/20 text-white' : 'border-slate-700 text-slate-400'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Heading">
            <input value={slide.heading ?? ''} onChange={(e) => patch({ heading: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Body">
            <textarea value={slide.body} onChange={(e) => patch({ body: e.target.value })} rows={5} className={inputClass} />
          </Field>
        </>
      )
    case 'section':
      return (
        <Field label="Section title">
          <input value={slide.title} onChange={(e) => patch({ title: e.target.value })} className={inputClass} />
        </Field>
      )
    case 'blank':
      return (
        <>
          <Field label="Heading">
            <input value={slide.heading ?? ''} onChange={(e) => patch({ heading: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Body">
            <textarea value={slide.body ?? ''} onChange={(e) => patch({ body: e.target.value })} rows={5} className={inputClass} />
          </Field>
        </>
      )
    case 'bullets':
      return (
        <>
          <Field label="Heading">
            <input value={slide.heading ?? ''} onChange={(e) => patch({ heading: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Bullets (one per line)">
            <textarea
              value={slide.items.join('\n')}
              onChange={(e) => patch({ items: e.target.value.split('\n') })}
              rows={6}
              className={inputClass}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={slide.revealOneByOne}
              onChange={(e) => patch({ revealOneByOne: e.target.checked })}
              className="h-4 w-4 accent-pulse-500"
            />
            Reveal one bullet at a time when presenting
          </label>
        </>
      )
    case 'quote':
      return (
        <>
          <Field label="Quote">
            <textarea value={slide.quote} onChange={(e) => patch({ quote: e.target.value })} rows={4} className={inputClass} />
          </Field>
          <Field label="Attribution">
            <input value={slide.attribution ?? ''} onChange={(e) => patch({ attribution: e.target.value })} className={inputClass} />
          </Field>
        </>
      )
    case 'twoColumn':
      return (
        <>
          <Field label="Heading">
            <input value={slide.heading ?? ''} onChange={(e) => patch({ heading: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Left column heading">
            <input value={slide.leftHeading ?? ''} onChange={(e) => patch({ leftHeading: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Left column text">
            <textarea value={slide.leftBody} onChange={(e) => patch({ leftBody: e.target.value })} rows={4} className={inputClass} />
          </Field>
          <Field label="Right column heading">
            <input value={slide.rightHeading ?? ''} onChange={(e) => patch({ rightHeading: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Right column text">
            <textarea value={slide.rightBody} onChange={(e) => patch({ rightBody: e.target.value })} rows={4} className={inputClass} />
          </Field>
        </>
      )
    case 'statement':
      return (
        <>
          <Field label="Big number or phrase">
            <input value={slide.value} onChange={(e) => patch({ value: e.target.value })} className={inputClass} placeholder="e.g. 68%" />
          </Field>
          <Field label="Label">
            <input value={slide.label ?? ''} onChange={(e) => patch({ label: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Description">
            <textarea value={slide.description ?? ''} onChange={(e) => patch({ description: e.target.value })} rows={3} className={inputClass} />
          </Field>
        </>
      )
    case 'code':
      return (
        <>
          <Field label="Heading">
            <input value={slide.heading ?? ''} onChange={(e) => patch({ heading: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Language label">
            <input value={slide.language ?? ''} onChange={(e) => patch({ language: e.target.value })} className={inputClass} placeholder="e.g. Python" />
          </Field>
          <Field label="Code">
            <textarea
              value={slide.code}
              onChange={(e) => patch({ code: e.target.value })}
              rows={10}
              spellCheck={false}
              className={`${inputClass} font-mono`}
            />
          </Field>
        </>
      )
    case 'timer': {
      const minutes = Math.floor(slide.durationSeconds / 60)
      const seconds = slide.durationSeconds % 60
      const setDuration = (m: number, s: number): void =>
        patch({ durationSeconds: Math.max(5, Math.min(60 * 60, Math.round(m) * 60 + Math.round(s))) })
      return (
        <>
          <Field label="Activity">
            <input value={slide.heading} onChange={(e) => patch({ heading: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Instructions (optional)">
            <textarea value={slide.body ?? ''} onChange={(e) => patch({ body: e.target.value })} rows={3} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Minutes">
              <input type="number" min={0} max={60} value={minutes} onChange={(e) => setDuration(Number(e.target.value), seconds)} className={inputClass} />
            </Field>
            <Field label="Seconds">
              <input type="number" min={0} max={59} value={seconds} onChange={(e) => setDuration(minutes, Number(e.target.value))} className={inputClass} />
            </Field>
          </div>
          <p className="text-xs text-slate-500">When presenting, the countdown starts as soon as you reach this slide. Space pauses it, R restarts it.</p>
        </>
      )
    }
    case 'multipleChoice':
      return (
        <>
          <Field label="Question">
            <textarea value={slide.question} onChange={(e) => patch({ question: e.target.value })} rows={2} className={inputClass} />
          </Field>
          <Field label="Options">
            <OptionsEditor options={slide.options} onChange={(options) => patch({ options })} />
          </Field>
          <Field label="Correct answer (optional)">
            <select
              value={slide.correctOptionId ?? ''}
              onChange={(e) => patch({ correctOptionId: e.target.value || undefined })}
              className={inputClass}
            >
              <option value="">No correct answer</option>
              {slide.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <RevealPolicyToggle value={slide.revealPolicy} onChange={(revealPolicy) => patch({ revealPolicy })} />
        </>
      )
    case 'multipleSelect':
      return (
        <>
          <Field label="Question">
            <textarea value={slide.question} onChange={(e) => patch({ question: e.target.value })} rows={2} className={inputClass} />
          </Field>
          <Field label="Options">
            <OptionsEditor options={slide.options} onChange={(options) => patch({ options })} />
          </Field>
          <RevealPolicyToggle value={slide.revealPolicy} onChange={(revealPolicy) => patch({ revealPolicy })} />
        </>
      )
    case 'trueFalse':
      return (
        <>
          <Field label="Question">
            <textarea value={slide.question} onChange={(e) => patch({ question: e.target.value })} rows={2} className={inputClass} />
          </Field>
          <Field label="Correct answer (optional)">
            <div className="flex gap-2">
              {[
                { label: 'No correct answer', value: undefined },
                { label: 'True', value: true },
                { label: 'False', value: false }
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => patch({ correctAnswer: opt.value })}
                  aria-pressed={slide.correctAnswer === opt.value}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs ${
                    slide.correctAnswer === opt.value ? 'border-pulse-400 bg-pulse-500/20 text-white' : 'border-slate-700 text-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>
          <RevealPolicyToggle value={slide.revealPolicy} onChange={(revealPolicy) => patch({ revealPolicy })} />
        </>
      )
    case 'rating':
      return (
        <>
          <Field label="Question">
            <textarea value={slide.question} onChange={(e) => patch({ question: e.target.value })} rows={2} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min">
              <input
                type="number"
                value={slide.min}
                onChange={(e) => patch({ min: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="Max">
              <input
                type="number"
                value={slide.max}
                onChange={(e) => patch({ max: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min label">
              <input value={slide.minLabel ?? ''} onChange={(e) => patch({ minLabel: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Max label">
              <input value={slide.maxLabel ?? ''} onChange={(e) => patch({ maxLabel: e.target.value })} className={inputClass} />
            </Field>
          </div>
          <RevealPolicyToggle value={slide.revealPolicy} onChange={(revealPolicy) => patch({ revealPolicy })} />
        </>
      )
    case 'likert':
      return (
        <>
          <Field label="Statement">
            <textarea value={slide.statement} onChange={(e) => patch({ statement: e.target.value })} rows={2} className={inputClass} />
          </Field>
          <RevealPolicyToggle value={slide.revealPolicy} onChange={(revealPolicy) => patch({ revealPolicy })} />
        </>
      )
    case 'wordCloud':
      return (
        <>
          <Field label="Question">
            <textarea value={slide.question} onChange={(e) => patch({ question: e.target.value })} rows={2} className={inputClass} />
          </Field>
          <Field label="Max words per student">
            <input
              type="number"
              min={1}
              max={5}
              value={slide.maxWordsPerStudent}
              onChange={(e) => patch({ maxWordsPerStudent: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <RevealPolicyToggle value={slide.revealPolicy} onChange={(revealPolicy) => patch({ revealPolicy })} />
        </>
      )
    case 'shortAnswer':
    case 'openResponse':
      return (
        <>
          <Field label="Question">
            <textarea value={slide.question} onChange={(e) => patch({ question: e.target.value })} rows={2} className={inputClass} />
          </Field>
          <RevealPolicyToggle value={slide.revealPolicy} onChange={(revealPolicy) => patch({ revealPolicy })} />
        </>
      )
    case 'ranking':
      return (
        <>
          <Field label="Question">
            <textarea value={slide.question} onChange={(e) => patch({ question: e.target.value })} rows={2} className={inputClass} />
          </Field>
          <Field label="Options">
            <OptionsEditor options={slide.options} onChange={(options) => patch({ options })} />
          </Field>
          <RevealPolicyToggle value={slide.revealPolicy} onChange={(revealPolicy) => patch({ revealPolicy })} />
        </>
      )
    case 'numeric':
      return (
        <>
          <Field label="Question">
            <textarea value={slide.question} onChange={(e) => patch({ question: e.target.value })} rows={2} className={inputClass} />
          </Field>
          <Field label="Unit (optional)">
            <input value={slide.unit ?? ''} onChange={(e) => patch({ unit: e.target.value })} className={inputClass} placeholder="e.g. %" />
          </Field>
          <RevealPolicyToggle value={slide.revealPolicy} onChange={(revealPolicy) => patch({ revealPolicy })} />
        </>
      )
    case 'qna':
      return (
        <Field label="Prompt">
          <input value={slide.prompt ?? ''} onChange={(e) => patch({ prompt: e.target.value })} className={inputClass} />
        </Field>
      )
    case 'poll':
      return (
        <>
          <Field label="Question">
            <textarea value={slide.question} onChange={(e) => patch({ question: e.target.value })} rows={2} className={inputClass} />
          </Field>
          <Field label="Options">
            <OptionsEditor options={slide.options} onChange={(options) => patch({ options })} />
          </Field>
          <RevealPolicyToggle value={slide.revealPolicy} onChange={(revealPolicy) => patch({ revealPolicy })} />
        </>
      )
  }
}

export function isInteractive(slide: Slide): boolean {
  return isInteractiveSlide(slide)
}
