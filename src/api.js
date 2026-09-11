import { BACKEND_URL } from './config.js'

export const getApiOrigin = () => {
  if (BACKEND_URL && !BACKEND_URL.startsWith('/') && !BACKEND_URL.includes('localhost') && !BACKEND_URL.includes('127.0.0.1')) {
    return BACKEND_URL.replace(/\/+$/, '')
  }
  return typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost:5173'
}

// Hard Roster Edit Cut-off: September 30, 2026 23:59:59 IST
export const ROSTER_EDIT_DEADLINE = new Date('2026-09-30T23:59:59').getTime()

const DEFAULT_USER = {
  id: "6aa313802c7891f56620e73f",
  email: "operator@gitjaipur.com",
  firstName: "Arjun",
  lastName: "Sharma",
  phone: "9876543210",
  college: "Global Institute of Technology, Jaipur",
  rollNumber: "23GIT1001",
  course: "B.Tech CSE",
  year: "3rd",
  gender: "male",
}

const DEFAULT_TEAM = {
  id: "6aa314902c7891f56620e74a",
  name: "CYBER_VORTEX",
  code: "VORTEX5",
  size: 3,
  status: "locked",
  track: "agentic_ai",
  trackName: "Agentic AI & Neural Systems",
  isLeaderForThisTeam: true,
  acceptedCount: 3,
  canLock: false,
  tableNumber: null,
  leader: {
    email: "operator@gitjaipur.com",
    name: "Arjun Sharma",
    college: "Global Institute of Technology, Jaipur",
  },
  members: [
    {
      id: "mem_1",
      name: "Arjun Sharma",
      email: "operator@gitjaipur.com",
      college: "Global Institute of Technology, Jaipur",
      role: "leader",
      status: "accepted",
    },
    {
      id: "mem_2",
      name: "Alex Rivera",
      email: "alex.rivera@iitb.ac.in",
      college: "IIT Bombay",
      role: "member",
      status: "accepted",
    },
    {
      id: "mem_3",
      name: "Priya Patel",
      email: "priya.patel@mnit.ac.in",
      college: "MNIT Jaipur",
      role: "member",
      status: "accepted",
    },
  ],
  invites: [
    {
      email: "alex.rivera@iitb.ac.in",
      token: "tok_alex_99182",
      inviteLink: "/invite/tok_alex_99182",
    },
    {
      email: "priya.patel@mnit.ac.in",
      token: "tok_priya_77123",
      inviteLink: "/invite/tok_priya_77123",
    },
  ],
  payment: {
    status: "submitted",
    utr: "428901238910",
    submittedAt: "2026-09-10T20:00:00.000Z",
  },
}

export const getStoredAdminKey = () => {
  try {
    return (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('cf_admin_passkey')) || ''
  } catch {
    return ''
  }
}

export const ADMIN_VAULT_KEY = '' // Deprecated: secrets are not bundled into public client assets

// Shared Store Sync (Cross-Tab, Incognito & Multi-Device Sync)
export function mergeMembers(membersA = [], membersB = []) {
  const memberMap = new Map()

  const addOrUpdate = (m) => {
    if (!m) return
    const key = (m.email || m.token || m.inviteCode || m.id || '').toLowerCase().trim()
    if (!key) return

    const existing = memberMap.get(key)
    if (!existing) {
      memberMap.set(key, { ...m })
    } else {
      const isAccepted =
        existing.status === 'accepted' ||
        m.status === 'accepted' ||
        existing.status === 'confirmed' ||
        m.status === 'confirmed'
      const status = isAccepted ? 'accepted' : (m.status || existing.status || 'pending')
      const checkedIn = !!(existing.checkedIn || m.checkedIn)
      memberMap.set(key, {
        ...existing,
        ...m,
        status,
        checkedIn,
        name: m.name || existing.name || '',
        firstName: m.firstName || existing.firstName || '',
        lastName: m.lastName || existing.lastName || '',
        phone: m.phone || existing.phone || '',
        college: m.college || existing.college || '',
        rollNumber: m.rollNumber || existing.rollNumber || '',
        course: m.course || existing.course || '',
        year: m.year || existing.year || '',
        gender: m.gender || existing.gender || '',
        role: existing.role === 'leader' || m.role === 'leader' ? 'leader' : (m.role || existing.role || 'member'),
        inviteCode: m.inviteCode || existing.inviteCode || '',
        token: m.token || existing.token || '',
      })
    }
  }

  for (const m of membersB) addOrUpdate(m)
  for (const m of membersA) addOrUpdate(m)

  return Array.from(memberMap.values())
}

// Request deduplication & throttling to protect backend from client stampedes
let activeSyncPromise = null
let lastSyncTimestamp = 0
let lastSyncResult = null

// Shared Store Sync (Cross-Tab, Incognito & Multi-Device Sync)
export async function syncWithSharedStore(forceOverwrite = false) {
  if (typeof fetch === 'undefined') return lastSyncResult

  const now = Date.now()
  // Throttle: If synced less than 2s ago and not forced, return cached result immediately
  if (!forceOverwrite && lastSyncResult && now - lastSyncTimestamp < 2000) {
    return lastSyncResult
  }

  // Coalesce: If a sync is already in flight, reuse the same active promise
  if (activeSyncPromise) {
    return activeSyncPromise
  }

  activeSyncPromise = (async () => {
    try {
      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/shared-store?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (!res.ok) return lastSyncResult
      const json = await res.json().catch(() => null)
      if (!json?.data) return lastSyncResult

      const { teams, users, opsState, problemStatements } = json.data
      let finalTeams = []

      if (Array.isArray(teams)) {
        if (forceOverwrite) {
          // Direct authoritative server sync
          finalTeams = teams.map((t) => ({
            ...t,
            tableNumber: (opsState?.tableAssignments?.[t.id]) || t.tableNumber || null,
          }))
        } else {
          let localTeams = []
          try {
            const raw = localStorage.getItem('cf_teams')
            localTeams = raw ? JSON.parse(raw) : []
          } catch {}
          const map = new Map(teams.map((t) => [t.id, t]))
          for (const lt of localTeams) {
            if (!map.has(lt.id)) {
              map.set(lt.id, lt)
            } else {
              const serverTeam = map.get(lt.id)
              const teamMembers = Array.isArray(serverTeam.members) ? serverTeam.members : (lt.members || [])
              const acceptedCount = teamMembers.filter(
                (m) => (m.status === 'accepted' || m.status === 'confirmed') && !m.earlyExit
              ).length
              const assignedTable = (opsState?.tableAssignments?.[lt.id]) || serverTeam.tableNumber || lt.tableNumber || null
              map.set(lt.id, {
                ...lt,
                ...serverTeam,
                tableNumber: assignedTable,
                members: teamMembers,
                acceptedCount: serverTeam.acceptedCount !== undefined ? serverTeam.acceptedCount : acceptedCount,
                payment: { ...(lt.payment || {}), ...(serverTeam.payment || {}) },
              })
            }
          }
          finalTeams = Array.from(map.values())
        }

        // Sync opsState table assignments to all teams in map
        if (opsState?.tableAssignments) {
          for (const t of finalTeams) {
            if (opsState.tableAssignments[t.id]) {
              t.tableNumber = opsState.tableAssignments[t.id]
            }
          }
        }

        try {
          localStorage.setItem('cf_teams', JSON.stringify(finalTeams))
        } catch {}

        // Update current user specific team cache
        const currentUser = getStoredUser()
        if (currentUser?.email) {
          const uEmail = currentUser.email.toLowerCase()
          const myTeam = finalTeams.find(
            (t) =>
              t.leader?.email?.toLowerCase() === uEmail ||
              t.leaderEmail?.toLowerCase() === uEmail ||
              (t.members || []).some((m) => m.email?.toLowerCase() === uEmail)
          )
          if (myTeam) {
            try {
              localStorage.setItem(`cf_user_teams_${uEmail}`, JSON.stringify([myTeam]))
            } catch {}
          }
        }
      }

      if (opsState) {
        let currentOps = null
        try {
          const raw = localStorage.getItem('cf_sealed_ops_state')
          if (raw) currentOps = JSON.parse(decodeURIComponent(escape(atob(raw))))
        } catch {}
        const mergedOps = forceOverwrite
          ? { ...opsState }
          : {
              ...opsState,
              ...(currentOps || {}),
              tableAssignments: {
                ...(opsState.tableAssignments || {}),
                ...((currentOps && currentOps.tableAssignments) || {}),
              },
            }
        if (problemStatements) {
          mergedOps.problemStatements = problemStatements
        }
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(mergedOps))))
        try {
          localStorage.setItem('cf_sealed_ops_state', encoded)
        } catch {}
      }

      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('codefiesta_teams_updated', { detail: { teams: finalTeams } }))
        window.dispatchEvent(new CustomEvent('hackathon:state-updated', { detail: opsState }))
      }

      lastSyncTimestamp = Date.now()
      lastSyncResult = { teams: finalTeams, users, opsState, problemStatements }
      return lastSyncResult
    } catch {
      return lastSyncResult
    } finally {
      activeSyncPromise = null
    }
  })()

  return activeSyncPromise
}

export async function pushToSharedStore(payload) {
  if (typeof fetch === 'undefined') return
  try {
    const origin = getApiOrigin()
    const adminKey = getStoredAdminKey()
    const headers = { 'Content-Type': 'application/json' }
    if (adminKey) {
      headers['x-vault-passkey'] = adminKey
      headers['x-ops-vault-key'] = adminKey
    }
    const res = await fetch(`${origin}/api/shared-store`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    return await res.json().catch(() => null)
  } catch {
    return null
  }
}

// Automatically sync on initial load in browser
if (typeof window !== 'undefined') {
  syncWithSharedStore().catch(() => {})
}

export const DEFAULT_PROBLEM_STATEMENTS = [
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

let _inMemoryHackathonState = null

export function getSealedHackathonState() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('cf_sealed_ops_state')
      if (raw) {
        const parsed = JSON.parse(decodeURIComponent(escape(atob(raw))))
        if (!parsed.evaluationRounds) {
          parsed.evaluationRounds = { round1: false, round2: false }
        }
        if (!parsed.problemStatements || !Array.isArray(parsed.problemStatements) || parsed.problemStatements.length === 0) {
          parsed.problemStatements = DEFAULT_PROBLEM_STATEMENTS
        }
        // Purge any dummy or unassigned table allocations
        if (parsed.tableAssignments) {
          for (const [teamKey, tableVal] of Object.entries(parsed.tableAssignments)) {
            if (tableVal === 'T-14' || !tableVal || tableVal === 'UNASSIGNED') {
              delete parsed.tableAssignments[teamKey]
            }
          }
        }
        _inMemoryHackathonState = parsed
        return parsed
      }
    }
  } catch {}

  if (_inMemoryHackathonState) {
    return _inMemoryHackathonState
  }

  const defaultState = {
    problemStatementsReleased: false,
    problemStatements: DEFAULT_PROBLEM_STATEMENTS,
    evaluationRounds: {
      round1: false, // First Assessment Round (non-time-specific ground toggle)
      round2: false, // Second Assessment Round (non-time-specific ground toggle)
    },
    activePhase: 'Registration & Squad Assembly',
    announcements: [
      {
        id: 'ann_1',
        text: 'Welcome to Codefiesta 5.0! Official problem statements will unlock on Hackathon Day.',
        time: '10:00 AM',
        priority: 'normal',
      },
      {
        id: 'ann_2',
        text: 'Physical Venue: Global Institute of Technology (GIT), Sitapura, Jaipur.',
        time: '11:30 AM',
        priority: 'urgent',
      },
    ],
    tableAssignments: {},
    coordinators: [
      {
        id: 'coord_default',
        name: 'Main Gate Staff',
        email: 'gate.coordinator@codefiesta.in',
        password: 'gate_access_cf5',
        gate: 'Sitapura Main Entrance',
      },
    ],
    gateCheckins: {},
    mentors: [
      {
        id: 'men_1',
        email: 'mentor.ai@codefiesta.in',
        password: 'mentor_access_cf5',
        name: 'Dr. Rajesh Sharma',
        track: 'agentic_ai',
        tables: 'T-01 - T-20',
      },
    ],
    evaluations: [],
  }
  _inMemoryHackathonState = defaultState
  return defaultState
}

