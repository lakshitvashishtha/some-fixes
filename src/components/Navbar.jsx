import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api'

function scrollToSection(id) {
  // Use Lenis if available (set up in App.jsx) for buttery smooth scroll;
  // fall back to native smooth scroll otherwise.
  const el = document.getElementById(id)
  if (!el) return
  if (window.__lenis && typeof window.__lenis.scrollTo === 'function') {
    window.__lenis.scrollTo(el, { duration: 1.4, offset: 0 })
  } else {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  REGISTRATION COUNTDOWN                                                  */
/*  Deadline: 30 Sept 2026, 12:00 PM (local time)                          */
/* ─────────────────────────────────────────────────────────────────────── */

function RegistrationCountdown() {
  const DEADLINE = new Date('2026-09-30T12:00:00').getTime()

  const compute = () => {
    const diff = Math.max(0, DEADLINE - Date.now())
    const days  = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
    const mins  = Math.floor((diff / (1000 * 60)) % 60)
    const secs  = Math.floor((diff / 1000) % 60)
    return { diff, days, hours, mins, secs }
  }

  const [t, setT] = useState(compute)

  useEffect(() => {
    const id = setInterval(() => setT(compute()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="flex w-full max-w-[280px] sm:max-w-none items-center justify-center sm:justify-start gap-2 sm:gap-3 bg-[#0a1f22]/90 backdrop-blur-md border border-amber-400/40 px-3 sm:px-6 py-2 sm:py-3 rounded-xl shadow-2xl"
      title="Registration closes 30 Sept 2026, 12:00 PM"
    >
      <div
        className="flex items-baseline gap-0.5 sm:gap-1.5 font-pixel font-bold text-amber-300 tabular-nums"
        style={{ fontSize: 'clamp(11px, 3vw, 22px)', textShadow: '0 0 8px rgba(251,191,36,0.45)' }}
      >
        <span>{String(t.days).padStart(2, '0')}<span className="text-[7px] sm:text-[10px] opacity-60 ml-0.5">D</span></span>
        <span className="opacity-50">:</span>
        <span>{String(t.hours).padStart(2, '0')}<span className="text-[7px] sm:text-[10px] opacity-60 ml-0.5">H</span></span>
        <span className="opacity-50">:</span>
        <span>{String(t.mins).padStart(2, '0')}<span className="text-[7px] sm:text-[10px] opacity-60 ml-0.5">M</span></span>
        <span className="opacity-50">:</span>
        <span>{String(t.secs).padStart(2, '0')}<span className="text-[7px] sm:text-[10px] opacity-60 ml-0.5">S</span></span>
      </div>
    </div>
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const user = getStoredUser()
    setIsLoggedIn(Boolean(user && (user.email || user.id)))
  }, [])

  const handleProfileClick = () => {
    const user = getStoredUser()
    if (user && (user.email || user.id)) {
      navigate('/dashboard')
    } else {
      navigate('/auth')
    }
  }

  const navItems = [
    { label: 'Themes',   target: 'section-themes'   },
    { label: 'Timeline', target: 'section-timeline' },
    { label: 'Glimpse',  target: 'section-glimpse'  },
    { label: 'Prizes',   target: 'section-prizes'   },
    { label: 'Our Team', target: 'section-team'     },
  ]

  return (
    <header className="relative z-40 w-full px-4 sm:px-6 py-3 sm:py-5 lg:px-12 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
      {/* Row 1 — brand left; on mobile user profile button sits top-right */}
      <div className="flex items-center justify-between w-full sm:w-auto sm:shrink-0">
        <div className="flex items-center bg-[#0b2123]/90 text-white px-2 sm:px-5 py-1 sm:py-2.5 rounded-md border-2 border-[#123631] shadow-[0_3px_0_#071517] backdrop-blur-md">
          <span className="font-pixel text-[10px] sm:text-sm text-arcadeYellow font-bold tracking-wider mr-1.5 sm:mr-2.5">&lt;CF/5.0&gt;</span>
          <span className="font-pixel text-xs sm:text-base font-bold tracking-tight text-white">CODEFIESTA</span>
        </div>

        {/* Profile button — mobile only (top-right of row 1) */}
        <button
          className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-teal-500/40 text-teal-300 hover:text-white transition backdrop-blur-md active:scale-95 cursor-pointer shadow-md"
          onClick={handleProfileClick}
          title={isLoggedIn ? 'Candidate Dashboard' : 'Sign In / Register'}
          aria-label="User Profile"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v2h20v-2c0-3.33-6.67-5-10-5z" />
          </svg>
        </button>
      </div>

      {/* Center: desktop nav */}
      <nav className="hidden xl:flex items-center gap-2.5 bg-[#0c2626]/80 backdrop-blur-md p-2 rounded-xl border border-teal-500/30 shadow-2xl">
        {navItems.map((item) => (
          <button
            key={item.target}
            className="retro-nav-pill px-5 py-2.5 text-sm font-pixel font-semibold uppercase bg-[#184844] hover:bg-[#205e58] text-white rounded-lg border border-[#0e2c29] cursor-pointer transition-colors"
            onClick={() => scrollToSection(item.target)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Row 2 (mobile) / right group (desktop): countdown + desktop profile button */}
      <div className="flex items-center justify-center sm:justify-end gap-1.5 sm:gap-3 w-full sm:w-auto shrink-0">
        <RegistrationCountdown />
        {/* Desktop Profile Icon Button */}
        <button
          className="hidden sm:flex w-12 h-12 items-center justify-center rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-teal-500/40 text-teal-300 hover:text-white transition backdrop-blur-md active:scale-95 cursor-pointer shadow-lg"
          onClick={handleProfileClick}
          title={isLoggedIn ? 'Candidate Dashboard' : 'Sign In / Register'}
          aria-label="User Profile"
        >
          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
            <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v2h20v-2c0-3.33-6.67-5-10-5z" />
          </svg>
        </button>
      </div>
    </header>
  )
}
