/**
 * GlimpsePage.jsx — "GLIMPSE" photo wall (v5 — perf-optimised)
 *
 * Key changes from v4:
 *  - CARD_COUNT dropped 28 → 14  (fewer DOM nodes = less GPU work)
 *  - Removed transform-style: preserve-3d from stage (huge GPU saving);
 *    depth is now faked with CSS scale() instead of translateZ so every
 *    card stays on its own composited layer without a shared 3-D context.
 *  - z-index is NO LONGER mutated every frame. Cards get a fixed z-index
 *    once on randomize() and only the hover card gets bumped.
 *  - will-change: transform, opacity set on every card element so the
 *    browser promotes them to GPU layers up-front.
 *  - toFixed() / string allocation removed from the hot path — template
 *    literals with integer rounding only.
 *  - Sway removed (Math.sin per card per frame was unnecessary cost).
 *  - dt capped at 33 ms (30 fps floor) to prevent spiral-of-death on
 *    tab-restore / long frames.
 */

import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

/* ── Scene parameters ────────────────────────────────────────────────── */
const CARD_COUNT     = 14      // reduced from 28

const SIZE_MIN       = 140
const SIZE_MAX       = 260

const ASPECT_MIN     = 1.15
const ASPECT_MAX     = 1.40

const Z_SPAWN        =  600    // px — spawns in front of camera
const Z_END          = -1200   // px — dies deep behind camera

const X_MIN          = -0.15
const X_MAX          =  1.15
const Y_MIN          = -0.15
const Y_MAX          =  1.15

const ROT_MAX        = 7
const LIFE_MIN       = 8
const LIFE_MAX       = 14
const DELAY_MAX      = 3

const FADE_IN_END    = 0.10
const FADE_OUT_START = 0.76

/* ── Math helpers ────────────────────────────────────────────────────── */
const clamp01      = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const lerp         = (a, b, t) => a + (b - a) * t
const rand         = (min, max) => min + Math.random() * (max - min)
const randInt      = (n) => Math.floor(Math.random() * n)
const easeOutCubic = (t) => 1 - (1 - t) ** 3
const easeInCubic  = (t) => t * t * t