export function saveSealedHackathonState(state) {
  _inMemoryHackathonState = state
  try {
    if (typeof localStorage !== 'undefined') {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(state))))
      localStorage.setItem('cf_sealed_ops_state', encoded)
    }
    pushToSharedStore({ opsState: state })
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('hackathon:state-updated', { detail: state }))
    }
  } catch {}
}

function getStoredUser() {
  try {
    if (localStorage.getItem('cf_logged_out') === 'true') {
      return null
    }
    const raw = localStorage.getItem('cf_auth_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function getStoredUsers() {
  const list = []
  const current = getStoredUser()
  if (current) list.push(current)
  return list
}

export function generateMemberInviteCode(teamName = 'SQUAD', leaderName = 'LEADER', collegeName = 'GIT', memberSlug = 'MEMBER') {
  const clean = (s) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'UNIT'
  const tSlug = clean(teamName).slice(0, 6)
  const lSlug = clean(leaderName).slice(0, 6)
  const cSlug = clean(collegeName).slice(0, 4)
  const mSlug = clean(memberSlug).slice(0, 7)
  const salt = Math.floor(1000 + Math.random() * 9000)
  return `${tSlug}-${lSlug}-${cSlug}-${mSlug}-${salt}`
}

function getAllRegisteredTeams() {
  try {
    const rawAll = localStorage.getItem('cf_teams')
    if (rawAll) {
      const parsed = JSON.parse(rawAll)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t) => ({
          ...t,
          tableNumber: t.tableNumber === 'T-14' ? null : t.tableNumber,
        }))
      }
    }
  } catch {}
  return []
}

export function isEmailRegisteredAnywhere(email) {
  if (!email || typeof email !== 'string') return false
  const target = email.trim().toLowerCase()
  if (!target) return false

  // Check stored auth users
  try {
    const rawAllUsers = localStorage.getItem('cf_all_users')
    if (rawAllUsers) {
      const allUsers = JSON.parse(rawAllUsers)
      if (Array.isArray(allUsers)) {
        const foundUser = allUsers.find((u) => u.email && u.email.toLowerCase() === target)
        if (foundUser) return { registered: true, source: 'user', user: foundUser }
      }
    }
    const current = localStorage.getItem('cf_auth_user')
    if (current) {
      const parsed = JSON.parse(current)
      if (parsed.email && parsed.email.toLowerCase() === target) {
        return { registered: true, source: 'user', user: parsed }
      }
    }
  } catch {}

  // Check all teams (leaders and members)
  const allTeams = getAllRegisteredTeams()
  for (const t of allTeams) {
    if (t.leader?.email && t.leader.email.toLowerCase() === target) {
      return { registered: true, source: 'team_leader', teamName: t.name, teamId: t.id }
    }
    for (const m of t.members || []) {
      if (m.email && m.email.toLowerCase() === target) {
        return { registered: true, source: 'team_member', teamName: t.name, teamId: t.id }
      }
    }
  }

  return false
}

function saveRegisteredTeams(allTeams) {
  try {
    localStorage.setItem('cf_teams', JSON.stringify(allTeams))
    pushToSharedStore({ teams: allTeams })
  } catch {}
}

function saveAllUsers(allUsers) {
  try {
    localStorage.setItem('cf_all_users', JSON.stringify(allUsers))
    pushToSharedStore({ users: allUsers })
  } catch {}
}

function getStoredTeams(currentUser) {
  const opsState = getSealedHackathonState()
  const allTeams = getAllRegisteredTeams()
  const u = currentUser || getStoredUser()
  if (!u || !u.email) return []

  const userTeams = allTeams.filter((t) => {
    const isLeader = t.leader?.email?.toLowerCase() === u.email.toLowerCase()
    const isMember = (t.members || []).some(
      (m) => m.email?.toLowerCase() === u.email.toLowerCase()
    )
    const isInvited = (t.invites || []).some(
      (i) => i.email?.toLowerCase() === u.email.toLowerCase()
    )
    return isLeader || isMember || isInvited
  }).map((t) => {
    const explicitTable = opsState.tableAssignments?.[t.id]
    const cleanTable = explicitTable && explicitTable !== 'T-14' ? explicitTable : (t.tableNumber === 'T-14' ? null : t.tableNumber) || null
    return {
      ...t,
      tableNumber: cleanTable,
    }
  })

  if (userTeams.length > 0) {
    return userTeams
  }

  try {
    const userSpecific = localStorage.getItem(`cf_user_teams_${u.email}`)
    if (userSpecific) {
      const parsed = JSON.parse(userSpecific)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t) => {
          const explicitTable = opsState.tableAssignments?.[t.id]
          const cleanTable = explicitTable && explicitTable !== 'T-14' ? explicitTable : (t.tableNumber === 'T-14' ? null : t.tableNumber) || null
          return { ...t, tableNumber: cleanTable }
        })
      }
    }
  } catch {}

  return []
}

function saveTeams(teams, currentUser) {
  try {
    const u = currentUser || getStoredUser()
    if (u?.email) {
      localStorage.setItem(`cf_user_teams_${u.email}`, JSON.stringify(teams))
    }
    const all = getAllRegisteredTeams()
    const teamMap = new Map(all.map((t) => [t.id, t]))
    for (const t of teams) {
      const existing = teamMap.get(t.id)
      if (existing) {
        const membersToSave = Array.isArray(t.members) ? t.members : existing.members
        const acceptedCount = (membersToSave || []).filter(
          (m) => (m.status === 'accepted' || m.status === 'confirmed') && !m.earlyExit
        ).length
        teamMap.set(t.id, {
          ...existing,
          ...t,
          members: membersToSave,
          acceptedCount: t.acceptedCount !== undefined ? t.acceptedCount : acceptedCount,
          payment: { ...(existing.payment || {}), ...(t.payment || {}) },
        })
      } else {
        teamMap.set(t.id, t)
      }
    }
    saveRegisteredTeams(Array.from(teamMap.values()))
  } catch {}
}

