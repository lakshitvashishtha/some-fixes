import { useEffect, useRef } from 'react'

// ── Shooting-star config ──────────────────────────────────────────────────────
function spawnStar(W, H) {
  const angle = (20 + Math.random() * 30) * (Math.PI / 180)  // downward-right diagonal
  const speed = 380 + Math.random() * 280
  const len   = 80  + Math.random() * 100
  return {
    x:    Math.random() * W,
    y:    Math.random() * H * 0.5,
    vx:   Math.cos(angle) * speed,
    vy:   Math.sin(angle) * speed,
    len,
    life:  0,
    maxLife: (len / speed) * 2.2,
    color: Math.random() > 0.6 ? '#c4f0ff' : '#ffffff',
    width: 1 + Math.random() * 1.2,
    dead:  false,
  }
}

export default function BackgroundDecor() {
  const shootRef  = useRef(null)   // shooting-star canvas
  const nebulaRef = useRef(null)   // nebula static canvas (painted once)

  // ── Paint nebula dust once onto a static canvas ────────────────────────────
  useEffect(() => {
    const canvas = nebulaRef.current
    if (!canvas) return
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')

    const W = canvas.width
    const H = canvas.height

    // Soft nebula blobs
    const blobs = [
      { cx:W*0.15, cy:H*0.25, rx:W*0.32, ry:H*0.22, color:'rgba(147,51,234,0.045)' },
      { cx:W*0.80, cy:H*0.70, rx:W*0.28, ry:H*0.30, color:'rgba(6,182,212,0.04)'  },
      { cx:W*0.55, cy:H*0.10, rx:W*0.20, ry:H*0.18, color:'rgba(249,115,22,0.03)' },
      { cx:W*0.30, cy:H*0.80, rx:W*0.25, ry:H*0.20, color:'rgba(99,102,241,0.04)' },
      { cx:W*0.90, cy:H*0.15, rx:W*0.18, ry:H*0.22, color:'rgba(236,72,153,0.03)' },
    ]
    blobs.forEach(({ cx, cy, rx, ry, color }) => {
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry))
      grd.addColorStop(0,   color)
      grd.addColorStop(0.5, color.replace(/[\d.]+\)$/, '0.015)'))
      grd.addColorStop(1,   'transparent')
      ctx.save()
      ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry))
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(
        cx * (Math.max(rx,ry)/rx), cy * (Math.max(rx,ry)/ry),
        Math.max(rx,ry), 0, Math.PI*2
      )
      ctx.fill()
      ctx.restore()
    })

    // Dust speckles
    for (let i = 0; i < 600; i++) {
      const sx = Math.random() * W
      const sy = Math.random() * H
      const sr = 0.5 + Math.random() * 1.5
      ctx.globalAlpha = 0.04 + Math.random() * 0.08
      ctx.fillStyle   = Math.random() > 0.5 ? '#a5f3fc' : '#e9d5ff'
      ctx.beginPath()
      ctx.arc(sx, sy, sr, 0, Math.PI*2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }, [])

  // ── Animate nebula drift ──────────────────────────────────────────────────
  // Translate-only drift over a pre-baked scale(1.03) layer. The transform
  // write is a pure compositor move; the loop fully pauses when the tab is
  // hidden.
  useEffect(() => {
    const canvas = nebulaRef.current
    if (!canvas) return
    let animId = 0
    const drift = { x: 0, y: 0, tx: 0, ty: 0 }
    let t = 0

    const tick = () => {
      animId = 0
      if (document.hidden) return
      t += 0.002
      drift.tx = Math.sin(t * 0.7) * 12
      drift.ty = Math.cos(t * 0.45) * 8
      drift.x  += (drift.tx - drift.x) * 0.01
      drift.y  += (drift.ty - drift.y) * 0.01
      canvas.style.transform = `translate(${drift.x}px, ${drift.y}px) scale(1.03)`
      animId = requestAnimationFrame(tick)
    }
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (animId) { cancelAnimationFrame(animId); animId = 0 }
      } else if (!animId) {
        animId = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    animId = requestAnimationFrame(tick)
    return () => {
      if (animId) cancelAnimationFrame(animId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  // ── Shooting stars ─────────────────────────────────────────────────────────
  // Instead of clearing the whole viewport every frame, each streak erases
  // only its own previous bounding box (+4px AA pad) before redrawing — the
  // canvas is transparent apart from the few active streaks, so per-streak
  // clears keep it pixel-identical. Loop pauses when the tab is hidden.
  useEffect(() => {
    const canvas = shootRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId = 0

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const stars   = []
    let nextSpawn = 0
    let prevTime  = performance.now()

    const draw = (now) => {
      // Schedule first (defensive) — a stray exception mid-frame must never
      // be able to kill the animation chain silently.
      if (!document.hidden) animId = requestAnimationFrame(draw)
      else { animId = 0; return }
      const delta = Math.min((now - prevTime) / 1000, 0.05)
      prevTime = now

      const W = canvas.width
      const H = canvas.height

      // Spawn shooting star randomly
      if (now > nextSpawn) {
        stars.push(spawnStar(W, H))
        nextSpawn = now + 2200 + Math.random() * 3500
      }

      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i]
        const dirX = Math.cos(Math.atan2(s.vy, s.vx))
        const dirY = Math.sin(Math.atan2(s.vy, s.vx))

        // Erase the streak drawn last frame (nothing to erase on spawn)
        if (s.lastX0 !== undefined) {
          const minX = Math.min(s.lastX0, s.lastX1) - 4
          const minY = Math.min(s.lastY0, s.lastY1) - 4
          ctx.clearRect(minX, minY, Math.abs(s.lastX1 - s.lastX0) + 8, Math.abs(s.lastY1 - s.lastY0) + 8)
        }

        s.life += delta
        if (s.life >= s.maxLife) { stars.splice(i, 1); continue }

        s.x += s.vx * delta
        s.y += s.vy * delta

        const progress  = s.life / s.maxLife
        const fadeAlpha = progress < 0.2
          ? progress / 0.2
          : progress > 0.7
          ? 1 - (progress - 0.7) / 0.3
          : 1

        // tail gradient — hex → rgba with the fade alpha baked in
        const tx0 = s.x - dirX * s.len
        const ty0 = s.y - dirY * s.len
        const hexR = parseInt(s.color.slice(1, 3), 16)
        const hexG = parseInt(s.color.slice(3, 5), 16)
        const hexB = parseInt(s.color.slice(5, 7), 16)
        const grd = ctx.createLinearGradient(tx0, ty0, s.x, s.y)
        grd.addColorStop(0, 'transparent')
        grd.addColorStop(1, `rgba(${hexR},${hexG},${hexB},${fadeAlpha})`)

        ctx.save()
        ctx.globalAlpha = fadeAlpha
        ctx.strokeStyle = grd
        ctx.lineWidth   = s.width
        ctx.lineCap     = 'round'
        ctx.beginPath()
        ctx.moveTo(tx0, ty0)
        ctx.lineTo(s.x, s.y)
        ctx.stroke()

        // bright head dot
        ctx.fillStyle   = '#ffffff'
        ctx.globalAlpha = fadeAlpha * 0.9
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.width * 1.2, 0, Math.PI*2)
        ctx.fill()
        ctx.restore()

        // Remember this streak for next frame's erase
        s.lastX0 = tx0
        s.lastY0 = ty0
        s.lastX1 = s.x
        s.lastY1 = s.y
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (animId) { cancelAnimationFrame(animId); animId = 0 }
      } else {
        prevTime = performance.now()
        if (!animId) animId = requestAnimationFrame(draw)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    animId = requestAnimationFrame(draw)

    return () => {
      if (animId) cancelAnimationFrame(animId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <>
      {/* Scanlines overlay */}
      <div className="scanlines-overlay fixed inset-0 z-30 pointer-events-none" />

      {/* Nebula dust — drifts slowly */}
      <canvas
        ref={nebulaRef}
        aria-hidden="true"
        style={{
          position:'fixed', inset:0, zIndex:1,
          width:'100%', height:'100%',
          pointerEvents:'none',
          transformOrigin:'center center',
          willChange:'transform',
        }}
      />

      {/* Shooting stars */}
      <canvas
        ref={shootRef}
        aria-hidden="true"
        style={{
          position:'fixed', inset:0, zIndex:2,
          width:'100%', height:'100%',
          pointerEvents:'none',
        }}
      />

      {/* HUD overlay text */}
      <div className="fixed inset-0 pointer-events-none opacity-25 z-[5]">
        <div className="absolute top-12 left-10 font-pixel text-xs text-cyan-300 tracking-widest">+ + + + +</div>
        <div className="absolute top-28 right-12 font-pixel text-xs text-cyan-300 tracking-widest">[LAT. 42.109 / LNG. 71.02]</div>
        <div className="absolute bottom-16 left-12 font-pixel text-xs text-cyan-300 tracking-widest">FPS: 60.0 // PROTOCOL 5.0</div>
        <div className="absolute bottom-20 right-24 font-pixel text-xs text-cyan-300 tracking-widest">▲ ARENA_LOADED: 100%</div>
      </div>
    </>
  )
}
