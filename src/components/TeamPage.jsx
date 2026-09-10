/**
 * TeamPage.jsx  (v4 — Arcade Player-Card Roster)
 *
 * Style goals:
 *   • Matches the site's core arcade vocabulary: hard 2px borders, chunky
 *     offset push-button shadows, HUD corner brackets, blueprint grid fill
 *   • Silkscreen / pixel type throughout — no generic glassmorphism
 *   • Ribbed press-down social buttons (same feel as auth page buttons)
 *   • Straight cards, hover lift — no lanyard, no 3D mouse tilt
 */

import { useState } from 'react'
import { motion } from 'framer-motion'

function makeAvatar(initials, bg = '#111827', accent = '#38bdf8') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <rect width="200" height="200" fill="${bg}"/>
    <circle cx="100" cy="76" r="34" fill="${accent}" opacity="0.85"/>
    <path d="M42,185 C42,135 68,125 100,125 C132,125 158,135 158,185 Z" fill="${accent}" opacity="0.85"/>
    <rect x="0" y="150" width="200" height="50" fill="${bg}" opacity="0.92"/>
    <text x="100" y="182" font-family="'Courier New', monospace" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="3">${initials}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const CONVENERS = [
  {
    name: 'Dr. Pradeep Jha',
    role: 'Convener (HOD)',
    photo: 'https://ik.imagekit.io/rcfcr7y0e/Screenshot%202025-09-04%20121036.png?updatedAt=1756976567715',
    accentColor: '#f5c344',
  },
  {
    name: 'Mr. Pankaj Jain',
    role: 'Co-Convener (Asst. Prof)',
    photo: 'https://ik.imagekit.io/rcfcr7y0e/Screenshot%202025-09-04%20121209.png?updatedAt=1756976607127',
    accentColor: '#fb923c',
    imgScale: 1.4,
  },
]

const COORDINATORS = [
  {
    name: 'Durgesh Singh',
    role: 'Student Coordinator Lead',
    photo: '/team-photos/durgesh-singh.jpg',
    accentColor: '#fbbf24',
    instagram: 'https://instagram.com',
    linkedin: 'https://linkedin.com',
  },
  {
    name: 'Mudit Paliwal',
    role: 'Co-Lead Sponsor Team',
    photo: '/team-photos/mudit-paliwal.jpg',
    accentColor: '#f59e0b',
    instagram: 'https://instagram.com',
    linkedin: 'https://linkedin.com',
  },
  {
    name: 'Aman Goyal',
    role: 'Lead Designing Team',
    photo: '/team-photos/aman-goyal.png',
    accentColor: '#f5c344',
    instagram: 'https://www.instagram.com/mr.goyal_214?stkn=MXF4djhkM3d0aXFseQ==',
    linkedin: 'https://www.linkedin.com/in/aman-goyal-b516b032a',
  },
  {
    name: 'Prabhat Kumar',
    role: 'Co-Lead Sponsor Team',
    photo: '/team-photos/prabhat-kumar.jpg',
    accentColor: '#fb923c',
    instagram: 'https://www.instagram.com/prabhat_kr18?stkn=MWlmcXkybzNyc2o4ZQ==',
    linkedin: 'https://www.linkedin.com/in/prabhat-kumar-4b7957295',
  },
  {
    name: 'Eklavya Vaishnav',
    role: 'Lead PR Team',
    photo: '/team-photos/eklavya-vaishnav.jpg',
    accentColor: '#fbbf24',
    instagram: 'https://instagram.com',
    linkedin: 'https://linkedin.com',
    objectPosition: 'center center',
  },
  {
    name: 'Aman Bagda',
    role: 'Co-Lead Sponsor Team',
    photo: '/team-photos/aman-bagda.jpg',
    accentColor: '#f59e0b',
    instagram: 'https://instagram.com',
    linkedin: 'https://linkedin.com',
  },
  {
    name: 'Sahil Yadav',
    role: 'Lead Guest Management Team',
    photo: '/team-photos/sahil-yadav.jpg',
    accentColor: '#f5c344',
    instagram: 'https://www.instagram.com/rao.sahil.05?stkn=MndycjhlbHFzM3o=',
    linkedin: 'https://www.linkedin.com/in/sahil-yadav-423252402?utm_source=share_via&utm_content=profile&utm_medium=member_android',
  },
  {
    name: 'Lakshit Vashishtha',
    role: 'Lead Registration Team',
    photo: '/team-photos/lakshit-vashishtha.jpg',
    accentColor: '#fb923c',
    instagram: 'https://www.instagram.com/lakshitvashishtha?stkn=a2QzNHNtMW04Zzdt',
    linkedin: 'https://www.linkedin.com/in/lakshit-vashishtha-3291a1295/',
  },
  {
    name: 'Sahil Vaishnav',
    role: 'Coordinator Technical Team',
    photo: makeAvatar('SV', '#0a192f', '#38bdf8'),
    accentColor: '#38bdf8',
    instagram: 'https://instagram.com',
    linkedin: 'https://linkedin.com',
  },
  {
    name: 'Rishi Goswami',
    role: 'Coordinator Technical Team',
    photo: makeAvatar('RG', '#1e112a', '#a855f7'),
    accentColor: '#a855f7',
    instagram: 'https://instagram.com',
    linkedin: 'https://linkedin.com',
  },
  {
    name: 'Abhay Shekhawat',
    role: 'Coordinator Technical Team',
    photo: makeAvatar('AS', '#1c1917', '#facc15'),
    accentColor: '#facc15',
    instagram: 'https://instagram.com',
    linkedin: 'https://linkedin.com',
  },
  {
    name: 'Lakshya Yadav',
    role: 'Coordinator Technical Team',
    photo: makeAvatar('LY', '#062b24', '#2dd4bf'),
    accentColor: '#2dd4bf',
    instagram: 'https://instagram.com',
    linkedin: 'https://linkedin.com',
  },
]