async function handleFallback(path, options, err) {
  const method = (options.method || 'GET').toUpperCase()
  const body = options.body ? JSON.parse(options.body) : {}
  const currentUser = getStoredUser()

  if (path === '/api/auth/me') {
    if (!currentUser) {
      throw new Error('Not authenticated')
    }
    return { user: currentUser }
  }

  if (path === '/api/auth/login') {
    const loginEmail = (body.email || '').toLowerCase().trim()
    const loginPassword = (body.password || '').trim()

    if (!loginEmail) throw new Error('Email is required.')
    if (!loginPassword) throw new Error('Password is required.')

    // 1. Look up the user in stored users list
    let matchedUser = null
    try {
      const rawAllUsers = localStorage.getItem('cf_all_users')
      if (rawAllUsers) {
        const allUsers = JSON.parse(rawAllUsers)
        if (Array.isArray(allUsers)) {
          const found = allUsers.find(
            (u) => u.email && u.email.toLowerCase() === loginEmail
          )
          if (found) {
            if (found.password && found.password !== loginPassword) {
              throw new Error('Invalid password. Please check your credentials.')
            }
            matchedUser = found
          }
        }
      }
    } catch (e) {
      if (e.message?.includes('Invalid password')) throw e
    }

    // 2. Also check currently stored auth user
    if (!matchedUser) {
      try {
        const raw = localStorage.getItem('cf_auth_user')
        if (raw) {
          const stored = JSON.parse(raw)
          if (stored.email?.toLowerCase() === loginEmail) {
            if (stored.password && stored.password !== loginPassword) {
              throw new Error('Invalid password. Please check your credentials.')
            }
            matchedUser = stored
          }
        }
      } catch (e) {
        if (e.message?.includes('Invalid password')) throw e
      }
    }

    // 3. Fallback: Check if this user is a registered team leader or squad member
    if (!matchedUser) {
      const allTeams = getAllRegisteredTeams()
      for (const t of allTeams) {
        if (t.leader?.email && t.leader.email.toLowerCase() === loginEmail) {
          if (t.leader.password && t.leader.password !== loginPassword) {
            throw new Error('Invalid password. Please check your credentials.')
          }
          matchedUser = {
            id: 'usr_' + Math.random().toString(36).slice(2, 9),
            email: t.leader.email.toLowerCase(),
            name: t.leader.name || `${t.leader.firstName || ''} ${t.leader.lastName || ''}`.trim() || 'Squad Leader',
            firstName: t.leader.firstName || '',
            lastName: t.leader.lastName || '',
            phone: t.leader.phone || '',
            college: t.leader.college || '',
            rollNumber: t.leader.rollNumber || '',
            course: t.leader.course || '',
            year: t.leader.year || '',
            gender: t.leader.gender || '',
            password: t.leader.password || loginPassword,
          }
          break
        }
        const memberMatch = (t.members || []).find((m) => m.email && m.email.toLowerCase() === loginEmail)
        if (memberMatch) {
          if (memberMatch.password && memberMatch.password !== loginPassword) {
            throw new Error('Invalid password. Please check your credentials.')
          }
          matchedUser = {
            id: memberMatch.id || 'usr_' + Math.random().toString(36).slice(2, 9),
            email: memberMatch.email.toLowerCase(),
            name: memberMatch.name || `${memberMatch.firstName || ''} ${memberMatch.lastName || ''}`.trim() || 'Squad Member',
            firstName: memberMatch.firstName || '',
            lastName: memberMatch.lastName || '',
            phone: memberMatch.phone || '',
            college: memberMatch.college || '',
            rollNumber: memberMatch.rollNumber || '',
            course: memberMatch.course || '',
            year: memberMatch.year || '',
            gender: memberMatch.gender || '',
            password: memberMatch.password || loginPassword,
          }
          break
        }
      }
    }

    if (!matchedUser) {
      throw new Error('No squad registration found for this email. Please register your squad first.')
    }

    try {
      localStorage.setItem('cf_auth_user', JSON.stringify(matchedUser))
      localStorage.removeItem('cf_logged_out')
      let existing = []
      try {
        existing = JSON.parse(localStorage.getItem('cf_all_users') || '[]')
      } catch {}
      const filtered = existing.filter((u) => u.email?.toLowerCase() !== matchedUser.email.toLowerCase())
      filtered.push(matchedUser)
      saveAllUsers(filtered)
    } catch {}
    return { success: true, user: matchedUser }
  }

  if (path === '/api/auth/register') {
    const targetEmail = (body.email || '').toLowerCase().trim()
    if (!targetEmail) {
      throw new Error('Email address is required.')
    }
    const found = isEmailRegisteredAnywhere(targetEmail)
    if (found) {
      throw new Error(`Email "${targetEmail}" is already registered${found.teamName ? ` in squad "${found.teamName}"` : ''}. One email = one registration/access only.`)
    }
    const user = {
      ...DEFAULT_USER,
      ...body,
      email: targetEmail,
      id: 'usr_' + Math.random().toString(36).slice(2, 9),
      name: `${body.firstName || ''} ${body.lastName || ''}`.trim() || 'Hacker Pilot',
    }
    try {
      localStorage.setItem('cf_auth_user', JSON.stringify(user))
      localStorage.removeItem('cf_logged_out')
      let existingAllUsers = []
      try {
        existingAllUsers = JSON.parse(localStorage.getItem('cf_all_users') || '[]')
      } catch {}
      const filtered = existingAllUsers.filter((u) => u.email?.toLowerCase() !== targetEmail)
      filtered.push(user)
      saveAllUsers(filtered)
    } catch {}
    return { success: true, user }
  }

  if (path === '/api/auth/logout') {
    try {
      localStorage.removeItem('cf_auth_user')
      localStorage.setItem('cf_logged_out', 'true')
    } catch {}
    return { success: true }
  }

  if (path === '/api/auth/check-email') {
    const targetEmail = (body.email || '').toLowerCase().trim()
    const found = isEmailRegisteredAnywhere(targetEmail)
    if (found) {
      throw new Error(`Email "${targetEmail}" is already registered. One email = one registration only.`)
    }
    return { available: true }
  }

  if (path === '/api/teams/all') {
    const opsState = getSealedHackathonState()
    const allTeams = getAllRegisteredTeams().map((t) => {
      const explicitTable = opsState.tableAssignments?.[t.id]
      const tableNumber = explicitTable && explicitTable !== 'T-14' ? explicitTable : (t.tableNumber === 'T-14' ? null : t.tableNumber) || null
      const round1Eval = (opsState.evaluations || []).find((e) => e.teamId === t.id && (e.round === 'round1' || !e.round)) || null
      const round2Eval = (opsState.evaluations || []).find((e) => e.teamId === t.id && e.round === 'round2') || null
      return {
        ...t,
        tableNumber,
        evaluation: round2Eval || round1Eval || null,
        round1Evaluation: round1Eval,
        round2Evaluation: round2Eval,
      }
    })
    return { success: true, teams: allTeams }
  }

  if (path === '/api/teams/my') {
    const opsState = getSealedHackathonState()
    const user = currentUser || getStoredUser()
    const teams = getStoredTeams(user).map((t) => {
      const acceptedCount = (t.members || []).filter((m) => m.status === 'accepted').length
      const isLeader = (user?.email && t.leader?.email?.toLowerCase() === user.email.toLowerCase()) || !!t.isLeaderForThisTeam
      const canLock = isLeader && t.status !== 'locked' && acceptedCount >= t.size
      const explicitTable = opsState.tableAssignments?.[t.id]
      const tableNumber = explicitTable && explicitTable !== 'T-14' ? explicitTable : (t.tableNumber === 'T-14' ? null : t.tableNumber) || null
      const round1Eval = (opsState.evaluations || []).find((e) => e.teamId === t.id && (e.round === 'round1' || !e.round)) || null
      const round2Eval = (opsState.evaluations || []).find((e) => e.teamId === t.id && e.round === 'round2') || null
      return {
        ...t,
        acceptedCount,
        isLeader,
        isLeaderForThisTeam: isLeader,
        canLock,
        tableNumber,
        evaluation: round2Eval || round1Eval || null,
        round1Evaluation: round1Eval,
        round2Evaluation: round2Eval,
      }
    })
    return { success: true, teams }
  }

  if (path === '/api/teams/create') {
    const allRegistered = getAllRegisteredTeams()
    const targetName = (body.name || '').trim()
    if (!targetName) {
      throw new Error('Squad name cannot be empty.')
    }
    const nameTaken = allRegistered.some(
      (t) => t.name && t.name.trim().toLowerCase() === targetName.toLowerCase()
    )
    if (nameTaken) {
      throw new Error(`Squad name "${targetName}" is already taken by another team. Please choose a unique name.`)
    }

    const leaderEmail = (body.leader?.email || currentUser?.email || '').toLowerCase().trim()
    if (!leaderEmail) {
      throw new Error('Leader email is required.')
    }

    // Ensure leader is not already in another squad or registered
    const existingLeaderTeam = allRegistered.find(
      (t) =>
        (t.leader?.email && t.leader.email.toLowerCase() === leaderEmail) ||
        (t.members || []).some((m) => m.email && m.email.toLowerCase() === leaderEmail)
    )
    if (existingLeaderTeam) {
      throw new Error(`Email "${leaderEmail}" is already registered in squad "${existingLeaderTeam.name}". One email = one registration/access only.`)
    }

    const size = Math.max(2, Math.min(4, Number(body.size) || 4))
    const leaderName = (
      `${body.leader?.firstName || currentUser?.firstName || ''} ${body.leader?.lastName || currentUser?.lastName || ''}`.trim() ||
      body.leader?.name ||
      currentUser?.name ||
      'Squad Leader'
    )
    const leaderCollege = (body.leader?.college || currentUser?.college || 'Global Institute of Technology, Jaipur').trim()
    const leaderPhone = (body.leader?.phone || currentUser?.phone || '').trim()
    const leaderRoll = (body.leader?.rollNumber || currentUser?.rollNumber || '').trim()
    const leaderCourse = (body.leader?.course || currentUser?.course || 'CSE').trim()
    const leaderYear = (body.leader?.year || currentUser?.year || '1st').trim()
    const leaderGender = (body.leader?.gender || currentUser?.gender || 'male').trim()

    const members = [
      {
        id: 'mem_' + Math.random().toString(36).slice(2, 7),
        name: leaderName,
        firstName: body.leader?.firstName || currentUser?.firstName || leaderName.split(' ')[0] || '',
        lastName: body.leader?.lastName || currentUser?.lastName || leaderName.split(' ').slice(1).join(' ') || '',
        email: leaderEmail,
        phone: leaderPhone,
        college: leaderCollege,
        rollNumber: leaderRoll,
        course: leaderCourse,
        year: leaderYear,
        gender: leaderGender,
        role: 'leader',
        status: 'accepted',
      },
    ]
    const invites = []

    // Process teammate entries
    const rawTeammates = Array.isArray(body.members) ? body.members : []
    const needed = size - 1
    const seenEmails = new Set([leaderEmail])

    for (let i = 0; i < needed; i++) {
      const tm = rawTeammates[i] || {}
      const tmEmail = (tm.email || '').toLowerCase().trim()
      const tmFirst = (tm.firstName || '').trim()
      const tmLast = (tm.lastName || '').trim()
      const tmName = (tm.name || `${tmFirst} ${tmLast}`).trim() || `Teammate ${i + 2}`
      const tmPhone = (tm.phone || '').trim()
      const tmCollege = (tm.college || leaderCollege).trim()
      const tmRoll = (tm.rollNumber || '').trim()
      const tmCourse = (tm.course || 'CSE').trim()
      const tmYear = (tm.year || '1st').trim()
      const tmGender = (tm.gender || 'male').trim()

      if (!tmEmail) {
        throw new Error(`Teammate #${i + 2} email address is required.`)
      }
      if (seenEmails.has(tmEmail)) {
        throw new Error(`Duplicate email "${tmEmail}" entered. Each teammate must have a unique email address.`)
      }
      seenEmails.add(tmEmail)

      // Strict one email = one registration check across all teams
      const alreadyInTeam = allRegistered.find(
        (t) =>
          (t.leader?.email && t.leader.email.toLowerCase() === tmEmail) ||
          (t.members || []).some((m) => m.email && m.email.toLowerCase() === tmEmail)
      )
      if (alreadyInTeam) {
        throw new Error(`Email "${tmEmail}" is already registered in squad "${alreadyInTeam.name}". One email = one registration/access only.`)
      }

      const personalCode = generateMemberInviteCode(
        targetName,
        leaderName,
        tmCollege || leaderCollege,
        tmFirst || tmName || tmEmail.split('@')[0]
      )
      const token = 'tok_' + Math.random().toString(36).slice(2, 9)

      members.push({
        id: 'mem_' + Math.random().toString(36).slice(2, 7),
        name: tmName,
        firstName: tmFirst || tmName.split(' ')[0] || '',
        lastName: tmLast || tmName.split(' ').slice(1).join(' ') || '',
        email: tmEmail,
        phone: tmPhone,
        college: tmCollege,
        rollNumber: tmRoll,
        course: tmCourse,
        year: tmYear,
        gender: tmGender,
        role: 'member',
        status: 'pending',
        inviteCode: personalCode,
        token: token,
      })

      invites.push({
        name: tmName,
        email: tmEmail,
        token: token,
        inviteCode: personalCode,
        inviteLink: `${typeof window !== 'undefined' && window.location ? window.location.origin : ''}/invite/${token}`,
      })
    }

    const utr = body.payment?.utr || body.utr
    if (!utr || !String(utr).trim()) {
      throw new Error('Registration payment is required. Please scan the QR code and submit your 12-digit UTR transaction ID.')
    }

    const generalCode = generateMemberInviteCode(targetName, leaderName, leaderCollege, 'ALL')

    const newTeam = {
      id: 'team_' + Math.random().toString(36).slice(2, 9),
      name: targetName,
      code: generalCode,
      size,
      status: 'registered',
      isLeaderForThisTeam: true,
      canLock: true,
      acceptedCount: 1,
      tableNumber: null,
      createdAt: new Date().toISOString(),
      leader: {
        email: leaderEmail,
        name: leaderName,
        firstName: body.leader?.firstName || currentUser?.firstName || '',
        lastName: body.leader?.lastName || currentUser?.lastName || '',
        college: leaderCollege,
        phone: leaderPhone,
        rollNumber: leaderRoll,
        course: leaderCourse,
        year: leaderYear,
        gender: leaderGender,
      },
      members,
      invites,
      payment: {
        status: 'submitted',
        utr: String(utr).trim(),
        amount: Number(body.payment?.amount) || 800,
        submittedAt: body.payment?.submittedAt || new Date().toISOString(),
        verifiedAt: null,
        confirmationEmailDispatched: false,
      },
    }

    const currentTeams = getStoredTeams(currentUser)
    const updated = [newTeam, ...currentTeams.filter((t) => t.id !== newTeam.id)]
    saveTeams(updated, currentUser)
    return { success: true, team: newTeam }
  }

  if (path.startsWith('/api/teams/lock/')) {
    const teamId = path.replace('/api/teams/lock/', '')
    const teams = getStoredTeams(currentUser).map((t) => {
      if (t.id === teamId || !teamId) {
        return { ...t, status: 'locked', canLock: false }
      }
      return t
    })
    saveTeams(teams)
    return { success: true, team: teams[0] }
  }

  if (path.includes('/payment')) {
    const teams = getStoredTeams(currentUser).map((t) => ({
      ...t,
      payment: {
        status: 'submitted',
        utr: body.utr || '428901238910',
        submittedAt: new Date().toISOString(),
      },
    }))
    saveTeams(teams)
    return { success: true, payment: teams[0].payment }
  }

  // POST /api/teams/invite/:token/check-email
  if (path.startsWith('/api/teams/invite/') && path.includes('/check-email')) {
    const token = decodeURIComponent(
      path.replace('/api/teams/invite/', '').replace('/check-email', '').split('/')[0]
    )
    const checkEmail = (body.email || '').toLowerCase().trim()
    const allTeams = getAllRegisteredTeams()

    let matched = false
    let invitedEmail = ''
    for (const t of allTeams) {
      const inv = (t.invites || []).find(
        (i) => i.token === token || i.inviteCode === token || (i.inviteLink && i.inviteLink.includes(token))
      )
      const mem = (t.members || []).find((m) => m.token === token || m.inviteCode === token)
      if (inv || mem) {
        invitedEmail = (inv?.email || mem?.email || '').toLowerCase().trim()
        if (invitedEmail === checkEmail) {
          matched = true
        }
        break
      }
    }
    return {
      match: matched,
      invitedEmail,
    }
  }

  // GET /api/teams/invite/:token
  if (path.startsWith('/api/teams/invite/')) {
    const token = decodeURIComponent(path.replace('/api/teams/invite/', '').split('/')[0])
    const allTeams = getAllRegisteredTeams()

    let targetTeam = null
    let targetInvite = null
    let targetMember = null

    for (const t of allTeams) {
      const inv = (t.invites || []).find(
        (i) => i.token === token || i.inviteCode === token || (i.inviteLink && i.inviteLink.includes(token))
      )
      const mem = (t.members || []).find((m) => m.token === token || m.inviteCode === token)
      if (inv || mem) {
        targetTeam = t
        targetInvite = inv
        targetMember =
          mem || (inv ? (t.members || []).find((m) => m.email?.toLowerCase() === inv.email?.toLowerCase()) : null)
        break
      }
    }

    if (!targetTeam) {
      targetTeam = allTeams.find((t) => t.code === token || t.id === token)
    }

    if (!targetTeam) {
      if (
        DEFAULT_TEAM.invites?.some((i) => i.token === token) ||
        token.startsWith('tok_alex') ||
        token.startsWith('tok_priya')
      ) {
        targetTeam = { ...DEFAULT_TEAM }
        targetInvite = targetTeam.invites?.find((i) => i.token === token)
        targetMember = targetTeam.members?.find((m) => m.email?.toLowerCase() === targetInvite?.email?.toLowerCase())
      }
    }

    if (!targetTeam) {
      const fallbackTeams = getStoredTeams(currentUser)
      targetTeam = fallbackTeams[0] || DEFAULT_TEAM
    }

    return {
      valid: true,
      team: {
        ...targetTeam,
        leaderName: targetTeam.leader?.name || 'Squad Leader',
      },
      teamName: targetTeam.name,
      leaderName: targetTeam.leader?.name || 'Squad Leader',
      invitedEmail: targetInvite?.email || targetMember?.email || '',
      invitedName: targetInvite?.name || targetMember?.name || '',
      token,
    }
  }

  // POST /api/teams/accept/:token
  if (path.startsWith('/api/teams/accept/')) {
    const token = decodeURIComponent(path.replace('/api/teams/accept/', '').split('/')[0])
    let allTeams = getAllRegisteredTeams()
    const user = currentUser || getStoredUser()

    let targetTeam = null
    let targetMember = null

    for (const t of allTeams) {
      const inv = (t.invites || []).find(
        (i) => i.token === token || i.inviteCode === token || (i.inviteLink && i.inviteLink.includes(token))
      )
      const mem = (t.members || []).find((m) => m.token === token || m.inviteCode === token)
      if (inv || mem) {
        targetTeam = t
        targetMember =
          mem || (inv ? (t.members || []).find((m) => m.email?.toLowerCase() === inv.email?.toLowerCase()) : null)
        break
      }
    }

    if (!targetTeam && user?.email) {
      for (const t of allTeams) {
        const mem = (t.members || []).find((m) => m.email?.toLowerCase() === user.email.toLowerCase())
        if (mem) {
          targetTeam = t
          targetMember = mem
          break
        }
      }
    }

    if (!targetTeam) {
      const userTeams = getStoredTeams(user)
      if (userTeams.length > 0) {
        targetTeam = userTeams[0]
        targetMember = (targetTeam.members || []).find((m) => m.email?.toLowerCase() === user?.email?.toLowerCase())
      }
    }

    if (targetTeam) {
      if (targetMember) {
        targetMember.status = 'accepted'
        if (user) {
          if (user.firstName && !targetMember.firstName) targetMember.firstName = user.firstName
          if (user.lastName && !targetMember.lastName) targetMember.lastName = user.lastName
          if (user.phone && !targetMember.phone) targetMember.phone = user.phone
          if (user.college && !targetMember.college) targetMember.college = user.college
          if (user.rollNumber && !targetMember.rollNumber) targetMember.rollNumber = user.rollNumber
          if (user.course && !targetMember.course) targetMember.course = user.course
          if (user.year && !targetMember.year) targetMember.year = user.year
          if (user.gender && !targetMember.gender) targetMember.gender = user.gender
        }
      } else if (user?.email) {
        targetMember = {
          id: 'mem_' + Math.random().toString(36).slice(2, 7),
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email,
          phone: user.phone || '',
          college: user.college || targetTeam.leader?.college || '',
          rollNumber: user.rollNumber || '',
          course: user.course || 'CSE',
          year: user.year || '1st',
          gender: user.gender || 'male',
          role: 'member',
          status: 'accepted',
        }
        targetTeam.members = [...(targetTeam.members || []), targetMember]
      }

      targetTeam.acceptedCount = (targetTeam.members || []).filter((m) => m.status === 'accepted').length

      const teamMap = new Map(allTeams.map((t) => [t.id, t]))
      teamMap.set(targetTeam.id, targetTeam)
      allTeams = Array.from(teamMap.values())

      saveRegisteredTeams(allTeams)
      if (user) {
        saveTeams([targetTeam], user)
        try {
          const updatedUser = {
            ...user,
            teamId: targetTeam.id,
            teamName: targetTeam.name,
            role: targetMember?.role || 'member',
            status: 'accepted',
          }
          localStorage.setItem('cf_auth_user', JSON.stringify(updatedUser))
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new Event('codefiesta_auth_change'))
          }
        } catch {}
      }

      pushToSharedStore({ teams: allTeams })
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('codefiesta_teams_updated', { detail: { team: targetTeam } }))
        window.dispatchEvent(new CustomEvent('hackathon:state-updated'))
      }
    }

    return { success: true, team: targetTeam }
  }

  // POST /api/teams/accept-direct/:teamId
  if (path.startsWith('/api/teams/accept-direct/')) {
    const teamId = decodeURIComponent(path.replace('/api/teams/accept-direct/', '').split('/')[0])
    let allTeams = getAllRegisteredTeams()
    const user = currentUser || getStoredUser()
    const targetTeam = allTeams.find((t) => t.id === teamId)
    if (targetTeam) {
      let targetMember = (targetTeam.members || []).find((m) => m.email?.toLowerCase() === user?.email?.toLowerCase())
      if (!targetMember) {
        targetMember = (targetTeam.members || []).find((m) => m.status === 'pending')
      }
      if (targetMember) {
        targetMember.status = 'accepted'
        if (user) {
          targetMember.email = user.email || targetMember.email
          targetMember.name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || targetMember.name
        }
      }
      targetTeam.acceptedCount = (targetTeam.members || []).filter((m) => m.status === 'accepted').length
      const teamMap = new Map(allTeams.map((t) => [t.id, t]))
      teamMap.set(targetTeam.id, targetTeam)
      allTeams = Array.from(teamMap.values())

      saveRegisteredTeams(allTeams)
      if (user) saveTeams([targetTeam], user)
      pushToSharedStore({ teams: allTeams })
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('codefiesta_teams_updated', { detail: { team: targetTeam } }))
        window.dispatchEvent(new CustomEvent('hackathon:state-updated'))
      }
    }
    return { success: true, team: targetTeam }
  }

  // PATCH /api/teams/:id (edit team size / name)
  if (method === 'PATCH' && path.startsWith('/api/teams/') && !path.includes('/members/')) {
    const teamId = path.replace('/api/teams/', '').split('/')[0]
    const teams = getStoredTeams(currentUser).map((t) => {
      if (t.id === teamId || !teamId) {
        return {
          ...t,
          ...(body.name ? { name: body.name } : {}),
          ...(body.size ? { size: Number(body.size) } : {}),
        }
      }
      return t
    })
    saveTeams(teams)
    return { success: true, team: teams[0] }
  }

  // PATCH /api/teams/:id/members/:email (Edit teammate details - strictly before Sept 30)
  if (method === 'PATCH' && path.includes('/members/')) {
    if (Date.now() > ROSTER_EDIT_DEADLINE) {
      throw new Error('Roster modifications are closed. Editing teammates was only allowed until 30th September.')
    }
    const parts = path.replace('/api/teams/', '').split('/members/')
    const teamId = parts[0]
    const oldEmail = decodeURIComponent(parts[1] || '').toLowerCase()

    const teams = getStoredTeams(currentUser).map((t) => {
      if (t.id === teamId || !teamId) {
        const updatedMembers = (t.members || []).map((m) => {
          if (m.email?.toLowerCase() === oldEmail) {
            const newEmail = body.email ? body.email.toLowerCase().trim() : m.email
            if (newEmail !== oldEmail) {
              const alreadyUsed = isEmailRegisteredAnywhere(newEmail)
              if (alreadyUsed) {
                throw new Error(`Email "${newEmail}" is already registered. One email = one registration only.`)
              }
            }
            return {
              ...m,
              firstName: body.firstName !== undefined ? body.firstName.trim() : m.firstName,
              lastName: body.lastName !== undefined ? body.lastName.trim() : m.lastName,
              name: body.name !== undefined ? body.name.trim() : (body.firstName || body.lastName ? `${body.firstName || m.firstName || ''} ${body.lastName || m.lastName || ''}`.trim() : m.name),
              email: newEmail,
              phone: body.phone !== undefined ? body.phone.trim() : m.phone,
              college: body.college !== undefined ? body.college.trim() : m.college,
              rollNumber: body.rollNumber !== undefined ? body.rollNumber.trim() : m.rollNumber,
              course: body.course !== undefined ? body.course.trim() : m.course,
              year: body.year !== undefined ? body.year : m.year,
              gender: body.gender !== undefined ? body.gender : m.gender,
            }
          }
          return m
        })
        return { ...t, members: updatedMembers }
      }
      return t
    })
    saveTeams(teams, currentUser)
    const updatedTeam = teams.find((t) => t.id === teamId) || teams[0]
    return { success: true, team: updatedTeam }
  }

  // POST /api/teams/:id/members (Add teammate - strictly before Sept 30)
  if (method === 'POST' && path.includes('/members') && !path.includes('/payment') && !path.includes('/track') && !path.includes('/submission')) {
    if (Date.now() > ROSTER_EDIT_DEADLINE) {
      throw new Error('Roster modifications are closed. Editing teammates was only allowed until 30th September.')
    }
    const teamId = path.replace('/api/teams/', '').replace('/members', '').trim()
    const allRegistered = getAllRegisteredTeams()
    const targetTeam = allRegistered.find((t) => t.id === teamId)
    if (!targetTeam) throw new Error('Squad not found.')

    if ((targetTeam.members || []).length >= 4) {
      throw new Error('Squad has reached the maximum capacity of 4 members.')
    }

    const tmEmail = (body.email || '').toLowerCase().trim()
    if (!tmEmail) throw new Error('Teammate email is required.')

    const exists = isEmailRegisteredAnywhere(tmEmail)
    if (exists) {
      throw new Error(`Email "${tmEmail}" is already registered. One email = one registration only.`)
    }

    const tmFirst = (body.firstName || '').trim()
    const tmLast = (body.lastName || '').trim()
    const tmName = (body.name || `${tmFirst} ${tmLast}`).trim() || tmEmail.split('@')[0]
    const tmPhone = (body.phone || '').trim()
    const tmCollege = (body.college || targetTeam.leader?.college || '').trim()
    const tmRoll = (body.rollNumber || '').trim()
    const tmCourse = (body.course || 'CSE').trim()
    const tmYear = (body.year || '1st').trim()
    const tmGender = (body.gender || 'male').trim()

    const personalCode = generateMemberInviteCode(
      targetTeam.name,
      targetTeam.leader?.name || 'Leader',
      tmCollege,
      tmFirst || tmName
    )
    const token = 'tok_' + Math.random().toString(36).slice(2, 9)

    const newMember = {
      id: 'mem_' + Math.random().toString(36).slice(2, 7),
      name: tmName,
      firstName: tmFirst,
      lastName: tmLast,
      email: tmEmail,
      phone: tmPhone,
      college: tmCollege,
      rollNumber: tmRoll,
      course: tmCourse,
      year: tmYear,
      gender: tmGender,
      role: 'member',
      status: 'pending',
      inviteCode: personalCode,
      token,
    }

    targetTeam.members = [...(targetTeam.members || []), newMember]
    targetTeam.invites = [
      ...(targetTeam.invites || []),
      {
        name: tmName,
        email: tmEmail,
        token,
        inviteCode: personalCode,
        inviteLink: `${typeof window !== 'undefined' && window.location ? window.location.origin : ''}/invite/${token}`,
      },
    ]
    targetTeam.size = Math.max(targetTeam.size, targetTeam.members.length)

    const teams = getStoredTeams(currentUser).map((t) => (t.id === teamId ? targetTeam : t))
    saveTeams(teams, currentUser)
    return { success: true, member: newMember, team: targetTeam }
  }

  // DELETE /api/teams/:id/members/:email (Remove teammate - strictly before Sept 30)
  if (method === 'DELETE' && path.includes('/members/')) {
    if (Date.now() > ROSTER_EDIT_DEADLINE) {
      throw new Error('Roster modifications are closed. Editing teammates was only allowed until 30th September.')
    }
    const parts = path.replace('/api/teams/', '').split('/members/')
    const teamId = decodeURIComponent(parts[0] || '').trim()
    const emailToDelete = decodeURIComponent(parts[1] || '').toLowerCase().trim()

    // 1. Authoritatively update all registered teams
    const allTeams = getAllRegisteredTeams().map((t) => {
      if (t.id === teamId || t.code === teamId || !teamId) {
        const remainingMembers = (t.members || []).filter(
          (m) => (m.email || '').toLowerCase().trim() !== emailToDelete
        )
        const remainingInvites = (t.invites || []).filter(
          (i) => (i.email || '').toLowerCase().trim() !== emailToDelete
        )
        const acceptedCount = remainingMembers.filter(
          (m) => (m.status === 'accepted' || m.status === 'confirmed') && !m.earlyExit
        ).length
        return {
          ...t,
          members: remainingMembers,
          invites: remainingInvites,
          acceptedCount,
          size: Math.max(1, remainingMembers.length),
        }
      }
      return t
    })
    saveRegisteredTeams(allTeams)

    // 2. Clean up local browser caches
    try {
      localStorage.setItem('cf_teams', JSON.stringify(allTeams))
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('cf_user_teams_')) {
          try {
            const ut = JSON.parse(localStorage.getItem(k) || '[]')
            if (Array.isArray(ut)) {
              const updatedUt = ut.map((t) => {
                if (t.id === teamId || t.code === teamId || !teamId) {
                  const rem = (t.members || []).filter(
                    (m) => (m.email || '').toLowerCase().trim() !== emailToDelete
                  )
                  return {
                    ...t,
                    members: rem,
                    acceptedCount: rem.filter((m) => (m.status === 'accepted' || m.status === 'confirmed') && !m.earlyExit).length,
                    size: Math.max(1, rem.length),
                  }
                }
                return t
              })
              localStorage.setItem(k, JSON.stringify(updatedUt))
            }
          } catch {}
        }
      }
    } catch {}

    // 3. Persist to shared database store immediately
    await pushToSharedStore({ teams: allTeams, wipeTeams: true })

    // 4. Dispatch event for instant UI update across tabs
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('codefiesta_teams_updated', { detail: { teams: allTeams } }))
    }

    const updatedTeam = allTeams.find((t) => t.id === teamId || t.code === teamId)
    return { success: true, team: updatedTeam }
  }

  // POST /api/teams/check-name
  if (path === '/api/teams/check-name') {
    const targetName = (body.name || '').trim().toLowerCase()
    if (!targetName) throw new Error('Squad name is required.')
    const all = getAllRegisteredTeams()
    const taken = all.some((t) => t.name && t.name.trim().toLowerCase() === targetName)
    if (taken) {
      throw new Error(`Squad name "${body.name}" is already taken by another team. Please choose a unique name.`)
    }
    return { available: true }
  }

  // POST /api/teams/join-code
  if (path === '/api/teams/join-code') {
    const rawCode = (body.code || '').trim()
    if (!rawCode) throw new Error('Party code is required.')
    const code = rawCode.toUpperCase()
    const allTeams = getAllRegisteredTeams()

    let targetTeam = null
    let matchedMember = null

    // 1. Search for personal member invite code first
    for (const t of allTeams) {
      const mem = (t.members || []).find(
        (m) => m.inviteCode && m.inviteCode.toUpperCase() === code
      )
      if (mem) {
        targetTeam = t
        matchedMember = mem
        break
      }
      const inv = (t.invites || []).find(
        (i) => (i.inviteCode && i.inviteCode.toUpperCase() === code) || i.token === rawCode
      )
      if (inv) {
        targetTeam = t
        matchedMember = (t.members || []).find((m) => m.email?.toLowerCase() === inv.email?.toLowerCase())
        break
      }
    }

    // 2. Fallback: Search by team general code
    if (!targetTeam) {
      targetTeam = allTeams.find(
        (t) => (t.code && t.code.toUpperCase() === code) ||
               (t.invites && t.invites.some((i) => i.token === rawCode || i.inviteLink?.includes(rawCode)))
      )
    }

    // 3. Fallback for demo codes
    if (!targetTeam && (code === 'VORTEX5' || DEFAULT_TEAM.code === code)) {
      targetTeam = { ...DEFAULT_TEAM }
    }

    if (!targetTeam) {
      throw new Error(`Invalid squad party code "${rawCode}". Please check with your team leader.`)
    }

    // Process joining / confirmation
    if (matchedMember) {
      matchedMember.status = 'accepted'
    } else {
      const candidateEmail = (body.email || currentUser?.email || '').toLowerCase().trim()
      if (candidateEmail) {
        matchedMember = (targetTeam.members || []).find((m) => m.email?.toLowerCase() === candidateEmail)
        if (matchedMember) {
          matchedMember.status = 'accepted'
        } else if ((targetTeam.members || []).length < (targetTeam.size || 4)) {
          matchedMember = {
            id: 'mem_' + Math.random().toString(36).slice(2, 7),
            name: body.name || candidateEmail.split('@')[0],
            email: candidateEmail,
            college: body.college || targetTeam.leader?.college || '',
            role: 'member',
            status: 'accepted',
          }
          targetTeam.members = [...(targetTeam.members || []), matchedMember]
        }
      } else {
        const pendingSlot = (targetTeam.members || []).find((m) => m.status === 'pending')
        if (pendingSlot) {
          pendingSlot.status = 'accepted'
          matchedMember = pendingSlot
        }
      }
    }

    targetTeam.acceptedCount = (targetTeam.members || []).filter((m) => m.status === 'accepted').length

    // Construct authenticated user session for the joining member
    const activeMember = matchedMember || (targetTeam.members || [])[0]
    const activeUser = {
      id: activeMember?.id || 'usr_' + Math.random().toString(36).slice(2, 8),
      email: activeMember?.email || 'operative@codefiesta.in',
      name: activeMember?.name || `${activeMember?.firstName || ''} ${activeMember?.lastName || ''}`.trim() || 'Squad Operative',
      firstName: activeMember?.firstName || '',
      lastName: activeMember?.lastName || '',
      college: activeMember?.college || targetTeam.leader?.college || '',
      phone: activeMember?.phone || '',
      rollNumber: activeMember?.rollNumber || '',
      course: activeMember?.course || '',
      year: activeMember?.year || '',
      gender: activeMember?.gender || '',
      role: activeMember?.role || 'member',
      teamId: targetTeam.id,
      teamName: targetTeam.name,
      isLeaderForThisTeam: targetTeam.leader?.email?.toLowerCase() === activeMember?.email?.toLowerCase(),
    }

    try {
      localStorage.setItem('cf_auth_user', JSON.stringify(activeUser))
      localStorage.removeItem('cf_logged_out')
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new Event('codefiesta_auth_change'))
      }
    } catch {}

    // Save to global teams registry and user storage
    const currentTeams = getStoredTeams(activeUser)
    const updated = [targetTeam, ...currentTeams.filter((t) => t.id !== targetTeam.id)]
    saveTeams(updated, activeUser)

    return {
      success: true,
      team: targetTeam,
      member: matchedMember,
      user: activeUser,
      token: 'tok_party_' + Math.random().toString(36).slice(2, 9),
    }
  }

  // POST /api/teams/:id/track
  if (path.includes('/track')) {
    const teamId = body.teamId || path.replace('/api/teams/', '').split('/')[0]
    const teams = getStoredTeams(currentUser).map((t) => {
      if (t.id === teamId || !teamId) {
        return {
          ...t,
          track: body.track || t.track,
          trackName: body.trackName || t.trackName,
        }
      }
      return t
    })
    saveTeams(teams)
    const active = teams.find((t) => t.id === teamId) || teams[0]
    return { success: true, team: active }
  }

  // GET or POST /api/teams/:id/submission
  if (path.includes('/submission')) {
    const teamId = body.teamId || path.replace('/api/teams/', '').split('/')[0]
    const key = `cf_sub_${teamId || 'default'}`
    if (method === 'GET' || path.endsWith('/get')) {
      let sub = null
      try {
        const raw = localStorage.getItem(key)
        if (raw) sub = JSON.parse(raw)
      } catch {}
      return {
        success: true,
        submission: sub || {
          title: '',
          abstract: '',
          track: 'agentic_ai',
          pptUrl: '',
          githubUrl: '',
          demoUrl: '',
          videoUrl: '',
          techStack: ['React', 'Python'],
          status: 'not_submitted',
          updatedAt: null,
        },
      }
    }

    if (method === 'POST') {
      const sub = {
        title: body.title || '',
        abstract: body.abstract || '',
        track: body.track || 'agentic_ai',
        pptUrl: body.pptUrl || '',
        githubUrl: body.githubUrl || '',
        demoUrl: body.demoUrl || '',
        videoUrl: body.videoUrl || '',
        techStack: Array.isArray(body.techStack) ? body.techStack : [],
        status: body.isFinal ? 'submitted' : 'draft',
        updatedAt: new Date().toISOString(),
      }
      try {
        localStorage.setItem(key, JSON.stringify(sub))
      } catch {}
      return { success: true, submission: sub }
    }
  }


  // GET /api/ops/state
  if (path === '/api/ops/state') {
    return { success: true, state: getSealedHackathonState() }
  }

  // POST /api/ops/admin-login
  if (path === '/api/ops/admin-login') {
    if (body.passkey === ADMIN_VAULT_KEY) {
      return { success: true, token: 'vault_adm_' + Math.random().toString(36).slice(2, 9) }
    }
    throw new Error('Access Denied: Invalid Master Passkey')
  }

  // POST /api/ops/toggle-round
  if (path === '/api/ops/toggle-round') {
    const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
    if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
    const state = getSealedHackathonState()
    const roundKey = body.round === 'round2' ? 'round2' : 'round1'
    state.evaluationRounds = state.evaluationRounds || { round1: false, round2: false }
    state.evaluationRounds[roundKey] = !!body.open
    saveSealedHackathonState(state)
    return {
      success: true,
      round: roundKey,
      open: state.evaluationRounds[roundKey],
      evaluationRounds: state.evaluationRounds,
    }
  }

  // POST /api/ops/toggle-problems
  if (path === '/api/ops/toggle-problems') {
    const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
    if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
    const state = getSealedHackathonState()
    state.problemStatementsReleased = !!body.released
    saveSealedHackathonState(state)
    return { success: true, released: state.problemStatementsReleased }
  }

  // POST /api/ops/broadcast
  if (path === '/api/ops/broadcast') {
    const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
    if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
    const state = getSealedHackathonState()
    const item = {
      id: 'ann_' + Date.now(),
      text: body.text || '',
      priority: body.priority || 'normal',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    state.announcements = [item, ...(state.announcements || [])]
    saveSealedHackathonState(state)
    return { success: true, announcement: item, announcements: state.announcements }
  }

  // POST /api/ops/assign-table
  if (path === '/api/ops/assign-table') {
    const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
    if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
    const state = getSealedHackathonState()
    state.tableAssignments = state.tableAssignments || {}
    const cleanTable = (body.tableNumber || '').toUpperCase().trim()
    const finalTable = cleanTable && cleanTable !== 'UNASSIGNED' ? cleanTable : null
    if (!finalTable) {
      delete state.tableAssignments[body.teamId]
    } else {
      state.tableAssignments[body.teamId] = finalTable
    }
    saveSealedHackathonState(state)

    // Also update team object in stored teams
    let allRegistered = getAllRegisteredTeams()
    let found = false
    let updated = allRegistered.map((t) => {
      if (t.id === body.teamId) {
        found = true
        return {
          ...t,
          tableNumber: finalTable,
        }
      }
      return t
    })

    if (!found) {
      try {
        const raw = localStorage.getItem('cf_teams')
        const parsed = raw ? JSON.parse(raw) : []
        updated = parsed.map((t) => (t.id === body.teamId ? { ...t, tableNumber: finalTable } : t))
      } catch {}
    }

    saveRegisteredTeams(updated)

    // Push both opsState and teams in a single atomic payload to shared store
    try {
      pushToSharedStore({
        opsState: state,
        teams: updated,
      })
    } catch {}

    return {
      success: true,
      teamId: body.teamId,
      tableNumber: finalTable,
      tableAssignments: state.tableAssignments,
    }
  }

  // POST /api/ops/provision-coordinator
  if (path === '/api/ops/provision-coordinator') {
    const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
    if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
    const state = getSealedHackathonState()
    const coord = {
      id: 'coord_' + Math.random().toString(36).slice(2, 7),
      name: body.name || 'Gate Coordinator',
      email: (body.email || '').toLowerCase().trim(),
      password: body.password || 'gate123',
      gate: body.gate || 'Sitapura Main Entrance',
    }
    state.coordinators = [...(state.coordinators || []), coord]
    saveSealedHackathonState(state)
    return { success: true, coordinator: coord }
  }

  // POST /api/ops/remove-coordinator
  if (path === '/api/ops/remove-coordinator' || (path.startsWith('/api/ops/coordinators/') && method === 'DELETE')) {
    const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
    if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
    const coordId = body.coordId || path.split('/').pop()
    const state = getSealedHackathonState()
    state.coordinators = (state.coordinators || []).filter(
      (c) => c.id !== coordId && c.email?.toLowerCase() !== String(coordId).toLowerCase()
    )
    saveSealedHackathonState(state)
    return { success: true, coordinators: state.coordinators }
  }

  // POST /api/ops/update-coordinator
  if (path === '/api/ops/update-coordinator' || (path.startsWith('/api/ops/coordinators/') && (method === 'PATCH' || method === 'PUT'))) {
    const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
    if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
    const coordId = body.coordId || path.split('/').pop()
    const state = getSealedHackathonState()
    let updatedCoord = null
    state.coordinators = (state.coordinators || []).map((c) => {
      if (c.id === coordId || c.email?.toLowerCase() === String(coordId).toLowerCase()) {
        updatedCoord = {
          ...c,
          name: body.name !== undefined ? body.name : c.name,
          email: body.email !== undefined ? (body.email || '').toLowerCase().trim() : c.email,
          password: body.password !== undefined ? body.password : c.password,
          gate: body.gate !== undefined ? body.gate : c.gate,
        }
        return updatedCoord
      }
      return c
    })
    saveSealedHackathonState(state)
    return { success: true, coordinator: updatedCoord, coordinators: state.coordinators }
  }

  // POST /api/ops/verify-payment
  if (path === '/api/ops/verify-payment') {
    const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
    if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
    const teamId = body.teamId
    const verified = body.verified !== false
    const allTeams = getAllRegisteredTeams()
    const targetTeam = allTeams.find((t) => t.id === teamId)
    if (!targetTeam) throw new Error('Squad not found')

    targetTeam.payment = targetTeam.payment || {}
    targetTeam.payment.status = verified ? 'verified' : 'rejected'
    targetTeam.payment.verifiedAt = verified ? new Date().toISOString() : null
    targetTeam.payment.confirmationEmailDispatched = verified
    targetTeam.payment.notes = body.notes || (verified ? 'Payment matched against bank statements' : 'Payment rejected')

    if (verified) {
      targetTeam.status = 'confirmed'
    }

    saveRegisteredTeams(allTeams)
    if (targetTeam.leader?.email) {
      saveTeams([targetTeam], { email: targetTeam.leader.email })
    }

    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('hackathon:state-updated', { detail: getSealedHackathonState() }))
      window.dispatchEvent(new CustomEvent('hackathon:team-updated', { detail: targetTeam }))
    }

    return {
      success: true,
      team: targetTeam,
      emailDispatched: {
        to: targetTeam.leader?.email,
        teamName: targetTeam.name,
        subject: `[CONFIRMED] Codefiesta 5.0 Official Pass Issued — ${targetTeam.name}`,
        body: `Greetings ${targetTeam.leader?.name || 'Leader'},\n\nYour payment of ₹${targetTeam.payment?.amount || 800} (UTR: ${targetTeam.payment?.utr}) has been successfully verified against our accounts. Your squad "${targetTeam.name}" is officially confirmed for Codefiesta 5.0.\n\nAll candidate passes and entry QR codes are now active on your dashboard.\n\nCodefiesta 5.0 HQ`,
        utr: targetTeam.payment?.utr,
        amount: targetTeam.payment?.amount || 800,
        timestamp: new Date().toISOString(),
      },
    }
  }

  // POST /api/ops/revert-payment
  if (path === '/api/ops/revert-payment') {
    const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
    if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
    const teamId = body.teamId
    const allTeams = getAllRegisteredTeams()
    const targetTeam = allTeams.find((t) => t.id === teamId)
    if (!targetTeam) throw new Error('Squad not found')

    targetTeam.payment = targetTeam.payment || {}
    targetTeam.payment.status = 'submitted'
    targetTeam.payment.verifiedAt = null
    targetTeam.payment.confirmationEmailDispatched = false
    targetTeam.payment.notes = 'Payment verification reverted by Admin'
    targetTeam.status = 'registered'

    saveRegisteredTeams(allTeams)
    if (targetTeam.leader?.email) {
      saveTeams([targetTeam], { email: targetTeam.leader.email })
    }
    pushToSharedStore({ teams: allTeams })
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('hackathon:state-updated', { detail: getSealedHackathonState() }))
      window.dispatchEvent(new CustomEvent('hackathon:team-updated', { detail: targetTeam }))
      window.dispatchEvent(new CustomEvent('codefiesta_teams_updated', { detail: { teams: allTeams } }))
    }
    return { success: true, team: targetTeam, message: 'Payment reverted to pending bank match' }
  }

  // POST /api/ops/reset-user-password
  if (path === '/api/ops/reset-user-password') {
    const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
    if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
    const email = (body.email || '').toLowerCase().trim()
    const newPassword = body.newPassword || ''
    if (!email || !newPassword) throw new Error('Email and new password are required')

    let allUsers = []
    try {
      const rawUsers = localStorage.getItem('cf_all_users')
      allUsers = rawUsers ? JSON.parse(rawUsers) : []
    } catch {}

    const targetUser = allUsers.find((u) => u.email && u.email.toLowerCase() === email)
    if (targetUser) {
      targetUser.password = newPassword
    } else {
      // User might be created on the fly
      allUsers.push({ email, password: newPassword, name: email.split('@')[0] })
    }
    saveAllUsers(allUsers)

    try {
      if (typeof localStorage !== 'undefined') {
        const cur = localStorage.getItem('cf_auth_user')
        if (cur) {
          const parsed = JSON.parse(cur)
          if (parsed.email && parsed.email.toLowerCase() === email) {
            parsed.password = newPassword
            localStorage.setItem('cf_auth_user', JSON.stringify(parsed))
          }
        }
      }
    } catch {}

    return { success: true, email, message: `Password for ${email} has been reset.` }
  }

  // POST /api/ops/remove-attendee
  if (path === '/api/ops/remove-attendee') {
    const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
    if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
    const teamId = body.teamId
    const email = (body.email || '').toLowerCase().trim()
    const isEarlyExit = body.earlyExit !== false

    const allTeams = getAllRegisteredTeams()
    const targetTeam = allTeams.find((t) => t.id === teamId || t.code === teamId)
    if (!targetTeam) throw new Error('Squad not found')

    const member = (targetTeam.members || []).find((m) => (m.email || '').toLowerCase().trim() === email)
    if (member) {
      if (isEarlyExit) {
        member.earlyExit = true
        member.earlyExitAt = new Date().toISOString()
      } else {
        // Complete drop from roster
        targetTeam.members = (targetTeam.members || []).filter((m) => (m.email || '').toLowerCase().trim() !== email)
        targetTeam.invites = (targetTeam.invites || []).filter((i) => (i.email || '').toLowerCase().trim() !== email)
        targetTeam.size = Math.max(1, targetTeam.members.length)
      }
      targetTeam.acceptedCount = (targetTeam.members || []).filter(
        (m) => (m.status === 'accepted' || m.status === 'confirmed') && !m.earlyExit
      ).length
    }

    saveRegisteredTeams(allTeams)
    try {
      localStorage.setItem('cf_teams', JSON.stringify(allTeams))
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('cf_user_teams_')) {
          try {
            const ut = JSON.parse(localStorage.getItem(k) || '[]')
            if (Array.isArray(ut)) {
              const updatedUt = ut.map(t => {
                if (t.id === teamId || t.code === teamId) {
                  return { ...targetTeam }
                }
                return t
              })
              localStorage.setItem(k, JSON.stringify(updatedUt))
            }
          } catch {}
        }
      }
    } catch {}

    await pushToSharedStore({ teams: allTeams, wipeTeams: true })
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('codefiesta_teams_updated', { detail: { teams: allTeams } }))
    }
    return { success: true, team: targetTeam }
  }

  // POST /api/ops/reinstate-attendee
  if (path === '/api/ops/reinstate-attendee') {
    const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
    if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
    const teamId = body.teamId
    const email = (body.email || '').toLowerCase().trim()

    const allTeams = getAllRegisteredTeams()
    const targetTeam = allTeams.find((t) => t.id === teamId || t.code === teamId)
    if (!targetTeam) throw new Error('Squad not found')

    const member = (targetTeam.members || []).find((m) => (m.email || '').toLowerCase().trim() === email)
    if (member) {
      member.earlyExit = false
      delete member.earlyExitAt
      targetTeam.acceptedCount = (targetTeam.members || []).filter(
        (m) => (m.status === 'accepted' || m.status === 'confirmed') && !m.earlyExit
      ).length
    }

    saveRegisteredTeams(allTeams)
    try {
      localStorage.setItem('cf_teams', JSON.stringify(allTeams))
    } catch {}
    await pushToSharedStore({ teams: allTeams, wipeTeams: true })
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('codefiesta_teams_updated', { detail: { teams: allTeams } }))
    }
    return { success: true, team: targetTeam }
  }

  // GET & POST /api/ops/problem-statements
  if (path === '/api/ops/problem-statements') {
    const state = getSealedHackathonState()
    if (method === 'POST') {
      const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
      if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
      if (Array.isArray(body.problemStatements)) {
        state.problemStatements = body.problemStatements
        saveSealedHackathonState(state)
        pushToSharedStore({ opsState: state })
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('hackathon:state-updated', { detail: state }))
        }
      }
      return { success: true, problemStatements: state.problemStatements }
    }
    return { success: true, problemStatements: state.problemStatements || DEFAULT_PROBLEM_STATEMENTS }
  }

  // POST /api/auth/request-password-reset
  if (path === '/api/auth/request-password-reset') {
    const email = (body.email || '').toLowerCase().trim()
    const state = getSealedHackathonState()
    state.passwordResetRequests = state.passwordResetRequests || []
    if (email && !state.passwordResetRequests.some((r) => r.email === email)) {
      state.passwordResetRequests.push({
        id: 'pwd_' + Date.now(),
        email,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      })
      saveSealedHackathonState(state)
      pushToSharedStore({ opsState: state })
    }
    return {
      success: true,
      message: 'Password reset request registered with Codefiesta Admin Helpdesk.',
      helpline: '+91 97723 16648 / support@codefiesta.in',
    }
  }

  // GET /api/ops/registrations
  if (path === '/api/ops/registrations') {
    const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
    if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
    const allTeams = getAllRegisteredTeams()
    const candidates = []

    for (const t of allTeams) {
      const leaderCollege = t.leader?.college || 'Global Institute of Technology, Jaipur'
      const confirmedCount =
        (t.members || []).filter(
          (x) =>
            x.status === 'accepted' ||
            x.status === 'confirmed' ||
            x.role === 'leader' ||
            (t.leader?.email && x.email?.toLowerCase() === t.leader?.email?.toLowerCase())
        ).length || t.acceptedCount || 1
      const totalCount = (t.members || []).length || 4

      for (const m of t.members || []) {
        const isLeader =
          m.role === 'leader' ||
          (t.leader?.email && m.email?.toLowerCase() === t.leader?.email?.toLowerCase())
        const isConfirmed = isLeader || m.status === 'accepted' || m.status === 'confirmed'
        const candidateStatus = isConfirmed ? 'accepted' : (m.status || 'pending')

        candidates.push({
          teamId: t.id,
          teamName: t.name,
          collegeName: m.college || leaderCollege,
          candidateName: m.name || (isLeader ? t.leader?.name : 'Operative'),
          role: isLeader ? 'leader' : 'member',
          email: m.email || '',
          phone: m.phone || (isLeader ? t.leader?.phone : '') || '',
          rollNumber: m.rollNumber || (isLeader ? t.leader?.rollNumber : '') || '',
          course: m.course || (isLeader ? t.leader?.course : '') || 'CSE',
          year: m.year || (isLeader ? t.leader?.year : '') || '1st',
          gender: m.gender || (isLeader ? t.leader?.gender : '') || 'male',
          status: candidateStatus,
          inviteStatus: candidateStatus,
          isConfirmed,
          teamConfirmedCount: confirmedCount,
          teamTotalCount: totalCount,
          inviteCode: m.inviteCode || '',
          utr: t.payment?.utr || 'NOT_SUBMITTED',
          paymentStatus: t.payment?.status || 'not_submitted',
          amount: t.payment?.amount || 800,
          submittedAt: t.payment?.submittedAt || t.createdAt || new Date().toISOString(),
          verifiedAt: t.payment?.verifiedAt || null,
          earlyExit: !!m.earlyExit,
          earlyExitAt: m.earlyExitAt || null,
          tableNumber: t.tableNumber || null,
          track: t.track || null,
          trackName: t.trackName || null,
          submission: t.submission || null,
          team: t,
        })
      }
    }

    return {
      success: true,
      candidates,
      teams: allTeams,
    }
  }

  // POST /api/gate/login
  if (path === '/api/gate/login') {
    const email = (body.email || '').toLowerCase().trim()
    const password = body.password || ''
    const state = getSealedHackathonState()
    const found = (state.coordinators || []).find(
      (c) => c.email.toLowerCase() === email && c.password === password
    )
    if (found) {
      return { success: true, coordinator: found }
    }
    if (email === 'gate.coordinator@codefiesta.in' && password === 'gate_access_cf5') {
      return {
        success: true,
        coordinator: {
          id: 'coord_default',
          name: 'Main Gate Staff',
          email,
          gate: 'Sitapura Main Entrance',
        },
      }
    }
    throw new Error('Invalid gate coordinator credentials.')
  }

  // POST /api/gate/scan
  if (path === '/api/gate/scan') {
    const state = getSealedHackathonState()
    const input = (body.code || body.passId || '').trim()
    if (!input) throw new Error('No QR payload or pass ID provided.')

    let targetEmail = ''
    let targetTeamId = ''
    let targetPassId = ''

    if (input.startsWith('CF5:')) {
      const parts = input.split(':')
      targetTeamId = parts[1] || ''
      targetEmail = (parts[2] || '').toLowerCase()
      targetPassId = parts[3] || ''
    } else if (input.includes('@')) {
      targetEmail = input.toLowerCase()
    } else {
      targetPassId = input
    }

    const allTeams = getAllRegisteredTeams()
    let foundTeam = null
    let foundMember = null

    for (const t of allTeams) {
      for (const m of t.members || []) {
        const pId = `CF5-${(m.id || m.email || '0000').slice(-6).toUpperCase()}`
        if (
          (targetEmail && m.email.toLowerCase() === targetEmail) ||
          (targetPassId && pId === targetPassId.toUpperCase()) ||
          (targetPassId && (m.id || '').endsWith(targetPassId))
        ) {
          foundTeam = t
          foundMember = m
          break
        }
      }
      if (foundTeam) break
    }

    if (!foundTeam) {
      const u = getStoredUsers().find(
        (usr) =>
          (targetEmail && usr.email.toLowerCase() === targetEmail) ||
          (targetPassId && `CF5-${(usr.id || '0000').slice(-6).toUpperCase()}` === targetPassId.toUpperCase())
      )
      if (u) {
        foundMember = {
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email.split('@')[0],
          email: u.email,
          college: u.college || 'Participant',
          role: 'leader',
          status: 'accepted',
        }
        foundTeam = allTeams.find((t) => (t.members || []).some((m) => m.email === u.email)) || {
          id: 'team_solo_' + u.id,
          name: 'SOLO OPERATIVE',
          size: 1,
          members: [foundMember],
          tableNumber: state.tableAssignments?.[u.id] || null,
        }
      }
    }

    if (!foundTeam || !foundMember) {
      throw new Error('QR Code verification failed: No matching registered participant found.')
    }

    state.gateCheckins = state.gateCheckins || {}
    state.gateCheckins[foundTeam.id] = state.gateCheckins[foundTeam.id] || {}

    const checkinTime = new Date().toISOString()
    state.gateCheckins[foundTeam.id][foundMember.email.toLowerCase()] = checkinTime
    saveSealedHackathonState(state)

    const acceptedMembers = (foundTeam.members || []).filter(
      (m) => m.status === 'accepted' || m.role === 'leader'
    )
    const teamSize = Math.max(acceptedMembers.length, foundTeam.size || 1)

    const roster = acceptedMembers.map((m) => {
      const isHere = !!state.gateCheckins[foundTeam.id][m.email.toLowerCase()]
      return {
        ...m,
        checkedIn: isHere,
        checkedInAt: state.gateCheckins[foundTeam.id][m.email.toLowerCase()] || null,
      }
    })

    const checkedInCount = roster.filter((m) => m.checkedIn).length
    const isComplete = checkedInCount >= acceptedMembers.length && acceptedMembers.length > 0

    return {
      success: true,
      team: {
        id: foundTeam.id,
        name: foundTeam.name,
        size: teamSize,
        tableNumber: state.tableAssignments?.[foundTeam.id] || foundTeam.tableNumber || null,
        roster,
      },
      scannedMember: {
        name: foundMember.name || foundMember.email.split('@')[0],
        email: foundMember.email,
        college: foundMember.college,
        checkedInAt: checkinTime,
      },
      checkedInCount,
      totalMembers: acceptedMembers.length,
      isComplete,
    }
  }

  // GET /api/gate/teams
  if (path === '/api/gate/teams') {
    const state = getSealedHackathonState()
    const allTeams = getAllRegisteredTeams()
    const gateStats = allTeams.map((t) => {
      const checkins = state.gateCheckins?.[t.id] || {}
      const accepted = (t.members || []).filter((m) => m.status === 'accepted' || m.role === 'leader')
      const presentCount = accepted.filter((m) => checkins[m.email.toLowerCase()]).length
      return {
        id: t.id,
        name: t.name,
        size: t.size,
        tableNumber: state.tableAssignments?.[t.id] || t.tableNumber || null,
        acceptedCount: accepted.length,
        presentCount,
        isFullyPresent: presentCount >= accepted.length && accepted.length > 0,
        isPartiallyPresent: presentCount > 0 && presentCount < accepted.length,
      }
    })
    return { success: true, teams: gateStats }
  }

  // POST /api/ops/provision-mentor
  if (path === '/api/ops/provision-mentor') {
    const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
    if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
    const state = getSealedHackathonState()
    const mentor = {
      id: 'men_' + Math.random().toString(36).slice(2, 7),
      name: body.name || 'Mentor Specialist',
      email: (body.email || '').toLowerCase().trim(),
      password: body.password || 'mentor123',
      track: body.track || 'agentic_ai',
      tables: body.tables || 'T-01 - T-20',
    }
    state.mentors = [...(state.mentors || []), mentor]
    saveSealedHackathonState(state)
    return { success: true, mentor }
  }

  // POST /api/ops/remove-mentor
  if (path === '/api/ops/remove-mentor' || (path.startsWith('/api/ops/mentors/') && method === 'DELETE')) {
    const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
    if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
    const mentorId = body.mentorId || path.split('/').pop()
    const state = getSealedHackathonState()
    state.mentors = (state.mentors || []).filter(
      (m) => m.id !== mentorId && m.email?.toLowerCase() !== String(mentorId).toLowerCase()
    )
    saveSealedHackathonState(state)
    return { success: true, mentors: state.mentors }
  }

  // POST /api/ops/update-mentor
  if (path === '/api/ops/update-mentor' || (path.startsWith('/api/ops/mentors/') && (method === 'PATCH' || method === 'PUT'))) {
    const key = options.headers?.['X-Ops-Vault-Key'] || body.passkey
    if (key !== ADMIN_VAULT_KEY) throw new Error('Access Denied: Unauthorized Action')
    const mentorId = body.mentorId || path.split('/').pop()
    const state = getSealedHackathonState()
    let updatedMentor = null
    state.mentors = (state.mentors || []).map((m) => {
      if (m.id === mentorId || m.email?.toLowerCase() === String(mentorId).toLowerCase()) {
        updatedMentor = {
          ...m,
          name: body.name !== undefined ? body.name : m.name,
          email: body.email !== undefined ? (body.email || '').toLowerCase().trim() : m.email,
          password: body.password !== undefined ? body.password : m.password,
          track: body.track !== undefined ? body.track : m.track,
          tables: body.tables !== undefined ? body.tables : m.tables,
        }
        return updatedMentor
      }
      return m
    })
    saveSealedHackathonState(state)
    return { success: true, mentor: updatedMentor, mentors: state.mentors }
  }

  // POST /api/mentor/login
  if (path === '/api/mentor/login') {
    const email = (body.email || '').toLowerCase().trim()
    const password = body.password || ''
    const state = getSealedHackathonState()
    const found = (state.mentors || []).find((m) => m.email.toLowerCase() === email && m.password === password)
    if (found) {
      return { success: true, mentor: found }
    }
    if (email === 'mentor.ai@codefiesta.in' && password === 'mentor_access_cf5') {
      return {
        success: true,
        mentor: {
          id: 'men_default',
          name: 'Dr. Rajesh Sharma',
          email,
          track: 'agentic_ai',
          tables: 'T-01 - T-20',
        },
      }
    }
    throw new Error('Invalid mentor credentials.')
  }

  // POST /api/mentor/evaluate
  if (path === '/api/mentor/evaluate') {
    const state = getSealedHackathonState()
    const roundKey = body.round === 'round2' ? 'round2' : 'round1'
    const roundLabel = roundKey === 'round2' ? 'Second Assessment' : 'First Assessment'

    // 1. Check if the evaluation round is opened by admin
    if (!state.evaluationRounds?.[roundKey]) {
      throw new Error(`${roundLabel} is currently LOCKED by Admin Ops. Please wait for the ground round announcement.`)
    }

    // 2. Check if this team already has a locked evaluation for THIS specific round
    const existing = (state.evaluations || []).find(
      (e) => e.teamId === body.teamId && (e.round === roundKey || (!e.round && roundKey === 'round1'))
    )
    if (existing && existing.locked) {
      throw new Error(`Evaluation for ${roundLabel} is permanently locked and cannot be modified.`)
    }

    const total =
      Number(body.scores?.innovation || 0) +
      Number(body.scores?.tech || 0) +
      Number(body.scores?.feasibility || 0) +
      Number(body.scores?.pitch || 0)

    const evalItem = {
      id: 'eval_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      teamId: body.teamId,
      teamName: body.teamName || 'Squad',
      tableNumber: body.tableNumber || (state.tableAssignments?.[body.teamId] || null),
      round: roundKey,
      roundName: roundLabel,
      mentorEmail: body.mentorEmail,
      mentorName: body.mentorName || 'Evaluator',
      scores: {
        innovation: Number(body.scores?.innovation || 0),
        tech: Number(body.scores?.tech || 0),
        feasibility: Number(body.scores?.feasibility || 0),
        pitch: Number(body.scores?.pitch || 0),
      },
      innovation: Number(body.scores?.innovation || 0),
      tech: Number(body.scores?.tech || 0),
      feasibility: Number(body.scores?.feasibility || 0),
      pitch: Number(body.scores?.pitch || 0),
      total,
      notes: body.notes || body.comments || '',
      comments: body.notes || body.comments || '',
      locked: true,
      lockedAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    }

    state.evaluations = [
      ...(state.evaluations || []).filter(
        (e) => !(e.teamId === body.teamId && (e.round === roundKey || (!e.round && roundKey === 'round1')))
      ),
      evalItem,
    ]
    saveSealedHackathonState(state)
    return { success: true, evaluation: evalItem }
  }

  return { success: true }
}

