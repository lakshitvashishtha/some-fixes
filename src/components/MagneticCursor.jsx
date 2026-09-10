import { useEffect, useRef } from 'react'

/**
 * MagneticCursor — Boids-steered rocket + exhaust ignition
 * ──────────────────────────────────────────────────────────
 * Rocket boid:
 *   • Seek/arrive steering toward mouse
 *   • Velocity-driven rotation (banks into turns)
 *
 * Exhaust particles (boids):
 *   • Spawned at the rocket's tail each frame when moving
 *   • Each particle has its own boid velocity — starts with
 *     the rocket's backwards vector + random spread
 *   • Separation force keeps particles from clumping
 *   • Fade + shrink over lifetime
 *   • Colour shifts: white core → orange → red → transparent
 */

// ── Rocket boid constants ──────────────────────────────────
const MAX_SPEED  = 22
const MAX_FORCE  = 2.8
const DRAG       = 0.88
const SIZE       = 32        // rocket render size (smaller than before)
const ARRIVE_R   = 80

// ── Exhaust particle constants ─────────────────────────────
const PARTICLE_COUNT   = 6    // spawned per frame when moving
const PARTICLE_LIFE    = 22   // frames alive
const PARTICLE_SPEED   = 4.5  // initial ejection speed
const PARTICLE_SPREAD  = 0.55 // radians of random spread cone
const PARTICLE_SIZE_START = 5
const PARTICLE_SIZE_END   = 0
const SEP_RADIUS       = 8    // separation boid radius
const SEP_FORCE        = 0.4  // separation steering strength

// Exhaust colour stops: [r, g, b, alpha] at life fraction 0→1
const FLAME_COLORS = [
  [255, 255, 220, 0.95],  // 0.0 — hot white core
  [255, 200,  60, 0.85],  // 0.3 — yellow-orange
  [255,  90,  20, 0.65],  // 0.6 — deep orange
  [180,  20,   0, 0.25],  // 0.85 — dark red
  [  0,   0,   0, 0.00],  // 1.0 — gone
]

function lerpColor(t) {
  const stops = FLAME_COLORS
  const scaled = t * (stops.length - 1)
  const i = Math.min(Math.floor(scaled), stops.length - 2)
  const f = scaled - i
  const a = stops[i], b = stops[i + 1]
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
    (a[3] + (b[3] - a[3]) * f).toFixed(3),
  ]
}

