/**
 * PrizePoolPage.jsx  (v9 — simplified)
 *
 * Removed the internal 4×100vh sticky scroll-track. The page now renders
 * as a single 100vh viewport: Grand Cash Pool spans the full top row and
 * the remaining two cards sit side-by-side below it (all stacked on
 * mobile), so there's no empty black gap after it — TeamPage follows
 * immediately.
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GalaxyBackground from './GalaxyBackground.jsx'
import DeferredRender from './DeferredRender.jsx'

const TOTAL_CARDS = 3

/* ─────────────────────────────────────────────────────────────────────── */
/*  UTILITIES                                                               */
/* ─────────────────────────────────────────────────────────────────────── */

function useCounter(target, duration = 1800, active = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) return
    let start = null
    const step = ts => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setValue(Math.floor((1 - (1 - p) ** 2) * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [active, target, duration])
  return `₹${value.toLocaleString('en-IN')}`
}

const CHAMFER_LG = 'polygon(14px 0%,calc(100% - 14px) 0%,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0% calc(100% - 14px),0% 14px)'
const CHAMFER_SM = 'polygon(7px 0%,calc(100% - 7px) 0%,100% 7px,100% calc(100% - 7px),calc(100% - 7px) 100%,7px 100%,0% calc(100% - 7px),0% 7px)'

/*  Responsive type scale — floors match the original mobile sizes exactly,
    then scale up with viewport width so laptop/desktop text stays readable. */
const FS_META  = 'clamp(8px,1.1vw,12px)'        // tiny mono labels / badges
const FS_SMALL = 'clamp(9px,1.15vw,13px)'       // sub-labels
const FS_BODY  = 'clamp(10px,1.2vw,14px)'       // buttons / list items
const FS_TEXT  = 'clamp(11px,1.25vw,15px)'      // paragraph copy
const FS_TITLE = 'clamp(1rem,1.5vw,1.375rem)'   // card headings

/* ── HUD corner L-brackets ── */
function HudCorners({ color }) {
  return (
    <>
      {[{top:6,left:6},{top:6,right:6},{bottom:6,left:6},{bottom:6,right:6}].map((pos,i) => (
        <div key={i} style={{ position:'absolute',width:12,height:12,pointerEvents:'none',zIndex:8,...pos }}>
          <div style={{ position:'absolute',top:0,left:0,width:'100%',height:1.5,background:color,boxShadow:`0 0 4px ${color}` }} />
          <div style={{ position:'absolute',top:0,left:0,width:1.5,height:'100%',background:color,boxShadow:`0 0 4px ${color}` }} />
        </div>
      ))}
    </>
  )
}

function DotGrid({ color = 'rgba(148,163,184,0.05)' }) {
  return <div style={{ position:'absolute',inset:0,pointerEvents:'none',zIndex:1,
    backgroundImage:`radial-gradient(circle,${color} 1px,transparent 1px)`,backgroundSize:'12px 12px' }} />
}

function Scanlines() {
  return <div style={{ position:'absolute',inset:0,pointerEvents:'none',zIndex:9,opacity:0.12,
    background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.5) 2px,rgba(0,0,0,0.5) 4px)' }} />
}

function StatusDot({ color, label }) {
  return (
    <span style={{ display:'inline-flex',alignItems:'center',gap:5 }}>
      <motion.span animate={{ opacity:[1,0.2,1] }} transition={{ duration:1.4,repeat:Infinity }}
        style={{ display:'inline-block',width:5,height:5,borderRadius:'50%',background:color,boxShadow:`0 0 6px ${color}` }} />
      <span style={{ fontFamily:'"Silkscreen",monospace',fontSize:8,letterSpacing:'0.12em',color:`${color}80`,textTransform:'uppercase' }}>
        {label}
      </span>
    </span>
  )
}