async function request(path, options = {}) {
  const origin = getApiOrigin()
  if (origin) {
    try {
      const storedKey = getStoredAdminKey()
      const headers = {
        'Content-Type': 'application/json',
        ...(storedKey ? { 'x-vault-passkey': storedKey, 'x-ops-vault-key': storedKey } : {}),
        ...(options.headers || {}),
      }
      const res = await fetch(`${origin}${path}`, {
        credentials: 'include',
        ...options,
        headers,
      })
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const data = await res.json().catch(() => null)
        if (res.ok) {
          if ((path === '/api/auth/login' || path === '/api/auth/register') && data?.user) {
            try {
              localStorage.setItem('cf_auth_user', JSON.stringify(data.user))
              localStorage.removeItem('cf_logged_out')
            } catch {}
          }
          return data
        } else if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 429) {
          // Intentional rejection from backend (invalid password, bad email, lockout, etc.)
          throw new Error(data?.error || `Request failed with status ${res.status}`)
        }
      }
    } catch (err) {
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError') && !err.message.includes('Load failed')) {
        throw err
      }
    }
  }

  // Fallback to local storage & shared database
  try {
    await syncWithSharedStore()
  } catch {}

  return handleFallback(path, options)
}

export function registerUser(payload) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function loginUser(payload) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function checkEmailApi(email) {
  return request('/api/auth/check-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function fetchMe() {
  return request('/api/auth/me')
}

export function logoutUser() {
  return request('/api/auth/logout', { method: 'POST' })
}

export function createTeamApi(payload) {
  return request('/api/teams/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function editTeamApi(teamId, payload) {
  return request(`/api/teams/${encodeURIComponent(teamId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function removeMemberApi(teamId, email) {
  return request(
    `/api/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(email)}`,
    { method: 'DELETE' },
  )
}

export function addMemberApi(teamId, memberData) {
  return request(`/api/teams/${encodeURIComponent(teamId)}/members`, {
    method: 'POST',
    body: JSON.stringify(memberData),
  })
}

export function updateMemberApi(teamId, email, memberData) {
  return request(
    `/api/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(email)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(memberData),
    },
  )
}

