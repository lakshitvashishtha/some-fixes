import { useCallback, useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import deviceTier from './hooks/useDeviceTier.js'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import QuickStats from './components/QuickStats.jsx'
import BackgroundDecor from './components/BackgroundDecor.jsx'
import GlobeBackground from './components/GlobeBackground.jsx'
import StarBackground from './components/StarBackground.jsx'
import InfoModal from './components/InfoModal.jsx'
import SatelliteFloating from './components/SatelliteFloating.jsx'
import VerticalScroll from './components/VerticalScroll.jsx'
import ThemesPage from './components/ThemesPage.jsx'
import MagneticCursor from './components/MagneticCursor.jsx'
import TimelinePage from './components/TimelinePage.jsx'
import PrizePoolPage from './components/PrizePoolPage.jsx'
import GlimpsePage from './components/GlimpsePage.jsx'
import TeamPage from './components/TeamPage.jsx'

const modalData = {
  aboutModal: {
    title: 'ABOUT CODEFIESTA 5.0',
    content: `Codefiesta 5.0 is the premier national 24-hour hackathon designed to unite bold thinkers, developers, and designers. Build innovative digital worlds, AI solutions, and decentralized protocols with peers across the nation.`,
  },
  themeModal: {
    title: 'HACKATHON THEMES',
    content: `• Generative AI & Intelligent Agents<br>• Decentralized Autonomous Web & Cyber Resilience<br>• Climate Tech & Smart Cities<br>• Open Innovation & Creative Frontier`,
  },
  prizesModal: {
    title: 'PRIZE POOL BREAKDOWN',
    content: `🏆 <strong>Grand Champion:</strong> $5,000 + Venture Fast-track<br>🥈 <strong>First Runner-Up:</strong> $3,000 + Cloud Credits<br>🥉 <strong>Second Runner-Up:</strong> $2,000<br>✨ <strong>Special Category Prizes:</strong> Best Web3, Best UI/UX, & Most Creative Project.`,
  },
  timelineModal: {
    title: 'EVENT TIMELINE (OCTOBER 8–9, 2026)',
    content: `• <strong>Sept 30:</strong> Registrations Close<br>• <strong>Oct 8, 08:30 AM:</strong> Reporting & Kit Distribution<br>• <strong>Oct 8, 10:00 AM:</strong> Inauguration & Welcome Address<br>• <strong>Oct 8, 10:30 AM:</strong> 24-Hour Hacking Sprint Starts<br>• <strong>Oct 8, 09:00 PM:</strong> Cultural Night<br>• <strong>Oct 9, 10:00 AM:</strong> Final Assessment & Code Freeze<br>• <strong>Oct 9, 11:00 AM:</strong> Power Judging Stage Pitches<br>• <strong>Oct 9, 12:00 PM:</strong> Result & Winner Announcement`,
  },
  problemModal: {
    title: 'PROBLEM STATEMENTS',
    content: `Curated industry statements will be unlocked 2 hours before the hacking sprint begins. Prepare your development toolkits and stay tuned on our Discord server!`,
  },
}

export default function App() {
  const [activeModal, setActiveModal] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const audioCtxRef = useRef(null)

  const playArcadeBeep = useCallback((freq = 440) => {
    if (!soundEnabled) return
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.12)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.12)
    } catch (_) {}
  }, [soundEnabled])

  const openModal  = useCallback((key) => { playArcadeBeep(520); setActiveModal(key) }, [playArcadeBeep])
  const closeModal = useCallback(() => setActiveModal(null), [])

  // Smooth scroll (Lenis)
  useEffect(() => {
    const { isMobile, isTouchDevice } = deviceTier

    const lenis = new Lenis({
      autoRaf:          true,
      smoothWheel:      !isTouchDevice,
      lerp:             isMobile ? 0.08 : 0.05,   // lower = longer, silkier glide
      smoothTouch:      false,
      wheelMultiplier:  1.8,                       // more travel per wheel tick
      touchMultiplier:  1.0,
    })

    window.__lenis = lenis

    return () => {
      lenis.destroy()
      delete window.__lenis
    }
  }, [])

  // Space bar easter egg
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        alert('🚀 Launching Codefiesta 5.0 Arena!')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const activeData = activeModal ? modalData[activeModal] : null

  return (
    <div className="relative min-h-screen text-slate-100 selection:bg-arcadeYellow selection:text-slate-900 font-sans overflow-x-hidden">
      <MagneticCursor />
      <StarBackground />
      <BackgroundDecor />

      <VerticalScroll
        sectionOneBackground={<GlobeBackground />}
        sectionOneForeground={
          <div className="relative flex flex-col h-full w-full">
            <SatelliteFloating />
            <Navbar />
            <Hero playArcadeBeep={playArcadeBeep} />
            <QuickStats />
          </div>
        }
        sectionTwo={<ThemesPage />}
        sectionThree={<TimelinePage />}
        sectionFour={<GlimpsePage />}
        sectionFive={<PrizePoolPage />}
        sectionSix={<TeamPage />}
      />

      {activeData && (
        <InfoModal open={true} title={activeData.title} content={activeData.content} onClose={closeModal} />
      )}
    </div>
  )
}
