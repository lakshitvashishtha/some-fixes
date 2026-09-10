/**
 * TimelinePage.jsx — Semicircular Timeline with Cover + Hold
 *
 * Single unified layout — arc on BOTH mobile and desktop.
 *
 * Mobile adaptations (no separate layout):
 *   – Arc radius and center are scaled down to fit narrow screens.
 *   – Detail panel sits BELOW the arc (not to the right).
 *   – Active milestone image fills the full-screen background (blurred +
 *     dimmed) and cross-fades whenever the active item changes.
 *
 * Desktop: exactly the same as before + background image cross-fade.
 */

import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TIMELINE = [
  { date: '8:00 AM',  title: 'Team Registration',  detail: 'Check in your squad, collect your badges, and get your workstations set up. The clock is already ticking.',                              color: '#00f5ff', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80' },
  { date: '10:00 AM', title: 'Opening Ceremony',    detail: 'Welcome address, sponsor introductions, and the official flag-off. Problem statements are revealed — let the hacking begin.',            color: '#a855f7', image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80' },
  { date: '11:00 AM', title: 'Hackathon Begins',    detail: 'Keyboards hot, ideas flowing. The 24-hour build sprint is live. Mentors are on standby.',                                                color: '#22d3ee', image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80' },
  { date: '2:00 PM',  title: 'Mentor Sessions',     detail: 'Round-robin expert consultations. Get your architecture reviewed, unblock bottlenecks, and sharpen your pitch.',                         color: '#f59e0b', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80' },
  { date: '4:00 PM',  title: 'Coffee Break',        detail: 'Fuel up. Step away from the screen, recharge, and come back stronger for the final push.',                                               color: '#fb923c', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80' },
  { date: '5:00 PM',  title: 'Workshop',            detail: 'Live deep-dive session on a high-impact tech topic. Integrate fresh knowledge directly into your project.',                               color: '#34d399', image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80' },
  { date: '9:00 PM',  title: 'Networking Session',  detail: 'Mingle with industry professionals, fellow hackers, and sponsors. Make connections that outlast the hackathon.',                         color: '#f43f5e', image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80' },
  { date: '11:00 PM', title: 'Progress Check',      detail: 'Final milestone review before submission. Lock in your build, polish your demo, and prep for judging.',                                  color: '#fbbf24', image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80' },
]

const COUNT = TIMELINE.length

// ── Arc constants (desktop baseline — scaled for mobile at render time) ──
const ARC_SPAN_DEG  = 280
const ARC_START_DEG = -ARC_SPAN_DEG / 2

// Scroll budget
const CIRCULAR_SCROLL_PX = COUNT * 550
const POST_ARC_BUFFER =
  typeof window !== 'undefined' ? window.innerHeight : 800

// ── HUD corner brackets ───────────────────────────────────────────────────
function HudCorners({ color }) {
  return (
    <>
      {[
        ['top-1 left-1',    'border-t border-l'],
        ['top-1 right-1',   'border-t border-r'],
        ['bottom-1 left-1', 'border-b border-l'],
        ['bottom-1 right-1','border-b border-r'],
      ].map(([pos, borders]) => (
        <div
          key={pos}
          className={`absolute ${pos} w-3 h-3 ${borders}`}
          style={{ borderColor: `${color}99` }}
        />
      ))}
    </>
  )
}

// ── Full-screen background image that cross-fades on milestone change ─────
function BackgroundImage({ activeItem }) {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.img
          key={activeItem.index}
          src={activeItem.image}
          alt=""
          aria-hidden="true"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1,  scale: 1    }}
          exit={{    opacity: 0,  scale: 0.97 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            filter: 'blur(18px) brightness(0.18) saturate(1.4)',
            transform: 'scale(1.08)',   // hide blur edge artefacts
          }}
          draggable={false}
        />
      </AnimatePresence>
      {/* dark vignette so text stays readable */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 40%, rgba(3,7,18,0.35) 0%, rgba(3,7,18,0.82) 100%)',
        }}
      />
    </div>
  )
}

// ── Shared arc renderer ───────────────────────────────────────────────────
function ArcScene({ items, arcPathD, arcCX, arcCY }) {
  return (
    <>
      {/* SVG arc path + animated dots */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10, overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#00f5ff" stopOpacity="0.6" />
            <stop offset="50%"  stopColor="#a855f7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path
          d={arcPathD}
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth="1.5"
          opacity="0.35"
        />
        {items.filter(it => it.visible).map((it) => (
          <g key={it.index}>
            <circle
              cx={it.x} cy={it.y}
              r={it.isActive ? 5 : 3}
              fill={it.isActive ? it.color : '#475569'}
              opacity={it.opacity}
            />
            {it.isActive && (
              <circle
                cx={it.x} cy={it.y}
                r="10" fill="none"
                stroke={it.color}
                strokeWidth="1.5"
                opacity="0.5"
              >
                <animate attributeName="r"       values="8;16;8"    dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        ))}
      </svg>

      {/* Number labels along arc */}
      {items.filter(it => it.visible).map((it) => {
        const num = String(it.index + 1).padStart(2, '0')
        return (
          <div
            key={it.index}
            className="absolute pointer-events-none select-none"
            style={{
              left: it.x, top: it.y,
              transform: `translate(-50%, -50%) scale(${it.scale})`,
              opacity: it.opacity,
              transition: 'transform 0.12s ease-out, opacity 0.12s ease-out',
              zIndex: 15,
            }}
          >
            <span
              className="font-pixel font-black block"
              style={{
                fontSize: it.isActive ? it.activeFontSize : it.inactiveFontSize,
                color: it.isActive ? it.color : '#475569',
                textShadow: it.isActive
                  ? `0 0 30px ${it.color}66, 0 0 60px ${it.color}33`
                  : 'none',
                lineHeight: 1,
              }}
            >
              {num}
            </span>
          </div>
        )
      })}
    </>
  )
}

// ── Active-item detail panel (used on both mobile + desktop) ─────────────
function DetailPanel({ activeItem, mobile = false, vw: viewportW = 390 }) {
  const panelStyle = mobile
    ? {
        position: 'absolute',
        left: Math.round(viewportW * 0.38),
        right: 10,
        top: 100,
        bottom: 40,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        zIndex: 25,
        pointerEvents: 'none',
      }
    : {
        // Desktop: right of arc, fills the empty right space and is vertically
        // centered between the header (~110px) and the bottom progress bar (~20px)
        position: 'absolute',
        left: 480,
        right: 48,
        top: 110,
        bottom: 40,
        maxWidth: 560,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        zIndex: 25,
        pointerEvents: 'none',
      }

  return (
    <AnimatePresence mode="wait">
      {activeItem && (
        <motion.div
          key={activeItem.index}
          initial={{ opacity: 0, y: 0, x: mobile ? 20 : 30 }}
          animate={{ opacity: 1, y: 0, x: 0            }}
          exit={{    opacity: 0, y: 0, x: mobile ? 10 : -20 }}
          transition={{ duration: 0.35 }}
          style={panelStyle}
        >
          {mobile ? (
            /* ── Mobile panel: compact vertical card, right of arc ── */
            <div
              style={{
                background: 'rgba(2,8,23,0.88)',
                backdropFilter: 'blur(18px)',
                border: `1.5px solid ${activeItem.color}55`,
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: `0 0 24px ${activeItem.color}28, 0 8px 32px rgba(0,0,0,0.7)`,
              }}
            >
              {/* Image */}
              <div style={{ position: 'relative', width: '100%', height: 110, overflow: 'hidden' }}>
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeItem.index}
                    src={activeItem.image}
                    alt={activeItem.title}
                    initial={{ opacity: 0, scale: 1.08 }}
                    animate={{ opacity: 1, scale: 1    }}
                    exit={{    opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    draggable={false}
                  />
                </AnimatePresence>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(135deg, ${activeItem.color}22 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />
                <HudCorners color={activeItem.color} />
              </div>

              {/* Text */}
              <div style={{ padding: '8px 10px' }}>
                <div style={{
                  display: 'inline-block', padding: '2px 7px', borderRadius: 999,
                  fontFamily: '"Silkscreen", monospace', fontSize: 8,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: activeItem.color, background: `${activeItem.color}18`,
                  border: `1px solid ${activeItem.color}44`, marginBottom: 5,
                }}>
                  {activeItem.date}
                </div>
                <h2 className="font-pixel font-black uppercase" style={{
                  fontSize: 'clamp(0.7rem, 3.5vw, 0.9rem)',
                  color: '#ffffff', lineHeight: 1.2, marginBottom: 4,
                }}>
                  {activeItem.title}
                </h2>
                <p style={{
                  fontSize: 9.5, color: '#94a3b8', lineHeight: 1.5,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                }}>
                  {activeItem.detail}
                </p>
                <div style={{
                  marginTop: 6, height: 2, width: 32, borderRadius: 9999,
                  background: activeItem.color, boxShadow: `0 0 8px ${activeItem.color}88`,
                }} />
              </div>
            </div>
          ) : (
            /* ── Desktop panel: full image + text stacked, fills right dead space ── */
            <>
              {/* Image */}
              <div
                className="relative mb-3 rounded-xl overflow-hidden"
                style={{
                  width: '100%',
                  height: 'clamp(140px, 20vh, 200px)',
                  border: `1px solid ${activeItem.color}44`,
                  boxShadow: `0 0 24px ${activeItem.color}22, 0 4px 32px rgba(0,0,0,0.7)`,
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeItem.index}
                    src={activeItem.image}
                    alt={activeItem.title}
                    initial={{ opacity: 0, scale: 1.06 }}
                    animate={{ opacity: 1, scale: 1    }}
                    exit={{    opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    style={{
                      position: 'absolute', inset: 0,
                      width: '100%', height: '100%',
                      objectFit: 'cover',
                    }}
                    draggable={false}
                  />
                </AnimatePresence>
                <div
                  style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(135deg, ${activeItem.color}18 0%, transparent 60%)`,
                    pointerEvents: 'none',
                  }}
                />
                <HudCorners color={activeItem.color} />
              </div>

              {/* Date badge */}
              <div
                className="inline-block px-3 py-1 rounded-full font-pixel text-[10px] tracking-widest uppercase mb-2"
                style={{
                  backgroundColor: `${activeItem.color}18`,
                  color: activeItem.color,
                  border: `1px solid ${activeItem.color}44`,
                }}
              >
                {activeItem.date}
              </div>

              {/* Title */}
              <h2
                className="font-pixel font-black uppercase mb-3"
                style={{
                  fontSize: 'clamp(1.3rem, 2.8vw, 2.2rem)',
                  color: '#ffffff',
                  lineHeight: 1.1,
                }}
              >
                {activeItem.title}
              </h2>

              {/* Detail */}
              <p className="leading-relaxed" style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                {activeItem.detail}
              </p>

              <div
                className="mt-4 h-0.5 rounded-full"
                style={{
                  width: '60px',
                  background: activeItem.color,
                  boxShadow: `0 0 14px ${activeItem.color}88`,
                }}
              />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════
export default function TimelinePage() {
  const sentinelRef    = useRef(null)

  const [pinned,       setPinned]       = useState(false)
  const [progress,     setProgress]     = useState(0)
  const [vw,           setVw]           = useState(typeof window !== 'undefined' ? window.innerWidth  : 1280)
  const [vh,           setVh]           = useState(typeof window !== 'undefined' ? window.innerHeight : 800)
  const [panelOpacity, setPanelOpacity] = useState(0)
  const unpinTimerRef = useRef(null)

  const isMobile = vw < 768

  // ── Viewport tracking ───────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => { setVw(window.innerWidth); setVh(window.innerHeight) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── Scroll handler ──────────────────────────────────────────────────────
  useEffect(() => {
    let rafId = 0
    function compute() {
      rafId = 0
      const sentinel = sentinelRef.current
      if (!sentinel) return
      const sentinelTop = sentinel.getBoundingClientRect().top + window.scrollY
      const scrollY     = window.scrollY
      const pinStart    = sentinelTop - window.innerHeight * 0.5
      const pinEnd      = sentinelTop + CIRCULAR_SCROLL_PX + POST_ARC_BUFFER

      if (scrollY >= pinStart && scrollY < pinEnd) {
        if (!pinned) {
          if (unpinTimerRef.current) { clearTimeout(unpinTimerRef.current); unpinTimerRef.current = null }
          setPinned(true)
          setPanelOpacity(1)
        }
        const p = Math.min(1, Math.max(0, (scrollY - sentinelTop) / CIRCULAR_SCROLL_PX))
        setProgress(p)
      } else {
        if (pinned) {
          setPanelOpacity(0)
          if (!unpinTimerRef.current) {
            unpinTimerRef.current = setTimeout(() => { setPinned(false); unpinTimerRef.current = null }, 300)
          }
        }
        if (scrollY < pinStart) setProgress(0)
        else setProgress(1)
      }
    }
    function onScroll() { if (!rafId) rafId = requestAnimationFrame(compute) }
    window.addEventListener('scroll', onScroll, { passive: true })
    compute()
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onScroll)
      if (unpinTimerRef.current) clearTimeout(unpinTimerRef.current)
    }
  }, [pinned])

  // ── Arc geometry — adapts to screen size ────────────────────────────────
  //
  //  Mobile:  OVAL  rx=210px  ry=310px, center at -2% width / 46% height
  //  Tablet:  oval  rx=260px  ry=340px, center at  8% width / 48% height
  //  Desktop: circle r=260px,           center at 50px      / 50% height (original)
  //
  const arcRX = isMobile ? 150  : vw < 1024 ? 260  : 260
  const arcRY = isMobile ? 290  : vw < 1024 ? 340  : 260
  const arcCX = isMobile ? vw * -0.22 : vw < 1024 ? vw * 0.02 : 50
  const arcCY = isMobile ? vh * 0.50   : vw < 1024 ? vh * 0.48  : vh * 0.5

  // keep a single "radius" alias for dot-position & desktop compat
  const arcRadius = Math.max(arcRX, arcRY)

  // Font sizes scale with radius
  const activeFontSize   = isMobile ? '2.8rem' : vw < 1024 ? '3.2rem' : '3.5rem'
  const inactiveFontSize = isMobile ? '1.5rem' : vw < 1024 ? '1.7rem' : '1.8rem'

  const rotationOffset = ARC_START_DEG + progress * ARC_SPAN_DEG

  const items = TIMELINE.map((item, i) => {
    const baseAngleDeg   = ARC_START_DEG + (i / (COUNT - 1)) * ARC_SPAN_DEG
    const angleDeg       = baseAngleDeg - rotationOffset
    const angleRad       = (angleDeg * Math.PI) / 180
    // Oval: use arcRX for horizontal, arcRY for vertical
    const x              = arcCX + arcRX * Math.cos(angleRad)
    const y              = arcCY + arcRY * Math.sin(angleRad)
    const centerDist     = Math.abs(angleDeg)
    const normalizedDist = centerDist / (ARC_SPAN_DEG / 2)
    const isActive       = normalizedDist < 0.1
    const scale          = isActive ? 1 : Math.max(0.35, 1 - normalizedDist * 0.7)
    const opacity        = isActive ? 1 : Math.max(0.12, 1 - normalizedDist * 1.3)
    const visible        = angleDeg > -ARC_SPAN_DEG * 0.65 && angleDeg < ARC_SPAN_DEG * 0.65
    return { ...item, x, y, angleDeg, scale, opacity, isActive, visible, index: i, activeFontSize, inactiveFontSize }
  })

  const activeItem = items.find(it => it.isActive) ||
    items.reduce((c, it) => Math.abs(it.angleDeg) < Math.abs(c.angleDeg) ? it : c)

  const arcPathD = (() => {
    const s  = (ARC_START_DEG * Math.PI) / 180
    const e  = ((ARC_START_DEG + ARC_SPAN_DEG) * Math.PI) / 180
    const x1 = arcCX + arcRX * Math.cos(s)
    const y1 = arcCY + arcRY * Math.sin(s)
    const x2 = arcCX + arcRX * Math.cos(e)
    const y2 = arcCY + arcRY * Math.sin(e)
    // SVG elliptical arc: A rx ry x-rotation large-arc-flag sweep-flag x y
    return `M ${x1} ${y1} A ${arcRX} ${arcRY} 0 ${ARC_SPAN_DEG > 180 ? 1 : 0} 1 ${x2} ${y2}`
  })()

  return (
    <>
      {/* Sentinel: provides scroll space for the pinned phase */}
      <div ref={sentinelRef} style={{ height: `${CIRCULAR_SCROLL_PX + POST_ARC_BUFFER}px` }} />

      {/* Fixed overlay */}
      {(pinned || panelOpacity > 0) && (
        <div
          className="fixed inset-0 z-40 overflow-hidden"
          style={{
            top: 0, left: 0, width: '100vw', height: '100vh',
            opacity: panelOpacity,
            pointerEvents: panelOpacity < 0.1 ? 'none' : 'auto',
          }}
        >
          {/* ── Full-screen blurred background image ── */}
          <BackgroundImage activeItem={activeItem} />

          {/* ── Page header ── */}
          <div className="absolute inset-x-0 top-0 z-30 text-center pointer-events-none"
            style={{ paddingTop: isMobile ? '1rem' : '2rem' }}>
            <h1
              className="voxel-3d-text voxel-white-block font-pixel font-black uppercase"
              style={{ fontSize: isMobile ? 'clamp(1.5rem, 7vw, 2.2rem)' : 'clamp(1.8rem, 5vw, 3.5rem)' }}
            >
              Event Timeline
            </h1>
            <p className="mt-1 font-pixel text-[10px] text-cyan-300/70 tracking-widest uppercase">
              ◈ Oct 8–9. 24 Hours. One Mission. ◈
            </p>
          </div>

          {/* ── Arc scene (numbers + path + dots) ── */}
          <ArcScene
            items={items}
            arcPathD={arcPathD}
            arcCX={arcCX}
            arcCY={arcCY}
          />

          {/* ── Active item detail panel ── */}
          <DetailPanel activeItem={activeItem} mobile={isMobile} vw={vw} />

          {/* ── Scroll hint ── */}
          {progress < 0.02 && (
            <div className="absolute inset-x-0 z-30 pointer-events-none text-center"
              style={{ bottom: isMobile ? '1.5rem' : '2rem' }}>
              <motion.p
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="font-mono text-[10px] tracking-widest uppercase"
                style={{ color: 'rgba(0,245,255,0.4)' }}
              >
                ↓ Scroll to explore milestones ↓
              </motion.p>
            </div>
          )}

          {/* ── Progress bar ── */}
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-800/50 z-30">
            <div
              className="h-full"
              style={{
                width: `${progress * 100}%`,
                background: 'linear-gradient(90deg, #00f5ff, #a855f7, #f59e0b)',
                boxShadow: '0 0 8px rgba(0,245,255,0.4)',
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
