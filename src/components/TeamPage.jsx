import { useRef, useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'

const FS_TITLE_LG = '1.1rem'
const FS_TITLE_SM = '1rem'
const ICON_SIZE = 15

const CONVENERS = [
  {
    name: 'Dr. Pradeep Jha',
    role: 'Lead Visionary',
    photo: 'https://ik.imagekit.io/rcfcr7y0e/Screenshot%202025-09-04%20121036.png?updatedAt=1756976567715',
    accentColor: '#f5c344',
    tilt: -2,
  },
  {
    name: 'Pankaj Jain',
    role: 'Strategic Mind',
    photo: 'https://ik.imagekit.io/rcfcr7y0e/Screenshot%202025-09-04%20121209.png?updatedAt=1756976607127',
    accentColor: '#fb923c',
    tilt: 2,
    imgScale: 1.4,
  },
]

const ORGANIZER = [
  {
    name: 'Durgesh Singh',
    photo: 'https://ik.imagekit.io/codekigit/Durgest%20(%20organsiser%20&%20Platform%20Handler.jpg?updatedAt=1789038237721',
    accentColor: '#fbbf24',
    tilt: -1.5,
    instagram: 'https://www.instagram.com/becomingdurgesh?stkn=MWlvaml6MHk3cm92MQ==',
    linkedin: 'https://www.linkedin.com/in/durgesh-kumar-singh-0a23542a3/',
  },
]

const TECHNICAL_TEAM = [
  {
    name: 'Sahil Vaishanv',
    photo: 'https://ik.imagekit.io/rcfcr7y0e/1750825936202.jpeg?updatedAt=1756941821776',
    accentColor: '#fbbf24',
    tilt: 2,
    instagram: 'https://www.instagram.com/sahil_vaishnav99?stkn=MTJpODRiOWtyYXN4Yg==',
    linkedin: 'https://www.linkedin.com/in/sahil-vaishnav-77b759371/',
  },
  {
    name: 'Rishi Goswami',
    photo: 'https://ik.imagekit.io/rcfcr7y0e/WhatsApp%20Image%202025-09-03%20at%2016.21.57_74e28e25.jpg?updatedAt=1757792763548',
    accentColor: '#f59e0b',
    tilt: -1,
    instagram: 'https://www.instagram.com/ronitgoswami_7/',
    linkedin: 'https://www.linkedin.com/in/rishi-puri-21919b32b/',
  },
  {
    name: 'Abhay Shekhawat',
    photo: 'https://ik.imagekit.io/codekigit/abhay.jpeg',
    accentColor: '#f5c344',
    tilt: 1,
    instagram: 'https://www.instagram.com/a6hay_sin9h?stkn=dmV5am9qcG11b3Rr',
    linkedin: 'https://www.linkedin.com/in/abhay-singh-shekhawat-354218254/',
  },
  {
    name: 'Lakshay Yadav',
    photo: '/team-photos/lakshay-yadav.jpg',
    accentColor: '#fb923c',
    tilt: -1.5,
    linkedin: 'https://www.linkedin.com/in/shayisone/',
  },
]

const CORE_TEAM = [
  {
    name: 'Lakshit Vashishtha',
    role: 'Lead Registration Team',
    photo: '/team-photos/lakshit-vashishtha.jpg',
    accentColor: '#f5c344',
    tilt: -1.5,
  },
  {
    name: 'Prabhat Kumar',
    role: 'Lead Sponsor Team',
    photo: '/team-photos/prabhat-kumar.jpg',
    accentColor: '#fb923c',
    tilt: 1.5,
  },
  {
    name: 'Sahil Yadav',
    role: 'Lead Guest Management Team',
    photo: '/team-photos/sahil-yadav.jpg',
    accentColor: '#fbbf24',
    tilt: -1,
  },
  {
    name: 'Aman Bagda',
    role: 'Co-Lead Management Team',
    photo: '/team-photos/aman-bagda.jpg',
    accentColor: '#facc15',
    tilt: 1.5,
  },
  {
    name: 'Mudit Paliwal',
    role: 'Co-Lead PR Team',
    photo: '/team-photos/mudit-paliwal.jpg',
    accentColor: '#fbbf24',
    tilt: -1.5,
  },
  {
    name: 'Aman Goyal',
    role: 'Lead Designing Team',
    photo: '/team-photos/aman-goyal.png',
    accentColor: '#f5c344',
    tilt: 1.5,
  },
]

function SectionBadge({ children }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 16px',
        borderRadius: 999,
        background: 'rgba(245,195,68,0.12)',
        border: '2px solid rgba(245,195,68,0.45)',
        boxShadow: '0 3px 0 rgba(179,130,23,0.5), 0 6px 18px rgba(245,195,68,0.12)',
        marginBottom: 10,
      }}
    >
      <span className="font-pixel text-arcadeYellow tracking-widest uppercase" style={{ fontSize: 10 }}>
        {children}
      </span>
    </div>
  )
}

