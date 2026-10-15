// Presentation themes: a palette + font pairing applied to every slide, with
// optional per-slide overrides (background, alignment, text size). Colors are
// exposed to slide markup as CSS variables (see themeStyleVars), so slides are
// written once against semantic tokens (text-slide-fg, bg-slide-accent/20…)
// and every theme — light or dark — just works.

export type FontId = 'inter' | 'nunito' | 'merriweather' | 'playfair' | 'mono' | 'caveat'

export const FONTS: { id: FontId; label: string; stack: string }[] = [
  { id: 'inter', label: 'Inter (clean sans)', stack: "'Inter Variable', system-ui, sans-serif" },
  { id: 'nunito', label: 'Nunito (rounded, friendly)', stack: "'Nunito Variable', 'Segoe UI', sans-serif" },
  { id: 'merriweather', label: 'Merriweather (readable serif)', stack: "'Merriweather', Georgia, serif" },
  { id: 'playfair', label: 'Playfair Display (elegant serif)', stack: "'Playfair Display Variable', Georgia, serif" },
  { id: 'mono', label: 'JetBrains Mono (code)', stack: "'JetBrains Mono Variable', Consolas, monospace" },
  { id: 'caveat', label: 'Caveat (handwritten)', stack: "'Caveat Variable', 'Segoe Print', cursive" }
]

export type ThemeId = 'midnight' | 'daylight' | 'chalkboard' | 'ocean' | 'sunset' | 'forest' | 'paper' | 'contrast'

export interface Theme {
  id: ThemeId
  name: string
  /** Any CSS background value — solid color or gradient. */
  background: string
  fg: string
  muted: string
  accent: string
  headingFont: FontId
  bodyFont: FontId
}

export const THEMES: Theme[] = [
  { id: 'midnight', name: 'Midnight', background: 'linear-gradient(180deg, #020617 0%, #0a0e1a 100%)', fg: '#ffffff', muted: '#cbd5e1', accent: '#5c8bff', headingFont: 'inter', bodyFont: 'inter' },
  { id: 'daylight', name: 'Daylight', background: '#f8fafc', fg: '#0f172a', muted: '#475569', accent: '#2245e6', headingFont: 'inter', bodyFont: 'inter' },
  { id: 'chalkboard', name: 'Chalkboard', background: 'linear-gradient(160deg, #1f3a2c 0%, #142a1f 100%)', fg: '#f5f5f0', muted: '#c9d4c5', accent: '#facc15', headingFont: 'caveat', bodyFont: 'nunito' },
  { id: 'ocean', name: 'Ocean', background: 'linear-gradient(160deg, #0c4a6e 0%, #082f49 100%)', fg: '#f0f9ff', muted: '#bae6fd', accent: '#2dd4bf', headingFont: 'nunito', bodyFont: 'nunito' },
  { id: 'sunset', name: 'Sunset', background: 'linear-gradient(160deg, #7c2d12 0%, #4c1d95 100%)', fg: '#fff7ed', muted: '#fed7aa', accent: '#fb923c', headingFont: 'playfair', bodyFont: 'inter' },
  { id: 'forest', name: 'Forest', background: '#f0fdf4', fg: '#14532d', muted: '#3f6212', accent: '#16a34a', headingFont: 'merriweather', bodyFont: 'merriweather' },
  { id: 'paper', name: 'Paper', background: '#fbf7ef', fg: '#292524', muted: '#57534e', accent: '#b45309', headingFont: 'playfair', bodyFont: 'merriweather' },
  { id: 'contrast', name: 'High contrast', background: '#000000', fg: '#ffffff', muted: '#ffffff', accent: '#ffff00', headingFont: 'inter', bodyFont: 'inter' }
]

/** Presentation-wide appearance: a base theme plus optional font/accent overrides. */
export interface PresentationTheme {
  themeId: ThemeId
  headingFont?: FontId
  bodyFont?: FontId
  accent?: string
}

export type SlideAlign = 'left' | 'center'
export type SlideTextSize = 'sm' | 'md' | 'lg'

/** Per-slide overrides on top of the presentation theme. */
export interface SlideStyle {
  /** Solid hex background replacing the theme's. Text color flips automatically for contrast. */
  background?: string
  align?: SlideAlign
  textSize?: SlideTextSize
}

/** Swatches offered for per-slide backgrounds and accent overrides. */
export const COLOR_SWATCHES = [
  '#0f172a', '#1e3a8a', '#0c4a6e', '#134e4a', '#14532d', '#713f12',
  '#7c2d12', '#831843', '#4c1d95', '#ffffff', '#fef3c7', '#dbeafe',
  '#dcfce7', '#fce7f3', '#ede9fe', '#f1f5f9'
]

export const DEFAULT_THEME: PresentationTheme = { themeId: 'midnight' }

export interface ResolvedTheme {
  background: string
  fg: string
  muted: string
  accent: string
  headingStack: string
  bodyStack: string
  align: SlideAlign
  textScale: number
}

export function getTheme(id: ThemeId | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

export function fontStack(id: FontId): string {
  return (FONTS.find((f) => f.id === id) ?? FONTS[0]).stack
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && hexToRgb(v) !== null
}

/** WCAG relative luminance — used to pick readable text on a custom background. */
function luminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function resolveTheme(presentationTheme: PresentationTheme | undefined, style?: SlideStyle): ResolvedTheme {
  const base = getTheme(presentationTheme?.themeId)
  let fg = base.fg
  let muted = base.muted
  let background = base.background
  if (style?.background && isHexColor(style.background)) {
    background = style.background
    const light = luminance(style.background) > 0.4
    fg = light ? '#0f172a' : '#ffffff'
    muted = light ? '#475569' : '#e2e8f0'
  }
  return {
    background,
    fg,
    muted,
    accent: presentationTheme?.accent && isHexColor(presentationTheme.accent) ? presentationTheme.accent : base.accent,
    headingStack: fontStack(presentationTheme?.headingFont ?? base.headingFont),
    bodyStack: fontStack(presentationTheme?.bodyFont ?? base.bodyFont),
    align: style?.align ?? 'center',
    textScale: style?.textSize === 'sm' ? 0.85 : style?.textSize === 'lg' ? 1.2 : 1
  }
}

/** CSS custom properties consumed by the slide-* Tailwind tokens (see tailwind.config.ts). */
export function themeStyleVars(t: ResolvedTheme): Record<string, string> {
  const channels = (hex: string): string => (hexToRgb(hex) ?? [255, 255, 255]).join(' ')
  return {
    background: t.background,
    color: t.fg,
    fontFamily: t.bodyStack,
    '--slide-fg': channels(t.fg),
    '--slide-muted': channels(t.muted),
    '--slide-accent': channels(t.accent),
    '--slide-font-heading': t.headingStack,
    '--slide-font-body': t.bodyStack,
    '--slide-scale': String(t.textScale)
  }
}