/* ─────────────────────────────────────────────────────────────────────── */
/*  ARCADE PILL (page section badge — same vocabulary as Page 1)          */
/* ─────────────────────────────────────────────────────────────────────── */
function ArcadePill({ children }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '5px 16px', borderRadius: 999,
      background: 'rgba(245,195,68,0.12)',
      border: '2px solid rgba(245,195,68,0.45)',
      boxShadow: '0 3px 0 rgba(179,130,23,0.5), 0 6px 18px rgba(245,195,68,0.12)',
      marginBottom: 10,
    }}>
      <span className="font-pixel text-arcadeYellow tracking-widest uppercase" style={{ fontSize: 10 }}>
        {children}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  SECTION HEADER                                                          */
/* ─────────────────────────────────────────────────────────────────────── */
function SectionHeader({ title }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="text-center mb-10"
    >
      <ArcadePill>// {title}</ArcadePill>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  WARM RULE                                                               */
/* ─────────────────────────────────────────────────────────────────────── */
function WarmRule() {
  return (
    <div className="flex items-center gap-4 my-14 max-w-2xl mx-auto px-6">
      <div className="flex-1 h-px"
        style={{ background: 'linear-gradient(90deg,transparent,rgba(245,195,68,0.35))' }} />
      <span className="font-pixel text-arcadeYellow/40 tracking-widest text-[9px] uppercase">
        ★ ★ ★
      </span>
      <div className="flex-1 h-px"
        style={{ background: 'linear-gradient(90deg,rgba(245,195,68,0.35),transparent)' }} />
    </div>
  )
}

/* ── Social icons (Instagram / LinkedIn) ── */
function InstagramIcon({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.2" cy="6.8" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

function LinkedInIcon({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4v15h-4V8zm7.5 0h3.8v2.05h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V23h-4v-7.9c0-1.88-.03-4.3-2.62-4.3-2.63 0-3.03 2.05-3.03 4.17V23H8V8z" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  ARCADE PLAYER CARD                                                      */

function BadgeCard({ member, delay = 0, large = false, fullWidth = false, social = false }) {
  const [imgError, setImgError] = useState(false)
  const ac  = member.accentColor || '#f5c344'
  const cardW = large ? 'w-64 sm:w-72' : fullWidth ? 'w-full' : 'w-56 sm:w-60'
  const initials = member.name.split(' ').map(n => n[0]).join('').slice(0, 2)
  const photoSrc = imgError ? makeAvatar(initials, '#10121a', ac) : member.photo

  // Format name: on 6-col cards, split into lines (First \n Last) matching Image 1
  const displayName = large ? member.name : member.name.split(' ').join('\n')

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`${cardW} h-full flex flex-col`}
    >
      {/* Arcade push-button body — lifts on hover, hard offset shadow */}
      <div
        className="group w-full h-full flex flex-col justify-between transition-all duration-150 ease-out hover:-translate-y-1.5 active:translate-y-0"
        style={{
          position: 'relative',
          background: 'linear-gradient(180deg, #10121a 0%, #0a0b12 100%)',
          border: `2px solid ${ac}55`,
          boxShadow: '0 5px 0 #04060c, 0 10px 20px rgba(0,0,0,0.55)',
          transitionProperty: 'transform, border-color, box-shadow',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = ac
          e.currentTarget.style.boxShadow = `0 8px 0 #04060c, 0 14px 26px rgba(0,0,0,0.6), 0 0 16px ${ac}30`
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = `${ac}55`
          e.currentTarget.style.boxShadow = '0 5px 0 #04060c, 0 10px 20px rgba(0,0,0,0.55)'
        }}
      >
        <div>
          {/* Top hazard strip — pixel steps in accent colour */}
          <div style={{
            height: 4,
            background: `repeating-linear-gradient(90deg, ${ac} 0 8px, transparent 8px 16px)`,
            opacity: 0.85,
          }} />

          {/* Photo bay — HUD corner brackets + CRT scanlines */}
          <div style={{
            position: 'relative', aspectRatio: '1/1', overflow: 'hidden',
            margin: 5,
            border: '1px solid rgba(255,184,0,0.14)',
            background: '#0a0804',
          }}>

            {/* HUD corner brackets (brighten with card hover) */}
            <span className="transition-opacity duration-150 opacity-60 group-hover:opacity-100"
              style={{ position:'absolute', top:4, left:4, width:8, height:8,
                borderTop:`2px solid ${ac}`, borderLeft:`2px solid ${ac}`, pointerEvents:'none' }} />
            <span className="transition-opacity duration-150 opacity-60 group-hover:opacity-100"
              style={{ position:'absolute', top:4, right:4, width:8, height:8,
                borderTop:`2px solid ${ac}`, borderRight:`2px solid ${ac}`, pointerEvents:'none' }} />
            <span className="transition-opacity duration-150 opacity-60 group-hover:opacity-100"
              style={{ position:'absolute', bottom:4, left:4, width:8, height:8,
                borderBottom:`2px solid ${ac}`, borderLeft:`2px solid ${ac}`, pointerEvents:'none' }} />
            <span className="transition-opacity duration-150 opacity-60 group-hover:opacity-100"
              style={{ position:'absolute', bottom:4, right:4, width:8, height:8,
                borderBottom:`2px solid ${ac}`, borderRight:`2px solid ${ac}`, pointerEvents:'none' }} />

            <img
              src={photoSrc}
              alt={member.name}
              onError={() => setImgError(true)}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                objectPosition: member.objectPosition || 'center top', display: 'block',
                transform: `scale(${member.imgScale ?? 1})`, transformOrigin: 'center top',
                filter: 'grayscale(0.25) contrast(1.05)',
                transition: 'filter 0.25s ease',
              }}
              loading="lazy"
              onMouseEnter={e => { e.currentTarget.style.filter = 'grayscale(0) contrast(1.02)' }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'grayscale(0.25) contrast(1.05)' }}
            />

            {/* CRT scanlines over the photo */}
            <div className="scanlines-overlay" style={{ position: 'absolute', inset: 0, opacity: 0.5 }} />
          </div>
        </div>

        {/* ID plate — name + role + social buttons */}
        <div className="flex-1 flex flex-col justify-between" style={{ padding: large ? '14px 16px 16px' : '9px 8px 10px', textAlign: 'center' }}>
          <div>
            <div className="min-h-[2.3rem] flex items-center justify-center">
              <h3 className="font-pixel font-black uppercase pixel-shadow-white text-center whitespace-pre-line"
                style={{
                  fontSize: large ? '0.95rem' : '0.72rem',
                  color: '#f8fafc',
                  lineHeight: 1.25,
                  letterSpacing: '0.04em',
                }}>
                {displayName}
              </h3>
            </div>

            {/* Role pill — mini arcade badge */}
            <div className="min-h-[2.2rem] flex items-center justify-center mt-1.5">
              <span
                className="inline-block font-pixel uppercase tracking-wider transition-transform duration-100 group-hover:-translate-y-px text-center"
                style={{
                  fontSize: large ? 9 : 7,
                  color: ac,
                  background: `${ac}14`,
                  border: `1.5px solid ${ac}66`,
                  boxShadow: `0 2px 0 #04060c`,
                  padding: '2.5px 6px',
                  lineHeight: 1.25,
                }}>
                {member.role}
              </span>
            </div>
          </div>

          <div className="mt-auto pt-2.5">
            {/* Ticket-stub divider */}
            <div style={{
              margin: '0 auto 8px', width: '70%', height: 0,
              borderTop: `1px dashed ${ac}35`,
            }} />

            {/* Social buttons — ribbed arcade press keys */}
            {social && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <a
                  href={member.instagram || 'https://www.instagram.com'}
                  target="_blank"
                  rel="noreferrer"
                  title="Instagram"
                  className="btn-ribbed flex items-center justify-center gap-1 transition-all duration-100 active:translate-y-0.5"
                  style={{
                    padding: '5px 2px',
                    fontFamily: '"Silkscreen", monospace',
                    fontSize: 7,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    color: ac,
                    background: '#131722',
                    border: `1.5px solid ${ac}44`,
                    boxShadow: '0 2.5px 0 #04060c',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = ac; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = `${ac}44`; e.currentTarget.style.color = ac }}
                >
                  <InstagramIcon size={8} /> Insta
                </a>
                <a
                  href={member.linkedin || 'https://www.linkedin.com'}
                  target="_blank"
                  rel="noreferrer"
                  title="LinkedIn"
                  className="btn-ribbed flex items-center justify-center gap-1 transition-all duration-100 active:translate-y-0.5"
                  style={{
                    padding: '5px 2px',
                    fontFamily: '"Silkscreen", monospace',
                    fontSize: 7,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    color: ac,
                    background: '#131722',
                    border: `1.5px solid ${ac}44`,
                    boxShadow: '0 2.5px 0 #04060c',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = ac; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = `${ac}44`; e.currentTarget.style.color = ac }}
                >
                  <LinkedInIcon size={8} /> Link
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  PAGE                                                                    */
/* ─────────────────────────────────────────────────────────────────────── */
export default function TeamPage() {
  return (
    <div className="relative min-h-screen w-full py-24 px-4 sm:px-6">

      <div className="relative z-10 max-w-[1400px] mx-auto">

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: -22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <h1
            className="voxel-3d-text voxel-white-block font-pixel font-black uppercase text-center"
            style={{ fontSize: 'clamp(2.8rem,7vw,5rem)', marginTop: 4 }}
          >
            The Team
          </h1>
          <p style={{ color: 'rgba(203,193,170,0.55)', fontSize: 14, maxWidth: 420,
            margin: '14px auto 0', lineHeight: 1.6 }}>
            The crew that architects, powers, and launches Codefiesta every year.
          </p>
        </motion.div>

        {/* ══ CONVENERS ══ */}
        <SectionHeader title="Conveners" />
        <div className="flex flex-wrap justify-center gap-10 mb-12">
          {CONVENERS.map((m, i) => (
            <BadgeCard key={m.name} member={m} delay={0.08 + i * 0.12} large />
          ))}
        </div>

        <WarmRule />

        {/* ══ COORDINATORS — 6 per row on desktop matching Image 1 ══ */}
        <SectionHeader title="Coordinators" />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5 md:gap-4 max-w-[1400px] mx-auto items-stretch">
          {COORDINATORS.map((m, i) => (
            <BadgeCard key={m.name} member={m} delay={0.04 + i * 0.04} fullWidth social />
          ))}
        </div>

      </div>
    </div>
  )
}