function SectionTitle({ title }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="text-center mb-10"
    >
      <SectionBadge>// {title}</SectionBadge>
    </motion.div>
  )
}

function StarDivider() {
  return (
    <div className="flex items-center gap-4 my-14 max-w-2xl mx-auto px-6">
      <div
        className="flex-1 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(245,195,68,0.35))' }}
      />
      <span className="font-pixel text-arcadeYellow/40 tracking-widest text-[9px] uppercase">★ ★ ★</span>
      <div
        className="flex-1 h-px"
        style={{ background: 'linear-gradient(90deg, rgba(245,195,68,0.35), transparent)' }}
      />
    </div>
  )
}

function InstagramIcon({ size = ICON_SIZE }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function LinkedInIcon({ size = ICON_SIZE }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4v15h-4V8zm7.5 0h3.8v2.05h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V23h-4v-7.9c0-1.88-.03-4.3-2.62-4.3-2.63 0-3.03 2.05-3.03 4.17V23H8V8z" />
    </svg>
  )
}

function SocialButton({ href, label, accent = '#fbbf24', children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 999,
        color: accent || '#fbbf24',
        background: 'rgba(5, 10, 20, 0.75)',
        border: `1.5px solid ${accent ? `${accent}77` : 'rgba(251, 191, 36, 0.45)'}`,
        textDecoration: 'none',
        transition: 'border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accent || '#fbbf24'
        e.currentTarget.style.color = '#ffffff'
        e.currentTarget.style.boxShadow = `0 0 10px ${accent ? `${accent}88` : 'rgba(251, 191, 36, 0.5)'}`
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${accent ? `${accent}77` : 'rgba(251, 191, 36, 0.45)'}`
        e.currentTarget.style.color = accent || '#fbbf24'
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {children}
    </a>
  )
}

function MemberCard({ member, delay = 0, large = false, showRole = false }) {
  const cardRef = useRef(null)
  const rafRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const accent = member.accentColor

  const handleMouseMove = useCallback(
    (e) => {
      const card = cardRef.current
      if (!card) return
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const { left, top, width, height } = card.getBoundingClientRect()
        const xNorm = (e.clientX - left) / width - 0.5
        const yNorm = (e.clientY - top) / height - 0.5
        card.style.transform = `perspective(900px) rotateX(${(-yNorm * 8).toFixed(2)}deg) rotateY(${(xNorm * 8).toFixed(2)}deg) rotate(${member.tilt}deg)`
      })
    },
    [member.tilt]
  )

  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const card = cardRef.current
    if (card) {
      card.style.transition = 'transform 0.45s cubic-bezier(0.23,1,0.32,1)'
      card.style.transform = `rotate(${member.tilt}deg)`
      setTimeout(() => {
        if (card) card.style.transition = ''
      }, 460)
      setHovered(false)
    }
  }, [member.tilt])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const cardWidth = large ? 'w-56 sm:w-64' : 'w-48 sm:w-52'
  const paddingY = large ? '18px' : '14px'
  const stalkH = large ? 28 : 20

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`${cardWidth} flex-shrink-0`}
    >
      {/* Top hanger line */}
      <div className="flex justify-center">
        <div
          style={{
            width: 2,
            height: stalkH,
            background: `linear-gradient(to bottom, transparent, ${accent}80)`,
            borderRadius: 1,
          }}
        />
      </div>

      {/* Main card box */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={() => setHovered(true)}
        style={{
          transform: `rotate(${member.tilt}deg)`,
          clipPath:
            'polygon(12px 0%,calc(100% - 12px) 0%,100% 12px,100% calc(100% - 12px),calc(100% - 12px) 100%,12px 100%,0% calc(100% - 12px),0% 12px)',
          background: 'rgba(2,8,23,0.55)',
          backdropFilter: 'blur(12px)',
          border: `1.5px solid ${hovered ? accent : accent + '55'}`,
          boxShadow: hovered
            ? `0 0 0 1px ${accent}40, 0 12px 28px rgba(0,0,0,0.6)`
            : `0 0 0 1px ${accent}18, 0 8px 22px rgba(0,0,0,0.5)`,
          transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
          cursor: 'default',
        }}
      >
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

        {/* Photo container with retro scanlines */}
        <div style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', background: '#0a0804' }}>
          <img
            src={member.photo}
            alt={member.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top',
              display: 'block',
              transform: `scale(${member.imgScale ?? 1})`,
              transformOrigin: 'center top',
            }}
            loading="lazy"
          />
          {/* Subtle retro scanlines over photo */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.06) 2px, rgba(255,255,255,0.06) 4px)'
            }}
          />
        </div>

        {/* Info */}
        <div style={{ padding: `${paddingY} 12px`, textAlign: 'center' }}>
          <h3
            className="font-pixel font-black uppercase tracking-wide"
            style={{
              fontSize: large ? FS_TITLE_LG : FS_TITLE_SM,
              color: '#f8fafc',
              lineHeight: 1.2,
              marginBottom: showRole && member.role ? 6 : 0,
            }}
          >
            {member.name}
          </h3>

          {showRole && member.role && (
            <div className="my-2 flex justify-center">
              <span
                className="font-arcade text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-amber-400/40 bg-amber-400/10 text-amber-300 shadow-sm leading-snug break-words"
              >
                {member.role}
              </span>
            </div>
          )}

          {!large && (member.instagram || member.linkedin) && (
            <div className="flex items-center justify-center gap-2.5 mt-2.5">
              {member.instagram && (
                <SocialButton
                  href={member.instagram}
                  label={`${member.name} on Instagram`}
                  accent={accent}
                >
                  <InstagramIcon size={13} />
                </SocialButton>
              )}
              {member.linkedin && (
                <SocialButton
                  href={member.linkedin}
                  label={`${member.name} on LinkedIn`}
                  accent={accent}
                >
                  <LinkedInIcon size={13} />
                </SocialButton>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function TeamPage() {
  return (
    <div className="relative min-h-screen w-full py-24 px-6">
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-20"
        >
          <h1
            className="voxel-3d-text voxel-white-block font-pixel font-black uppercase text-center"
            style={{ fontSize: 'clamp(2.8rem,7vw,5rem)', marginTop: 4 }}
          >
            The Team
          </h1>
          <p
            style={{
              color: 'rgba(203,193,170,0.55)',
              fontSize: 14,
              maxWidth: 420,
              margin: '14px auto 0',
              lineHeight: 1.6,
            }}
          >
            The crew that architects, powers, and launches Codefiesta every year.
          </p>
        </motion.div>

        {/* 1. Conveners */}
        <SectionTitle title="Conveners" />
        <div className="flex flex-wrap justify-center gap-12">
          {CONVENERS.map((m, idx) => (
            <MemberCard key={m.name} member={m} delay={0.08 + idx * 0.12} large={true} showRole={true} />
          ))}
        </div>

        <StarDivider />

        {/* 2. Organizer */}
        <SectionTitle title="Organizer" />
        <div className="flex flex-wrap justify-center gap-8">
          {ORGANIZER.map((m, idx) => (
            <MemberCard key={m.name} member={m} delay={0.06 + idx * 0.08} showRole={true} />
          ))}
        </div>

        <StarDivider />

        {/* 3. Technical Team */}
        <SectionTitle title="Technical Team" />
        <div className="flex flex-wrap justify-center gap-8">
          {TECHNICAL_TEAM.map((m, idx) => (
            <MemberCard key={m.name} member={m} delay={0.06 + idx * 0.08} />
          ))}
        </div>

        <StarDivider />

        {/* 4. Core Team */}
        <SectionTitle title="Core Team" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 justify-items-center max-w-4xl mx-auto">
          {CORE_TEAM.map((m, idx) => (
            <MemberCard key={m.name} member={m} delay={0.05 + idx * 0.06} showRole={true} />
          ))}
        </div>
      </div>
    </div>
  )
}