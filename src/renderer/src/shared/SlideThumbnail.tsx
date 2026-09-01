import { useEffect, useRef, useState } from 'react'
import type { Slide } from '@shared/types'
import { SlideStatic } from './SlideStatic'

const DESIGN_WIDTH = 960
const DESIGN_HEIGHT = 540

/** A 16:9 slide preview that scales its full-size content down (or up) to fit whatever width it's given. */
export function SlideThumbnail({ slide, size = 'preview' }: { slide: Slide; size?: 'preview' | 'present' }): JSX.Element {
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
    <div ref={containerRef} className="relative aspect-video w-full overflow-hidden rounded-md bg-slate-950">
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: DESIGN_WIDTH, height: DESIGN_HEIGHT, transform: `scale(${scale})` }}
      >
        <SlideStatic slide={slide} size={size} />
      </div>
    </div>
  )
}