function SparkBurst({ color, active }) {
  return (
    <AnimatePresence>
      {active && [0,1,2,3,4,5].map(i => {
        const rad = (i/6)*Math.PI*2
        const dist = 28+Math.random()*16
        return (
          <motion.span key={i}
            initial={{ opacity:1,x:0,y:0,scale:1 }}
            animate={{ opacity:0,x:Math.cos(rad)*dist,y:Math.sin(rad)*dist,scale:0.3 }}
            exit={{ opacity:0 }}
            transition={{ duration:0.5,ease:'easeOut' }}
            style={{ position:'absolute',top:'50%',left:'50%',width:4,height:4,
              background:color,boxShadow:`0 0 5px ${color}`,pointerEvents:'none',zIndex:20 }} />
        )
      })}
    </AnimatePresence>
  )
}

function RippleEffect({ ripples, color }) {
  return (
    <>
      {ripples.map(r => (
        <motion.span key={r.id}
          initial={{ opacity:0.6,scale:0,x:r.x-40,y:r.y-40 }}
          animate={{ opacity:0,scale:1 }}
          transition={{ duration:0.6,ease:'easeOut' }}
          style={{ position:'absolute',width:80,height:80,
            border:`1.5px solid ${color}`,boxShadow:`0 0 8px ${color}88`,pointerEvents:'none',zIndex:15 }} />
      ))}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  CARD SHELL                                                              */
/* ─────────────────────────────────────────────────────────────────────── */
function CardShell({ children, color, glowColor, moduleId }) {
  const cardRef = useRef(null)
  const shineRef = useRef(null)
  const frameRef = useRef(null)
  const [sparking, setSparking] = useState(false)
  const [ripples,  setRipples]  = useState([])
  const [hovered,  setHovered]  = useState(false)

  const onMouseMove = useCallback(e => {
    const c = cardRef.current; if (!c) return
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      const { left,top,width,height } = c.getBoundingClientRect()
      const x = (e.clientX-left)/width, y = (e.clientY-top)/height
      c.style.transform = `perspective(900px) rotateX(${((y-.5)*-12).toFixed(2)}deg) rotateY(${((x-.5)*12).toFixed(2)}deg) translateY(-4px)`
      if (shineRef.current) {
        shineRef.current.style.background = `radial-gradient(circle at ${(x*100).toFixed(1)}% ${(y*100).toFixed(1)}%,rgba(255,255,255,0.07) 0%,transparent 55%)`
        shineRef.current.style.opacity = '1'
      }
    })
  }, [])

  const onMouseLeave = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    const c = cardRef.current; if (!c) return
    c.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)'
    c.style.transform = ''
    setTimeout(() => { if (c) c.style.transition = '' }, 510)
    if (shineRef.current) shineRef.current.style.opacity = '0'
    setHovered(false)
  }, [])

  const onMouseEnter = useCallback(() => {
    setSparking(true); setHovered(true)
    setTimeout(() => setSparking(false), 550)
  }, [])

  const onClick = useCallback(e => {
    const c = cardRef.current; if (!c) return
    const { left,top } = c.getBoundingClientRect()
    const id = Date.now()+Math.random()
    setRipples(p => [...p,{id,x:e.clientX-left,y:e.clientY-top}])
    setTimeout(() => setRipples(p => p.filter(r => r.id!==id)), 650)
  }, [])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  return (
    <div ref={cardRef}
      onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
      onMouseEnter={onMouseEnter} onClick={onClick}
      style={{ position:'relative',overflow:'hidden',height:'100%',
        clipPath:CHAMFER_LG,
        background:'rgba(2,8,23,0.42)',
        backdropFilter:'blur(12px)',
        border:`1px solid ${hovered ? color+'55' : color+'22'}`,
        boxShadow:hovered
          ? `0 0 0 1px ${color}28,0 0 28px ${glowColor},0 12px 40px rgba(0,0,0,0.65)`
          : `0 0 0 1px ${color}10,0 8px 32px rgba(0,0,0,0.55)`,
        transition:'box-shadow 0.3s ease,border-color 0.3s ease',cursor:'default' }}>
      <DotGrid color={`${color}08`} />
      <Scanlines />
      <HudCorners color={hovered ? color : `${color}50`} />
      <span ref={shineRef} style={{ position:'absolute',inset:0,opacity:0,pointerEvents:'none',transition:'opacity 0.2s ease',zIndex:10 }} />
      <RippleEffect ripples={ripples} color={color} />
      <SparkBurst color={color} active={sparking} />
      {moduleId && (
        <div style={{ position:'absolute',top:9,right:14,zIndex:12,
          fontFamily:'"Silkscreen",monospace',fontSize:8,color:`${color}60`,
          letterSpacing:'0.14em',textTransform:'uppercase' }}>// {moduleId}</div>
      )}
      <div style={{ position:'relative',zIndex:5,height:'100%' }}>{children}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  CARD CONTENTS                                                           */
/* ─────────────────────────────────────────────────────────────────────── */

function CardGrandCash({ counterActive }) {
  const counter = useCounter(150000, 1800, counterActive)
  return (
    <CardShell color="#fbbf24" glowColor="rgba(234,179,8,0.28)" moduleId="PRIZE_RESERVE_ALPHA">
      <div style={{ padding:'28px 24px' }}>
        <div style={{ display:'flex',flexDirection:'column',gap:2,marginBottom:14 }}>
          {['SYS.LOCATION: SECTOR_01','REWARD_TIER: ALPHA'].map(m => (
            <span key={m} style={{ fontFamily:'"Silkscreen",monospace',fontSize:FS_META,
              color:'rgba(251,191,36,0.40)',letterSpacing:'0.13em',textTransform:'uppercase' }}>{m}</span>
          ))}
        </div>
        <h3 className="font-pixel text-white uppercase tracking-wide" style={{ fontSize:FS_TITLE,marginBottom:5 }}>Grand Cash Pool</h3>
        <p style={{ fontSize:FS_TEXT,color:'rgba(148,163,184,0.80)',lineHeight:1.6,marginBottom:20 }}>
          Top teams compete for the primary cash pool — the largest payout in Codefiesta history.
        </p>
        <div style={{ position:'relative',overflow:'hidden',clipPath:CHAMFER_SM,
          background:'linear-gradient(135deg,rgba(234,179,8,0.10),rgba(0,0,0,0.40))',
          border:'1px solid rgba(251,191,36,0.28)',padding:'20px 18px',marginBottom:18 }}>
          {['top-0','bottom-0'].map(p => (
            <div key={p} className={`absolute ${p} left-0 right-0`}
              style={{ height:1,background:'linear-gradient(90deg,transparent,rgba(251,191,36,0.55),transparent)' }} />
          ))}
          <motion.div animate={{ opacity:[0.5,1,0.5] }} transition={{ duration:1.8,repeat:Infinity }}
            style={{ position:'absolute',left:0,top:'50%',transform:'translateY(-50%)',width:2,height:'55%',
              background:'rgba(251,191,36,0.75)',boxShadow:'0 0 8px rgba(251,191,36,0.8)' }} />
          <motion.div animate={{ opacity:[0.5,1,0.5] }} transition={{ duration:1.8,repeat:Infinity,delay:0.9 }}
            style={{ position:'absolute',right:0,top:'50%',transform:'translateY(-50%)',width:2,height:'55%',
              background:'rgba(251,191,36,0.75)',boxShadow:'0 0 8px rgba(251,191,36,0.8)' }} />
          <div className="font-pixel font-black text-yellow-400 text-center"
            style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)',lineHeight:1,
              textShadow:'0 0 8px rgba(234,179,8,0.40),0 0 18px rgba(234,179,8,0.18)' }}>
            {counterActive ? counter : '₹0'}
          </div>
          <div style={{ fontFamily:'"Silkscreen",monospace',fontSize:FS_SMALL,textAlign:'center',
            color:'rgba(251,191,36,0.45)',letterSpacing:'0.18em',marginTop:6 }}>WINNER'S PURSE</div>
        </div>
      </div>
    </CardShell>
  )
}

