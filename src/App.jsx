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
    content: `Codefiesta 5.0 is the premier national 24-hour hackathon hosted by Global Institute of Technology (GIT), Jaipur in association with Hack2Skill and GRRAS Solutions. Build cutting-edge solutions across 14 emerging tracks and compete for a ₹7,00,000 prize pool!`
  },
  themeModal: {
    title: 'HACKATHON THEMES (14 OFFICIAL TRACKS)',
    content: `• Web 3.0 • EdTech • Healthcare<br>• GenAI • Agentic AI • Robotics & Drones<br>• IOT • Cybersecurity • Women Safety<br>• Agriculture • Road Safety • Smart Automation<br>• Fintech • GovTech`
  },
  prizesModal: {
    title: 'PRIZE POOL BREAKDOWN',
    content: `🏆 <strong>Total Prize Pool: ₹7,00,000</strong><br>• <strong>₹1,50,000+</strong> Direct Cash Prizes<br>• <strong>₹2,00,000</strong> Incubation & Seed Grants<br>• Track Winners, Best All-Girls Team, & Swag Kits<br>• Exclusive internship and fast-track opportunities with partners.`
  },
  timelineModal: {
    title: 'EVENT TIMELINE',
    content: `• <strong>October 8:</strong> Opening Ceremony & Problem Statements Unlocked<br>• <strong>October 8, 11:00 AM:</strong> 24-Hour Hacking Sprint Begins<br>• <strong>Mentoring:</strong> 3 rounds of strict technical evaluations<br>• <strong>October 9, 11:00 AM:</strong> Final Pitch Demos & Grand Valedictory`
  },
  problemModal: {
    title: 'PROBLEM STATEMENTS',
    content: `Problem statements spanning all 14 official tracks (Web 3.0, EdTech, Healthcare, GenAI, Agentic AI, Robotics & Drones, IOT, Cybersecurity, Women Safety, Agriculture, Road Safety, Smart Automation, Fintech, GovTech) are unlocked at hackathon launch!`
  }
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

  const toggleChiptune = useCallback(() => {
    setSoundEnabled((prev) => {
      if (!prev) setTimeout(() => playArcadeBeep(660), 0)
      return !prev
    })
  }, [playArcadeBeep])

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
            <Navbar soundEnabled={soundEnabled} toggleChiptune={toggleChiptune} />
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