export default function MagneticCursor() {
  const canvasRef   = useRef(null)
  const stateRef    = useRef({
    x: -200, y: -200,
    vx: 0,   vy: 0,
    mx: -200, my: -200,
    angle: 0,
    visible: false,
  })
  const particlesRef = useRef([])   // active exhaust boids
  const imgRef       = useRef(null)
  const rafRef       = useRef(null)
  const frameRef     = useRef(0)

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (isTouch) return

    document.documentElement.style.cursor = 'none'

    // ── Load rocket image ──────────────────────────────────────────
    const img = new Image()
    img.src   = '/cursor.png'
    imgRef.current = img

    // ── Canvas ─────────────────────────────────────────────────────
    const canvas = canvasRef.current
    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // ── Mouse ──────────────────────────────────────────────────────
    const onMove  = (e) => { const s = stateRef.current; s.mx = e.clientX; s.my = e.clientY; s.visible = true }
    const onLeave = () => { stateRef.current.visible = false }
    const onEnter = () => { stateRef.current.visible = true  }
    window.addEventListener('mousemove', onMove)
    document.documentElement.addEventListener('mouseleave', onLeave)
    document.documentElement.addEventListener('mouseenter', onEnter)

    const ctx = canvas.getContext('2d')

    // ── Spawn exhaust particles at rocket tail ─────────────────────
    const spawnExhaust = (rx, ry, angle, spd) => {
      if (spd < 1.2) return   // don't emit when barely moving
      const count = Math.ceil(PARTICLE_COUNT * Math.min(spd / MAX_SPEED, 1))

      // Tail offset — behind the rocket centre (opposite to nose direction)
      // angle is the rocket's current heading; tail is angle + π
      const tailDist = SIZE * 0.52
      const tx = rx + Math.sin(angle + Math.PI) * tailDist
      const ty = ry - Math.cos(angle + Math.PI) * tailDist

      for (let i = 0; i < count; i++) {
        // Ejection direction: backwards from rocket ± spread
        const ejectAngle = (angle + Math.PI) + (Math.random() - 0.5) * PARTICLE_SPREAD
        const ejectSpd   = PARTICLE_SPEED * (0.6 + Math.random() * 0.8)
        particlesRef.current.push({
          x:    tx + (Math.random() - 0.5) * 3,
          y:    ty + (Math.random() - 0.5) * 3,
          vx:   Math.sin(ejectAngle) * ejectSpd,
          vy:  -Math.cos(ejectAngle) * ejectSpd,
          age:  0,
          life: PARTICLE_LIFE + Math.floor(Math.random() * 6),
        })
      }
    }

    // ── rAF loop ───────────────────────────────────────────────────
    const tick = () => {
      frameRef.current++
      const s  = stateRef.current
      const ps = particlesRef.current
      const W  = canvas.width
      const H  = canvas.height

      // ── Rocket — snap directly to mouse, zero lag ────────────
      const prevX = s.x
      const prevY = s.y

      s.x = s.mx
      s.y = s.my

      // Velocity derived from positional delta (used for exhaust + rotation)
      s.vx = s.x - prevX
      s.vy = s.y - prevY

      const spd = Math.sqrt(s.vx * s.vx + s.vy * s.vy)

      // Smooth angle toward movement direction
      if (spd > 0.5) {
        const targetAngle = Math.atan2(s.vy, s.vx) + Math.PI / 2
        let diff = targetAngle - s.angle
        while (diff >  Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        s.angle += diff * 0.18
      }

      // ── Spawn exhaust ─────────────────────────────────────────
      if (s.visible) spawnExhaust(s.x, s.y, s.angle, spd)

      // ── Update exhaust particles (boids with separation) ──────
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]

        // Separation from nearby particles
        let sepX = 0, sepY = 0, sepCount = 0
        for (let j = 0; j < ps.length; j++) {
          if (i === j) continue
          const ex = p.x - ps[j].x
          const ey = p.y - ps[j].y
          const ed = Math.sqrt(ex * ex + ey * ey) || 0.001
          if (ed < SEP_RADIUS) {
            sepX += (ex / ed) / ed   // weighted by closeness
            sepY += (ey / ed) / ed
            sepCount++
          }
        }
        if (sepCount > 0) {
          p.vx += (sepX / sepCount) * SEP_FORCE
          p.vy += (sepY / sepCount) * SEP_FORCE
        }

        // Slight upward drift (heat rises)
        p.vy -= 0.04

        p.x += p.vx; p.y += p.vy

        // Dampen over time
        p.vx *= 0.96; p.vy *= 0.96
        p.age++
      }

      // Remove dead particles
      particlesRef.current = ps.filter(p => p.age < p.life)

      // ── Draw ──────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H)

      // Draw exhaust FIRST (behind rocket)
      for (const p of particlesRef.current) {
        const t    = p.age / p.life            // 0 → 1
        const [r, g, b, a] = lerpColor(t)
        const sz   = PARTICLE_SIZE_START + (PARTICLE_SIZE_END - PARTICLE_SIZE_START) * t

        // Glow pass
        ctx.save()
        ctx.globalAlpha = parseFloat(a) * 0.5
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 2.2)
        grd.addColorStop(0, `rgba(${r},${g},${b},0.6)`)
        grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.fillStyle = grd
        ctx.beginPath()
        ctx.arc(p.x, p.y, sz * 2.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Core dot
        ctx.save()
        ctx.globalAlpha = parseFloat(a)
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, Math.max(sz, 0.5), 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // Draw rocket on top
      if (s.visible && imgRef.current.complete) {
        ctx.save()
        ctx.translate(s.x, s.y)
        ctx.rotate(s.angle)
        ctx.globalAlpha = 1
        ctx.drawImage(imgRef.current, -SIZE / 2, -SIZE / 2, SIZE, SIZE)
        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      document.documentElement.removeEventListener('mouseenter', onEnter)
      document.documentElement.style.cursor = ''
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 999999,
      }}
    />
  )
}