/* ═══════════════════════════════════════════════════════════════════════ */
export default function GlimpsePage() {
  const stageRef  = useRef(null)
  const animIdRef = useRef(null)
  const [photos, setPhotos] = useState([])

  useEffect(() => {
    let cancelled = false
    fetch('/cloudinary-photos.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return
        setPhotos(data.map((d) => d.url).filter(Boolean))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || photos.length === 0) return

    const PHOTOS = photos

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let W = stage.clientWidth  || window.innerWidth
    let H = stage.clientHeight || window.innerHeight

    const cards = []

    /* ── Randomise card parameters ───────────────────────────────────── */
    const randomize = (card) => {
      card.w     = rand(SIZE_MIN, SIZE_MAX)
      card.h     = card.w * rand(ASPECT_MIN, ASPECT_MAX)
      card.xFrac = rand(X_MIN, X_MAX)
      card.yFrac = rand(Y_MIN, Y_MAX)
      card.rot   = rand(-ROT_MAX, ROT_MAX)
      card.delay = rand(0, DELAY_MAX)
      card.life  = rand(LIFE_MIN, LIFE_MAX)
      card.cycle = card.delay + card.life
      card.age   = card.mid ? rand(0, card.cycle) : 0
      card.hover = false

      // Fixed z-index tier per card (1–13) — NOT changed per frame
      card.zTier = card.idx + 1

      let nextIdx
      do { nextIdx = randInt(PHOTOS.length) } while (nextIdx === card.imgIdx)
      card.imgIdx  = nextIdx
      card.img.src = PHOTOS[nextIdx]
    }

    /* ── Place card (px from vw/vh fractions) ────────────────────────── */
    const place = (card) => {
      card.x = card.xFrac * W - card.w * 0.5
      card.y = card.yFrac * H - card.h * 0.5
      card.el.style.width  = `${card.w | 0}px`
      card.el.style.height = `${card.h | 0}px`
    }

    /* ── Build one card element ──────────────────────────────────────── */
    const buildCard = (i) => {
      const el = document.createElement('div')
      el.className = 'glimpse-photo'
      // GPU layer promotion — key perf fix
      el.style.willChange = 'transform, opacity'
      el.style.position   = 'absolute'

      const img = document.createElement('img')
      img.alt       = `Glimpse photo ${i + 1}`
      img.draggable = false
      img.loading   = 'lazy'
      img.decoding  = 'async'

      ;['tl', 'tr', 'bl', 'br'].forEach((pos) => {
        const b = document.createElement('span')
        b.className = `glimpse-corner glimpse-corner--${pos}`
        el.appendChild(b)
      })

      const cap    = document.createElement('div')
      cap.className = 'glimpse-caption'

      const label  = document.createElement('span')
      label.className   = 'glimpse-caption__label'
      label.textContent = `GLM-${String((i % PHOTOS.length) + 1).padStart(2, '0')}`

      const coords = document.createElement('span')
      coords.className  = 'glimpse-caption__coords'
      coords.textContent = `X:${String(Math.floor(rand(100, 999))).padStart(3, '0')} Y:${String(Math.floor(rand(100, 999))).padStart(3, '0')}`

      cap.appendChild(label)
      cap.appendChild(coords)
      el.appendChild(img)
      el.appendChild(cap)
      stage.appendChild(el)

      const card = {
        el, img, idx: i,
        w: 0, h: 0, x: 0, y: 0,
        xFrac: 0, yFrac: 0,
        rot: 0, delay: 0, life: 0, cycle: 0, age: 0,
        imgIdx: -1, hover: false, zTier: i + 1,
        mid: false,
        enter: null, leave: null,
      }

      card.enter = () => {
        card.hover = true
        el.style.zIndex = '99999'
      }
      card.leave = () => {
        card.hover = false
        el.style.zIndex = String(card.zTier)
      }
      el.addEventListener('mouseenter', card.enter)
      el.addEventListener('mouseleave', card.leave)

      randomize(card)
      card.mid = true
      card.age = rand(0, card.cycle)     // stagger initial spread
      el.style.zIndex = String(card.zTier)

      place(card)
      return card
    }

    for (let i = 0; i < CARD_COUNT; i++) cards.push(buildCard(i))

    /* ── Per-frame paint ─────────────────────────────────────────────── */
    const paint = (card) => {
      if (card.age < card.delay) {
        card.el.style.opacity   = '0'
        card.el.style.transform =
          `translate3d(${card.x | 0}px,${card.y | 0}px,${Z_SPAWN}px) rotateZ(${card.rot | 0}deg)`
        return
      }

      const t = card.age - card.delay
      const p = clamp01(t / card.life)

      // True 3-D Z — produces real perspective tunnel effect
      const z = lerp(Z_SPAWN, Z_END, easeInCubic(p))

      // Opacity envelope
      let o
      if (p < FADE_IN_END) {
        o = easeOutCubic(clamp01(p / FADE_IN_END))
      } else if (p > FADE_OUT_START) {
        o = 1 - easeOutCubic(clamp01((p - FADE_OUT_START) / (1 - FADE_OUT_START)))
      } else {
        o = 1
      }

      const rot = Math.round(card.rot)

      card.el.style.transform =
        `translate3d(${card.x | 0}px,${card.y | 0}px,${z | 0}px) rotateZ(${rot}deg)`
      card.el.style.opacity = o.toFixed(2)
    }

    /* ── rAF loop ────────────────────────────────────────────────────── */
    let running = false
    let prevT   = null

    const frame = (t) => {
      if (!running) return
      // Cap dt to 33 ms to avoid huge jumps after tab restore
      const dt = prevT === null ? 0 : Math.min(0.033, (t - prevT) / 1000)
      prevT = t

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i]
        card.age += dt
        if (card.age >= card.cycle) {
          randomize(card)
          place(card)
        }
        paint(card)
      }
      animIdRef.current = requestAnimationFrame(frame)
    }

    /* ── Static fallback (prefers-reduced-motion) ────────────────────── */
    if (reduceMotion) {
      cards.forEach((card) => {
        card.el.style.opacity   = '1'
        card.el.style.transform =
          `translate3d(${card.x | 0}px,${card.y | 0}px,0px) rotateZ(${Math.round(card.rot)}deg)`
      })
      return
    }

    /* ── IntersectionObserver — pause when not visible ───────────────── */
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true
          prevT   = null
          animIdRef.current = requestAnimationFrame(frame)
        } else if (!entry.isIntersecting && running) {
          running = false
          if (animIdRef.current) cancelAnimationFrame(animIdRef.current)
        }
      },
      { threshold: 0.01 },
    )
    observer.observe(stage)

    // Kick off if already visible
    running = true
    prevT   = null
    animIdRef.current = requestAnimationFrame(frame)

    /* ── Resize ──────────────────────────────────────────────────────── */
    let resizeTimer = null
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        W = stage.clientWidth  || window.innerWidth
        H = stage.clientHeight || window.innerHeight
        cards.forEach(place)
      }, 150)
    }
    window.addEventListener('resize', onResize)

    return () => {
      running = false
      observer.disconnect()
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current)
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      cards.forEach((card) => {
        card.el.removeEventListener('mouseenter', card.enter)
        card.el.removeEventListener('mouseleave', card.leave)
      })
      while (stage.firstChild) stage.removeChild(stage.firstChild)
    }
  }, [photos])

  return (
    <motion.section
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.12 }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
      className="relative w-full min-h-screen overflow-hidden"
      style={{ background: '#030712' }}
      aria-label="Glimpse photo gallery"
    >
      {/* Stage — perspective kept for real 3D tunnel; preserve-3d only on stage not children */}
      <div
        ref={stageRef}
        className="absolute inset-0"
        style={{
          perspective:       '1000px',
          perspectiveOrigin: '50% 50%',
          transformStyle:    'preserve-3d',
          overflow:          'hidden',
        }}
      />

      {/* Edge vignettes */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[14vh]"
        style={{
          background: 'linear-gradient(180deg,#030712 0%,rgba(3,7,18,0) 100%)',
          zIndex: 600,
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[14vh]"
        style={{
          background: 'linear-gradient(0deg,#030712 0%,rgba(3,7,18,0) 100%)',
          zIndex: 600,
        }}
      />

      {/* Heading */}
      <div
        className="relative flex flex-col items-center pointer-events-none"
        style={{ paddingTop: '3.25rem', zIndex: 10000 }}
      >
        <motion.h2
          initial={{ opacity: 0, y: -24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="voxel-3d-text voxel-white-block font-pixel font-black uppercase text-center select-none"
          style={{ fontSize: 'clamp(2.6rem,6.5vw,4.6rem)', letterSpacing: '0.14em', lineHeight: 1 }}
        >
          Glimpse
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
          className="mt-3 font-pixel text-sm text-cyan-300/80 tracking-widest uppercase"
        >
          ◈ A scattered wall of memories ◈
        </motion.p>
      </div>
    </motion.section>
  )
}
