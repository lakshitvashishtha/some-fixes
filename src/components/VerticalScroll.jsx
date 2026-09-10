import { useRef } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import MarqueeBanner from './MarqueeBanner.jsx'
import Footer from './Footer.jsx'

// ── Arcade scroll progress bar ───────────────────────────────────────────
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 35, mass: 0.5 })
  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-gradient-to-r from-arcadeYellow via-arcadeOrange to-terminalGreen"
      style={{ scaleX }}
    />
  )
}

/**
 * Simple sequential scroll - no sticky overlap
 * Each page appears one after another in normal document flow
 */
export default function VerticalScroll({
  sectionOneBackground,
  sectionOneForeground,
  sectionTwo,
  sectionThree,
  sectionFour,
  sectionFive,
  sectionSix,
}) {
  return (
    <>
      <ScrollProgressBar />

      <div className="relative">
        
        {/* ── Page 1 — Hero/Earth ── */}
        <section className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 z-0">
            {sectionOneBackground}
          </div>
          <div className="relative z-10 w-full h-screen flex flex-col">
            {sectionOneForeground}
          </div>
        </section>

        {/* ── Marquee Banner — between Hero and Themes ── */}
        <MarqueeBanner />

        {/* ── Page 2 — Saturn/Themes ──────────────────────────────────────
         * ThemesPage handles its own pinning internally via a fixed overlay
         * (mirrors TimelinePage). The section here just provides document
         * height for the sentinel inside ThemesPage to work against.
         * overflow-hidden removed so the fixed overlay can escape the section.
         */}
        <section
          id="section-themes"
          className="relative w-full"
        >
          {sectionTwo}
        </section>

        {/* ── Page 3 — Timeline ── */}
        {/* NOTE: no overflow-hidden here — it breaks position: sticky inside TimelinePage */}
        {sectionThree && (
          <section id="section-timeline" className="relative w-full">
            {sectionThree}
          </section>
        )}

        {/* ── Page 4 — Glimpse photo collage ──────────────────────────────
         * sticky + z-40 makes Glimpse sit on top of the Timeline overlay
         * (z-40) until it naturally scrolls off, preventing mixing.
         */}
        {sectionFour && (
          <section
            id="section-glimpse"
            className="relative w-full overflow-hidden"
            style={{
              height: '100vh',
              position: 'sticky',
              top: 0,
              zIndex: 45,
            }}
          >
            {sectionFour}
          </section>
        )}

        {/* ── Page 5 — Prize Pool ── */}
        {/* NOTE: no overflow-hidden — PrizePoolPage uses position:sticky internally */}
        {sectionFive && (
          <section id="section-prizes" className="relative w-full">
            {sectionFive}
          </section>
        )}

        {/* ── Page 6 — Team ── */}
        {sectionSix && (
          <section id="section-team" className="relative w-full overflow-hidden">
            {sectionSix}
          </section>
        )}

        {/* ── Footer ── */}
        <Footer />

      </div>
    </>
  )
}