export function verifyInviteApi(token) {
  return request(`/api/teams/invite/${encodeURIComponent(token)}`)
}

export function checkInviteEmailApi(token, email) {
  return request(
    `/api/teams/invite/${encodeURIComponent(token)}/check-email`,
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  )
}

export function acceptInviteApi(token) {
  return request(`/api/teams/accept/${encodeURIComponent(token)}`, {
    method: 'POST',
  })
}

export function acceptDirectApi(teamId) {
  return request(`/api/teams/accept-direct/${encodeURIComponent(teamId)}`, {
    method: 'POST',
  })
}

export function fetchMyTeams() {
  return request('/api/teams/my')
}

export function getAllRegisteredTeamsApi() {
  return request('/api/teams/all')
}

export function lockTeam(teamId) {
  return request(`/api/teams/lock/${encodeURIComponent(teamId)}`, {
    method: 'POST',
  })
}

export function submitPaymentApi(teamIdOrPayload, maybeUtr) {
  let teamId = teamIdOrPayload
  let utr = maybeUtr
  if (typeof teamIdOrPayload === 'object' && teamIdOrPayload !== null) {
    teamId = teamIdOrPayload.teamId
    utr = teamIdOrPayload.utr
  }
  return request(`/api/teams/${encodeURIComponent(teamId || 'team')}/payment`, {
    method: 'POST',
    body: JSON.stringify({ utr }),
  })
}

