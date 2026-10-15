import type { FontId, PresentationTheme } from '@shared/theme'
import { COLOR_SWATCHES, DEFAULT_THEME, FONTS, THEMES, fontStack, getTheme } from '@shared/theme'
import { useEditorStore } from '../store'

const selectClass =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-pulse-400'

/** Presentation-wide look: theme, fonts, accent color. Per-slide overrides live in the Slide tab. */
export function DesignPanel(): JSX.Element | null {
  const presentation = useEditorStore((s) => s.presentation)
  const setTheme = useEditorStore((s) => s.setTheme)
  if (!presentation) return null

  const current: PresentationTheme = presentation.theme ?? DEFAULT_THEME
  const base = getTheme(current.themeId)
  const update = (patch: Partial<PresentationTheme>): void => setTheme({ ...current, ...patch })

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Theme</h3>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => {
            const selected = t.id === current.themeId
            return (
              <button
                key={t.id}
                role="radio"
                aria-checked={selected}
                // Picking a new theme resets font/accent overrides, so the
                // theme's own pairing shows instead of a stale mix.
                onClick={() => setTheme({ themeId: t.id })}
                className={`overflow-hidden rounded-lg border-2 text-left ${selected ? 'border-pulse-400' : 'border-slate-800 hover:border-slate-600'}`}
              >
                <div className="flex h-14 items-center justify-center gap-2 px-2" style={{ background: t.background }}>
                  <span style={{ color: t.fg, fontFamily: fontStack(t.headingFont) }} className="text-lg font-bold">
                    Aa
                  </span>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.accent }} aria-hidden="true" />
                </div>
                <div className="bg-slate-900 px-2 py-1 text-xs text-slate-300">{t.name}</div>
              </button>
            )
          })}
        </div>
      </section>

      <FontSelect
        label="Heading font"
        value={current.headingFont ?? base.headingFont}
        onChange={(headingFont) => update({ headingFont })}
      />
      <FontSelect label="Body font" value={current.bodyFont ?? base.bodyFont} onChange={(bodyFont) => update({ bodyFont })} />

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Accent color</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => update({ accent: undefined })}
            aria-pressed={!current.accent}
            className={`rounded-md border px-2 py-1 text-xs ${!current.accent ? 'border-pulse-400 text-white' : 'border-slate-700 text-slate-400'}`}
          >
            Theme default
          </button>
          {['#5c8bff', '#2dd4bf', '#16a34a', '#facc15', '#fb923c', '#ef4444', '#ec4899', '#a855f7'].map((c) => (
            <button
              key={c}
              onClick={() => update({ accent: c })}
              aria-pressed={current.accent === c}
              aria-label={`Accent ${c}`}
              className={`h-7 w-7 rounded-full border-2 ${current.accent === c ? 'border-white' : 'border-transparent'}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Each slide can also override its background, alignment, and text size from the Slide tab. Swatches there
        include {COLOR_SWATCHES.length} preset colors plus a custom picker.
      </p>
    </div>
  )
}

function FontSelect({ label, value, onChange }: { label: string; value: FontId; onChange: (f: FontId) => void }): JSX.Element {
  const id = `font-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <section>
      <label htmlFor={id} className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as FontId)} className={selectClass}>
        {FONTS.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
      <p className="mt-2 truncate text-lg text-slate-200" style={{ fontFamily: fontStack(value) }}>
        The quick brown fox
      </p>
    </section>
  )
}
