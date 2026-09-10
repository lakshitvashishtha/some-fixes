/**
 * MarqueeBanner.jsx
 *
 * Infinitely scrolling retro-terminal marquee strip.
 * Sits between Hero (Page 1) and Themes (Page 2).
 *
 * Technique: two identical flex tracks side-by-side inside a single
 * overflow-hidden container. The pair translates from 0% → -50%,
 * which moves exactly one track-width — making the loop seamless.
 */

const SEGMENT =
  '✦ BUILD • INNOVATE • WIN ✦ CODEFIESTA 5.0 ✦ 24 HOURS OF HACKING ✦ REWARDS & RECOGNITION'

// Repeat enough times so the track is always wider than the viewport
const CONTENT = Array(10).fill(SEGMENT).join('  ')

export default function MarqueeBanner() {
  return (
    <>
      {/* Keyframe injected once via a <style> tag — avoids touching global CSS */}
      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee-scroll 28s linear infinite;
          will-change: transform;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div
        className="relative w-full z-10 border-y border-cyan-500/20 bg-slate-950/60 backdrop-blur-sm overflow-hidden"
        style={{ height: '40px' }}
        aria-hidden="true"
      >
        {/* Edge-fade mask */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            maskImage:
              'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
            zIndex: 2,
          }}
        />

        {/* Scrolling track — two identical halves so -50% lands exactly at start */}
        <div
          className="marquee-track flex items-center h-full whitespace-nowrap cursor-default select-none"
        >
          {/* First half */}
          <span
            className="font-pixel text-xs tracking-widest uppercase px-8"
            style={{
              color: '#38bdf8',
              textShadow: '0 0 8px rgba(56,189,248,0.6), 0 0 20px rgba(56,189,248,0.25)',
            }}
          >
            {CONTENT}
          </span>

          {/* Second half — identical, creates seamless loop */}
          <span
            className="font-pixel text-xs tracking-widest uppercase px-8"
            style={{
              color: '#38bdf8',
              textShadow: '0 0 8px rgba(56,189,248,0.6), 0 0 20px rgba(56,189,248,0.25)',
            }}
          >
            {CONTENT}
          </span>
        </div>
      </div>
    </>
  )
}