export async function joinTeamByCodeApi(code, extra = {}) {
  try {
    await syncWithSharedStore()
  } catch {}
  return request('/api/teams/join-code', {
    method: 'POST',
    body: JSON.stringify({ code, ...extra }),
  })
}

export function joinWithPartyCodeApi(code, extra = {}) {
  return joinTeamByCodeApi(code, extra)
}

export function checkSquadNameApi(name) {
  return request('/api/teams/check-name', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function updateTeamTrackApi(teamId, track, trackName) {
  return request(`/api/teams/${encodeURIComponent(teamId)}/track`, {
    method: 'POST',
    body: JSON.stringify({ teamId, track, trackName }),
  })
}

export function getProjectSubmissionApi(teamId) {
  return request(`/api/teams/${encodeURIComponent(teamId)}/submission/get`, {
    method: 'GET',
  })
}

export function saveProjectSubmissionApi(teamId, payload) {
  return request(`/api/teams/${encodeURIComponent(teamId)}/submission`, {
    method: 'POST',
    body: JSON.stringify({ teamId, ...payload }),
  })
}
export function getHackathonStateApi() {
  return request('/api/ops/state')
}

export async function verifyAdminPasskeyApi(passkey) {
  const cleanKey = (passkey || '').trim()
  const res = await request('/api/ops/admin-login', {
    method: 'POST',
    body: JSON.stringify({ passkey: cleanKey }),
  })
  if (res?.success) {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('cf_admin_passkey', cleanKey)
      }
    } catch {}
    return res
  }
  throw new Error(res?.error || 'Access Denied: Invalid Master Passkey')
}

