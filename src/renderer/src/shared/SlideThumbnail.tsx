import { useEffect, useRef, useState } from 'react'
import type { Slide } from '@shared/types'
import type { PresentationTheme } from '@shared/theme'
import { resolveTheme, themeStyleVars } from '@shared/theme'
import { SlideStatic } from './SlideStatic'

const DESIGN_WIDTH = 960
const DESIGN_HEIGHT = 540

/** A 16:9 slide preview that renders at a fixed design size and scales to fit whatever width it's given — so thumbnails, the editor canvas, and a projected slide all share one layout. */
export function SlideThumbnail({ slide, theme }: { slide: Slide; theme?: PresentationTheme }): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.2)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setScale(width / DESIGN_WIDTH)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="relative aspect-video w-full overflow-hidden rounded-md">
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `scale(${scale})`,
          ...(themeStyleVars(resolveTheme(theme, slide.style)) as React.CSSProperties)
        }}
      >
        <SlideStatic slide={slide} />
      </div>
    </div>
  )
}
