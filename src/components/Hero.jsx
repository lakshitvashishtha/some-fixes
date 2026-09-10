import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// HTS registration portal flag. When HTS_ON=true the landing "REGISTER NOW"
// button opens HTS_URL instead of the in-app /auth flow.
const HTS_ENABLED = import.meta.env.HTS_ON === 'true'
const HTS_URL = import.meta.env.HTS_URL || ''
const HTS_REGISTER_URL = HTS_ENABLED && HTS_URL ? HTS_URL : null

const whiteDepthPalette = [
  '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827', '#030712'
]
const yellowDepthPalette = [
  '#fde047', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12', '#422006', '#1c0e02'
]

function buildSteppedShadow(dirX, dirY, palette) {
  const steps = palette.length
  const parts = []
  for (let i = 1; i <= steps; i++) {
    const px = Math.round(dirX * i)
    const py = Math.round(dirY * i)
    parts.push(`${px}px ${py}px 0px ${palette[i - 1]}`)
  }
  return parts.join(', ')
}

export default function Hero({ playArcadeBeep }) {
  const navigate = useNavigate()
  const tiltContainerRef = useRef(null)
  const titleRef = useRef(null)
  const line1Ref = useRef(null)
  const line2Ref = useRef(null)
  const line3Ref = useRef(null)

  useEffect(() => {
    const tiltContainer = tiltContainerRef.current
    const mainTitle = titleRef.current

    let currentX = 0, currentY = 0
    let targetX = 0, targetY = 0

    function handleCursorMove(clientX, clientY) {
      if (!mainTitle) return
      const rect = mainTitle.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const deltaX = clientX - centerX
      const deltaY = clientY - centerY

      const normX = Math.max(-1, Math.min(1, deltaX / (window.innerWidth / 2)))
      const normY = Math.max(-1, Math.min(1, deltaY / (window.innerHeight / 2)))

      targetX = normX
      targetY = normY
      wake()
    }

    const onMouseMove = (e) => handleCursorMove(e.clientX, e.clientY)
    const onTouchMove = (e) => {
      if (e.touches && e.touches.length > 0) {
        handleCursorMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove, { passive: true })

    // Render helper — identical transform/shadow math to the original loop
    function writeTitle() {
      const maxPitch = 20
      const maxYaw = 24
      const maxRoll = 5

      const rotX = -currentY * maxPitch
      const rotY = currentX * maxYaw
      const rotZ = currentX * currentY * -maxRoll

      if (tiltContainer) {
        tiltContainer.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg) translateZ(35px)`
      }

      const stepUnitX = 1.0 - (currentX * 0.75)
      const stepUnitY = 1.0 - (currentY * 0.65)

      const whiteShadow = buildSteppedShadow(stepUnitX, stepUnitY, whiteDepthPalette)
      const yellowShadow = buildSteppedShadow(stepUnitX, stepUnitY, yellowDepthPalette)

      if (line1Ref.current) {
        line1Ref.current.style.textShadow = whiteShadow
        line1Ref.current.style.filter = 'none'
      }
      if (line2Ref.current) {
        line2Ref.current.style.textShadow = whiteShadow
        line2Ref.current.style.filter = 'none'
      }
      if (line3Ref.current) {
        line3Ref.current.style.textShadow = yellowShadow
        line3Ref.current.style.filter = 'none'
      }

      if (line1Ref.current && line2Ref.current && line3Ref.current) {
        const shiftX = (currentX * 5).toFixed(2)
        const shiftY = (currentY * 3).toFixed(2)
        line1Ref.current.style.transform = `translate3d(${-shiftX * 0.6}px, ${-shiftY * 0.6}px, 15px)`
        line2Ref.current.style.transform = `translate3d(0px, 0px, 25px)`
        line3Ref.current.style.transform = `translate3d(${shiftX * 0.7}px, ${shiftY * 0.7}px, 35px)`
      }
    }

    // The tilt only changes while the pointer moves, so the rAF chain runs
    // only from a pointer event until the easing converges, and only while
    // the hero is near the viewport — no more idle per-frame style writes.
    let rafId = 0
    let inView = true

    function tick() {
      rafId = 0
      if (!inView) return
      const lerp = 0.085
      currentX += (targetX - currentX) * lerp
      currentY += (targetY - currentY) * lerp

      const settled =
        Math.abs(targetX - currentX) < 0.0005 &&
        Math.abs(targetY - currentY) < 0.0005

      if (settled) {
        currentX = targetX
        currentY = targetY
        writeTitle()
        return   // converged — stop until the next pointer event
      }
      writeTitle()
      rafId = requestAnimationFrame(tick)
    }

    function wake() {
      if (!rafId && inView) rafId = requestAnimationFrame(tick)
    }

    // Write the initial rest state once (identical to the old first frame)
    writeTitle()

    // Pause entirely while the hero is scrolled off-screen
    const heroRoot = tiltContainer && tiltContainer.parentElement
    const observer = heroRoot
      ? new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting
          if (!inView && rafId) { cancelAnimationFrame(rafId); rafId = 0 }
          else if (inView) wake()
        }, { threshold: 0 })
      : null
    if (observer && heroRoot) observer.observe(heroRoot)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      if (observer) observer.disconnect()
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return (
    <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 sm:px-6">
      <div className="relative z-10 flex flex-col items-center justify-center cursor-default pointer-events-auto select-none" id="tiltContainer" ref={tiltContainerRef}>
        <div className="mb-2 sm:mb-3 px-2 sm:px-3 py-1 bg-[#091f21]/90 backdrop-blur-md border border-teal-400/40 rounded-full flex items-center gap-1.5 sm:gap-2 shadow-lg">
          <span className="font-pixel text-[9px] sm:text-[11px] text-teal-200 tracking-widest">ANNUAL NATIONAL LEVEL HACKATHON</span>
        </div>
        <div className="voxel-3d-text font-pixel text-center text-[16vw] xs:text-[16vw] sm:text-8xl md:text-9xl lg:text-[10rem] font-black tracking-normal leading-[0.88]" ref={titleRef} id="mainVoxelTitle">
          <div className="block voxel-white-block transform transition-transform duration-200" id="titleLine1" ref={line1Ref}>CODE</div>
          <div className="block voxel-white-block transform transition-transform duration-200" id="titleLine2" ref={line2Ref}>FIESTA</div>
          <div className="block voxel-yellow-block text-[13vw] xs:text-[13vw] sm:text-7xl md:text-8xl lg:text-9xl transform transition-transform duration-200" id="titleLine3" ref={line3Ref}>5.0</div>
        </div>
        <div className="mt-6 sm:mt-8 relative z-20 flex flex-col items-center">
          <a
            className="arcade-begin-btn inline-block px-6 sm:px-8 lg:px-10 py-2.5 sm:py-3 lg:py-3.5 rounded-lg text-slate-900 font-pixel text-base sm:text-lg lg:text-xl font-black tracking-widest uppercase transition transform active:scale-95 text-center cursor-pointer"
            href="/"
            onClick={(e) => {
              e.preventDefault()
              window.location.href = window.location.pathname
            }}
          >
            REGISTER NOW
          </a>
          <span className="mt-2 sm:mt-2.5 font-pixel text-[9px] sm:text-[11px] text-cyan-200 font-bold tracking-wider uppercase opacity-90">[ Closes 30 Sept · 12:00 PM ]</span>
        </div>
      </div>
    </main>
  )
}
