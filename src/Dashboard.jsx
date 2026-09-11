import { QRCodeSvg } from './qrGenerator.jsx'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  fetchMe,
  logoutUser,
  fetchMyTeams,
  lockTeam,
  editTeamApi,
  removeMemberApi,
  addMemberApi,
  updateMemberApi,
  ROSTER_EDIT_DEADLINE,
  acceptDirectApi,
  joinTeamByCodeApi,
  updateTeamTrackApi,
  getProjectSubmissionApi,
  saveProjectSubmissionApi,
  createTeamApi,
  submitPaymentApi,
  getHackathonStateApi,
} from './api'
import { getSocket, joinTeamRoom } from './socket'

// Codefiesta 5.0 Hackathon Kickoff (Local IST)
const EVENT_START = new Date('2026-10-09T08:00:00').getTime()
const SUBMISSION_DEADLINE = new Date('2026-10-05T23:59:59').getTime()

const OFFICIAL_TRACKS = [
  {
    id: 'agentic_ai',
    title: 'Agentic AI & Neural Systems',
    icon: '🤖',
    tagline: 'Autonomous multi-agent workflows, code synthesis, & fine-tuned LLMs',
    brief:
      'Design autonomous software agents capable of multi-step reasoning, real-time environment interaction, and tool-augmented problem solving. Focus on developer productivity, cognitive task automation, or adaptive AI copilots.',
    problemStatements: [
      'AI-Based early warning and landslide Risk Monitoring System in NER',
      'AI-Based Smart Logistics and Accessibility Intelligence Platform for North Eastern Region (NER)',
      'AI-Based Cognitive Gaming and Memory Assistance Platform for Elderly Dementia Patients in North Eastern Region (NER)',
    ],
    deliverables: [
      'AI-Based early warning and landslide Risk Monitoring System in NER',
      'AI-Based Smart Logistics and Accessibility Intelligence Platform for North Eastern Region (NER)',
      'AI-Based Cognitive Gaming and Memory Assistance Platform for Elderly Dementia Patients in North Eastern Region (NER)',
    ],
  },
  {
    id: 'web3_defi',
    title: 'Web 3.0 & Decentralized Systems',
    icon: '🌐',
    tagline: 'Cross-chain protocols, smart contracts, ZK-proofs & digital ownership',
    brief:
      'Build trustless decentralized applications leveraging blockchain primitives. Solutions can span cross-chain asset bridging, account abstraction, privacy-preserving zero-knowledge proofs, or decentralized physical infrastructure (DePIN).',
    problemStatements: [
      'Trustless cross-chain decentralized carbon credit verification and trading registry',
      'Account abstraction (ERC-4337) smart wallet for seamless Web3 citizen onboarding',
      'DePIN sensor network protocol for decentralized air quality monitoring & telemetry',
    ],
    deliverables: [
      'Trustless cross-chain decentralized carbon credit verification and trading registry',
      'Account abstraction (ERC-4337) smart wallet for seamless Web3 citizen onboarding',
      'DePIN sensor network protocol for decentralized air quality monitoring & telemetry',
    ],
  },
  {
    id: 'govtech_mobility',
    title: 'GovTech, Smart Mobility & Road Safety',
    icon: '🏛️',
    tagline: 'Civic grievance AI, public safety, traffic intelligence & smart transit',
    brief:
      'Harness real-time computer vision, IoT telemetry, and conversational AI to transform urban governance and civic infrastructure. Tackle road accident hotspot prevention, pothole detection, or automated municipal service delivery.',
    problemStatements: [
      'Solar-Powered Smart Mini Cold Storage System for Fresh Vegetables in North Eastern Region (NER)',
      'AI-Driven automated civic grievance classification, geotagging, and emergency dispatch optimizer',
      'Edge vision system for road safety accident hotspot prediction and highway pothole telemetry',
    ],
    deliverables: [
      'Solar-Powered Smart Mini Cold Storage System for Fresh Vegetables in North Eastern Region (NER)',
      'AI-Driven automated civic grievance classification, geotagging, and emergency dispatch optimizer',
      'Edge vision system for road safety accident hotspot prediction and highway pothole telemetry',
    ],
  },
  {
    id: 'cybersecurity',
    title: 'Cybersecurity & Zero-Trust Intel',
    icon: '🛡️',
    tagline: 'Threat detection, automated vulnerability triage & cryptography',
    brief:
      'Engineer defensive tools for modern attack surfaces. Build proactive threat intelligence pipelines, automated SIEM triage, quantum-safe encryption utilities, or runtime application security protection.',
    problemStatements: [
      'Automated zero-day vulnerability triage and dynamic software fuzzing harness',
      'Proactive DNS threat intelligence & malware command-and-control beacon detector',
      'Quantum-safe encryption communication bridge for critical SCADA infrastructure',
    ],
    deliverables: [
      'Automated zero-day vulnerability triage and dynamic software fuzzing harness',
      'Proactive DNS threat intelligence & malware command-and-control beacon detector',
      'Quantum-safe encryption communication bridge for critical SCADA infrastructure',
    ],
  },
  {
    id: 'fintech_fraud',
    title: 'Fintech & Real-Time Fraud Shield',
    icon: '💳',
    tagline: 'Instant payment rails, anomaly detection on UPI, & credit scoring',
    brief:
      'Revolutionize payments and financial inclusion. Build real-time graph-based anomaly detection on high-frequency transaction streams, automated financial advisory for underbanked populations, or micro-insurance primitives.',
    problemStatements: [
      'Development of an Intelligent Freight Forecasting Model for Optimized Vessel Chartering and Bulk Cargo Procurement from overseas to East Coast of India',
      'Real-time graph-based anomaly detector on high-frequency UPI transaction rails',
      'Decentralized micro-lending credit scoring engine for unbanked regional artisans',
    ],
    deliverables: [
      'Development of an Intelligent Freight Forecasting Model for Optimized Vessel Chartering and Bulk Cargo Procurement from overseas to East Coast of India',
      'Real-time graph-based anomaly detector on high-frequency UPI transaction rails',
      'Decentralized micro-lending credit scoring engine for unbanked regional artisans',
    ],
  },
  {
    id: 'healthcare_biotech',
    title: 'Healthcare, BioTech & Assistive Tech',
    icon: '🏥',
    tagline: 'Diagnostic AI, telemedicine, telemetry & accessibility tools',
    brief:
      'Create technology that saves lives and improves health outcomes. Develop AI-assisted diagnostic assistants, wearable health telemetry pipelines, EHR interoperability protocols, or assistive devices for differently-abled individuals.',
    problemStatements: [
      'AI-Assisted Early Detection System for Osteoarthritis (OA) Risk Markers in North Eastern Region (NER)',
      'Wearable non-invasive biometric telemetry pipeline for remote mountain health centers',
      'Automated multi-lingual AI clinical screening kiosk for rural public dispensaries',
    ],
    deliverables: [
      'AI-Assisted Early Detection System for Osteoarthritis (OA) Risk Markers in North Eastern Region (NER)',
      'Wearable non-invasive biometric telemetry pipeline for remote mountain health centers',
      'Automated multi-lingual AI clinical screening kiosk for rural public dispensaries',
    ],
  },
  {
    id: 'open_innovation',
    title: 'Open Innovation & Disruptive Tech',
    icon: '🚀',
    tagline: 'Radical, unconstrained solutions solving any high-impact challenge',
    brief:
      'Have an out-of-the-box breakthrough that defies categorization? Build any high-leverage technical innovation spanning space tech, clean energy, quantum computing, or consumer applications.',
    problemStatements: [
      'Autonomous drone swarm mesh protocol for disaster reconnaissance in dense forest and mountain terrain',
      'Low-cost software-defined ground station receiver for open satellite weather and agricultural telemetry',
      'High-throughput edge computing platform for distributed precision agriculture diagnostics',
    ],
    deliverables: [
      'Autonomous drone swarm mesh protocol for disaster reconnaissance in dense forest and mountain terrain',
      'Low-cost software-defined ground station receiver for open satellite weather and agricultural telemetry',
      'High-throughput edge computing platform for distributed precision agriculture diagnostics',
    ],
  },
]

const TECH_STACK_OPTIONS = [
  'React', 'Next.js', 'Python', 'FastAPI', 'Node.js', 'PyTorch', 'TensorFlow',
  'Solidity', 'Go', 'Rust', 'PostgreSQL', 'MongoDB', 'Docker', 'TailwindCSS',
  'LangChain', 'Three.js', 'TypeScript', 'WebSockets', 'AWS', 'Flutter',
]

const inputClass =
  'w-full rounded bg-[#0a0c13] border border-slate-700/80 px-3 sm:px-3.5 py-2 sm:py-2.5 text-[10px] sm:text-xs text-white outline-none placeholder:text-slate-500 focus:border-tactical transition-colors font-mono'
const sizeBtnBase =
  'rounded py-2 sm:py-2.5 text-xs font-bold tracking-wide transition-colors font-mono'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function useTMinus(targetTimestamp) {
  const compute = () => Math.max(0, targetTimestamp - Date.now())
  const [diff, setDiff] = useState(compute)

  useEffect(() => {
    const id = setInterval(() => setDiff(compute()), 1000)
    return () => clearInterval(id)
  }, [targetTimestamp])

  const totalSec = Math.floor(diff / 1000)
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    mins: Math.floor((totalSec % 3600) / 60),
    secs: Math.floor(totalSec % 60),
    daysLeft: Math.ceil(diff / 86400000),
    isExpired: diff <= 0,
  }
}

function Avatar({ text, className = '' }) {
  return (
    <div className={`flex items-center justify-center font-sans font-bold shrink-0 select-none ${className}`}>
      {text}
    </div>
  )
}

