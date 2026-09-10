/**
 * GalaxyBackground.jsx
 *
 * A pure Three.js spiral-arm galaxy rendered on a transparent canvas.
 * Designed to sit behind any UI layer (pointer-events:none, z:0).
 *
 * Galaxy specs:
 *   • 3 spiral arms, ~8 000 particles (reduced on mobile)
 *   • Two particle colours: warm amber/gold core ↔ cool blue-white rim
 *   • Slow continuous Y-axis rotation + gentle camera tilt on mousemove
 *   • IntersectionObserver pauses rAF when off-screen (perf)
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import deviceTier from '../hooks/useDeviceTier.js'
import { createLayerRenderer } from '../three/rendererPool.js'

const { isMobile } = deviceTier

export default function GalaxyBackground() {
  const mountRef = useRef(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const W = container.clientWidth  || window.innerWidth
    const H = container.clientHeight || window.innerHeight

    /* ── Renderer (shared factory — desktop 1.5×, mobile/low-end 1×) ── */
    const { renderer, setSize: setRendererSize, dispose: disposeRenderer } =
      createLayerRenderer({ allowHighDpr: false })
    setRendererSize(W, H)
    container.appendChild(renderer.domElement)

    /* ── Scene / Camera ── */
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 500)
    camera.position.set(0, 18, 32)
    camera.lookAt(0, 0, 0)

    /* ── Galaxy parameters ── */
    const COUNT      = isMobile ? 4000 : 8000
    const ARMS       = 3
    const ARM_SPREAD = 1.6      // radial scatter per arm
    const RADIUS_MAX = 18       // galaxy disc radius
    const THICKNESS  = 0.8      // vertical scatter

    /* ── Galaxy size tuning ──
       DESKTOP_SCALE enlarges the whole galaxy on laptop/desktop screens.
       1 = original size. Raise it (e.g. 1.6) to make the galaxy bigger,
       lower it to shrink. Mobile always uses 1 (unchanged). */
    const DESKTOP_SCALE = 1.35
    const galaxyScale   = isMobile ? 1 : DESKTOP_SCALE

    /* ── Build particle positions & colours ── */
    const positions = new Float32Array(COUNT * 3)
    const colors    = new Float32Array(COUNT * 3)

    // Inner warm gold
    const coreColor = new THREE.Color('#f59e0b')
    // Mid arc warm amber
    const midColor  = new THREE.Color('#fbbf24')
    // Outer cool blue-white
    const rimColor  = new THREE.Color('#bfdbfe')
    // Arm tip cooler
    const tipColor  = new THREE.Color('#93c5fd')

    for (let i = 0; i < COUNT; i++) {
      const arm        = i % ARMS
      const armAngle   = (arm / ARMS) * Math.PI * 2

      // Distribute radius with more density toward center
      const t      = Math.pow(Math.random(), 0.7)   // bias toward centre
      const radius = t * RADIUS_MAX

      // Spiral angle: tighter toward the centre
      const spinAngle = radius * 0.55 + armAngle

      // Gaussian scatter around the arm curve
      const scatter  = (Math.random() - 0.5) * ARM_SPREAD * (radius / RADIUS_MAX + 0.2)
      const scatterY = (Math.random() - 0.5) * THICKNESS * (1 - t * 0.7)

      const x = Math.cos(spinAngle) * radius + scatter
      const y = scatterY
      const z = Math.sin(spinAngle) * radius + scatter

      positions[i*3]   = x
      positions[i*3+1] = y
      positions[i*3+2] = z

      // Colour: lerp from core → rim based on normalised radius
      const nr = radius / RADIUS_MAX
      let col
      if (nr < 0.25)      col = coreColor.clone().lerp(midColor, nr / 0.25)
      else if (nr < 0.65) col = midColor.clone().lerp(rimColor, (nr - 0.25) / 0.40)
      else                col = rimColor.clone().lerp(tipColor,  (nr - 0.65) / 0.35)

      // Slight random brightness variation
      const bright = 0.75 + Math.random() * 0.25
      colors[i*3]   = col.r * bright
      colors[i*3+1] = col.g * bright
      colors[i*3+2] = col.b * bright
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3))

    /* ── Circular sprite texture ── */
    const spriteCanvas = document.createElement('canvas')
    spriteCanvas.width = spriteCanvas.height = 32
    const sCtx = spriteCanvas.getContext('2d')
    const grad = sCtx.createRadialGradient(16,16,0, 16,16,16)
    grad.addColorStop(0,   'rgba(255,255,255,1)')
    grad.addColorStop(0.3, 'rgba(255,255,255,0.7)')
    grad.addColorStop(1,   'rgba(255,255,255,0)')
    sCtx.fillStyle = grad
    sCtx.fillRect(0,0,32,32)
    const spriteTex = new THREE.CanvasTexture(spriteCanvas)

    const material = new THREE.PointsMaterial({
      size:           isMobile ? 0.22 : 0.18,
      map:            spriteTex,
      vertexColors:   true,
      transparent:    true,
      opacity:        0.88,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
      sizeAttenuation: true,
    })

    const galaxy = new THREE.Points(geometry, material)

    /* ── Group holds galaxy + core glow so both scale together ── */
    const galaxyGroup = new THREE.Group()
    galaxyGroup.scale.setScalar(galaxyScale)
    galaxyGroup.add(galaxy)
    scene.add(galaxyGroup)

    /* ── Bright core glow (additive sprite) ── */
    const coreSpriteCanvas = document.createElement('canvas')
    coreSpriteCanvas.width = coreSpriteCanvas.height = 128
    const csCtx = coreSpriteCanvas.getContext('2d')
    const coreGrad = csCtx.createRadialGradient(64,64,0, 64,64,64)
    coreGrad.addColorStop(0,   'rgba(253,224,171,0.95)')
    coreGrad.addColorStop(0.2, 'rgba(251,191,36,0.55)')
    coreGrad.addColorStop(0.5, 'rgba(245,158,11,0.18)')
    coreGrad.addColorStop(1,   'rgba(0,0,0,0)')
    csCtx.fillStyle = coreGrad
    csCtx.fillRect(0,0,128,128)
    const coreTex = new THREE.CanvasTexture(coreSpriteCanvas)

    const coreSpriteMat = new THREE.SpriteMaterial({
      map: coreTex, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    const coreSprite = new THREE.Sprite(coreSpriteMat)
    coreSprite.scale.set(7, 7, 1)
    coreSprite.position.set(0, 0, 0)
    galaxyGroup.add(coreSprite)

    /* ── Mouse parallax ── */
    let targetTiltX = 0, targetTiltY = 0
    const onMouseMove = e => {
      targetTiltX = ((e.clientY / window.innerHeight) - 0.5) * 0.25
      targetTiltY = ((e.clientX / window.innerWidth)  - 0.5) * 0.15
    }
    if (!isMobile) window.addEventListener('mousemove', onMouseMove)

    /* ── Resize ── */
    const onResize = () => {
      const w = container.clientWidth  || window.innerWidth
      const h = container.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      setRendererSize(w, h)
    }
    window.addEventListener('resize', onResize)

    /* ── Visibility gating — the rAF chain fully stops when off-screen
       or the tab is hidden; the first delta after resume is clamped so
       the galaxy/camera never jump after a pause. ── */
    let visible = true
    let last    = performance.now()
    let rafId   = 0

    const syncLoop = () => {
      const shouldRun = visible && !document.hidden
      if (shouldRun && !rafId) {
        rafId = requestAnimationFrame(animate)
      } else if (!shouldRun && rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
    }
    const obs = new IntersectionObserver(
      ([e]) => { visible = e.isIntersecting; syncLoop() },
      { threshold: 0 },
    )
    obs.observe(container)
    const onVisibilityChange = () => {
      if (!document.hidden) last = performance.now()
      syncLoop()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    /* ── Animate ── */
    const animate = (now) => {
      rafId = 0
      if (!visible || document.hidden) return
      const dt = Math.min((now - last) * 0.001, 0.05)
      last = now

      galaxy.rotation.y += dt * 0.04   // slow gentle spin

      // Lerp camera tilt toward mouse
      camera.position.x += (targetTiltY * 6  - camera.position.x) * 0.03
      camera.position.y += (18 - targetTiltX * 5 - camera.position.y) * 0.03
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
      syncLoop()
    }
    syncLoop()

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      obs.disconnect()
      if (!isMobile) window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      if (renderer.domElement.parentNode)
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      disposeRenderer()
      geometry.dispose()
      material.dispose()
      spriteTex.dispose()
      coreTex.dispose()
    }
  }, [])

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      }}
    />
  )
}