function CardInternship() {
  const logs = [
    { cmd:'CAREER_GROWTH',      color:'#22d3ee' },
    { cmd:'PARTNER_COMPANIES',  color:'#67e8f9' },
    { cmd:'REAL_PROJECTS',      color:'#22d3ee' },
  ]
  return (
    <CardShell color="#22d3ee" glowColor="rgba(34,211,238,0.22)" moduleId="CAREER_DOCK">
      <div style={{ padding:'28px 24px' }}>
        <h3 className="font-pixel text-white uppercase tracking-wide" style={{ fontSize:FS_TITLE,marginBottom:4 }}>Internship Ops</h3>
        <p style={{ fontSize:FS_TEXT,color:'rgba(148,163,184,0.78)',marginBottom:18,lineHeight:1.55 }}>
          Career transmissions awaiting your signal. Top performers get fast-tracked to industry partners.
        </p>
        {/* Plain terminal-style lines — no boxes */}
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {logs.map(log => (
            <div key={log.cmd} style={{ display:'flex',alignItems:'center',gap:8 }}>
              <span style={{ fontFamily:'"Silkscreen",monospace',fontSize:FS_BODY,color:'rgba(34,211,238,0.45)' }}>{'>'}</span>
              <span style={{ fontFamily:'"Silkscreen",monospace',fontSize:FS_BODY,color:log.color,
                letterSpacing:'0.12em',textTransform:'uppercase',textShadow:`0 0 6px ${log.color}55` }}>{log.cmd}</span>
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  )
}

function CardSwag() {
  const cargo = [
    { slot:'SLOT_A',item:'T-SHIRT',color:'#34d399' },
    { slot:'SLOT_B',item:'STICKERS',color:'#6ee7b7' },
    { slot:'SLOT_C',item:'EXCL. MERCH',color:'#34d399' },
  ]
  return (
    <CardShell color="#34d399" glowColor="rgba(52,211,153,0.22)" moduleId="CARGO_BAY">
      <div style={{ padding:'28px 24px' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5 }}>
          <h3 className="font-pixel text-white uppercase tracking-wide" style={{ fontSize:FS_TITLE }}>Swag & Goodies</h3>
          <div style={{ fontFamily:'"Silkscreen",monospace',fontSize:FS_META,color:'rgba(52,211,153,0.55)',
            padding:'2px 8px',border:'1px solid rgba(52,211,153,0.20)',background:'rgba(52,211,153,0.07)',
            clipPath:'polygon(5px 0%,100% 0%,100% 100%,0% 100%,0% 5px)',letterSpacing:'0.12em' }}>
            SUPPLY: EVERYONE
          </div>
        </div>
        <p style={{ fontSize:FS_TEXT,color:'rgba(148,163,184,0.78)',marginBottom:20 }}>
          Exclusive payload for all operatives.
        </p>
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:20 }}>
          {cargo.map((item,i) => (
            <motion.div key={item.slot}
              animate={{ y:[0,-2,0] }} transition={{ duration:2.5+i*0.4,repeat:Infinity,ease:'easeInOut',delay:i*0.3 }}
              style={{ background:'rgba(52,211,153,0.06)',
                border:`1px solid rgba(52,211,153,${0.20-i*0.04})`,
                clipPath:'polygon(5px 0%,100% 0%,100% calc(100% - 5px),calc(100% - 5px) 100%,0% 100%,0% 5px)',
                padding:'6px 12px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <span style={{ fontFamily:'"Silkscreen",monospace',fontSize:FS_META,color:'rgba(52,211,153,0.38)',letterSpacing:'0.1em' }}>{item.slot}</span>
                <div style={{ width:1,height:10,background:'rgba(52,211,153,0.20)' }} />
                <span style={{ fontFamily:'"Silkscreen",monospace',fontSize:FS_BODY,color:item.color,
                  letterSpacing:'0.12em',textShadow:`0 0 6px ${item.color}55` }}>{item.item}</span>
              </div>
              <span style={{ fontFamily:'"Silkscreen",monospace',fontSize:FS_META,color:'rgba(52,211,153,0.35)',letterSpacing:'0.1em' }}>QTY:∞</span>
            </motion.div>
          ))}
        </div>
      </div>
    </CardShell>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  (Scroll-driven scattered layout removed — cards now sit in a 2×2 grid)  */
/* ─────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────── */
/*  PAGE                                                                    */
/* ─────────────────────────────────────────────────────────────────────── */
export default function PrizePoolPage() {
  const outerRef   = useRef(null)
  const [inView, setInView] = useState(false)
  const heroCounter = useCounter(700000, 2000, inView)

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.8 && rect.bottom > 0 && !inView) {
        setInView(true)
      }
    }
    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => window.removeEventListener('scroll', update)
  }, [inView])

  const CARDS = [
    <CardGrandCash    key="cash"   counterActive={inView} />,
    <CardInternship   key="intern" />,
    <CardSwag         key="swag"  />,
  ]

  return (
    <div ref={outerRef} className="relative w-full min-h-screen overflow-hidden">
      {/* Galaxy WebGL layer mounts only when this section nears the viewport —
          saves the 8k-particle build + WebGL context at page load. */}
      <DeferredRender className="absolute inset-0 pointer-events-none">
        <GalaxyBackground />
      </DeferredRender>

      <div className="relative z-10 w-full min-h-screen flex flex-col px-6 md:px-10 py-8">

        {/* ── Centred header ── */}
        <div className="flex flex-col items-center pt-2">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src="/mario-coins.gif"
              alt=""
              draggable={false}
              style={{ width: 48, height: 48, imageRendering: 'pixelated' }}
            />
            <h1 className="voxel-3d-text voxel-white-block font-pixel font-black uppercase text-center"
              style={{ fontSize:'clamp(2rem,5vw,4rem)', lineHeight:1,
                textShadow:'0 0 40px rgba(251,191,36,0.35)' }}>
              Prize Pool
            </h1>
          </div>

          {/* ── Total prize readout ── */}
          <div style={{ marginTop:18 }}>
            <div style={{
              position:'relative',
              clipPath:'polygon(14px 0%,calc(100% - 14px) 0%,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0% calc(100% - 14px),0% 14px)',
              background:'rgba(0,0,0,0.50)',
              backdropFilter:'blur(16px)',
              border:'1px solid rgba(234,179,8,0.40)',
              padding:'16px 40px',
              boxShadow:'0 0 80px rgba(234,179,8,0.30), 0 0 160px rgba(234,179,8,0.14)',
              textAlign:'center',
            }}>
              {[{top:0,left:0},{top:0,right:0},{bottom:0,left:0},{bottom:0,right:0}].map((pos,i) => (
                <motion.div key={i} animate={{ opacity:[0.4,1,0.4] }}
                  transition={{ duration:1.8,repeat:Infinity,delay:i*0.45 }}
                  style={{ position:'absolute',width:6,height:6,
                    background:'rgba(251,191,36,0.80)',boxShadow:'0 0 6px rgba(251,191,36,0.9)',...pos }} />
              ))}
              <div style={{ fontFamily:'"Silkscreen",monospace',fontSize:FS_META,
                color:'rgba(251,191,36,0.40)',letterSpacing:'0.18em',marginBottom:4 }}>
                TOTAL_PRIZE_WORTH
              </div>
              <div className="font-pixel font-black text-yellow-400 prize-hero-amount"
                style={{ fontSize:'clamp(2.4rem,6.5vw,4.5rem)',lineHeight:1,
                  textShadow:'0 0 24px rgba(251,191,36,0.60),0 0 80px rgba(234,179,8,0.35)' }}>
                {inView ? heroCounter : '₹0'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Card grid: Grand Cash spans full width, two cards below ── */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-8 max-w-6xl mx-auto w-full items-stretch">
          {CARDS.map((card, idx) => (
            <div key={idx} className={idx === 0 ? 'md:col-span-2 min-h-[240px]' : 'min-h-[280px]'}>{card}</div>
          ))}
        </div>

        {/* ── HUD corner metadata ── */}
        <div className="flex justify-between pt-4 mt-2"
          style={{ borderTop:'1px solid rgba(56,189,248,0.06)' }}>
          {[['FPS','60.0'],['PROTOCOL','5.0'],['ARENA_LOADED','100%']].map(([k,v]) => (
            <span key={k} style={{ fontFamily:'"Silkscreen",monospace',fontSize:8,
              letterSpacing:'0.12em',color:'rgba(56,189,248,0.20)',textTransform:'uppercase' }}>
              {k}: <span style={{ color:'rgba(56,189,248,0.38)' }}>{v}</span>
            </span>
          ))}
        </div>

      </div>
    </div>
  )
}