function userInitials(user) {
  if (!user) return 'CF'
  const raw = `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase()
  return raw || (user.email ? user.email.slice(0, 2).toUpperCase() : 'CF')
}

function emailInitials(email) {
  if (!email) return 'CF'
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
/* MAIN DASHBOARD COMPONENT                                                 */
/* ──────────────────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [checked, setChecked] = useState(false)
  const [teams, setTeams] = useState([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [activeNav, setActiveNav] = useState('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const mainRef = useRef(null)
  const navigate = useNavigate()

  const { days, hours, mins, secs, daysLeft } = useTMinus(EVENT_START)

  const [hackathonState, setHackathonState] = useState({
    problemStatementsReleased: false,
    announcements: [],
    tableAssignments: {},
    evaluations: {},
  })

  useEffect(() => {
    const loadOpsState = async () => {
      try {
        const s = await getHackathonStateApi()
        if (s?.state) setHackathonState(s.state)
        else if (s) setHackathonState(s)
      } catch {}
    }
    loadOpsState()

    const handleUpdate = (e) => {
      if (e.detail) setHackathonState(e.detail)
    }
    window.addEventListener('hackathon:state-updated', handleUpdate)
    return () => window.removeEventListener('hackathon:state-updated', handleUpdate)
  }, [])

  // Hydrate user session
  useEffect(() => {
    fetchMe()
      .then((data) => {
        if (!data?.user) {
          navigate('/auth')
          return
        }
        setUser(data.user)
      })
      .catch(() => navigate('/auth'))
      .finally(() => setChecked(true))
  }, [navigate])

  // Hydrate user's squad
  const reloadTeams = () => {
    setLoadingTeams(true)
    fetchMyTeams()
      .then((data) => setTeams(data.teams || []))
      .catch(() => setTeams([]))
      .finally(() => setLoadingTeams(false))
  }

  useEffect(() => {
    if (!user) return
    reloadTeams()

    // Smart polling: refresh every 4.5s only when tab is active (saves 80% backend load)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      fetchMyTeams()
        .then((data) => {
          if (data?.teams) setTeams(data.teams)
        })
        .catch(() => {})
    }, 4500)

    const handleSync = () => {
      fetchMyTeams()
        .then((data) => {
          if (data?.teams) setTeams(data.teams)
        })
        .catch(() => {})
    }

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        handleSync()
      }
    }

    window.addEventListener('codefiesta_teams_updated', handleSync)
    window.addEventListener('hackathon:state-updated', handleSync)
    window.addEventListener('storage', handleSync)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      window.removeEventListener('codefiesta_teams_updated', handleSync)
      window.removeEventListener('hackathon:state-updated', handleSync)
      window.removeEventListener('storage', handleSync)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user])

  // Socket room updates for squad
  useEffect(() => {
    if (!teams.length) return
    const socket = getSocket()
    for (const t of teams) {
      joinTeamRoom(t.id)
    }
    const onUpdate = (updated) => {
      if (!updated?.id) return
      setTeams((prev) =>
        prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
      )
    }
    socket.on('team:updated', onUpdate)
    return () => socket.off('team:updated', onUpdate)
  }, [teams])

  // Scroll Spy to keep left sidebar navigation synchronized with scroll position
  useEffect(() => {
    const mainEl = mainRef.current
    if (!mainEl) return

    const sectionIds = ['overview', 'my-team', 'tracks', 'evaluation', 'pass', 'resources']

    const handleScroll = () => {
      const scrollPos = mainEl.scrollTop + 160
      let currentSection = 'overview'
      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (el) {
          const top = el.getBoundingClientRect().top - mainEl.getBoundingClientRect().top + mainEl.scrollTop
          if (scrollPos >= top) {
            currentSection = id
          }
        }
      }
      setActiveNav(currentSection)
    }

    mainEl.addEventListener('scroll', handleScroll, { passive: true })
    return () => mainEl.removeEventListener('scroll', handleScroll)
  }, [teams])

  const handleLogout = async () => {
    try {
      await logoutUser()
    } finally {
      navigate('/auth')
    }
  }

  const goTo = (targetId) => {
    setMenuOpen(false)
    setActiveNav(targetId)
    const main = mainRef.current
    if (!main) return
    if (targetId === 'overview') {
      main.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const el = document.getElementById(targetId)
    if (!el) return
    const top =
      el.getBoundingClientRect().top -
      main.getBoundingClientRect().top +
      main.scrollTop -
      72
    main.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }

  // Live Scroll Spy: dynamically highlights active navigation item in sidebar as user scrolls
  useEffect(() => {
    const main = mainRef.current
    if (!main) return

    const sectionIds = ['overview', 'my-team', 'tracks', 'evaluation', 'pass', 'resources']

    const handleScroll = () => {
      const mainRect = main.getBoundingClientRect()
      let currentSection = 'overview'

      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (el) {
          const rect = el.getBoundingClientRect()
          const relativeTop = rect.top - mainRect.top
          if (relativeTop <= 150) {
            currentSection = id
          }
        }
      }

      setActiveNav((prev) => (prev !== currentSection ? currentSection : prev))
    }

    main.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => main.removeEventListener('scroll', handleScroll)
  }, [teams, user])

  if (!checked || !user) {
    return (
      <div className="h-dvh w-full bg-[#07080e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded border-2 border-tactical border-t-transparent animate-spin" />
          <span className="font-mono text-xs text-tactical tracking-widest uppercase font-bold">
            INITIALIZING HUD...
          </span>
        </div>
      </div>
    )
  }

  const myTeam = teams.find((t) => t.members?.some((m) => m.email === user.email)) || teams[0] || null
  const isLeader = myTeam ? myTeam.leader?.email === user.email || myTeam.isLeaderForThisTeam : false
  const cleanExplicit = hackathonState.tableAssignments?.[myTeam?.id]
  const cleanTeamTable = myTeam?.tableNumber && myTeam.tableNumber !== 'T-14' && myTeam.tableNumber !== 'UNASSIGNED' ? myTeam.tableNumber : null
  const assignedTable = (cleanExplicit && cleanExplicit !== 'T-14' && cleanExplicit !== 'UNASSIGNED' ? cleanExplicit : cleanTeamTable) || null
  const evaluation = (myTeam && hackathonState.evaluations?.[myTeam.id]) || myTeam?.evaluation || null

  // Strict Hard-Gating: Dashboard access is completely locked until admin reconciles UTR against bank records
  const isPaymentPending = myTeam && myTeam.payment?.status !== 'verified'

  if (isPaymentPending) {
    return (
      <VerificationPendingScreen
        user={user}
        team={myTeam}
        onRefresh={reloadTeams}
        onLogout={async () => {
          await logoutUser()
          navigate('/auth')
        }}
      />
    )
  }

  const NAV_ITEMS = [
    { id: 'overview', label: 'Overview', icon: '⚡' },
    { id: 'my-team', label: myTeam ? 'My Squad' : 'Form Squad', icon: '👥' },
    { id: 'tracks', label: 'Problem Tracks', icon: '🎯' },
    { id: 'evaluation', label: 'Scorecard & Eval', icon: '⚖️' },
    { id: 'pass', label: 'Event Pass', icon: '🎫' },
    { id: 'resources', label: 'Rules & Schedule', icon: '📜' },
  ]

  return (
    <div className="operative-dashboard relative flex h-dvh w-full overflow-hidden bg-[#07080e] text-slate-200 font-mono selection:bg-[#ffb800] selection:text-black antialiased">
      {/* Subtle background tactical matrix grid */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-30 z-0" />

      {/* Mobile menu backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* ── Sidebar Navigation ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col justify-between bg-[#0b0d14] border-r border-slate-800/80 shrink-0 transition-transform duration-200 md:static md:translate-x-0 md:z-20 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5">
          {/* Brand Header */}
          <div className="flex items-center gap-3 pb-5 mb-5 border-b border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-tactical flex items-center justify-center text-black font-sans font-black text-sm shadow-[0_0_12px_rgba(255,184,0,0.35)]">
              CF
            </div>
            <div>
              <div className="font-sans font-bold text-sm text-white tracking-wider flex items-center gap-1.5">
                CODEFIESTA <span className="text-tactical font-mono text-xs">5.0</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                Hackathon Portal
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="space-y-1.5 text-xs">
            {NAV_ITEMS.map((item) => {
              const active = activeNav === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(item.id)}
                  className={`flex w-full items-center justify-between px-3 py-2.5 rounded transition ${
                    active
                      ? 'bg-[#151926] border-l-2 border-tactical text-tactical font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-[#121520] border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">{item.icon}</span>
                    <span className="tracking-wide font-sans font-semibold text-xs">
                      {item.label}
                    </span>
                  </div>
                  {active && <span className="text-[10px] text-tactical">▸</span>}
                </button>
              )
            })}
          </nav>
        </div>

        {/* User Card + Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-[#080910]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar
                text={userInitials(user)}
                className="w-8 h-8 rounded bg-[#161a28] border border-slate-700 text-tactical text-[10px]"
              />
              <div className="min-w-0">
                <div className="text-[11px] text-white font-medium truncate">
                  {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email.split('@')[0]}
                </div>
                <div className="text-[9px] text-slate-400 truncate">
                  {user.email}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Logout session"
              className="text-xs text-slate-400 hover:text-red-400 font-mono transition shrink-0 px-2.5 py-1 rounded-lg hover:bg-red-500/10"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Cockpit Area ── */}
      <div
        ref={mainRef}
        className="relative flex-1 flex flex-col min-w-0 h-full overflow-y-auto z-10"
      >
        {/* Top Floating HUD Bar */}
        <header className="h-16 shrink-0 border-b border-slate-800/80 bg-[#0b0d14]/90 backdrop-blur px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="rounded p-1.5 text-slate-400 hover:text-tactical hover:bg-[#131724] transition md:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sync animate-pulse" />
              <span className="font-mono text-xs text-slate-300 tracking-wider">
                STAGE 1 · SQUAD REGISTRATION & CREDENTIAL VERIFICATION
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#121624] border border-slate-800 px-2.5 py-1.5 rounded">
              <span className="text-tactical font-mono font-bold text-[10px]">T-MINUS:</span>
              <span className="text-white font-mono font-bold text-[10px] sm:text-xs tabular-nums">
                {pad2(days)}d : {pad2(hours)}h : {pad2(mins)}m : {pad2(secs)}s
              </span>
            </div>
          </div>
        </header>

        {/* Live Broadcast Ops Ticker */}
        {hackathonState.announcements && hackathonState.announcements.length > 0 && (
          <div className="bg-[#0f1424] border-b border-tactical/40 px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3 text-xs overflow-hidden shadow-[0_2px_12px_rgba(255,184,0,0.06)] shrink-0 z-20">
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-tactical animate-ping" />
              <span className="font-mono text-xs text-tactical tracking-wider uppercase font-semibold flex items-center gap-1">
                <span>📢</span> HACKATHON OPS BROADCAST:
              </span>
            </div>
            <div className="flex-1 truncate font-mono text-slate-200 text-[11px]">
              {hackathonState.announcements[hackathonState.announcements.length - 1].text}
            </div>
            <span className="text-[9px] font-mono text-slate-500 shrink-0">
              {new Date(hackathonState.announcements[hackathonState.announcements.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Content Body */}
        <main className="p-4 sm:p-8 lg:p-10 max-w-6xl w-full mx-auto space-y-8 sm:space-y-12 pb-24">
          {/* Welcome & Overview Header */}
          <section id="overview" className="border-b border-slate-800/80 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white font-sans">
                  OPERATIVE COCKPIT: <span className="text-tactical">{user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'HACKER'}</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Affiliation: <span className="text-slate-200">{user.college || 'Participant'}</span> · Codefiesta 5.0 starts in{' '}
                  <span className="text-tactical font-semibold">{daysLeft} days</span> (Oct 8–9, 2026 at GIT Jaipur).
                </p>
              </div>

              {/* Quick Status Pill */}
              <div className="flex items-center gap-2">
                {myTeam ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="px-3.5 py-1.5 rounded-xl bg-sync/10 border border-sync/40 text-sync text-xs font-mono font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sync" />
                      SQUAD: {myTeam.name}
                    </div>
                    <div className="px-3.5 py-1.5 rounded-xl bg-tactical/15 border border-tactical/50 text-tactical text-xs font-mono font-semibold flex items-center gap-1.5">
                      <span>📍</span> {assignedTable ? `TABLE ${assignedTable}` : 'DESK ALLOCATING'}
                    </div>
                  </div>
                ) : (
                  <div className="px-3.5 py-1.5 rounded-xl bg-tactical/10 border border-tactical/40 text-tactical text-xs font-mono font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-tactical animate-pulse" />
                    SOLO OPERATIVE · SQUAD REQUIRED
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* If the user has NO team yet, show the full First-Time User Onboarding Cockpit! */}
          {!myTeam && (
            <div id="my-team" className="scroll-mt-20">
              <FirstTimeOnboarding
                user={user}
                onTeamCreated={(newTeam) => {
                  setTeams([newTeam])
                }}
                onTeamJoined={(joinedTeam) => {
                  setTeams([joinedTeam])
                }}
              />
            </div>
          )}

          {/* Active Squad Console */}
          {myTeam && (
            <section id="my-team" className="space-y-6 scroll-mt-20">
              <TeamCard
                team={myTeam}
                user={user}
                assignedTable={assignedTable}
                setTeams={setTeams}
                onReload={reloadTeams}
              />
            </section>
          )}

          {/* Track & Problem Statements Section */}
          <section id="tracks" className="scroll-mt-20">
            <ProblemTracksSection
              myTeam={myTeam}
              isLeader={isLeader}
              user={user}
              problemStatementsReleased={hackathonState.problemStatementsReleased}
              problemStatements={hackathonState.problemStatements}
              onTrackUpdated={(updatedTeam) => {
                setTeams((prev) =>
                  prev.map((t) => (t.id === updatedTeam.id ? { ...t, ...updatedTeam } : t))
                )
              }}
            />
          </section>

          {/* On-Ground Evaluation & Scoring Ledger */}
          <section id="evaluation" className="scroll-mt-20">
            <span id="submission" className="scroll-mt-20 pointer-events-none block -mt-20 pt-20" />
            <OnGroundEvaluationLedger
              myTeam={myTeam}
              user={user}
              assignedTable={assignedTable}
              evaluation={evaluation}
              hackathonState={hackathonState}
            />
          </section>

          {/* Cyber Hacker Event Pass */}
          <section id="pass" className="scroll-mt-20">
            <EventPassSection user={user} team={myTeam} assignedTable={assignedTable} />
          </section>

          {/* Hackathon Handbook & 24-Hour Schedule */}
          <section id="resources" className="scroll-mt-20">
            <ResourcesSection />
          </section>
        </main>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
/* 0. VERIFICATION PENDING COMMAND HUD (Pre-Verification Hard Lock)        */
/* ──────────────────────────────────────────────────────────────────────── */

function VerificationPendingScreen({ user, team, onRefresh, onLogout }) {
  const [checking, setChecking] = useState(false)
  const [copiedUtr, setCopiedUtr] = useState(false)

  const isRejected = team?.payment?.status === 'rejected' || team?.status === 'rejected'
  const isLeader = team?.leader?.email === user?.email || user?.isLeader || team?.isLeaderForThisTeam || false

  // Real-time synchronization: poll verification state every 4 seconds only when active
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      onRefresh()
    }, 4000)

    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) onRefresh()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [onRefresh])

  const handleManualCheck = async () => {
    setChecking(true)
    try {
      await onRefresh()
    } finally {
      setTimeout(() => setChecking(false), 800)
    }
  }

  const allMembers = team.members || []

  return (
    <div className="min-h-dvh w-full bg-[#070910] text-slate-200 font-mono relative overflow-y-auto flex flex-col justify-between">
      {/* Tactical Matrix Grid */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-25 z-0" />

      {/* Top Header Bar */}
      <header className="h-16 border-b border-slate-800/80 bg-[#090c16]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-tactical/20 border border-tactical text-tactical font-sans font-black text-xs flex items-center justify-center">
            CF
          </div>
          <div>
            <div className="font-sans font-bold text-xs text-white tracking-wider flex items-center gap-1.5">
              CODEFIESTA <span className="text-tactical font-mono text-xs">5.0</span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono">
              Central Command // Finance Clearance Gate
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-white font-medium">{user.name || user.email}</div>
            <div className={`text-[9px] font-mono ${isRejected ? 'text-red-400 font-bold' : 'text-amber-400'}`}>
              {isRejected ? '✕ Payment Rejected by Admin' : '⏳ Payment Under Verification'}
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="text-[10px] font-sans uppercase font-bold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/10 transition"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Center Command Card */}
      <main className="max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-6 relative z-10 my-auto">
        <div className={`bg-[#0b0e1a]/95 border rounded-2xl p-6 sm:p-10 relative space-y-6 ${
          isRejected
            ? 'border-red-500/60 shadow-[0_0_50px_rgba(239,68,68,0.18)]'
            : 'border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.12)]'
        }`}>
          {/* Corner brackets */}
          <div className={`absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 ${isRejected ? 'border-red-500' : 'border-amber-500'}`} />
          <div className={`absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 ${isRejected ? 'border-red-500' : 'border-amber-500'}`} />
          <div className={`absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 ${isRejected ? 'border-red-500' : 'border-amber-500'}`} />
          <div className={`absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 ${isRejected ? 'border-red-500' : 'border-amber-500'}`} />

          {/* Header Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center shrink-0 shadow-inner ${
                isRejected
                  ? 'bg-red-500/15 border border-red-500/50 text-red-400'
                  : 'bg-amber-500/15 border border-amber-500/40 text-amber-400 animate-pulse'
              }`}>
                {isRejected ? '✕' : '⏳'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isRejected ? 'bg-red-500' : 'bg-amber-400 animate-ping'}`} />
                  <span className={`font-mono text-xs font-bold uppercase tracking-wider ${isRejected ? 'text-red-400' : 'text-amber-400'}`}>
                    {isRejected
                      ? 'REGISTRATION REJECTED // PAYMENT NOT RECONCILED'
                      : 'REGISTRATION SUBMITTED // AWAITING ADMIN UTR VERIFICATION'}
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold font-sans text-white mt-1">
                  {isRejected
                    ? 'Payment Verification Failed — Action Required'
                    : 'Dashboard Access Locked Until Payment Reconciliation'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={checking}
                className="px-4 py-2.5 rounded-xl bg-tactical hover:bg-[#e6a600] active:scale-95 text-black font-sans font-bold text-xs uppercase tracking-wider transition shadow flex items-center gap-1.5"
              >
                <span className={checking ? 'animate-spin' : ''}>🔄</span>
                <span>{checking ? 'CHECKING...' : 'CHECK STATUS'}</span>
              </button>
            </div>
          </div>

          {/* Verification Protocol Notice */}
          {isRejected ? (
            <div className="p-4 rounded-xl bg-[#1c0e14] border border-red-500/50 text-xs font-mono text-red-200/90 leading-relaxed space-y-2.5">
              <div className="font-bold flex items-center gap-2 text-red-400 text-sm">
                <span>✕</span>
                <span>FINANCE VERIFICATION FAILED: PAYMENT REJECTED</span>
              </div>
              <p className="text-slate-200 text-xs">
                Admin Rejection Note: <strong className="text-red-300">{team.payment?.notes || 'UTR reference could not be matched against bank statement credit.'}</strong>
              </p>
              <p className="text-slate-400 text-[11px]">
                The submitted transaction UTR <span className="font-mono text-red-400 line-through font-bold">{team.payment?.utr || 'N/A'}</span> was evaluated by the Codefiesta 5.0 Finance Desk and rejected. Dashboard features, event passes, and problem statements remain locked.
              </p>
              {isLeader ? (
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                  <Link
                    to="/payment"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-sans font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-red-600/30"
                  >
                    <span>←</span>
                    <span>Re-submit Correct UTR at Payment Gate</span>
                  </Link>
                  <span className="text-[10px] text-slate-400">
                    Verify in your UPI app and submit the correct 12-digit transaction reference.
                  </span>
                </div>
              ) : (
                <p className="text-amber-300 text-[11px] pt-1">
                  Please inform your squad leader (<strong className="text-white">{team.leader?.name || team.leader?.email}</strong>) to re-submit the payment transaction ID.
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#14121a] border border-amber-500/30 text-xs font-mono text-amber-200/90 leading-relaxed space-y-2">
              <div className="font-bold flex items-center gap-2 text-amber-300">
                <span>🛡️</span>
                <span>FINANCE VERIFICATION PROTOCOL IN PROGRESS</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Your registration details for squad <strong className="text-white">{team.name}</strong> and UPI UTR transaction reference <strong className="text-tactical font-mono">{team.payment?.utr}</strong> have been submitted to the Codefiesta 5.0 Command Desk.
              </p>
              <p className="text-slate-400 text-[11px]">
                Our on-ground finance coordinators are currently reconciling your transaction ID against official bank records. As soon as matched, an official confirmation email will be dispatched to <strong className="text-cyan-400">{team.leader?.email}</strong> and full dashboard access, event passes, and problem statements will unlock automatically.
              </p>
            </div>
          )}

          {/* Submitted Squad Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#0e1222] border border-slate-800 space-y-2.5">
              <span className="text-[10px] uppercase font-mono text-slate-400 block tracking-wider">
                Registration &amp; Payment Summary
              </span>
              <div className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Squad Name:</span>
                <span className="font-sans font-bold text-white text-sm">{team.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Squad Size:</span>
                <span className="font-mono text-cyan-300">{team.size} Members</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Submitted UTR:</span>
                <div className="inline-flex items-center gap-1.5">
                  <span className={`font-mono font-bold px-2 py-0.5 rounded border ${
                    isRejected
                      ? 'text-red-400 bg-red-500/10 border-red-500/30 line-through'
                      : 'text-tactical bg-tactical/10 border-tactical/30'
                  }`}>
                    {team.payment?.utr || 'NOT_SUBMITTED'}
                  </span>
                  {isRejected && (
                    <span className="text-[9px] font-arcade text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/40">
                      REJECTED
                    </span>
                  )}
                  {team.payment?.utr && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(team.payment.utr)
                        setCopiedUtr(true)
                        setTimeout(() => setCopiedUtr(false), 2000)
                      }}
                      className="text-[10px] text-slate-400 hover:text-white"
                      title="Copy UTR"
                    >
                      {copiedUtr ? '✓' : '📋'}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Registration Fee:</span>
                <span className="font-mono text-emerald-400 font-bold">₹{team.payment?.amount || 800} INR</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0e1222] border border-slate-800 space-y-2.5">
              <span className="text-[10px] uppercase font-mono text-slate-400 block tracking-wider">
                Team Leader Credentials
              </span>
              <div className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Leader Name:</span>
                <span className="font-medium text-white">{team.leader?.name || user.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Registered Email:</span>
                <span className="font-mono text-cyan-400 text-[11px] truncate max-w-[180px]">{team.leader?.email}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Contact Number:</span>
                <span className="font-mono text-slate-300">{team.leader?.phone || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Institute / College:</span>
                <span className="text-slate-300 text-[11px] truncate max-w-[180px]" title={team.leader?.college}>
                  {team.leader?.college || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Roster of Submitted Operatives */}
          <div className="space-y-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block tracking-wider">
              Enrolled Squad Roster ({allMembers.length} Candidates Submitted)
            </span>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#080b14]">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0d1120] text-[10px] text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Candidate Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3">Course / Year</th>
                    <th className="py-2.5 px-3">College / Roll No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {allMembers.map((m, idx) => (
                    <tr key={idx} className="hover:bg-[#0f1426]">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {m.role === 'leader' || m.email === team.leader?.email ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                            👑 LEADER
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px]">
                            MEMBER
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-white font-medium whitespace-nowrap">
                        {m.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 text-[11px] whitespace-nowrap">
                        {m.email}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                        {m.phone || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                        {m.course || 'CSE'} ({m.year || '1st'} Yr)
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-[150px] truncate" title={`${m.college} - ${m.rollNumber}`}>
                        {m.college || '—'} {m.rollNumber ? `(${m.rollNumber})` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer note & Live Polling indicator */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-500 border-t border-slate-800 pt-4 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sync animate-pulse" />
              <span>Live sync active · Checking verification status automatically every 3.5s...</span>
            </div>
            <div>
              Codefiesta 5.0 HQ · Sitapura Campus
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[10px] text-slate-600 font-mono border-t border-slate-900 bg-[#06080e]">
        Authorized Codefiesta 5.0 Personnel · Secure Finance Ledger
      </footer>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
/* 1. FIRST-TIME USER ONBOARDING COCKPIT (Unstop / Hack2Skill Replacement)  */
/* ──────────────────────────────────────────────────────────────────────── */

function FirstTimeOnboarding({ user, onTeamCreated, onTeamJoined }) {
  const [modalMode, setModalMode] = useState(null) // 'create' | 'join' | null
  const [createStep, setCreateStep] = useState(1) // 1: details, 2: payment scanner & UTR
  const [squadName, setSquadName] = useState('')
  const [squadSize, setSquadSize] = useState(3)

  // Leader Profile State
  const [leaderData, setLeaderData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    college: user?.college || '',
    rollNumber: user?.rollNumber || '',
    course: user?.course || 'CSE',
    year: user?.year || '1st',
    gender: user?.gender || 'male',
  })

  // Teammates List (for up to 3 teammates)
  const [teammates, setTeammates] = useState([
    {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      college: user?.college || '',
      rollNumber: '',
      course: 'CSE',
      year: '1st',
      gender: 'male',
    },
    {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      college: user?.college || '',
      rollNumber: '',
      course: 'CSE',
      year: '1st',
      gender: 'male',
    },
  ])

  const [utr, setUtr] = useState('')
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSizeChange = (newSize) => {
    setSquadSize(newSize)
    const needed = Math.max(1, newSize - 1)
    setTeammates((prev) => {
      return Array.from({ length: needed }, (_, i) => prev[i] || {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        college: user?.college || '',
        rollNumber: '',
        course: 'CSE',
        year: '1st',
        gender: 'male',
      })
    })
  }

  const updateLeader = (field, value) => {
    setLeaderData((prev) => ({ ...prev, [field]: value }))
  }

  const updateTeammate = (idx, field, value) => {
    setTeammates((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  const handleProceedToPayment = (e) => {
    e.preventDefault()
    setError('')
    const trimmedName = squadName.trim()
    if (!trimmedName) {
      setError('Please provide a squad name.')
      return
    }

    const emailRegex = /^\S+@\S+\.\S+$/
    const phoneRegex = /^[6-9]\d{9}$/

    // 1. Validate Leader Details
    if (!leaderData.firstName.trim() || !leaderData.lastName.trim()) {
      setError('Please enter first name and last name for team leader.')
      return
    }
    if (!leaderData.phone.trim() || !phoneRegex.test(leaderData.phone.trim())) {
      setError('Please enter a valid 10-digit mobile number for team leader (starts with 6-9).')
      return
    }
    if (!leaderData.college.trim()) {
      setError('Please enter college / university name for team leader.')
      return
    }
    if (!leaderData.rollNumber.trim()) {
      setError('Please enter college ID / roll number for team leader.')
      return
    }
    if (!leaderData.course.trim()) {
      setError('Please enter course / branch for team leader (e.g. CSE).')
      return
    }
    if (!leaderData.year.trim()) {
      setError('Please select academic year for team leader.')
      return
    }
    if (!leaderData.gender.trim()) {
      setError('Please select gender for team leader.')
      return
    }

    // 2. Validate Teammates Details
    const needed = Math.max(1, squadSize - 1)
    const active = teammates.slice(0, needed)
    const seenEmails = new Set([leaderData.email.toLowerCase()])

    for (let i = 0; i < active.length; i++) {
      const tm = active[i]
      const num = i + 2

      if (!tm.firstName.trim() || !tm.lastName.trim()) {
        setError(`Please enter first name and last name for Teammate #${num}.`)
        return
      }
      if (!tm.email.trim() || !emailRegex.test(tm.email.trim())) {
        setError(`Please enter a valid email address for Teammate #${num}.`)
        return
      }
      const tmEmailLower = tm.email.trim().toLowerCase()
      if (seenEmails.has(tmEmailLower)) {
        setError(`Email "${tm.email.trim()}" is duplicate. Each teammate (and leader) must have a unique email address.`)
        return
      }
      seenEmails.add(tmEmailLower)

      if (!tm.phone.trim() || !phoneRegex.test(tm.phone.trim())) {
        setError(`Please enter a valid 10-digit mobile number for Teammate #${num} (starts with 6-9).`)
        return
      }
      if (!tm.college.trim()) {
        setError(`Please enter college / university name for Teammate #${num}.`)
        return
      }
      if (!tm.rollNumber.trim()) {
        setError(`Please enter college ID / roll number for Teammate #${num}.`)
        return
      }
      if (!tm.course.trim()) {
        setError(`Please enter course / branch for Teammate #${num} (e.g. CSE).`)
        return
      }
      if (!tm.year.trim()) {
        setError(`Please select academic year for Teammate #${num}.`)
        return
      }
      if (!tm.gender.trim()) {
        setError(`Please select gender for Teammate #${num}.`)
        return
      }
    }

    setCreateStep(2)
  }

  const handleCreateSquadFinal = async (e) => {
    e.preventDefault()
    setError('')
    const trimmedUtr = utr.trim()
    if (!trimmedUtr || trimmedUtr.length < 6) {
      setError('Please enter a valid 12-digit UPI transaction UTR / reference number.')
      return
    }

    setSubmitting(true)
    try {
      const needed = Math.max(1, squadSize - 1)
      const active = teammates.slice(0, needed)
      const res = await createTeamApi({
        name: squadName.trim(),
        size: squadSize,
        leader: {
          firstName: leaderData.firstName.trim(),
          lastName: leaderData.lastName.trim(),
          phone: leaderData.phone.trim(),
          college: leaderData.college.trim(),
          rollNumber: leaderData.rollNumber.trim(),
          course: leaderData.course.trim(),
          year: leaderData.year.trim(),
          gender: leaderData.gender.trim(),
        },
        members: active.map((tm) => ({
          firstName: tm.firstName.trim(),
          lastName: tm.lastName.trim(),
          name: `${tm.firstName.trim()} ${tm.lastName.trim()}`,
          email: tm.email.trim().toLowerCase(),
          phone: tm.phone.trim(),
          college: tm.college.trim(),
          rollNumber: tm.rollNumber.trim(),
          course: tm.course.trim(),
          year: tm.year.trim(),
          gender: tm.gender.trim(),
        })),
        payment: {
          utr: trimmedUtr,
          amount: 800,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
        },
      })
      if (res.team) {
        onTeamCreated(res.team)
        setModalMode(null)
        setCreateStep(1)
        setUtr('')
      }
    } catch (err) {
      setError(err.message || 'Failed to create squad.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoinSquad = async (e) => {
    e.preventDefault()
    setError('')
    if (!joinCode.trim()) {
      setError('Enter your unique personal squad code or invite token.')
      return
    }
    setSubmitting(true)
    try {
      const res = await joinTeamByCodeApi(joinCode.trim())
      if (res.team) {
        onTeamJoined(res.team)
        setModalMode(null)
      }
    } catch (err) {
      setError(err.message || 'Unable to join squad. Check your code.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 bg-[#0a0d17]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-10 relative overflow-hidden shadow-2xl">
      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-tactical" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-tactical" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-tactical" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-tactical" />

      {/* 5-Stage Stepper */}
      <div>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80">
          <span className="font-mono text-xs text-tactical font-semibold tracking-wider uppercase">
            REGISTRATION DIRECTIVE // 5-STAGE PIPELINE
          </span>
          <span className="text-xs font-mono text-slate-400">Step 2 of 5</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 text-center font-mono text-xs">
          <div className="p-3 rounded-xl bg-sync/10 border border-sync/40 text-sync flex flex-col items-center gap-1">
            <span className="font-bold">✓ STEP 1</span>
            <span className="text-[11px] text-slate-300">Profile Verified</span>
          </div>
          <div className="p-3 rounded-xl bg-tactical/15 border-2 border-tactical text-tactical flex flex-col items-center gap-1 shadow-lg">
            <span className="font-bold animate-pulse">● STEP 2</span>
            <span className="text-[11px] text-white font-semibold">Form / Join Squad</span>
          </div>
          <div className="p-3 rounded-xl bg-[#0f1322] border border-slate-800 text-slate-500 flex flex-col items-center gap-1">
            <span>🔒 STEP 3</span>
            <span className="text-[11px]">Payment &amp; UTR</span>
          </div>
          <div className="p-3 rounded-xl bg-[#0f1322] border border-slate-800 text-slate-500 flex flex-col items-center gap-1">
            <span>🔒 STEP 4</span>
            <span className="text-[11px]">Admin Verify</span>
          </div>
          <div className="p-3 rounded-xl bg-[#0f1322] border border-slate-800 text-slate-500 flex flex-col items-center gap-1">
            <span>🔒 STEP 5</span>
            <span className="text-[11px]">Pass Issued</span>
          </div>
        </div>
      </div>

      {/* Action Directive Cards (2 Clean Cockpit Cards) */}
      <div>
        <div className="mb-6">
          <h2 className="text-lg sm:text-xl font-bold font-sans text-white tracking-wide uppercase">
            Squad Formation Required (2 to 4 Hackers)
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-mono leading-relaxed">
            Codefiesta 5.0 is an on-ground collaborative hackathon. Form your squad to unlock problem statements, slide deck presentations, and on-ground team badges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {/* Card 1: Create Squad */}
          <div className="bg-[#0e1220]/90 border border-slate-800/80 hover:border-tactical/70 p-6 sm:p-7 rounded-2xl flex flex-col justify-between transition-all duration-200 shadow-xl group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-tactical/10 border border-tactical/30 flex items-center justify-center text-2xl mb-4 text-tactical shadow-inner">
                ⚡
              </div>
              <h3 className="text-base sm:text-lg font-bold font-sans text-white mb-2 group-hover:text-tactical transition">
                CREATE NEW SQUAD
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 font-mono leading-relaxed">
                Take the lead. Choose a unique squad name, select team size (2 to 4), enter complete credentials for yourself and teammates, and submit payment UTR for admin verification.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setError('')
                setModalMode('create')
              }}
              className="mt-6 w-full btn-ribbed bg-tactical hover:bg-[#e6a600] active:translate-y-0.5 text-black font-sans font-bold text-xs sm:text-sm py-3.5 rounded-xl border-b-2 border-[#b28200] transition uppercase tracking-wider shadow-lg"
            >
              CREATE SQUAD &gt;&gt;
            </button>
          </div>

          {/* Card 2: Join with Code */}
          <div className="bg-[#0e1220]/90 border border-slate-800/80 hover:border-sync/70 p-6 sm:p-7 rounded-2xl flex flex-col justify-between transition-all duration-200 shadow-xl group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-sync/10 border border-sync/30 flex items-center justify-center text-2xl mb-4 text-sync shadow-inner">
                🔑
              </div>
              <h3 className="text-base sm:text-lg font-bold font-sans text-white mb-2 group-hover:text-sync transition">
                JOIN SQUAD WITH CODE
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 font-mono leading-relaxed">
                Has your team leader already registered your squad? Enter your exclusive personalized invite code (e.g. <span className="text-tactical font-mono">CYBER-SAHIL-GIT-DURGESH-8192</span>) to confirm your spot.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setError('')
                setModalMode('join')
              }}
              className="mt-6 w-full rounded-xl bg-[#14192b] hover:bg-[#1a2138] border border-slate-700 hover:border-sync text-sync font-sans font-bold text-xs sm:text-sm py-3.5 transition uppercase tracking-wider shadow-lg"
            >
              ENTER SQUAD CODE &gt;&gt;
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Create Squad */}
      {modalMode === 'create' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b0f1d] border border-tactical/60 rounded-2xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
              <div>
                <h3 className="text-base sm:text-lg font-bold font-sans text-tactical tracking-wide uppercase">
                  {createStep === 1 ? 'Step 1: Enter All Member Details' : 'Step 2: Registration Payment & UTR'}
                </h3>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Leader: {leaderData.firstName ? `${leaderData.firstName} ${leaderData.lastName}`.trim() : user.email} · {leaderData.college || 'Participant'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalMode(null)
                  setCreateStep(1)
                  setError('')
                }}
                className="w-8 h-8 rounded-lg bg-[#141828] text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="grid grid-cols-2 gap-2 mb-6 font-mono text-xs">
              <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                createStep === 1
                  ? 'bg-tactical/15 border-tactical text-tactical font-bold'
                  : 'bg-sync/15 border-sync text-sync font-bold'
              }`}>
                <span>{createStep === 2 ? '✓' : '1.'}</span>
                <span className="truncate">1. Complete Member Details</span>
              </div>
              <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                createStep === 2
                  ? 'bg-tactical/15 border-tactical text-tactical font-bold'
                  : 'bg-[#101424] border-slate-800 text-slate-500'
              }`}>
                <span>2.</span>
                <span className="truncate">2. Payment Scanner &amp; UTR (₹800)</span>
              </div>
            </div>

            {createStep === 1 ? (
              <form onSubmit={handleProceedToPayment} className="space-y-6">
                {/* Squad Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                      Squad Name (Unique across hackathon) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CYBER_TITANS"
                      value={squadName}
                      onChange={(e) => setSquadName(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                      Total Team Size *
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[2, 3, 4].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleSizeChange(s)}
                          className={`rounded-lg py-2.5 text-xs font-bold font-mono transition-all ${
                            squadSize === s
                              ? 'bg-tactical text-black shadow'
                              : 'bg-[#121627] text-slate-400 border border-slate-700/80 hover:border-slate-500'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section: Leader Profile */}
                <div className="p-4 sm:p-5 rounded-xl bg-[#0e1324] border border-amber-500/40 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span className="font-mono text-xs text-amber-300 font-bold uppercase flex items-center gap-1.5">
                      <span>👑</span> Squad Leader Credentials (You)
                    </span>
                    <span className="text-[10px] font-mono text-amber-400/80">Account: {leaderData.email}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Leader first name"
                        value={leaderData.firstName}
                        onChange={(e) => updateLeader('firstName', e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Leader last name"
                        value={leaderData.lastName}
                        onChange={(e) => updateLeader('lastName', e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        10-Digit Mobile Phone *
                      </label>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="e.g. 9876543210"
                        value={leaderData.phone}
                        onChange={(e) => updateLeader('phone', e.target.value.replace(/\D/g, ''))}
                        className={inputClass}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        College ID / Roll No. *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 22BCS001"
                        value={leaderData.rollNumber}
                        onChange={(e) => updateLeader('rollNumber', e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        College / University Name (Type Only) *
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your college / university name..."
                        value={leaderData.college}
                        onChange={(e) => updateLeader('college', e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                          Course *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. CSE"
                          value={leaderData.course}
                          onChange={(e) => updateLeader('course', e.target.value)}
                          className={inputClass}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                          Academic Year *
                        </label>
                        <select
                          value={leaderData.year}
                          onChange={(e) => updateLeader('year', e.target.value)}
                          className={inputClass}
                          required
                        >
                          <option value="1st">1st Year</option>
                          <option value="2nd">2nd Year</option>
                          <option value="3rd">3rd Year</option>
                          <option value="4th">4th Year</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                          Sex / Gender *
                        </label>
                        <select
                          value={leaderData.gender}
                          onChange={(e) => updateLeader('gender', e.target.value)}
                          className={inputClass}
                          required
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Teammate Form Cards */}
                <div className="space-y-4">
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span>Teammate Operatives ({squadSize - 1} required)</span>
                    <span className="text-tactical text-[11px]">One Email = One Registration</span>
                  </div>

                  {teammates.slice(0, squadSize - 1).map((tm, idx) => (
                    <div key={idx} className="p-4 sm:p-5 rounded-xl bg-[#0f1426] border border-slate-800/90 space-y-3">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                        <span className="font-mono text-xs text-tactical font-semibold uppercase flex items-center gap-1.5">
                          <span>👤</span> Teammate #{idx + 2} Credentials
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400">Generates distinct invite code</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                            First Name *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Durgesh"
                            value={tm.firstName}
                            onChange={(e) => updateTeammate(idx, 'firstName', e.target.value)}
                            className={inputClass}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Kumar"
                            value={tm.lastName}
                            onChange={(e) => updateTeammate(idx, 'lastName', e.target.value)}
                            className={inputClass}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                            Email Address (Unique) *
                          </label>
                          <input
                            type="email"
                            placeholder="e.g. durgesh@gmail.com"
                            value={tm.email}
                            onChange={(e) => updateTeammate(idx, 'email', e.target.value)}
                            className={inputClass}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                            10-Digit Mobile Phone *
                          </label>
                          <input
                            type="tel"
                            maxLength={10}
                            placeholder="e.g. 9811122233"
                            value={tm.phone}
                            onChange={(e) => updateTeammate(idx, 'phone', e.target.value.replace(/\D/g, ''))}
                            className={inputClass}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                            College ID / Roll No. *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 22BCS045"
                            value={tm.rollNumber}
                            onChange={(e) => updateTeammate(idx, 'rollNumber', e.target.value)}
                            className={inputClass}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                            Course *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. CSE"
                            value={tm.course}
                            onChange={(e) => updateTeammate(idx, 'course', e.target.value)}
                            className={inputClass}
                            required
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                            College / University Name (Type Only) *
                          </label>
                          <input
                            type="text"
                            placeholder="Type college / university name..."
                            value={tm.college}
                            onChange={(e) => updateTeammate(idx, 'college', e.target.value)}
                            className={inputClass}
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                          <div>
                            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                              Academic Year *
                            </label>
                            <select
                              value={tm.year}
                              onChange={(e) => updateTeammate(idx, 'year', e.target.value)}
                              className={inputClass}
                              required
                            >
                              <option value="1st">1st Year</option>
                              <option value="2nd">2nd Year</option>
                              <option value="3rd">3rd Year</option>
                              <option value="4th">4th Year</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                              Sex / Gender *
                            </label>
                            <select
                              value={tm.gender}
                              onChange={(e) => updateTeammate(idx, 'gender', e.target.value)}
                              className={inputClass}
                              required
                            >
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                    ⚠ {error}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="submit"
                    className="flex-1 btn-ribbed bg-tactical hover:bg-[#e6a600] text-black font-sans font-bold text-xs sm:text-sm py-3.5 rounded-xl border-b-2 border-[#b28200] uppercase tracking-wider shadow-lg"
                  >
                    CONTINUE TO PAYMENT SCANNER (₹800) &gt;&gt;
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="px-5 py-3.5 rounded-xl border border-slate-700 bg-[#121626] text-slate-300 font-sans font-medium text-xs sm:text-sm hover:bg-[#181d33] transition uppercase"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateSquadFinal} className="space-y-6">
                {/* QR Code & UPI Container */}
                <div className="p-5 rounded-xl bg-[#0f1426] border border-slate-800 text-center space-y-4">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-tactical/10 border border-tactical/40 text-tactical text-xs font-mono font-bold">
                    <span>💳</span> REGISTRATION FEE: ₹800.00
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-white p-3.5 rounded-xl shadow-2xl border-2 border-tactical/80">
                      <QRCodeSvg
                        value="upi://pay?pa=git.codefiesta@upi&pn=Codefiesta%205.0&am=800&cu=INR"
                        size={170}
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-300">
                        UPI ID: <strong className="text-tactical">git.codefiesta@upi</strong>
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText('git.codefiesta@upi')
                            setCopiedUpi(true)
                            setTimeout(() => setCopiedUpi(false), 2000)
                          } catch {}
                        }}
                        className="px-2.5 py-0.5 rounded bg-tactical/20 border border-tactical/40 text-tactical text-[10px] font-mono hover:bg-tactical/30 transition"
                      >
                        {copiedUpi ? 'COPIED!' : 'COPY'}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-1.5 max-w-sm">
                      Scan with Google Pay, PhonePe, Paytm, or BHIM. Pay <strong>₹800</strong>, then enter the 12-digit UTR below.
                    </p>
                  </div>
                </div>

                {/* UTR Input */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5 font-bold">
                    Enter 12-Digit UTR / UPI Transaction Reference Number *
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="e.g. 428901238910"
                    value={utr}
                    onChange={(e) => {
                      setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))
                      setError('')
                    }}
                    className={`${inputClass} text-center tracking-widest text-base sm:text-lg font-mono font-bold text-tactical`}
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5 font-mono">
                    You can find the 12-digit UTR on your payment receipt or banking SMS.
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                    ⚠ {error}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateStep(1)}
                    className="px-4 py-3.5 rounded-xl border border-slate-700 bg-[#121626] text-slate-300 font-sans font-medium text-xs sm:text-sm hover:bg-[#181d33] transition"
                  >
                    ← Back to Details
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || utr.trim().length < 6}
                    className="flex-1 btn-ribbed bg-sync hover:bg-[#18ba9b] text-black font-sans font-bold text-xs sm:text-sm py-3.5 rounded-xl border-b-2 border-[#127a65] uppercase tracking-wider disabled:opacity-50 shadow-lg"
                  >
                    {submitting ? 'SUBMITTING REGISTRATION...' : '💳 FINAL SUBMISSION & SUBMIT UTR >>'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Join Squad with Code */}
      {modalMode === 'join' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0f1d] border border-sync/60 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <h3 className="text-base sm:text-lg font-bold font-sans text-sync tracking-wide uppercase">
                Enter Personal Squad Code
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="w-8 h-8 rounded-lg bg-[#141828] text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinSquad} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                  Your Personal Join Code or Invite Token
                </label>
                <input
                  type="text"
                  placeholder="e.g. CYBER-SAHIL-GIT-DURGESH-8192"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className={`${inputClass} text-center tracking-widest text-sm sm:text-base font-mono font-bold uppercase`}
                  required
                />
                <p className="text-[11px] text-slate-400 mt-2 font-mono leading-relaxed">
                  Enter the unique personalized invite code sent to you by your squad leader. Each teammate receives their own distinct code.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                  ⚠ {error}
                </div>
              )}

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-ribbed bg-sync hover:bg-[#19b99a] text-black font-sans font-bold text-xs sm:text-sm py-3.5 rounded-xl border-b-2 border-[#127a65] uppercase tracking-wider disabled:opacity-50 shadow-lg"
                >
                  {submitting ? 'CONFIRMING...' : 'CONFIRM & JOIN SQUAD >>'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-5 py-3.5 rounded-xl border border-slate-700 bg-[#121626] text-slate-300 font-sans font-medium text-xs sm:text-sm hover:bg-[#181d33] transition uppercase"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
/* 2. SQUAD CONSOLE & ROSTER COMPONENT                                      */
/* ──────────────────────────────────────────────────────────────────────── */

function TeamCard({ team, user, assignedTable, setTeams, onReload }) {
  const [locking, setLocking] = useState(false)
  const [copied, setCopied] = useState('')
  const [editing, setEditing] = useState(false)
  const [teamName, setTeamName] = useState(team.name)
  const [teamSize, setTeamSize] = useState(team.size)
  const [emails, setEmails] = useState(
    (team.members || []).filter((m) => m.role !== 'leader').map((m) => m.email)
  )
  const [actionMsg, setActionMsg] = useState('')

  // Teammate management & edit states
  const [editingMember, setEditingMember] = useState(null)
  const [addingMember, setAddingMember] = useState(false)
  const [memberFormData, setMemberFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    college: '',
    rollNumber: '',
    course: 'B.Tech CSE',
    year: '1st',
    gender: 'male',
  })
  const [memberActionMsg, setMemberActionMsg] = useState('')
  const [memberSubmitting, setMemberSubmitting] = useState(false)

  const isLeader = team.leader?.email?.toLowerCase() === user.email?.toLowerCase() || team.isLeaderForThisTeam
  const isLocked = team.status === 'locked'
  const isDeadlinePassed = Date.now() > ROSTER_EDIT_DEADLINE
  const canModifyRoster = isLeader && !isLocked && !isDeadlinePassed
  const acceptedMembers = (team.members || []).filter((m) => m.status === 'accepted')
  const isFull = acceptedMembers.length >= team.size
  const teamCode = team.code || 'SQUAD5'

  const handleCopy = async (label, text) => {
    const ok = await copyText(text)
    if (ok) {
      setCopied(label)
      setTimeout(() => setCopied(''), 2000)
    }
  }

  const handleLock = async () => {
    setLocking(true)
    setActionMsg('')
    try {
      const res = await lockTeam(team.id)
      if (res.team) {
        setTeams((prev) =>
          prev.map((t) => (t.id === team.id ? { ...t, ...res.team, status: 'locked' } : t))
        )
      }
    } catch (err) {
      setActionMsg(err.message || 'Failed to lock squad.')
    } finally {
      setLocking(false)
    }
  }

  const handleRemoveMember = async (email) => {
    if (!canModifyRoster) {
      setActionMsg('Roster modifications are closed. Editing teammates was only allowed until 30th September.')
      return
    }
    const mem = (team.members || []).find(
      (m) => (m.email || '').toLowerCase() === (email || '').toLowerCase()
    )
    const memberName = mem?.name || mem?.firstName || email
    if (
      !window.confirm(
        `Are you sure you want to remove teammate "${memberName}" from squad "${team.name}"?`
      )
    ) {
      return
    }

    try {
      // Optimistically remove from state
      setTeams((prev) =>
        prev.map((t) => {
          if (t.id !== team.id) return t
          const updatedMembers = (t.members || []).filter(
            (m) => (m.email || '').toLowerCase() !== (email || '').toLowerCase()
          )
          return {
            ...t,
            members: updatedMembers,
            acceptedCount: updatedMembers.filter(
              (m) => (m.status === 'accepted' || m.status === 'confirmed') && !m.earlyExit
            ).length,
          }
        })
      )
      await removeMemberApi(team.id, email)
      setActionMsg(`✓ Teammate "${memberName}" removed successfully.`)
      setTimeout(() => setActionMsg(''), 4000)
      onReload()
    } catch (err) {
      setActionMsg(err.message || 'Could not remove member.')
    }
  }

  const handleUpdateMember = async (e) => {
    e.preventDefault()
    if (!editingMember) return
    setMemberActionMsg('')
    setMemberSubmitting(true)
    try {
      const res = await updateMemberApi(team.id, editingMember.email, memberFormData)
      if (res.team) {
        setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, ...res.team } : t)))
      }
      setEditingMember(null)
      onReload()
    } catch (err) {
      setMemberActionMsg(err.message || 'Failed to update member.')
    } finally {
      setMemberSubmitting(false)
    }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    setMemberActionMsg('')
    setMemberSubmitting(true)
    try {
      const res = await addMemberApi(team.id, memberFormData)
      if (res.team) {
        setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, ...res.team } : t)))
      }
      setAddingMember(false)
      onReload()
    } catch (err) {
      setMemberActionMsg(err.message || 'Failed to add member.')
    } finally {
      setMemberSubmitting(false)
    }
  }

  const handleSaveTeamEdit = async (e) => {
    e.preventDefault()
    setActionMsg('')
    try {
      const res = await editTeamApi(team.id, {
        name: teamName.trim(),
        size: teamSize,
        memberEmails: emails.filter(Boolean),
      })
      if (res.team) {
        setTeams((prev) =>
          prev.map((t) => (t.id === team.id ? { ...t, ...res.team } : t))
        )
        setEditing(false)
      }
    } catch (err) {
      setActionMsg(err.message || 'Failed to update squad.')
    }
  }

  return (
    <div className="bg-[#0a0d17]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 relative space-y-6 shadow-2xl">
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-tactical" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-tactical" />

      {/* Squad Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold font-sans text-white tracking-wide uppercase">
              {team.name}
            </h2>
            <div className="flex items-center gap-1.5 bg-[#141829] border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs font-mono">
              <span className="text-slate-400">TEAM CODE:</span>
              <span className="text-tactical font-bold">{teamCode}</span>
              <button
                type="button"
                onClick={() => handleCopy('code', teamCode)}
                className="text-slate-400 hover:text-white transition ml-1"
                title="Copy squad code"
              >
                {copied === 'code' ? '✓' : '⧉'}
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-[#141829] border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs font-mono">
              <span className="text-slate-400">TABLE:</span>
              <span className={assignedTable ? "text-tactical font-bold" : "text-amber-400 font-semibold text-[11px]"}>
                {assignedTable ? `TABLE ${assignedTable}` : 'NOT YET ASSIGNED'}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 font-mono">
            Hackathon Domain Track:{' '}
            <span className="text-tactical font-semibold">
              {team.trackName || 'Agentic AI & Neural Systems'}
            </span>
          </p>
        </div>

        {/* Squad Status & Capacity */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3 py-1.5 rounded-xl bg-[#131726] border border-slate-700 text-xs text-slate-300 font-mono">
            Confirmed: <strong className="text-tactical">{acceptedMembers.length}/{team.size}</strong>
          </span>
          {isLocked ? (
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-mono text-xs font-semibold flex items-center gap-1.5">
              🔒 ROSTER LOCKED
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-tactical/15 border border-tactical/40 text-tactical font-mono text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tactical animate-pulse" />
              OPEN ROSTER
            </span>
          )}
        </div>
      </div>

      {/* Live Roster Status Banner */}
      <div className="p-3.5 rounded-xl bg-[#0e1322] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="text-tactical font-bold text-sm">{acceptedMembers.length} of {team.size}</span>
          <span>Operatives Confirmed & Joined Squad</span>
        </div>
        {acceptedMembers.length < team.size ? (
          <span className="text-amber-400 text-[11px] font-medium flex items-center gap-1">
            <span>⏳</span> Waiting for {team.size - acceptedMembers.length} teammate(s) to enter their personalized code
          </span>
        ) : (
          <span className="text-sync text-[11px] font-medium flex items-center gap-1">
            <span>✓</span> All squad members confirmed! Ready for on-ground clearance.
          </span>
        )}
      </div>

      {/* Payment Verification Status Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono shadow-sm ${
        team.payment?.status === 'verified'
          ? 'bg-sync/10 border-sync/40 text-sync'
          : team.payment?.status === 'rejected'
          ? 'bg-red-500/10 border-red-500/40 text-red-300'
          : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl">
            {team.payment?.status === 'verified' ? '✓' : team.payment?.status === 'rejected' ? '✕' : '⏳'}
          </span>
          <div>
            <div className="font-sans font-bold text-sm text-white flex flex-wrap items-center gap-2">
              <span>
                {team.payment?.status === 'verified'
                  ? 'REGISTRATION PAYMENT VERIFIED & PASS ISSUED'
                  : team.payment?.status === 'rejected'
                  ? 'PAYMENT VERIFICATION REJECTED'
                  : 'PAYMENT UNDER ADMIN VERIFICATION'}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/40 border border-slate-700 text-tactical font-semibold">
                UTR: {team.payment?.utr || 'NOT_SUBMITTED'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              {team.payment?.status === 'verified'
                ? `Transaction verified by organizing committee. Official confirmation email sent to ${team.leader?.email || user.email}.`
                : team.payment?.status === 'rejected'
                ? `Reason: ${team.payment?.notes || 'UTR mismatch with bank records'}. Please contact organizers.`
                : `Organizing committee is matching your UTR against bank records. Confirmation email will be dispatched once verified.`}
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg text-xs font-bold font-mono bg-black/40 border border-slate-700 text-slate-200">
            ₹{team.payment?.amount || 800} Paid
          </span>
        </div>
      </div>

      {/* September 30 Roster Modification Deadline Banner */}
      {!isDeadlinePassed ? (
        <div className="p-3.5 rounded-xl bg-[#091220] border border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono shadow-sm">
          <div className="flex items-center gap-2.5 text-cyan-200">
            <span className="text-base">⏳</span>
            <span>
              <strong className="text-white">ROSTER MODIFICATIONS WINDOW:</strong> Teammates can be added, removed, or edited until{' '}
              <strong className="text-tactical">30th September 2026 (23:59 IST)</strong>.
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 whitespace-nowrap self-start sm:self-auto">
            ● WINDOW ACTIVE
          </span>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono shadow-sm">
          <div className="flex items-center gap-2.5 text-red-300">
            <span className="text-base">🔒</span>
            <span>
              <strong className="text-white">ROSTER FROZEN // DEADLINE PASSED (30TH SEPT):</strong> Teammate additions, removals, and details editing are permanently locked for Codefiesta 5.0.
            </span>
          </div>
          <span className="text-[10px] text-red-400 font-bold px-2.5 py-1 rounded bg-red-500/20 border border-red-500/40 whitespace-nowrap self-start sm:self-auto">
            ROSTER LOCKED
          </span>
        </div>
      )}

      {/* Member Roster List */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
          <h3 className="font-mono text-xs text-slate-300 tracking-wider uppercase font-semibold">
            Squad Operatives & Invite Codes ({team.members?.length || 0})
          </h3>
          <div className="flex items-center gap-2">
            {canModifyRoster && (team.members || []).length < 4 && (
              <button
                type="button"
                onClick={() => {
                  setAddingMember(true)
                  setEditingMember(null)
                  setMemberFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    college: team.leader?.college || '',
                    rollNumber: '',
                    course: 'B.Tech CSE',
                    year: '1st',
                    gender: 'male',
                  })
                  setMemberActionMsg('')
                }}
                className="px-3 py-1.5 rounded-lg bg-tactical hover:bg-[#e6a600] text-black font-mono text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <span>+</span>
                <span>ADD TEAMMATE</span>
              </button>
            )}
            {canModifyRoster && (
              <button
                type="button"
                onClick={() => setEditing(!editing)}
                className="text-xs font-mono text-tactical hover:underline"
              >
                {editing ? '[ Cancel Edit ]' : '[ Edit Squad Configuration ]'}
              </button>
            )}
            {isDeadlinePassed && (
              <span className="text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                🔒 Roster Sealed
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {(team.members || []).map((member, idx) => {
            const isSelf = member.email?.toLowerCase() === user.email?.toLowerCase()
            const isLead = member.role === 'leader'
            const isAccepted = member.status === 'accepted'
            const memberCode = member.inviteCode || teamCode

            return (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-xl bg-[#0d111e] border border-slate-800/90 hover:border-slate-700 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar
                      text={emailInitials(member.email || member.name)}
                      className={`w-9 h-9 rounded-xl text-xs ${
                        isLead
                          ? 'bg-tactical/20 border border-tactical text-tactical font-bold'
                          : 'bg-[#181e30] border border-slate-700 text-slate-300 font-bold'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-sans font-bold text-white truncate flex items-center gap-2">
                        <span>{member.name || member.email?.split('@')[0] || 'Teammate'}</span>
                        {isSelf && (
                          <span className="text-[10px] text-tactical font-mono font-normal">(YOU)</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono truncate mt-0.5">
                        {member.email} · {member.college || 'Participant'}
                        {member.phone ? ` · 📞 ${member.phone}` : ''}
                        {member.rollNumber ? ` · ID: ${member.rollNumber}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase font-bold ${
                        isLead
                          ? 'bg-tactical/15 text-tactical border border-tactical/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {isLead ? 'LEADER' : 'MEMBER'}
                    </span>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-mono font-semibold flex items-center gap-1.5 ${
                        isAccepted
                          ? 'bg-sync/15 text-sync border border-sync/40'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/40 animate-pulse'
                      }`}
                    >
                      {isAccepted ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-sync" />
                          <span>✓ CONFIRMED & JOINED</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span>⏳ INVITE PENDING</span>
                        </>
                      )}
                    </span>

                    {isLeader && !isLocked && !isLead && (
                      <div className="flex items-center gap-1.5">
                        {canModifyRoster ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMember(member)
                                setAddingMember(false)
                                setMemberFormData({
                                  firstName: member.firstName || member.name?.split(' ')[0] || '',
                                  lastName: member.lastName || member.name?.split(' ').slice(1).join(' ') || '',
                                  email: member.email || '',
                                  phone: member.phone || '',
                                  college: member.college || '',
                                  rollNumber: member.rollNumber || '',
                                  course: member.course || 'B.Tech CSE',
                                  year: member.year || '1st',
                                  gender: member.gender || 'male',
                                })
                                setMemberActionMsg('')
                              }}
                              className="text-[11px] text-slate-300 hover:text-tactical font-mono px-2 py-1 rounded bg-[#161c2e] hover:bg-[#1e243a] border border-slate-700 transition flex items-center gap-1"
                              title="Edit teammate details (allowed until 30th Sept)"
                            >
                              <span>✏️</span>
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.email)}
                              className="text-xs text-slate-500 hover:text-red-400 font-mono p-1 rounded hover:bg-red-500/10 transition"
                              title="Remove member (allowed until 30th Sept)"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <span
                            className="text-[10px] text-slate-500 font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
                            title="Modifications locked after 30th Sept"
                          >
                            🔒 Locked
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Per-Member Unique Join Code Box (For Teammates) */}
                {!isLead && (
                  <div className="pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#090c16]/70 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400 uppercase">Personal Join Code:</span>
                      <span className="text-xs font-mono font-bold text-tactical tracking-wider bg-[#141829] px-2.5 py-1 rounded border border-slate-700 select-all">
                        {memberCode}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(memberCode, memberCode)}
                        className="px-2.5 py-1 rounded bg-[#161c2e] hover:bg-tactical hover:text-black text-slate-300 font-mono text-[11px] transition flex items-center gap-1 border border-slate-700/80"
                      >
                        <span>{copied === memberCode ? '✓ COPIED!' : '📋 COPY CODE'}</span>
                      </button>

                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `Hey ${member.name || 'Hacker'}! Here is your exclusive personalized join code for squad "${team.name}" at Codefiesta 5.0: ${memberCode}. Enter this code at ${window.location.origin}/dashboard to confirm your spot!`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded bg-[#11291f] hover:bg-[#193a2c] text-emerald-300 font-mono text-[11px] transition flex items-center gap-1 border border-emerald-500/40"
                      >
                        <span>💬</span>
                        <span>SEND TO {(member.name || 'TEAMMATE').toUpperCase()}</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Edit Teammate Details Modal (Allowed strictly before Sept 30) */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b0e1a] border border-tactical/50 rounded-2xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-mono font-bold text-tactical uppercase tracking-wider">
                  EDIT TEAMMATE DETAILS
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Allowed until 30th September 2026
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">First Name *</label>
                  <input
                    type="text"
                    value={memberFormData.firstName}
                    onChange={(e) => setMemberFormData({ ...memberFormData, firstName: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={memberFormData.lastName}
                    onChange={(e) => setMemberFormData({ ...memberFormData, lastName: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={memberFormData.email}
                    onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Mobile (10-Digit) *</label>
                  <input
                    type="tel"
                    value={memberFormData.phone}
                    onChange={(e) => setMemberFormData({ ...memberFormData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">College Name *</label>
                  <input
                    type="text"
                    value={memberFormData.college}
                    onChange={(e) => setMemberFormData({ ...memberFormData, college: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Roll No. / ID *</label>
                  <input
                    type="text"
                    value={memberFormData.rollNumber}
                    onChange={(e) => setMemberFormData({ ...memberFormData, rollNumber: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Course *</label>
                  <input
                    type="text"
                    value={memberFormData.course}
                    onChange={(e) => setMemberFormData({ ...memberFormData, course: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Year *</label>
                  <select
                    value={memberFormData.year}
                    onChange={(e) => setMemberFormData({ ...memberFormData, year: e.target.value })}
                    className={inputClass}
                  >
                    {['1st', '2nd', '3rd', '4th'].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Sex *</label>
                  <select
                    value={memberFormData.gender}
                    onChange={(e) => setMemberFormData({ ...memberFormData, gender: e.target.value })}
                    className={inputClass}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              {memberActionMsg && (
                <p className="text-xs text-red-400 font-mono">⚠️ {memberActionMsg}</p>
              )}

              <div className="flex gap-2.5 pt-3">
                <button
                  type="submit"
                  disabled={memberSubmitting}
                  className="btn-ribbed bg-tactical text-black font-sans font-bold text-xs px-5 py-2.5 rounded-lg uppercase shadow flex-1 disabled:opacity-50"
                >
                  {memberSubmitting ? 'SAVING...' : 'SAVE TEAMMATE CHANGES'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="bg-[#171c2c] text-slate-300 font-sans text-xs px-4 py-2.5 rounded-lg uppercase hover:bg-[#1e243a]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Teammate Modal (Allowed strictly before Sept 30) */}
      {addingMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b0e1a] border border-tactical/50 rounded-2xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-mono font-bold text-tactical uppercase tracking-wider">
                  RECRUIT NEW TEAMMATE
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Allowed until 30th September 2026 (Max 4 Members)
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddingMember(false)}
                className="text-slate-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">First Name *</label>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={memberFormData.firstName}
                    onChange={(e) => setMemberFormData({ ...memberFormData, firstName: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Last Name *</label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={memberFormData.lastName}
                    onChange={(e) => setMemberFormData({ ...memberFormData, lastName: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Email Address *</label>
                  <input
                    type="email"
                    placeholder="teammate@college.edu"
                    value={memberFormData.email}
                    onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Mobile (10-Digit) *</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={memberFormData.phone}
                    onChange={(e) => setMemberFormData({ ...memberFormData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">College Name *</label>
                  <input
                    type="text"
                    placeholder={team.leader?.college || 'College Name'}
                    value={memberFormData.college}
                    onChange={(e) => setMemberFormData({ ...memberFormData, college: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Roll No. / ID *</label>
                  <input
                    type="text"
                    placeholder="23GIT1003"
                    value={memberFormData.rollNumber}
                    onChange={(e) => setMemberFormData({ ...memberFormData, rollNumber: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Course *</label>
                  <input
                    type="text"
                    placeholder="B.Tech CSE"
                    value={memberFormData.course}
                    onChange={(e) => setMemberFormData({ ...memberFormData, course: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Year *</label>
                  <select
                    value={memberFormData.year}
                    onChange={(e) => setMemberFormData({ ...memberFormData, year: e.target.value })}
                    className={inputClass}
                  >
                    {['1st', '2nd', '3rd', '4th'].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Sex *</label>
                  <select
                    value={memberFormData.gender}
                    onChange={(e) => setMemberFormData({ ...memberFormData, gender: e.target.value })}
                    className={inputClass}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              {memberActionMsg && (
                <p className="text-xs text-red-400 font-mono">⚠️ {memberActionMsg}</p>
              )}

              <div className="flex gap-2.5 pt-3">
                <button
                  type="submit"
                  disabled={memberSubmitting}
                  className="btn-ribbed bg-tactical text-black font-sans font-bold text-xs px-5 py-2.5 rounded-lg uppercase shadow flex-1 disabled:opacity-50"
                >
                  {memberSubmitting ? 'ENROLLING...' : 'ENROLL TEAMMATE & GENERATE CODE'}
                </button>
                <button
                  type="button"
                  onClick={() => setAddingMember(false)}
                  className="bg-[#171c2c] text-slate-300 font-sans text-xs px-4 py-2.5 rounded-lg uppercase hover:bg-[#1e243a]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leader Edit Squad Form */}
      {editing && (
        <form onSubmit={handleSaveTeamEdit} className="p-5 rounded-xl bg-[#0f1426] border border-tactical/40 space-y-4">
          <div className="font-mono text-xs text-tactical font-semibold uppercase">EDIT SQUAD CONFIGURATION</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Squad Name</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Team Size</label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setTeamSize(s)
                      const needed = Math.max(0, s - 1)
                      setEmails((prev) => Array.from({ length: needed }, (_, i) => prev[i] || ''))
                    }}
                    className={`rounded-lg py-2 text-xs font-mono font-bold transition ${
                      teamSize === s ? 'bg-tactical text-black shadow' : 'bg-[#151a2c] text-slate-300 border border-slate-700'
                    }`}
                  >
                    {s} PLAYERS
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2.5 pt-2">
            <button
              type="submit"
              className="btn-ribbed bg-tactical text-black font-sans font-bold text-xs px-5 py-2.5 rounded-lg uppercase shadow"
            >
              SAVE SQUAD CHANGES
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="bg-[#171c2c] text-slate-300 font-sans text-xs px-4 py-2.5 rounded-lg uppercase hover:bg-[#1e243a]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Squad Locking Gate & Payment Proceed */}
      <div className="pt-4 border-t border-slate-800/80">
        {isLocked ? (
          <div className="rounded-xl bg-[#0e1322] border border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 font-mono">
              <span className="text-sync text-base">✓</span>
              <span>Squad roster is officially locked. Proceed to payment verification if not completed.</span>
            </div>
            {isLeader && (
              <Link
                to="/payment"
                className="btn-ribbed bg-tactical hover:bg-[#e6a600] text-black font-sans font-bold text-xs sm:text-sm px-6 py-3 rounded-xl border-b-2 border-[#b28200] uppercase tracking-wider whitespace-nowrap text-center shadow-lg"
              >
                PAYMENT PORTAL &gt;&gt;
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-slate-400 font-mono leading-relaxed">
              {isFull
                ? 'All slots filled! Squad leader can now lock the roster to finalize enrollment.'
                : `Waiting for teammates to enter their personal join codes (${acceptedMembers.length}/${team.size} confirmed).`}
            </p>
            {isLeader && isFull && (
              <button
                type="button"
                onClick={handleLock}
                disabled={locking}
                className="btn-ribbed bg-tactical hover:bg-[#e6a600] text-black font-sans font-bold text-xs sm:text-sm px-7 py-3 rounded-xl border-b-2 border-[#b28200] uppercase tracking-wider disabled:opacity-50 shadow-lg"
              >
                {locking ? 'LOCKING...' : 'LOCK SQUAD & PROCEED >>'}
              </button>
            )}
          </div>
        )}
      </div>

      {actionMsg && <p className="text-xs text-red-400 font-mono">{actionMsg}</p>}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
/* 3. PROBLEM TRACKS & THEMES SELECTION COMPONENT                          */
/* ──────────────────────────────────────────────────────────────────────── */

function ProblemTracksSection({ myTeam, isLeader, user, onTrackUpdated, problemStatementsReleased, problemStatements }) {
  const [selectedTrack, setSelectedTrack] = useState(myTeam?.track || 'agentic_ai')
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const tracksToDisplay =
    Array.isArray(problemStatements) && problemStatements.length > 0
      ? problemStatements
      : OFFICIAL_TRACKS

  useEffect(() => {
    if (myTeam?.track) {
      setSelectedTrack(myTeam.track)
    }
  }, [myTeam])

  const handleSelectTrack = async (track) => {
    if (!myTeam || !isLeader) return
    setSelectedTrack(track.id)
    setSaving(true)
    setSuccessMsg('')
    try {
      const res = await updateTeamTrackApi(myTeam.id, track.id, track.title)
      if (res.team) {
        onTrackUpdated(res.team)
        setSuccessMsg(`Locked in track: ${track.title}`)
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    } catch {
      // Handled gracefully in mock
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 bg-[#0a0d17]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 relative shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg sm:text-xl font-bold font-sans text-white tracking-wide uppercase flex items-center gap-2">
            <span>🎯</span> OFFICIAL HACKATHON TRACKS & CHALLENGES
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-mono">
            Review the official problem tracks. The squad leader locks in your team's primary track on hackathon day.
          </p>
        </div>

        {myTeam && (
          <div className="text-xs font-mono bg-[#121626] border border-slate-700/80 px-3 py-1.5 rounded-xl text-tactical">
            Current: <strong>{myTeam.trackName || 'Agentic AI'}</strong>
          </div>
        )}
      </div>

      {/* Dynamic Release Gate: Encrypted Vault vs Live Challenges */}
      {!problemStatementsReleased ? (
        <div className="p-6 sm:p-10 rounded-2xl bg-[#0e1324]/90 border border-amber-500/30 text-amber-300 relative overflow-hidden shadow-xl">
          <div className="flex flex-col items-center text-center max-w-xl mx-auto py-4 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-3xl shadow-inner">
              🔒
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-medium tracking-wide">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                SECURITY CLEARANCE LEVEL 4 ENCRYPTION
              </div>
              <h3 className="text-lg sm:text-2xl font-bold font-sans text-white tracking-wide uppercase">
                Problem Statements & Track Themes Classified
              </h3>
              <p className="text-xs sm:text-sm font-mono text-slate-300 leading-relaxed">
                To guarantee 100% fair competition across all registered squads, specific hackathon challenge statements and theme briefs are held under cryptographic director vault encryption. The Admin Ops Center will unveil and push all 14 official problem tracks live on hackathon morning (October 8, 2026).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-4 text-left">
              <div className="p-3.5 rounded-xl bg-[#121727] border border-slate-800">
                <div className="text-[10px] font-mono text-tactical font-semibold uppercase">Status</div>
                <div className="text-xs text-white font-mono mt-0.5">Encrypted in Vault</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#121727] border border-slate-800">
                <div className="text-[10px] font-mono text-tactical font-semibold uppercase">Flag-Off Day</div>
                <div className="text-xs text-white font-mono mt-0.5">Oct 8, 10:00 AM</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#121727] border border-slate-800">
                <div className="text-[10px] font-mono text-tactical font-semibold uppercase">Next Directive</div>
                <div className="text-xs text-white font-mono mt-0.5">Complete Squad & Codes</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="p-4 sm:p-5 rounded-2xl bg-sync/10 border border-sync/40 text-sync flex items-start gap-3.5 shadow-lg">
            <span className="text-3xl">🔓</span>
            <div>
              <div className="text-sm sm:text-base font-bold font-sans uppercase tracking-wider text-sync flex items-center gap-2">
                <span>OFFICIAL PROBLEM STATEMENTS UNLOCKED & LIVE</span>
                <span className="px-2 py-0.5 rounded-md bg-sync/20 text-sync text-[10px] font-mono">ALL SQUADS GRANTED ACCESS</span>
              </div>
              <p className="text-xs sm:text-sm font-mono text-slate-300 mt-1 leading-relaxed">
                Admin Ops Center has unlocked hackathon challenges. All registered squads can now review challenge briefs and lock in their squad track below.
              </p>
            </div>
          </div>

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-sync/10 border border-sync/40 text-sync text-xs font-mono">
              ✓ {successMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {tracksToDisplay.map((track) => {
              const isCurrent = (myTeam?.track || 'agentic_ai') === track.id
              return (
                <div
                  key={track.id}
                  className={`p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between shadow-lg ${
                    isCurrent
                      ? 'bg-[#111626] border-tactical shadow-tactical/10'
                      : 'bg-[#0e1220]/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl">{track.icon}</span>
                      {isCurrent && (
                        <span className="px-2.5 py-1 rounded-full bg-tactical text-black font-mono text-[10px] uppercase font-bold shadow">
                          ACTIVE SQUAD TRACK
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold font-sans text-white mb-1">{track.title}</h3>
                    <p className="text-xs text-tactical font-mono mb-3">{track.tagline}</p>
                    <p className="text-xs sm:text-sm text-slate-300 font-mono leading-relaxed mb-4">
                      {track.brief}
                    </p>

                    <div className="border-t border-slate-800/80 pt-3.5">
                      <div className="text-[11px] font-mono text-tactical mb-2 uppercase font-bold flex items-center gap-1.5">
                        <span>🎯</span> Problem Statements:
                      </div>
                      <ul className="space-y-2 text-xs text-slate-300 font-mono list-disc list-inside">
                        {(track.problemStatements || track.deliverables || []).map((ps, i) => (
                          <li key={i} className="leading-snug">{ps}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {myTeam && isLeader && !isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleSelectTrack(track)}
                      disabled={saving}
                      className="mt-6 w-full btn-ribbed bg-tactical hover:bg-[#e6a600] text-black font-sans font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition shadow"
                    >
                      SELECT THIS TRACK &gt;&gt;
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
/* 4. ON-GROUND EVALUATION & SCORING LEDGER (Dual Rounds: R1 & R2)         */
/* ──────────────────────────────────────────────────────────────────────── */

function OnGroundEvaluationLedger({ myTeam, user, assignedTable, evaluation, hackathonState }) {
  const cleanMyTeamTable = myTeam?.tableNumber && myTeam.tableNumber !== 'T-14' && myTeam.tableNumber !== 'UNASSIGNED' ? myTeam.tableNumber : null
  const table = (assignedTable && assignedTable !== 'T-14' && assignedTable !== 'UNASSIGNED' ? assignedTable : cleanMyTeamTable) || null
  const evaluationsList = hackathonState?.evaluations || []

  const r1Eval = evaluationsList.find(
    (e) => e.teamId === myTeam?.id && (e.round === 'round1' || !e.round)
  ) || myTeam?.round1Evaluation || (evaluation?.round === 'round1' || !evaluation?.round ? evaluation : null)

  const r2Eval = evaluationsList.find(
    (e) => e.teamId === myTeam?.id && e.round === 'round2'
  ) || myTeam?.round2Evaluation || (evaluation?.round === 'round2' ? evaluation : null)

  const isR1Open = !!hackathonState?.evaluationRounds?.round1
  const isR2Open = !!hackathonState?.evaluationRounds?.round2

  const cumulativeTotal = (r1Eval?.total || 0) + (r2Eval?.total || 0)
  const maxPossible = (r1Eval ? 100 : 0) + (r2Eval ? 100 : 0)

  return (
    <div className="space-y-6 bg-[#0a0d17]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 relative shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-sans font-bold text-lg sm:text-xl text-white tracking-wide uppercase flex items-center gap-2">
              <span>⚖️</span> ON-GROUND EVALUATION & SCORING LEDGER (2 ROUNDS)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-mono">
            Direct In-Person Physical Jury Review · Sitapura Campus, GIT Jaipur · <strong className="text-tactical">No Slide Deck Upload Required</strong>
          </p>
        </div>

        {/* Overall Cumulative Score Badge */}
        {(r1Eval || r2Eval) ? (
          <div className="px-4 py-2.5 rounded-xl bg-[#0e1424] border border-tactical/60 flex items-center gap-3 shadow-lg">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">CUMULATIVE SCORE:</div>
            <div className="text-xl font-bold font-mono text-tactical">
              {cumulativeTotal} <span className="text-xs text-slate-500 font-mono">/ {maxPossible || 200}</span>
            </div>
          </div>
        ) : (
          <span className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs font-mono flex items-center gap-1.5">
            ● AWAITING ON-GROUND ROUNDS
          </span>
        )}
      </div>

      {/* Desk Location & Physical Protocol Notice */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 p-5 rounded-xl bg-[#0e121d] border border-tactical/40 flex flex-col justify-between shadow-md">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">
              ASSIGNED WORKSTATION TABLE
            </div>
            <div className={`text-2xl font-bold font-mono ${table ? 'text-tactical' : 'text-amber-400'}`}>
              {table ? `TABLE ${table}` : 'NOT YET ASSIGNED'}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-1 leading-relaxed">
              {table
                ? 'Mentors and judges report directly to this table for evaluation rounds'
                : 'Workstation desk will be allocated on-ground by Admin upon venue arrival'}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${table ? 'bg-sync' : 'bg-amber-400 animate-pulse'}`} />
            <span className={table ? 'text-slate-300' : 'text-amber-400/90 font-medium'}>
              {table ? 'Station Allocation Verified' : 'Awaiting On-Ground Table Allocation'}
            </span>
          </div>
        </div>

        <div className="md:col-span-2 p-5 rounded-xl bg-[#0e121d] border border-slate-800 text-xs font-mono space-y-2.5 shadow-md">
          <div className="text-tactical font-mono font-semibold text-xs uppercase tracking-wider">
            ON-GROUND PROTOCOL (NO PPT UPLOAD REQUIRED)
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">
            Codefiesta 5.0 conducts all evaluations in-person across 2 milestones. Mentors visit your table during active rounds to inspect your running localhost prototype, architecture, and pitch directly on your machines.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="text-sync">✓</span> Local dev server active
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sync">✓</span> Working feature demo
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sync">✓</span> Slide deck on laptop
            </div>
          </div>
        </div>
      </div>

      {/* Dual Assessment Scorecards */}
      <div className="space-y-6">
        {/* ROUND 1: First Assessment Round */}
        <div className={`p-6 rounded-2xl border transition shadow-lg ${
          r1Eval
            ? 'bg-[#0b101c] border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.08)]'
            : isR1Open
            ? 'bg-[#0e1422] border-cyan-500/40'
            : 'bg-[#0a0d16] border-slate-800'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-sans font-bold text-sm sm:text-base text-white uppercase">
                  ROUND 1: FIRST ASSESSMENT (5:00 PM MILESTONE)
                </span>
                {isR1Open ? (
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500 text-cyan-300 font-mono text-[10px] flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    LIVE ON-GROUND
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px]">
                    LOCKED BY OPS
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Initial architecture, idea feasibility, code scaffolding & repo check.
              </p>
            </div>

            {r1Eval && (
              <div className="text-right">
                <div className="font-mono font-bold text-2xl text-cyan-400">
                  {r1Eval.total} <span className="text-xs text-slate-500 font-mono">/ 100</span>
                </div>
                <div className="text-[9px] font-mono text-sync font-semibold">🔒 PERMANENTLY LOCKED</div>
              </div>
            )}
          </div>

          {r1Eval ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#101526] border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Innovation</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">{r1Eval.scores?.innovation ?? r1Eval.innovation} <span className="text-xs text-slate-500">/ 30</span></div>
                </div>
                <div className="p-3 rounded-xl bg-[#101526] border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Tech Architecture</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">{r1Eval.scores?.tech ?? r1Eval.tech} <span className="text-xs text-slate-500">/ 30</span></div>
                </div>
                <div className="p-3 rounded-xl bg-[#101526] border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Feasibility</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">{r1Eval.scores?.feasibility ?? r1Eval.feasibility} <span className="text-xs text-slate-500">/ 20</span></div>
                </div>
                <div className="p-3 rounded-xl bg-[#101526] border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Pitch & Deck</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">{r1Eval.scores?.pitch ?? r1Eval.pitch} <span className="text-xs text-slate-500">/ 20</span></div>
                </div>
              </div>

              {(r1Eval.comments || r1Eval.notes) && (
                <div className="p-4 rounded-xl bg-[#0f1424] border border-slate-800 text-xs font-mono">
                  <div className="text-xs font-mono text-cyan-300 uppercase mb-1 font-semibold">Mentor Evaluation Feedback:</div>
                  <div className="text-slate-300 italic text-xs leading-relaxed">"{r1Eval.comments || r1Eval.notes}"</div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-[#080b13] border border-dashed border-slate-800 text-center text-xs font-mono text-slate-400">
              {isR1Open ? (
                <span className="text-cyan-300 font-mono font-medium">
                  ⏳ Round 1 is in progress on-ground. Mentors are visiting Table {table || 'TBD'}.
                </span>
              ) : (
                'Round 1 will unlock on-ground when announced by the organizing directors.'
              )}
            </div>
          )}
        </div>

        {/* ROUND 2: Second Assessment Round */}
        <div className={`p-6 rounded-2xl border transition shadow-lg ${
          r2Eval
            ? 'bg-[#18110b] border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
            : isR2Open
            ? 'bg-[#16121f] border-amber-500/40'
            : 'bg-[#0a0d16] border-slate-800'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-sans font-bold text-sm sm:text-base text-white uppercase">
                  ROUND 2: SECOND ASSESSMENT (11:00 PM MILESTONE)
                </span>
                {isR2Open ? (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500 text-amber-300 font-mono text-[10px] flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    LIVE ON-GROUND
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px]">
                    LOCKED BY OPS
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Deep tech execution, working API / contract integration, feature completion & demo readiness.
              </p>
            </div>

            {r2Eval && (
              <div className="text-right">
                <div className="font-mono font-bold text-2xl text-amber-400">
                  {r2Eval.total} <span className="text-xs text-slate-500 font-mono">/ 100</span>
                </div>
                <div className="text-[9px] font-mono text-sync font-semibold">🔒 PERMANENTLY LOCKED</div>
              </div>
            )}
          </div>

          {r2Eval ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#1f150f] border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Innovation</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">{r2Eval.scores?.innovation ?? r2Eval.innovation} <span className="text-xs text-slate-500">/ 30</span></div>
                </div>
                <div className="p-3 rounded-xl bg-[#1f150f] border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Tech Architecture</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">{r2Eval.scores?.tech ?? r2Eval.tech} <span className="text-xs text-slate-500">/ 30</span></div>
                </div>
                <div className="p-3 rounded-xl bg-[#1f150f] border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Feasibility</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">{r2Eval.scores?.feasibility ?? r2Eval.feasibility} <span className="text-xs text-slate-500">/ 20</span></div>
                </div>
                <div className="p-3 rounded-xl bg-[#1f150f] border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Pitch & Demo</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">{r2Eval.scores?.pitch ?? r2Eval.pitch} <span className="text-xs text-slate-500">/ 20</span></div>
                </div>
              </div>

              {(r2Eval.comments || r2Eval.notes) && (
                <div className="p-4 rounded-xl bg-[#1f150f] border border-slate-800 text-xs font-mono">
                  <div className="text-xs font-mono text-amber-300 uppercase mb-1 font-semibold">Mentor Evaluation Feedback:</div>
                  <div className="text-slate-300 italic text-xs leading-relaxed">"{r2Eval.comments || r2Eval.notes}"</div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-[#080b13] border border-dashed border-slate-800 text-center text-xs font-mono text-slate-400">
              {isR2Open ? (
                <span className="text-amber-300 font-mono font-medium">
                  ⏳ Round 2 is in progress on-ground. Mentors are visiting Table {table || 'TBD'}.
                </span>
              ) : (
                'Round 2 will unlock on-ground when announced by the organizing directors.'
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


/* ──────────────────────────────────────────────────────────────────────── */
/* 5. CYBER HACKER EVENT PASS (Printable & Downloadable)                   */
/* ──────────────────────────────────────────────────────────────────────── */

function EventPassSection({ user, team, assignedTable }) {
  const passRef = useRef(null)

  const handlePrint = () => {
    window.print()
  }

  const teamName = team?.name || 'SOLO_OPERATIVE'
  const teamCode = team?.code || 'CF5-INDV'
  const trackName = team?.trackName || 'Agentic AI & Neural Systems'
  const fullName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Hacker Pilot'
  const college = user.college || 'Global Institute of Technology, Jaipur'
  const passId = `CF5-${(user.id || '0000').slice(-6).toUpperCase()}`

  return (
    <div className="space-y-4 bg-[#0b0e17] border border-slate-800 rounded-xl p-5 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <h2 className="font-sans font-bold text-sm sm:text-base text-white tracking-wide uppercase flex items-center gap-2">
            <span>🎫</span> OFFICIAL HACKER EVENT PASS
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Your credentials for physical reporting, badge collection, and WiFi access at GIT Jaipur on October 8, 2026.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="btn-ribbed bg-tactical hover:bg-[#e6a600] text-black font-mono font-bold text-xs px-4 py-2.5 rounded border-b-2 border-[#b28200] uppercase tracking-wider transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>🖨️</span> PRINT / SAVE PASS
        </button>
      </div>

      {/* Futuristic Holographic Event Pass Card */}
      <div
        ref={passRef}
        className="max-w-xl mx-auto rounded-xl p-6 sm:p-8 bg-gradient-to-br from-[#101422] via-[#090b13] to-[#121626] border-2 border-tactical/80 shadow-[0_0_25px_rgba(255,184,0,0.15)] relative overflow-hidden"
      >
        {/* Holographic Watermark Badge */}
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full border border-tactical/20 bg-tactical/5 pointer-events-none" />
        <div className="absolute top-2.5 right-4 text-[9px] font-mono font-semibold text-tactical/60 tracking-widest uppercase">
          OFFICIAL BADGE // CODEFIESTA 5.0
        </div>

        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-tactical text-black font-sans font-black text-xs flex items-center justify-center">
              CF
            </div>
            <div>
              <div className="font-sans font-bold text-sm text-white tracking-wider">CODEFIESTA 5.0</div>
              <div className="text-[9px] font-mono text-slate-400 uppercase">24-Hour National Hackathon</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-tactical text-sm">{passId}</div>
            <div className="text-[9px] font-mono text-sync uppercase font-medium">ACCESS GRANTED</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="sm:col-span-2 space-y-3">
            <div>
              <span className="text-[10px] font-mono text-slate-400 block uppercase font-medium tracking-wider">Hacker Name</span>
              <span className="text-sm font-bold text-white font-mono">{fullName}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 block uppercase font-medium tracking-wider">College / Institute</span>
              <span className="text-xs text-slate-200 font-mono">{college}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-medium tracking-wider">Squad</span>
                <span className="text-xs text-tactical font-mono font-bold">{teamName}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-medium tracking-wider">Squad Code</span>
                <span className="text-xs text-slate-200 font-mono">{teamCode}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 block uppercase font-medium tracking-wider">Assigned Table</span>
              <span className="text-xs text-tactical font-mono font-bold">{assignedTable ? `TABLE ${assignedTable}` : 'PENDING ALLOCATION'}</span>
            </div>
          </div>

          {/* QR Verification Visual - Unique Per Hacker */}
          <div className="flex flex-col items-center justify-center p-3 bg-[#080910] border border-tactical/30 rounded-lg shadow-inner">
            <div className="bg-white p-1.5 rounded-md flex items-center justify-center shadow-lg">
              <QRCodeSvg
                value={`CF5:${team?.id || 'INDV'}:${user?.email || 'user'}:${passId}`}
                size={82}
              />
            </div>
            <span className="text-[9px] font-mono font-bold text-tactical mt-2.5 tracking-widest uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sync animate-ping" />
              SCAN AT GATE
            </span>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-3 text-[10px] font-mono text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span>Venue: Global Institute of Technology, Sitapura, Jaipur</span>
          <span className="text-tactical font-semibold">Reporting: Oct 8, 2026 · 8:00 AM</span>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
/* 6. HACKATHON SCHEDULE, RULES & HELPLINE                                  */
/* ──────────────────────────────────────────────────────────────────────── */

function ResourcesSection() {
  const TIMELINE_EVENTS = [
    { time: '08:30 AM', day: 'Day 1 (Oct 8)', title: 'Reporting & Badge Collection' },
    { time: '09:30 AM', day: 'Day 1 (Oct 8)', title: 'Inauguration Ceremony' },
    { time: '10:30 AM', day: 'Day 1 (Oct 8)', title: 'Hackathon Starts (24-Hour Build Sprint)' },
    { time: '12:00 PM', day: 'Day 1 (Oct 8)', title: 'Session-1 Mentoring & Architecture Review' },
    { time: '01:00 PM', day: 'Day 1 (Oct 8)', title: 'Lunch Break & Refreshments' },
    { time: '02:00 PM', day: 'Day 1 (Oct 8)', title: 'Session-2 Mentoring & Code Triage' },
    { time: '05:00 PM', day: 'Day 1 (Oct 8)', title: 'FIRST ASSESSMENT ROUND (Round 1)', highlight: true },
    { time: '06:30 PM', day: 'Day 1 (Oct 8)', title: 'Session-3 Mentoring & Debugging' },
    { time: '07:30 PM', day: 'Day 1 (Oct 8)', title: 'Dinner Break' },
    { time: '09:00 PM', day: 'Day 1 (Oct 8)', title: 'Cultural Night & Chill Session' },
    { time: '11:00 PM', day: 'Day 1 (Oct 8)', title: 'SECOND ASSESSMENT ROUND (Round 2)', highlight: true },
    { time: '12:30 AM', day: 'Day 2 (Oct 9)', title: 'Midnight Games & Quizzes' },
    { time: '07:00 AM', day: 'Day 2 (Oct 9)', title: 'Happiness & Energizer Session' },
    { time: '08:00 AM', day: 'Day 2 (Oct 9)', title: 'Breakfast' },
    { time: '10:00 AM', day: 'Day 2 (Oct 9)', title: 'Final Assessment Round & Prototype Freeze' },
    { time: '11:00 AM', day: 'Day 2 (Oct 9)', title: 'Power Judging Round (Stage Pitches)' },
    { time: '12:00 PM', day: 'Day 2 (Oct 9)', title: 'Grand Result Announcement & Awards (₹1.5L+)' },
  ]

  const CRITERIA = [
    { title: 'Technical Innovation (30%)', desc: 'Originality, architectural depth, and creative use of modern paradigms.' },
    { title: 'Implementation & Working Prototype (25%)', desc: 'Code completeness, live demo functionality, and GitHub commit cadence.' },
    { title: 'Real-World Impact & Feasibility (25%)', desc: 'Practical utility, scalability, and market or societal value.' },
    { title: 'Pitch & Demonstration (20%)', desc: 'Clarity of presentation, slide deck design, and handling jury Q&A.' },
  ]

  return (
    <div className="space-y-8 bg-[#0b0e17] border border-slate-800 rounded-xl p-5 sm:p-8">
      <div>
        <h2 className="font-sans font-bold text-sm sm:text-base text-white tracking-wide uppercase flex items-center gap-2">
          <span>📜</span> HACKATHON SCHEDULE & JURY DIRECTIVES
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Essential guidelines for all participants competing in Codefiesta 5.0.
        </p>
      </div>

      {/* 24-Hour Schedule Timeline */}
      <div>
        <h3 className="font-mono text-xs font-bold text-tactical mb-3 uppercase tracking-wider">
          24-HOUR HACKATHON TIMELINE (OCTOBER 8–9, 2026)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TIMELINE_EVENTS.map((ev, i) => (
            <div key={i} className="p-3.5 rounded bg-[#0f121d] border border-slate-800 text-xs font-mono">
              <div className="flex items-center justify-between text-xs text-tactical font-mono font-semibold mb-1">
                <span>{ev.time}</span>
                <span className="text-slate-400">{ev.day}</span>
              </div>
              <div className="text-white font-medium">{ev.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Evaluation Matrix */}
      <div>
        <h3 className="font-mono text-xs font-bold text-sync mb-3 uppercase tracking-wider">
          SCORING & EVALUATION CRITERIA
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CRITERIA.map((c, i) => (
            <div key={i} className="p-3.5 rounded bg-[#0f121d] border border-slate-800 text-xs font-mono">
              <div className="text-white font-sans font-semibold text-xs sm:text-sm mb-1">{c.title}</div>
              <div className="text-slate-400 text-[11px]">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Organizer Contacts & Helpline */}
      <div className="p-4 rounded-lg bg-[#111420] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-sans font-bold text-xs sm:text-sm text-white uppercase tracking-wide">NEED HELP OR HAVE QUESTIONS?</div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Organizing Committee: Global Institute of Technology, Jaipur
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="https://wa.me/919234629282"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-1"
          >
            <span>💬</span> WhatsApp Helpline
          </a>
          <a
            href="https://www.instagram.com/_gitjaipur"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-mono flex items-center gap-1"
          >
            <span>📷</span> @_gitjaipur
          </a>
        </div>
      </div>
    </div>
  )
}
