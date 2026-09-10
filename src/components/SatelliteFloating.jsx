import { useEffect, useRef } from 'react'
import satelliteImg from '../assets/satellite.png'

export default function SatelliteFloating() {
  const containerRef = useRef(null)
  const glowRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    const glow = glowRef.current
    if (!container || !glow) return

    const floatAnim = container.animate(
      [
        { transform: 'translateY(0px) rotate(0deg)' },
        { transform: 'translateY(-14px) rotate(2deg)' },
        { transform: 'translateY(0px) rotate(0deg)' },
        { transform: 'translateY(14px) rotate(-2deg)' },
        { transform: 'translateY(0px) rotate(0deg)' },
      ],
      {
        duration: 5000,
        iterations: Infinity,
        easing: 'ease-in-out',
      }
    )

    const glowAnim = glow.animate(
      [
        { transform: 'scale(1)', opacity: 0.5 },
        { transform: 'scale(1.3)', opacity: 0.9 },
        { transform: 'scale(1)', opacity: 0.5 },
      ],
      {
        duration: 2200,
        iterations: Infinity,
        easing: 'ease-in-out',
      }
    )

    return () => {
      floatAnim.cancel()
      glowAnim.cancel()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute top-20 sm:top-24 md:top-32 left-4 sm:left-6 md:left-10 z-40 pointer-events-auto"
    >
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-36 lg:h-36">
        {/* Yellow glow behind the image */}
        <div
          ref={glowRef}
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'radial-gradient(circle, rgba(245,195,68,0.55) 0%, rgba(245,195,68,0.15) 50%, transparent 75%)',
            filter: 'blur(18px)',
            transform: 'scale(1.1)',
          }}
        />

        {/* Satellite image */}
        <img
          src={satelliteImg}
          alt="Satellite"
          className="relative z-10 w-full h-full object-contain drop-shadow-lg"
        />
      </div>
    </div>
  )
}