export function toggleProblemStatementsApi(released, passkey) {
  return request('/api/ops/toggle-problems', {
    method: 'POST',
    headers: { 'X-Ops-Vault-Key': passkey },
    body: JSON.stringify({ released, passkey }),
  })
}

export function broadcastAnnouncementApi(text, priority = 'normal', passkey) {
  return request('/api/ops/broadcast', {
    method: 'POST',
    headers: { 'X-Ops-Vault-Key': passkey },
    body: JSON.stringify({ text, priority, passkey }),
  })
}

export function assignTableApi(teamId, tableNumber, passkey) {
  return request('/api/ops/assign-table', {
    method: 'POST',
    headers: { 'X-Ops-Vault-Key': passkey },
    body: JSON.stringify({ teamId, tableNumber, passkey }),
  })
}

export function provisionMentorApi(mentorData, passkey) {
  return request('/api/ops/provision-mentor', {
    method: 'POST',
    headers: { 'X-Ops-Vault-Key': passkey },
    body: JSON.stringify({ ...mentorData, passkey }),
  })
}

export function mentorLoginApi(email, password) {
  return request('/api/mentor/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function submitMentorEvaluationApi(evaluation) {
  return request('/api/mentor/evaluate', {
    method: 'POST',
    body: JSON.stringify(evaluation),
  })
}

export function toggleEvaluationRoundApi(round, open, passkey) {
  return request('/api/ops/toggle-round', {
    method: 'POST',
    headers: { 'X-Ops-Vault-Key': passkey },
    body: JSON.stringify({ round, open, passkey }),
  })
}

export function provisionCoordinatorApi(coordData, passkey) {
  return request('/api/ops/provision-coordinator', {
    method: 'POST',
    headers: { 'X-Ops-Vault-Key': passkey },
    body: JSON.stringify({ ...coordData, passkey }),
  })
}

export function coordinatorLoginApi(email, password) {
  return request('/api/gate/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function scanGateQrApi(code) {
  return request('/api/gate/scan', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export function getGateTeamsApi() {
  return request('/api/gate/teams')
}

export function verifyTeamPaymentApi(teamId, verified = true, notes = '', passkey = getStoredAdminKey()) {
  return request('/api/ops/verify-payment', {
    method: 'POST',
    headers: { 'X-Ops-Vault-Key': passkey },
    body: JSON.stringify({ teamId, verified, notes, passkey }),
  })
}

export function getRegistrationsLedgerApi(passkey = getStoredAdminKey()) {
  return request('/api/ops/registrations', {
    headers: { 'X-Ops-Vault-Key': passkey, 'x-vault-passkey': passkey },
  })
}

export function removeMentorApi(mentorId, passkey = getStoredAdminKey()) {
  return request('/api/ops/remove-mentor', {
    method: 'POST',
    headers: { 'X-Ops-Vault-Key': passkey },
    body: JSON.stringify({ mentorId, passkey }),
  })
}

export function updateMentorApi(mentorId, payload, passkey = getStoredAdminKey()) {
  return request('/api/ops/update-mentor', {
    method: 'POST',
    headers: { 'X-Ops-Vault-Key': passkey },
    body: JSON.stringify({ mentorId, ...payload, passkey }),
  })
}

export function removeCoordinatorApi(coordId, passkey = getStoredAdminKey()) {
  return request('/api/ops/remove-coordinator', {
    method: 'POST',
    headers: { 'X-Ops-Vault-Key': passkey },
    body: JSON.stringify({ coordId, passkey }),
  })
}

export function updateCoordinatorApi(coordId, payload, passkey = getStoredAdminKey()) {
  return request('/api/ops/update-coordinator', {
    method: 'POST',
    headers: { 'X-Ops-Vault-Key': passkey },
    body: JSON.stringify({ coordId, ...payload, passkey }),
  })
}

export function revertTeamPaymentApi(teamId, passkey = getStoredAdminKey()) {
  return request('/api/ops/revert-payment', {
    method: 'POST',
    headers: { 'X-Ops-Vault-Key': passkey },
    body: JSON.stringify({ teamId, passkey }),
  })
}

export function resetUserPasswordApi(email, newPassword, passkey = getStoredAdminKey()) {
  return request('/api/ops/reset-user-password', {
    method: 'POST',
    headers: { 'X-Ops-Vault-Key': passkey },
    body: JSON.stringify({ email, newPassword, passkey }),
  })
}

export function removeAttendeeApi(teamId, email, earlyExit = true, passkey = getStoredAdminKey()) {
  return request('/api/ops/remove-attendee', {
    method: 'POST',
    headers: { 'X-Ops-Vault-Key': passkey },
    body: JSON.stringify({ teamId, email, earlyExit, passkey }),
  })
}

export function reinstateAttendeeApi(teamId, email, passkey = getStoredAdminKey()) {
  return request('/api/ops/reinstate-attendee', {
    method: 'POST',
    headers: { 'X-Ops-Vault-Key': passkey },
    body: JSON.stringify({ teamId, email, passkey }),
  })
}

export function getProblemStatementsApi() {
  return request('/api/ops/problem-statements')
}

export function updateProblemStatementsApi(problemStatements, passkey = getStoredAdminKey()) {
  return request('/api/ops/problem-statements', {
    method: 'POST',
    headers: { 'X-Ops-Vault-Key': passkey },
    body: JSON.stringify({ problemStatements, passkey }),
  })
}

export function requestPasswordResetApi(email) {
  return request('/api/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

