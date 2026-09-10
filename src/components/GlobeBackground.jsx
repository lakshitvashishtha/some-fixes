import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import deviceTier from '../hooks/useDeviceTier.js'
import { createLayerRenderer } from '../three/rendererPool.js'

const { isMobile } = deviceTier

/**
 * GlobeBackground (OPTIMISED)
 *
 * Performance tweaks:
 *   – Earth procedural texture 2048×1024 → 1024×512 (continent coords scaled)
 *   – Cloud canvas 1024×512 → 512×256
 *   – Antialias disabled (background scene)
 *   – Renderer built via shared rendererPool (unified DPR policy)
 *   – IntersectionObserver + visibilitychange fully pause the rAF chain;
 *     the first delta after resume is clamped so motion never jumps
 *   – All textures disposed on unmount
 */
export default function GlobeBackground({ containerId = 'threejs-container' }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    // On mobile: pull back further so the smaller Earth sits centered in viewport
    if (isMobile) {
      camera.position.set(0, 0.2, 9.5)   // centered, further back
    } else {
      camera.position.set(0, 2.8, 13.5)  // desktop
    }
    camera.lookAt(0, 0, 0)

    const { renderer, setSize: setRendererSize, dispose: disposeRenderer } =
      createLayerRenderer({ allowHighDpr: true })
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    setRendererSize(width, height)
    container.appendChild(renderer.domElement)

    const ambientLight = new THREE.AmbientLight(0x0a1c22, 0.75)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xfff7db, 2.8)
    sunLight.position.set(16, 12, 14)
    scene.add(sunLight)

    const rimLight = new THREE.DirectionalLight(0x00f0ff, 0.6)
    rimLight.position.set(-16, -6, -10)
    scene.add(rimLight)

    const fillLight = new THREE.DirectionalLight(0x1a6b63, 0.4)
    fillLight.position.set(0, -10, 8)
    scene.add(fillLight)

    const meteors = []
    const meteorMat = new THREE.LineBasicMaterial({ color: 0xdbfcff, transparent: true, opacity: 0.8 })
    for (let m = 0; m < 4; m++) {
      const mGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-1.8, -1.0, -0.6)
      ])
      const mLine = new THREE.Line(mGeo, meteorMat.clone())
      resetMeteor(mLine, true)
      scene.add(mLine)
      meteors.push(mLine)
    }

    function resetMeteor(line, init = false) {
      // Scale meteor spawn positions for mobile (40% scale)
      const scale = isMobile ? 0.4 : 1.0
      line.position.set(
        ((Math.random() - 0.35) * 32 + 5) * scale, 
        (Math.random() * 16 + 5) * scale, 
        (-10 - Math.random() * 10) * scale
      )
      line.scale.setScalar((0.7 + Math.random() * 0.8) * scale)
      line.material.opacity = 0
      line.userData = {
        active: false,
        speed: (0.3 + Math.random() * 0.25) * scale,
        delay: init ? Math.random() * 150 : Math.random() * 180 + 40,
        timer: 0
      }
    }

    // ── Earth map texture (reduced 2048×1024 → 1024×512) ───────────────────
    const TEX_W = 1024, TEX_H = 512
    const mapCanvas = document.createElement('canvas')
    mapCanvas.width = TEX_W
    mapCanvas.height = TEX_H
    const ctx = mapCanvas.getContext('2d')

    const oceanGrad = ctx.createLinearGradient(0, 0, 0, TEX_H)
    oceanGrad.addColorStop(0, '#020e1a')
    oceanGrad.addColorStop(0.2, '#031728')
    oceanGrad.addColorStop(0.5, '#06263f')
    oceanGrad.addColorStop(0.8, '#031728')
    oceanGrad.addColorStop(1, '#020e1a')
    ctx.fillStyle = oceanGrad
    ctx.fillRect(0, 0, TEX_W, TEX_H)

    // Scale helper: original coords were for 2048×1024
    const sx = (v) => v * TEX_W / 2048
    const sy = (v) => v * TEX_H / 1024

    function drawContinent(cx, cy, rx, ry, colMain, colHills) {
      ctx.save()
      ctx.beginPath()
      const pts = 42
      for (let i = 0; i <= pts; i++) {
        const angle = (i / pts) * Math.PI * 2
        const noise = 0.76 + Math.sin(angle * 5) * 0.14 + Math.cos(angle * 7) * 0.1 + Math.sin(angle * 13) * 0.05
        const x = sx(cx) + Math.cos(angle) * sx(rx) * noise
        const y = sy(cy) + Math.sin(angle) * sy(ry) * noise
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.lineWidth = 7
      ctx.strokeStyle = '#0d596b'
      ctx.stroke()
      ctx.fillStyle = colMain
      ctx.fill()

      ctx.beginPath()
      for (let i = 0; i <= pts; i++) {
        const angle = (i / pts) * Math.PI * 2
        const noise = 0.46 + Math.sin(angle * 4 + 1.2) * 0.12 + Math.cos(angle * 8) * 0.08
        const x = sx(cx) + Math.cos(angle) * sx(rx) * noise
        const y = sy(cy) + Math.sin(angle) * sy(ry) * noise
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = colHills
      ctx.fill()
      ctx.restore()
    }

    drawContinent(500, 360, 270, 170, '#144023', '#0f2d18')
    drawContinent(690, 660, 160, 230, '#123b20', '#1e522d')
    drawContinent(1080, 320, 230, 160, '#164324', '#0f2d18')
    drawContinent(1160, 590, 250, 240, '#5c431d', '#3d2e14')
    drawContinent(1510, 340, 390, 230, '#164223', '#0d2815')
    drawContinent(1660, 730, 170, 120, '#664a21', '#402e14')

    ctx.fillStyle = '#b6dbe6'
    ctx.fillRect(0, 0, TEX_W, 33)
    ctx.fillRect(0, TEX_H - 30, TEX_W, 30)

    const bumpCanvas = document.createElement('canvas')
    bumpCanvas.width = 512
    bumpCanvas.height = 256
    const bCtx = bumpCanvas.getContext('2d')
    bCtx.drawImage(mapCanvas, 0, 0, 512, 256)

    const earthTex = new THREE.CanvasTexture(mapCanvas)
    const bumpTex = new THREE.CanvasTexture(bumpCanvas)

    const earthMaster = new THREE.Group()
    // Centered on both mobile and desktop
    earthMaster.position.set(0, -0.2, 0)
    scene.add(earthMaster)

    // Mobile: 40% of desktop size so the whole globe fits in the viewport
    const earthRadius = isMobile ? 1.46 : 3.65
    const earthGeo = new THREE.SphereGeometry(earthRadius, isMobile ? 32 : 64, isMobile ? 24 : 48)
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      bumpMap: bumpTex,
      bumpScale: 0.12,
      roughness: 0.85,
      metalness: 0.15
    })
    const earthMesh = new THREE.Mesh(earthGeo, earthMat)
    earthMaster.add(earthMesh)

    // ── Cloud canvas (reduced 1024×512 → 512×256) ───────────────────────────
    const CLD_W = 512, CLD_H = 256
    const cloudCanvas = document.createElement('canvas')
    cloudCanvas.width = CLD_W
    cloudCanvas.height = CLD_H
    const cCtx = cloudCanvas.getContext('2d')
    cCtx.clearRect(0, 0, CLD_W, CLD_H)
    for (let c = 0; c < 90; c++) {
      const cx = Math.random() * CLD_W
      const cy = 35 + Math.random() * 185
      const rad = 10 + Math.random() * 23
      const cGrad = cCtx.createRadialGradient(cx, cy, 1, cx, cy, rad)
      cGrad.addColorStop(0, 'rgba(230, 245, 255, 0.45)')
      cGrad.addColorStop(0.5, 'rgba(200, 225, 240, 0.25)')
      cGrad.addColorStop(1, 'rgba(200, 225, 240, 0)')
      cCtx.fillStyle = cGrad
      cCtx.beginPath()
      cCtx.arc(cx, cy, rad, 0, Math.PI * 2)
      cCtx.fill()
    }
    const cloudTex = new THREE.CanvasTexture(cloudCanvas)
    cloudTex.wrapS = THREE.RepeatWrapping
    const cloudGeo = new THREE.SphereGeometry(earthRadius + 0.07, 48, 32)
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.38,
      blending: THREE.NormalBlending,
      depthWrite: false
    })
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat)
    earthMaster.add(cloudMesh)

    const moonGroup = new THREE.Group()
    scene.add(moonGroup)

    const moonCanvas = document.createElement('canvas')
    moonCanvas.width = 512
    moonCanvas.height = 256
    const mCtx = moonCanvas.getContext('2d')
    mCtx.fillStyle = '#b2bcc2'
    mCtx.fillRect(0, 0, 512, 256)

    for (let cr = 0; cr < 70; cr++) {
      const mx = Math.random() * 512
      const my = Math.random() * 256
      const mr = 4 + Math.random() * 16
      mCtx.beginPath()
      mCtx.arc(mx, my, mr, 0, Math.PI * 2)
      mCtx.fillStyle = Math.random() > 0.4 ? 'rgba(70, 78, 84, 0.4)' : 'rgba(215, 222, 226, 0.35)'
      mCtx.fill()
    }
    const moonTex = new THREE.CanvasTexture(moonCanvas)
    // Scale down Moon on mobile (40% size), keep full size on desktop
    const moonRadius = isMobile ? 0.29 : 0.72
    const moonGeo = new THREE.SphereGeometry(moonRadius, 24, 18)  // was 32×24
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      roughness: 0.9,
      metalness: 0.05
    })
    const moonMesh = new THREE.Mesh(moonGeo, moonMat)
    moonGroup.add(moonMesh)

    let moonAngle = 0.9
    // Scale down Moon orbit distance on mobile (40% distance), keep full distance on desktop
    const moonDistance = isMobile ? 3.0 : 7.6

    let targetRotX = 0.15
    let targetRotY = 0

    const handleMouseMove = (e) => {
      const mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      const mouseY = (e.clientY / window.innerHeight - 0.5) * 2
      // Reduce parallax range on mobile (40% of desktop)
      const parallaxScale = isMobile ? 0.4 : 1.0
      targetRotX = 0.15 + mouseY * 0.28 * parallaxScale
      targetRotY = mouseX * 0.35 * parallaxScale
    }

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth
      const h = container.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      setRendererSize(w, h)
    }

    // Skip mouse parallax on touch devices — no cursor, saves listener overhead
    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove)
    }
    window.addEventListener('resize', handleResize)

    // ── Visibility gating ────────────────────────────────────────────────────
    // The rAF chain fully stops when the scene is off-screen or the tab is
    // hidden, and restarts on demand. The first delta after a resume is
    // clamped so rotations/meteors never jump after a long pause.
    let visible = true
    let lastTime = performance.now()
    let animationId = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        syncLoop()
      },
      { threshold: 0 },
    )
    observer.observe(container)

    const syncLoop = () => {
      const shouldRun = visible && !document.hidden
      if (shouldRun && !animationId) {
        animationId = requestAnimationFrame(animate)
      } else if (!shouldRun && animationId) {
        cancelAnimationFrame(animationId)
        animationId = 0
      }
    }
    const onVisibilityChange = () => {
      if (!document.hidden) lastTime = performance.now()
      syncLoop()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    function animate(now) {
      animationId = 0
      if (!visible || document.hidden) return

      const delta = Math.min((now - lastTime) * 0.001, 0.05)
      lastTime = now

      earthMesh.rotation.y += delta * 0.085
      cloudMesh.rotation.y += delta * 0.11

      earthMaster.rotation.x += (targetRotX - earthMaster.rotation.x) * 0.05
      earthMaster.rotation.y += (targetRotY - earthMaster.rotation.y) * 0.05

      moonAngle += delta * 0.32
      const moonYVariation = isMobile ? 0.84 : 2.1  // 40% vertical movement on mobile
      moonMesh.position.set(
        Math.cos(moonAngle) * moonDistance,
        Math.sin(moonAngle) * moonYVariation + Math.sin(moonAngle * 0.5) * (isMobile ? 0.2 : 0.4),
        Math.sin(moonAngle) * (moonDistance * 0.72)
      )
      moonMesh.rotation.y += delta * 0.15

      for (let m = 0; m < meteors.length; m++) {
        const line = meteors[m]
        const data = line.userData
        if (!data.active) {
          data.timer += 1
          if (data.timer > data.delay) {
            data.active = true
            line.material.opacity = 0.85
          }
        } else {
          line.position.x -= data.speed * 2.2
          line.position.y -= data.speed * 1.35
          line.position.z -= data.speed * 0.8
          line.material.opacity -= delta * 0.7
          if (line.material.opacity <= 0.02 || line.position.y < -12) {
            resetMeteor(line)
          }
        }
      }

      renderer.render(scene, camera)
      syncLoop()
    }
    syncLoop()

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      observer.disconnect()
      if (!isMobile) window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
      disposeRenderer()
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
          else obj.material.dispose()
        }
      })
      ;[earthTex, bumpTex, cloudTex, moonTex].forEach((t) => t.dispose())
    }
  }, [])

  return (
    <div
      className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
      ref={containerRef}
      id={containerId}
    ></div>
  )
}
