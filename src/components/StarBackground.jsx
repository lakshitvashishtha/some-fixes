/**
 * StarBackground.jsx
 *
 * GPU star field (WebGL / Three.js Points).
 *
 * This is a 1:1 visual port of the previous 2-D canvas star field: same
 * seeded RNG (seed 42 → identical star positions, sizes, phases, colours),
 * same twinkle formula  opacity*(0.6 + 0.4·sin(t·speed + phase)), same
 * radius pulse, halo thresholds (>0.55 twinkle && r>1.1), constellation
 * edges and cross-sparkle rules, and the same per-layer parallax factors
 * (0.008 / 0.022 / 0.048) with modulo wrap-around.
 *
 * Instead of ~100–140 per-frame radial-gradient allocations on the CPU,
 * the whole field renders as 2 Points draws (halo pass + dot pass) with a
 * tiny ShaderMaterial each, plus optional ultra-thin line passes for
 * constellations and sparkles on desktop. Twinkle/radius/threshold math
 * runs per-vertex on the GPU; the CPU only eases the parallax uniform.
 *
 * Rendering-layer only — no props, no state. Fully pauses when the tab is
 * hidden.
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import deviceTier from '../hooks/useDeviceTier.js'

const { isMobile, isLowEndDevice } = deviceTier

// Cap star count based on device tier
const STAR_COUNT = isMobile || isLowEndDevice ? 80 : 280

// Expensive effects are disabled on mobile/low-end
const ENABLE_HALOS         = !isMobile && !isLowEndDevice
const ENABLE_CONSTELLATIONS = !isMobile && !isLowEndDevice
const ENABLE_SPARKLES       = !isMobile && !isLowEndDevice
const ENABLE_PARALLAX       = !isMobile  // no cursor on touch devices

// ── deterministic star field seeded so it never re-randomises on re-render ──
function makeStars(count, seed = 0) {
  const stars = []
  let s = seed
  const rng = () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
  for (let i = 0; i < count; i++) {
    stars.push({
      x:    rng() * 100,
      y:    rng() * 100,
      r:    0.5 + rng() * 1.5,
      opacity: 0.2 + rng() * 0.7,
      twinkleSpeed: 0.4 + rng() * 1.8,
      twinklePhase: rng() * Math.PI * 2,
      layer: Math.floor(rng() * 3),
      color: rng() > 0.85 ? (rng() > 0.5 ? '#bfdbfe' : '#fef08a') : '#ffffff',
    })
  }
  return stars
}

function makeConstellations(stars, count = 18) {
  const edges = []
  for (let i = 0; i < count; i++) {
    const a = Math.floor(Math.random() * stars.length)
    const b = Math.floor(Math.random() * stars.length)
    if (a !== b) edges.push([a, b])
  }
  return edges
}

const LAYER_PARALLAX = [0.008, 0.022, 0.048]

const STARS         = makeStars(STAR_COUNT, 42)
const CONSTELL_EDGES = ENABLE_CONSTELLATIONS ? makeConstellations(STARS, 14) : []

// Hex → [r, g, b] in 0..1
const HEX_RGB = {
  '#ffffff': [1.0, 1.0, 1.0],
  '#bfdbfe': [0xbf / 255, 0xdb / 255, 0xfe / 255],
  '#fef08a': [0xfe / 255, 0xf0 / 255, 0x8a / 255],
}

// Soft sprite textures (pre-rendered once per mount)
function makeRadialSprite(innerAlpha, outerAlpha = 0, edgeStart = 0, size = 64) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, `rgba(255,255,255,${innerAlpha})`)
  if (edgeStart > 0) grd.addColorStop(edgeStart, `rgba(255,255,255,${innerAlpha})`)
  grd.addColorStop(1, `rgba(255,255,255,${outerAlpha})`)
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, size, size)
  return c
}

const POINTS_VERT = `
  attribute vec2 aPos01;
  attribute vec3 aColor;
  attribute float aPar;     // LAYER_PARALLAX of this star
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aOpacity;
  attribute float aR0;      // static base radius
  uniform float uTime;
  uniform vec2  uRes;       // canvas size in px
  uniform vec2  uPar;       // eased parallax px
  uniform float uMode;      // 0 = halo pass, 1 = dot pass
  varying vec3 vColor;
  varying float vAlpha;
  varying float vMask;

  void main() {
    // Twinkle (identical formula to the old canvas version)
    float tw = aOpacity * (0.6 + 0.4 * sin(uTime * aSpeed + aPhase));
    // Radius pulse used by the dot pass
    float rp = aR0 * (0.85 + 0.15 * sin(uTime * aSpeed * 0.7 + aPhase));

    // Parallax shift with modulo wrap-around (px-space)
    vec2 px = aPos01 * uRes;
    px = mod(px + uPar * vec2(aPar * 80.0, aPar * 60.0), uRes);

    if (uMode < 0.5) {
      // Halo pass: diameter 8r (radius 4r), drawn when tw > 0.55 and r > 1.1
      gl_PointSize = aR0 * 8.0;
      vAlpha = 1.0;
      vMask  = step(0.55, tw) * step(1.1, aR0);
    } else {
      // Dot pass: diameter 2·rp (the pulsing arc radius)
      gl_PointSize = max(1.0, rp * 2.0);
      vAlpha = tw;
      vMask  = 1.0;
    }

    vColor = aColor;
    gl_Position = vec4(px / uRes * 2.0 - 1.0, 0.0, 1.0);
  }
`

const POINTS_FRAG = `
  uniform float uMode;
  uniform sampler2D uTexHalo;
  uniform sampler2D uTexDot;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vMask;

  void main() {
    float a;
    if (uMode < 0.5) {
      // Linear falloff — matches the old radial-gradient halo (alpha 1 → 0)
      a = texture2D(uTexHalo, gl_PointCoord).a * vMask;
    } else {
      // Soft-edged disc
      a = texture2D(uTexDot, gl_PointCoord).a * vAlpha;
    }
    if (a <= 0.003) discard;
    gl_FragColor = vec4(vColor * a, a);
  }
`

const SPARKLE_VERT = `
  attribute vec2 aPos01;   // wrapped star centre
  attribute vec2 aOff;     // cross arm endpoint offset in px
  attribute vec3 aColor;
  attribute float aPar;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aOpacity;
  uniform float uTime;
  uniform vec2  uRes;
  uniform vec2  uPar;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float tw = aOpacity * (0.6 + 0.4 * sin(uTime * aSpeed + aPhase));
    vAlpha = step(0.75, tw) * tw * 0.45;

    vec2 px = mod(aPos01 * uRes + uPar * vec2(aPar * 80.0, aPar * 60.0), uRes);
    vec2 p  = px + aOff;              // arms do NOT wrap (clipped like before)
    vColor = aColor;
    gl_Position = vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0);
  }
`

const SPARKLE_FRAG = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    if (vAlpha <= 0.003) discard;
    gl_FragColor = vec4(vColor * vAlpha, vAlpha);
  }
`

const CONSTELL_VERT = `
  attribute vec2 aPos01;
  attribute float aPar;
  attribute float aSeed;    // edge index → per-edge alpha animation
  uniform float uTime;
  uniform vec2  uRes;
  uniform vec2  uPar;
  varying float vAlpha;

  void main() {
    vAlpha = 0.04 + 0.04 * sin(uTime * 0.35 + aSeed);
    vec2 px = aPos01 * uRes + uPar * vec2(aPar * 60.0, aPar * 40.0);
    gl_Position = vec4(px / uRes * 2.0 - 1.0, 0.0, 1.0);
  }
`

const CONSTELL_FRAG = `
  varying float vAlpha;

  void main() {
    if (vAlpha <= 0.003) discard;
    gl_FragColor = vec4(150.0 / 255.0, 200.0 / 255.0, 1.0, vAlpha);
  }
`

export default function StarBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // WebGL context on the same <canvas> slot (fixed, z-index -10).
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: false,
    })
    renderer.setPixelRatio(1)
    renderer.setClearColor(0x000000, 0)

    const W = window.innerWidth
    const H = window.innerHeight
    renderer.setSize(W, H, false)   // CSS sizing stays on the canvas element

    const scene  = new THREE.Scene()
    const camera = new THREE.Camera()   // unused — shaders place vertices in clip space

    // ── Shared textures ──────────────────────────────────────────────────
    const haloTex = new THREE.CanvasTexture(makeRadialSprite(1, 0))     // 1 → 0 linear
    const dotTex  = new THREE.CanvasTexture(makeRadialSprite(1, 0, 0.92)) // soft edge disc
    haloTex.minFilter = THREE.LinearFilter
    dotTex.minFilter  = THREE.LinearFilter
    dotTex.magFilter  = THREE.LinearFilter
    haloTex.magFilter = THREE.LinearFilter

    const baseUniforms = () => ({
      uTime: { value: 0 },
      uRes:  { value: new THREE.Vector2(W, H) },
      uPar:  { value: new THREE.Vector2(0, 0) },
    })

    // ── Geometry: halo/dot points share one buffer ──────────────────────
    const count = STARS.length
    const pos   = new Float32Array(count * 2)
    const col   = new Float32Array(count * 3)
    const par   = new Float32Array(count)
    const phase = new Float32Array(count)
    const speed = new Float32Array(count)
    const opa   = new Float32Array(count)
    const r0    = new Float32Array(count)

    STARS.forEach((star, i) => {
      pos[i * 2]     = star.x / 100
      pos[i * 2 + 1] = star.y / 100
      const rgb = HEX_RGB[star.color] || [1, 1, 1]
      col[i * 3]     = rgb[0]
      col[i * 3 + 1] = rgb[1]
      col[i * 3 + 2] = rgb[2]
      par[i]         = LAYER_PARALLAX[star.layer]
      phase[i]       = star.twinklePhase
      speed[i]       = star.twinkleSpeed
      opa[i]         = star.opacity
      r0[i]          = star.r
    })

    const pointsGeo = new THREE.BufferGeometry()
    pointsGeo.setAttribute('aPos01',   new THREE.BufferAttribute(pos, 2))
    pointsGeo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3))
    pointsGeo.setAttribute('aPar',     new THREE.BufferAttribute(par, 1))
    pointsGeo.setAttribute('aPhase',   new THREE.BufferAttribute(phase, 1))
    pointsGeo.setAttribute('aSpeed',   new THREE.BufferAttribute(speed, 1))
    pointsGeo.setAttribute('aOpacity', new THREE.BufferAttribute(opa, 1))
    pointsGeo.setAttribute('aR0',      new THREE.BufferAttribute(r0, 1))

    const pointsDefs = {
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexShader: POINTS_VERT,
      fragmentShader: POINTS_FRAG,
    }

    // Halo pass (desktop only) — drawn first, like the old canvas order
    const haloMat = new THREE.ShaderMaterial({
      ...pointsDefs,
      uniforms: {
        ...baseUniforms(),
        uMode:     { value: 0 },
        uTexHalo:  { value: haloTex },
        uTexDot:   { value: dotTex },
      },
    })
    const haloPoints = new THREE.Points(pointsGeo, haloMat)
    haloPoints.frustumCulled = false
    haloPoints.visible = ENABLE_HALOS
    scene.add(haloPoints)

    // Dot pass
    const dotMat = new THREE.ShaderMaterial({
      ...pointsDefs,
      uniforms: {
        ...baseUniforms(),
        uMode:     { value: 1 },
        uTexHalo:  { value: haloTex },
        uTexDot:   { value: dotTex },
      },
    })
    const dotPoints = new THREE.Points(pointsGeo, dotMat)
    dotPoints.frustumCulled = false
    scene.add(dotPoints)

    // ── Constellation lines (desktop only) ──────────────────────────────
    let constellGeo = null
    let constellMesh = null
    let constellMat = null
    if (CONSTELL_EDGES.length) {
      const verts = CONSTELL_EDGES.length * 2
      const cPos = new Float32Array(verts * 2)
      const cPar = new Float32Array(verts)
      const cSeed = new Float32Array(verts)
      CONSTELL_EDGES.forEach(([ai, bi], e) => {
        const sa = STARS[ai]
        const sb = STARS[bi]
        cPos[e * 4]         = sa.x / 100
        cPos[e * 4 + 1]     = sa.y / 100
        cPos[e * 4 + 2]     = sb.x / 100
        cPos[e * 4 + 3]     = sb.y / 100
        cPar[e * 2]         = LAYER_PARALLAX[sa.layer]
        cPar[e * 2 + 1]     = LAYER_PARALLAX[sb.layer]
        cSeed[e * 2]        = e
        cSeed[e * 2 + 1]    = e
      })
      constellGeo = new THREE.BufferGeometry()
      constellGeo.setAttribute('aPos01', new THREE.BufferAttribute(cPos, 2))
      constellGeo.setAttribute('aPar',   new THREE.BufferAttribute(cPar, 1))
      constellGeo.setAttribute('aSeed',  new THREE.BufferAttribute(cSeed, 1))
      constellMat = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.NormalBlending,
        vertexShader: CONSTELL_VERT,
        fragmentShader: CONSTELL_FRAG,
        uniforms: baseUniforms(),
      })
      constellMesh = new THREE.LineSegments(constellGeo, constellMat)
      constellMesh.frustumCulled = false
      scene.add(constellMesh)
    }

    // ── Cross sparkles on layer-2 stars (desktop only) ──────────────────
    let sparkleGeo = null
    let sparkleMesh = null
    let sparkleMat = null
    if (ENABLE_SPARKLES) {
      // 4 vertices per qualifying star: two axis-aligned arms
      const crossStars = []
      STARS.forEach((star, i) => { if (star.layer === 2) crossStars.push(i) })
      const sPos  = new Float32Array(crossStars.length * 4 * 2)
      const sOff  = new Float32Array(crossStars.length * 4 * 2)
      const sCol  = new Float32Array(crossStars.length * 4 * 3)
      const sPar  = new Float32Array(crossStars.length * 4)
      const sPhase = new Float32Array(crossStars.length * 4)
      const sSpeed = new Float32Array(crossStars.length * 4)
      const sOpa  = new Float32Array(crossStars.length * 4)
      crossStars.forEach((si, v) => {
        const star = STARS[si]
        const rgb = HEX_RGB[star.color] || [1, 1, 1]
        const half = star.r * 3.5   // arm length (identical to old sparkle)
        const base = v * 4
        const offs = [[-half, 0], [half, 0], [0, -half], [0, half]]
        for (let k = 0; k < 4; k++) {
          const idx = base + k
          sPos[idx * 2]     = star.x / 100
          sPos[idx * 2 + 1] = star.y / 100
          sOff[idx * 2]     = offs[k][0]
          sOff[idx * 2 + 1] = offs[k][1]
          sCol[idx * 3]     = rgb[0]
          sCol[idx * 3 + 1] = rgb[1]
          sCol[idx * 3 + 2] = rgb[2]
          sPar[idx]         = LAYER_PARALLAX[star.layer]
          sPhase[idx]       = star.twinklePhase
          sSpeed[idx]       = star.twinkleSpeed
          sOpa[idx]         = star.opacity
        }
      })
      sparkleGeo = new THREE.BufferGeometry()
      sparkleGeo.setAttribute('aPos01',   new THREE.BufferAttribute(sPos, 2))
      sparkleGeo.setAttribute('aOff',     new THREE.BufferAttribute(sOff, 2))
      sparkleGeo.setAttribute('aColor',   new THREE.BufferAttribute(sCol, 3))
      sparkleGeo.setAttribute('aPar',     new THREE.BufferAttribute(sPar, 1))
      sparkleGeo.setAttribute('aPhase',   new THREE.BufferAttribute(sPhase, 1))
      sparkleGeo.setAttribute('aSpeed',   new THREE.BufferAttribute(sSpeed, 1))
      sparkleGeo.setAttribute('aOpacity', new THREE.BufferAttribute(sOpa, 1))
      sparkleMat = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.NormalBlending,
        vertexShader: SPARKLE_VERT,
        fragmentShader: SPARKLE_FRAG,
        uniforms: baseUniforms(),
      })
      sparkleMesh = new THREE.LineSegments(sparkleGeo, sparkleMat)
      sparkleMesh.frustumCulled = false
      scene.add(sparkleMesh)
    }

    // ── Resize ──────────────────────────────────────────────────────────
    const onResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      renderer.setSize(w, h, false)
      ;[haloMat, dotMat, constellMat, sparkleMat].forEach((mat) => {
        if (mat) {
          mat.uniforms.uRes.value.set(w, h)
          // Point sprites were laid out for the old resolution — sizes are
          // in CSS px which match the 1:1 buffer, so nothing else changes.
        }
      })
    }
    window.addEventListener('resize', onResize)

    // ── Parallax (desktop only) ─────────────────────────────────────────
    let targetParX = 0
    let targetParY = 0
    let parX = 0
    let parY = 0
    let onMouse = null
    if (ENABLE_PARALLAX) {
      onMouse = (e) => {
        targetParX = (e.clientX / window.innerWidth  - 0.5) * 2 * 60
        targetParY = (e.clientY / window.innerHeight - 0.5) * 2 * 40
      }
      window.addEventListener('mousemove', onMouse)
    }

    // ── Render loop — pauses entirely while the tab is hidden ───────────
    let rafId = 0
    let visible = !document.hidden

    const tick = (now) => {
      rafId = 0
      if (document.hidden) return
      const t = now / 1000

      if (ENABLE_PARALLAX) {
        parX += (targetParX - parX) * 0.04
        parY += (targetParY - parY) * 0.04
        const uv = { x: parX, y: parY }
        ;[haloMat, dotMat, constellMat, sparkleMat].forEach((mat) => {
          if (mat) mat.uniforms.uPar.value.set(uv.x, uv.y)
        })
      }

      ;[haloMat, dotMat, constellMat, sparkleMat].forEach((mat) => {
        if (mat) mat.uniforms.uTime.value = t
      })

      renderer.render(scene, camera)
      rafId = requestAnimationFrame(tick)
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }
      } else if (!rafId) {
        rafId = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    if (visible) rafId = requestAnimationFrame(tick)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('resize', onResize)
      if (onMouse) window.removeEventListener('mousemove', onMouse)
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) obj.material.dispose()
      })
      ;[haloTex, dotTex].forEach((tex) => tex.dispose())
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -10,
        width:  '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
