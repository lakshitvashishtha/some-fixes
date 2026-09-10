/**
 * DeferredRender.jsx
 *
 * Layout-neutral render-layer gate. The placeholder <div> always occupies
 * the same box, but `children` (the heavy render layers — WebGL scenes,
 * particle canvases, …) only mount once the box approaches the viewport.
 * Children never unmount afterwards, matching the app's current
 * always-mounted lifecycle while deferring expensive context creation,
 * texture builds and network fetches until they're actually needed.
 *
 * Rendering-layer only — holds no business logic / state.
 */

import { useEffect, useRef, useState } from 'react'

export default function DeferredRender({
  children,
  rootMargin = '150% 0px 150% 0px',
  className = '',
  style,
}) {
  const holderRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = holderRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      // No IO support — mount immediately rather than never.
      setReady(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReady(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])

  return (
    <div ref={holderRef} className={className} style={style}>
      {ready ? children : null}
    </div>
  )
}
