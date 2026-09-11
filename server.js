import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.disable('x-powered-by')

const PORT = process.env.PORT || 4000
const ADMIN_VAULT_KEY = process.env.ADMIN_VAULT_KEY || 'cf5_master_access_2026'

// Basic Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

// Rate Limiting (In-Memory IP sliding window for anti-abuse and anti-DDoS)
const rateLimitMap = new Map()

// Clean up stale IP records every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 300000)

const createRateLimiter = (maxRequests = 300, windowMs = 60000, message = 'Rate limit exceeded. Please wait a moment.') => {
  return (req, res, next) => {
    const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown-ip').trim()
    const now = Date.now()
    const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs }

    if (now > record.resetTime) {
      record.count = 1
      record.resetTime = now + windowMs
    } else {
      record.count += 1
    }

    rateLimitMap.set(ip, record)

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000))
      return res.status(429).json({ error: message })
    }

    next()
  }
}

const authLimiter = createRateLimiter(30, 60000, 'Too many login or registration attempts. Please wait 1 minute before trying again.')
const apiLimiter = createRateLimiter(600, 60000, 'Too many requests. Please slow down.')

// Setup CORS: reflect origin or allow all
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-vault-passkey']
}))

app.use(express.json({ limit: '10mb' }))

// Local fallback DB path
const dbPath = path.resolve(__dirname, 'scratch/shared_db.json')

const readLocalDb = () => {
  try {
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, 'utf8'))
    }
  } catch (e) {
    console.error('[server] Error reading local store:', e.message)
  }
  return { teams: [], users: [], opsState: null, problemStatements: null }
}

const writeLocalDb = (data) => {
  try {
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8')
  } catch (e) {
    console.error('[server] Error writing local store:', e.message)
  }
}

// In-Memory Read Cache for 1000+ Concurrent Users (TTL: 2.5 seconds)
// Dramatically reduces TiDB queries under peak load while maintaining real-time feel
let storeCache = null
let storeCacheExpiry = 0

const invalidateStoreCache = () => {
  storeCache = null
  storeCacheExpiry = 0
}

// TiDB MySQL Pool initialization (Tuned for 1000+ load handling)
let pool = null
let useTiDB = false

if (process.env.TIDB_HOST || process.env.DATABASE_URL) {
  try {
    const mysql = await import('mysql2/promise')
    const poolConfig = {
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      waitForConnections: true,
      connectionLimit: 25,
      maxIdle: 15,
      idleTimeout: 60000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      queueLimit: 0
    }

    if (process.env.DATABASE_URL) {
      pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        ...poolConfig
      })
    } else {
      pool = mysql.createPool({
        host: process.env.TIDB_HOST,
        port: Number(process.env.TIDB_PORT) || 4000,
        user: process.env.TIDB_USER,
        password: process.env.TIDB_PASSWORD,
        database: process.env.TIDB_DATABASE || 'codefiesta_db',
        ...poolConfig
      })
    }

    // Ping check
    await pool.query('SELECT 1')
    useTiDB = true
    console.log('⚡ Connected successfully to TiDB Cloud Serverless MySQL')
    
    // Auto initialize tables if schema.sql exists
    const schemaFile = path.resolve(__dirname, 'schema.sql')
    if (fs.existsSync(schemaFile)) {
      try {
        const ddl = fs.readFileSync(schemaFile, 'utf8')
        const statements = ddl
          .split(';')
          .map(s => s.trim())
          .filter(s => s && !s.startsWith('--') && !s.startsWith('CREATE DATABASE') && !s.startsWith('USE '))
        for (const st of statements) {
          try {
            await pool.query(st)
          } catch (stErr) {
            // Ignore minor DDL duplicate notice
          }
        }
        console.log('✓ TiDB schema verified & initialized')
      } catch (ddlErr) {
        console.warn('Notice initializing schema:', ddlErr.message)
      }
    }
  } catch (err) {
    console.error('⚠️ Could not connect to TiDB. Falling back to persistent file store.', err.message)
    useTiDB = false
  }
} else {
  console.log('ℹ️ Running in JSON file store mode (Set TIDB_HOST or DATABASE_URL for TiDB Cloud).')
}

// Unified Store Helpers
async function getFullStore(forceRefresh = false) {
  if (!forceRefresh && storeCache && Date.now() < storeCacheExpiry) {
    return storeCache
  }

  const local = readLocalDb()
  if (!useTiDB || !pool) {
    storeCache = local
    storeCacheExpiry = Date.now() + 2500
    return local
  }

  try {
    const [opsRows] = await pool.query('SELECT state_key, state_val FROM ops_state')
    const opsState = {}
    let problemStatements = null
    for (const r of opsRows) {
      if (r.state_key === 'problem_statements_json') {
        try { problemStatements = JSON.parse(r.state_val) } catch {}
      } else {
        try {
          opsState[r.state_key] = JSON.parse(r.state_val)
        } catch {
          opsState[r.state_key] = r.state_val === 'true' ? true : (r.state_key === 'false' ? false : r.state_val)
        }
      }
    }

    const [userRows] = await pool.query('SELECT * FROM users')
    const users = userRows.map(u => ({
      id: u.id,
      email: u.email,
      password: u.password,
      firstName: u.first_name,
      lastName: u.last_name,
      phone: u.phone,
      college: u.college,
      rollNumber: u.roll_number,
      course: u.course,
      year: u.year,
      gender: u.gender
    }))

    const [teamRows] = await pool.query('SELECT * FROM teams')
    const [memberRows] = await pool.query('SELECT * FROM team_members')

    const teams = teamRows.map(t => {
      const members = memberRows
        .filter(m => m.team_id === t.id)
        .map(m => ({
          id: m.id,
          teamId: m.team_id,
          email: m.email,
          name: m.name,
          college: m.college,
          role: m.role,
          status: m.status,
          inviteCode: m.invite_code,
          earlyExit: Boolean(m.early_exit),
          earlyExitAt: m.early_exit_at
        }))

      return {
        id: t.id,
        name: t.name,
        code: t.code,
        size: t.size,
        status: t.status,
        leader: {
          email: t.leader_email,
          name: members.find(m => m.role === 'leader')?.name || t.leader_email
        },
        members,
        acceptedCount: members.filter(m => m.status === 'accepted').length,
        payment: {
          status: t.payment_status,
          utr: t.payment_reference,
          reference: t.payment_reference,
          amount: t.payment_amount || 600,
          submittedAt: t.payment_submitted_at,
          verifiedAt: t.payment_verified_at
        },
        tableNumber: t.table_number,
        track: t.track,
        trackName: t.track_name,
        submission: t.submission_repo ? {
          repoUrl: t.submission_repo,
          demoUrl: t.submission_demo,
          notes: t.submission_notes,
          submittedAt: t.submitted_at
        } : null,
        createdAt: t.created_at
      }
    })

    const result = {
      teams: teams.length > 0 ? teams : local.teams || [],
      users: users.length > 0 ? users : local.users || [],
      opsState: Object.keys(opsState).length > 0 ? opsState : local.opsState,
      problemStatements: problemStatements || local.problemStatements
    }
    storeCache = result
    storeCacheExpiry = Date.now() + 2500
    return result
  } catch (err) {
    console.error('Error querying TiDB:', err.message)
    return local
  }
}

// Sanitizes store data to prevent password and sensitive data leaks over public API
function sanitizeForPublic(store) {
  if (!store) return store
  return {
    ...store,
    // Strictly strip plain text passwords
    users: (store.users || []).map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      college: u.college,
      course: u.course,
      year: u.year,
      gender: u.gender
    })),
    teams: store.teams || [],
    opsState: store.opsState || {},
    problemStatements: store.problemStatements || []
  }
}

async function saveFullStore(incoming) {
  invalidateStoreCache()
  const current = await getFullStore(true)

  const wipe = incoming.wipe === true || incoming.wipeTeams === true
  let mergedTeams = current.teams || []
  if (wipe) {
    mergedTeams = Array.isArray(incoming.teams) ? incoming.teams : []
  } else if (Array.isArray(incoming.teams)) {
    const teamMap = new Map((current.teams || []).map(t => [t.id, t]))
    for (const t of incoming.teams) teamMap.set(t.id, t)
    mergedTeams = Array.from(teamMap.values())
  }

  let mergedUsers = current.users || []
  if (wipe) {
    mergedUsers = Array.isArray(incoming.users) ? incoming.users : []
  } else if (Array.isArray(incoming.users)) {
    const userMap = new Map((current.users || []).map(u => [u.email?.toLowerCase(), u]))
    for (const u of incoming.users) {
      if (u.email) userMap.set(u.email.toLowerCase(), u)
    }
    mergedUsers = Array.from(userMap.values())
  }

  let mergedOpsState = { ...(current.opsState || {}), ...(incoming.opsState || {}) }
  if (incoming.opsState?.tableAssignments) {
    mergedOpsState.tableAssignments = {
      ...(current.opsState?.tableAssignments || {}),
      ...incoming.opsState.tableAssignments
    }
  }

  // Ensure two-way sync between opsState.tableAssignments and team.tableNumber
  if (mergedOpsState?.tableAssignments) {
    mergedTeams = mergedTeams.map((t) => {
      const assigned = mergedOpsState.tableAssignments[t.id]
      if (assigned !== undefined) {
        return { ...t, tableNumber: assigned || null }
      }
      return t
    })
  }
  if (mergedOpsState) {
    mergedOpsState.tableAssignments = mergedOpsState.tableAssignments || {}
    for (const t of mergedTeams) {
      if (t.tableNumber && !mergedOpsState.tableAssignments[t.id]) {
        mergedOpsState.tableAssignments[t.id] = t.tableNumber
      }
    }
  }

  const problemStatements = incoming.problemStatements || incoming.opsState?.problemStatements || current.problemStatements

  const updated = {
    teams: mergedTeams,
    users: mergedUsers,
    opsState: mergedOpsState,
    problemStatements,
    updatedAt: new Date().toISOString()
  }

  // Save to local file always as persistent backup
  writeLocalDb(updated)

  // Also sync to TiDB if active
  if (useTiDB && pool) {
    try {
      if (wipe) {
        await pool.query('DELETE FROM team_members')
        await pool.query('DELETE FROM teams')
        await pool.query('DELETE FROM users')
      }

      // Sync users
      for (const u of mergedUsers) {
        if (!u.email) continue
        await pool.query(
          `INSERT INTO users (id, email, password, first_name, last_name, phone, college, roll_number, course, year, gender)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             password = VALUES(password),
             first_name = VALUES(first_name),
             last_name = VALUES(last_name),
             phone = VALUES(phone),
             college = VALUES(college),
             roll_number = VALUES(roll_number)`,
          [
            u.id || ('usr_' + Math.random().toString(36).slice(2, 11)),
            u.email.toLowerCase(),
            u.password || 'cf5_pass_123',
            u.firstName || '',
            u.lastName || '',
            u.phone || '',
            u.college || '',
            u.rollNumber || '',
            u.course || 'B.Tech CSE',
            u.year || '1st',
            u.gender || 'male'
          ]
        )
      }

      // Sync teams & members
      for (const t of mergedTeams) {
        if (!t.id) continue
        await pool.query(
          `INSERT INTO teams (id, name, code, leader_email, size, status, payment_status, payment_reference, payment_amount, table_number, track, track_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             status = VALUES(status),
             payment_status = VALUES(payment_status),
             payment_reference = VALUES(payment_reference),
             table_number = VALUES(table_number),
             track = VALUES(track),
             track_name = VALUES(track_name)`,
          [
            t.id,
            t.name,
            t.code || ('CF5' + Math.random().toString(36).slice(2, 6).toUpperCase()),
            t.leader?.email || t.leaderEmail || 'leader@codefiesta.in',
            t.size || 3,
            t.status || 'forming',
            t.payment?.status || 'not_submitted',
            t.payment?.utr || t.payment?.reference || null,
            t.payment?.amount || 600,
            t.tableNumber || null,
            t.track || null,
            t.trackName || null
          ]
        )

        if (Array.isArray(t.members)) {
          const currentMemberEmails = t.members.map(m => (m.email || '').toLowerCase().trim()).filter(Boolean)
          if (currentMemberEmails.length > 0) {
            await pool.query(
              `DELETE FROM team_members WHERE team_id = ? AND LOWER(email) NOT IN (?)`,
              [t.id, currentMemberEmails]
            )
          } else {
            await pool.query(`DELETE FROM team_members WHERE team_id = ?`, [t.id])
          }

          for (const m of t.members) {
            await pool.query(
              `INSERT INTO team_members (id, team_id, email, name, college, role, status, invite_code, early_exit)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 name = VALUES(name),
                 college = VALUES(college),
                 status = VALUES(status),
                 early_exit = VALUES(early_exit)`,
              [
                m.id || ('mem_' + Math.random().toString(36).slice(2, 11)),
                t.id,
                m.email.toLowerCase(),
                m.name || m.email,
                m.college || '',
                m.role || 'member',
                m.status || 'accepted',
                m.inviteCode || null,
                Boolean(m.earlyExit)
              ]
            )
          }
        }
      }

      // Save opsState key-values
      if (mergedOpsState) {
        for (const [k, v] of Object.entries(mergedOpsState)) {
          await pool.query(
            `INSERT INTO ops_state (state_key, state_val) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE state_val = VALUES(state_val)`,
            [k, typeof v === 'string' ? v : JSON.stringify(v)]
          )
        }
      }

      if (problemStatements) {
        await pool.query(
          `INSERT INTO ops_state (state_key, state_val) VALUES ('problem_statements_json', ?)
           ON DUPLICATE KEY UPDATE state_val = VALUES(state_val)`,
          [JSON.stringify(problemStatements)]
        )
      }
    } catch (dbErr) {
      console.error('TiDB sync error:', dbErr.message)
    }
  }

  return updated
}

// ----------------------------------------------------------------------------
// API ROUTES
// ----------------------------------------------------------------------------

// Health Check & Uptime Monitoring (for UptimeRobot, Render, etc.)
const handleHealthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    app: 'CodeFiesta 5.0 Arena Backend',
    database: useTiDB ? 'TiDB Cloud Serverless' : 'Local Persistent JSON',
    port: PORT,
    timestamp: new Date().toISOString()
  })
}

app.get('/api/health', handleHealthCheck)
app.get('/health', handleHealthCheck)
app.get('/api/ping', (req, res) => res.status(200).send('pong'))
app.get('/ping', (req, res) => res.status(200).send('pong'))

// Shared Store Sync
app.get('/api/shared-store', apiLimiter, async (req, res) => {
  try {
    const data = await getFullStore()
    res.json({ success: true, data: sanitizeForPublic(data) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/shared-store', apiLimiter, async (req, res) => {
  try {
    const incoming = req.body || {}
    const isWipe = incoming.wipe === true || incoming.wipeTeams === true || incoming.wipeUsers === true

    // Security Check: Protect destructive operations
    if (isWipe) {
      const key = req.headers['x-vault-passkey'] || incoming.passkey
      if (key !== ADMIN_VAULT_KEY) {
        return res.status(403).json({ error: 'Unauthorized: Admin Vault Key required for wiping database.' })
      }
    }

    const updated = await saveFullStore(incoming)
    res.json({ success: true, data: sanitizeForPublic(updated) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Auth: Register (Protected by auth rate limiter)
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const body = req.body || {}
    const email = (body.email || '').toLowerCase().trim()
    if (!email) return res.status(400).json({ error: 'Email is required' })

    const store = await getFullStore()
    const existing = store.users.find(u => u.email.toLowerCase() === email)
    if (existing) return res.status(400).json({ error: 'Email is already registered' })

    const newUser = {
      id: 'usr_' + Math.random().toString(36).slice(2, 11),
      email,
      password: body.password || '',
      firstName: body.firstName || '',
      lastName: body.lastName || '',
      phone: body.phone || '',
      college: body.college || '',
      rollNumber: body.rollNumber || '',
      course: body.course || 'B.Tech CSE',
      year: body.year || '1st',
      gender: body.gender || 'male',
      registeredAt: new Date().toISOString()
    }

    await saveFullStore({ users: [...store.users, newUser] })
    const safeUser = { ...newUser }
    delete safeUser.password
    res.json({ success: true, user: safeUser })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Auth: Login (Protected by auth rate limiter)
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const store = await getFullStore()
    const user = store.users.find(
      u => u.email.toLowerCase() === (email || '').toLowerCase().trim()
    )

    if (!user) {
      return res.status(401).json({ error: 'No account registered with this email.' })
    }
    if (user.password && user.password !== password) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' })
    }

    const safeUser = { ...user }
    delete safeUser.password
    res.json({ success: true, user: safeUser })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Auth: Check Email
app.post('/api/auth/check-email', authLimiter, async (req, res) => {
  try {
    const { email } = req.body || {}
    const store = await getFullStore()
    const exists = store.users.some(u => u.email.toLowerCase() === (email || '').toLowerCase().trim())
    res.json({ exists })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Auth: Request Password Reset
app.post('/api/auth/request-password-reset', authLimiter, async (req, res) => {
  try {
    const { email } = req.body || {}
    console.log(`[PASSWORD RESET REQUEST] for candidate: ${email}`)
    res.json({ success: true, message: 'Reset request queued for Admin verification.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Teams: All & My
app.get('/api/teams/all', apiLimiter, async (req, res) => {
  try {
    const store = await getFullStore()
    res.json({ success: true, teams: store.teams || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Ops: Registrations Ledger
app.get('/api/ops/registrations', async (req, res) => {
  try {
    const key = req.headers['x-vault-passkey'] || req.query.passkey
    if (key !== ADMIN_VAULT_KEY) {
      return res.status(403).json({ error: 'Unauthorized: Invalid Admin Vault Key.' })
    }

    const store = await getFullStore()
    const candidates = []

    for (const t of store.teams || []) {
      for (const m of t.members || []) {
        const isLeader = m.role === 'leader'
        candidates.push({
          candidateId: m.id || m.email,
          candidateName: m.name || m.email,
          email: m.email,
          role: isLeader ? 'Leader' : 'Member',
          phone: m.phone || (isLeader ? t.leader?.phone : '') || '',
          college: m.college || (isLeader ? t.leader?.college : '') || 'GIT Jaipur',
          teamId: t.id,
          teamName: t.name,
          paymentVerified: t.payment?.status === 'verified',
          paymentReference: t.payment?.utr || t.payment?.reference || 'N/A',
          earlyExit: Boolean(m.earlyExit),
          tableNumber: t.tableNumber || null,
          track: t.track || null,
          trackName: t.trackName || null,
          submission: t.submission || null,
          team: t
        })
      }
    }

    res.json({ success: true, candidates, teams: store.teams || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Ops: Admin Password Reset for Candidate
app.post('/api/ops/reset-user-password', async (req, res) => {
  try {
    const { passkey, email, newPassword } = req.body || {}
    if (passkey !== ADMIN_VAULT_KEY) {
      return res.status(403).json({ error: 'Unauthorized: Invalid Admin Vault Key.' })
    }

    const store = await getFullStore()
    const user = store.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim())
    if (!user) return res.status(404).json({ error: 'User not found' })

    user.password = newPassword
    await saveFullStore({ users: store.users })
    res.json({ success: true, message: `Password updated for ${email}` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Ops: Payment Verify & Revert
app.post('/api/ops/verify-payment', async (req, res) => {
  try {
    const { passkey, teamId } = req.body || {}
    if (passkey !== ADMIN_VAULT_KEY) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const store = await getFullStore()
    const team = store.teams.find(t => t.id === teamId)
    if (!team) return res.status(404).json({ error: 'Team not found' })

    team.payment = {
      ...(team.payment || {}),
      status: 'verified',
      verifiedAt: new Date().toISOString()
    }

    await saveFullStore({ teams: store.teams })
    res.json({ success: true, team })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/ops/revert-payment', async (req, res) => {
  try {
    const { passkey, teamId } = req.body || {}
    if (passkey !== ADMIN_VAULT_KEY) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const store = await getFullStore()
    const team = store.teams.find(t => t.id === teamId)
    if (!team) return res.status(404).json({ error: 'Team not found' })

    team.payment = {
      ...(team.payment || {}),
      status: 'under_review',
      verifiedAt: null
    }

    await saveFullStore({ teams: store.teams })
    res.json({ success: true, team })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Squad Teammate Removal (Team Leader)
app.delete('/api/teams/:teamId/members/:email', async (req, res) => {
  try {
    const { teamId, email } = req.params
    if (!teamId || !email) {
      return res.status(400).json({ error: 'teamId and email are required' })
    }
    const cleanEmail = decodeURIComponent(email).toLowerCase().trim()

    const store = await getFullStore()
    const team = store.teams.find(t => t.id === teamId || t.code === teamId)
    if (!team) return res.status(404).json({ error: 'Team not found' })

    team.members = (team.members || []).filter(m => (m.email || '').toLowerCase().trim() !== cleanEmail)
    team.invites = (team.invites || []).filter(i => (i.email || '').toLowerCase().trim() !== cleanEmail)
    team.size = Math.max(1, team.members.length)
    team.acceptedCount = (team.members || []).filter(m => (m.status === 'accepted' || m.status === 'confirmed') && !m.earlyExit).length

    if (useTiDB && pool) {
      await pool.query('DELETE FROM team_members WHERE team_id = ? AND LOWER(email) = ?', [team.id, cleanEmail])
      await pool.query('UPDATE teams SET size = ? WHERE id = ?', [team.size, team.id])
    }

    await saveFullStore({ teams: store.teams })
    res.json({ success: true, team })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Ops: Remove Attendee / Early Exit
app.post('/api/ops/remove-attendee', async (req, res) => {
  try {
    const { passkey, teamId, email, markEarlyExitOnly, earlyExit } = req.body || {}
    if (passkey !== ADMIN_VAULT_KEY) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const cleanEmail = (email || '').toLowerCase().trim()
    const store = await getFullStore()
    const team = store.teams.find(t => t.id === teamId || t.code === teamId)
    if (!team) return res.status(404).json({ error: 'Team not found' })

    const member = (team.members || []).find(m => (m.email || '').toLowerCase().trim() === cleanEmail)
    if (!member) return res.status(404).json({ error: 'Member not found in team' })

    const isEarlyExit = earlyExit !== undefined ? earlyExit !== false : markEarlyExitOnly !== false
    if (isEarlyExit) {
      member.earlyExit = true
      member.earlyExitAt = new Date().toISOString()
      if (useTiDB && pool) {
        await pool.query('UPDATE team_members SET early_exit = true, early_exit_at = NOW() WHERE team_id = ? AND LOWER(email) = ?', [team.id, cleanEmail])
      }
    } else {
      team.members = (team.members || []).filter(m => (m.email || '').toLowerCase().trim() !== cleanEmail)
      team.invites = (team.invites || []).filter(i => (i.email || '').toLowerCase().trim() !== cleanEmail)
      team.size = Math.max(1, team.members.length)
      if (useTiDB && pool) {
        await pool.query('DELETE FROM team_members WHERE team_id = ? AND LOWER(email) = ?', [team.id, cleanEmail])
        await pool.query('UPDATE teams SET size = ? WHERE id = ?', [team.size, team.id])
      }
    }

    team.acceptedCount = (team.members || []).filter(m => (m.status === 'accepted' || m.status === 'confirmed') && !m.earlyExit).length
    await saveFullStore({ teams: store.teams })
    res.json({ success: true, team })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/ops/reinstate-attendee', async (req, res) => {
  try {
    const { passkey, teamId, email } = req.body || {}
    if (passkey !== ADMIN_VAULT_KEY) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const cleanEmail = (email || '').toLowerCase().trim()
    const store = await getFullStore()
    const team = store.teams.find(t => t.id === teamId || t.code === teamId)
    if (!team) return res.status(404).json({ error: 'Team not found' })

    const member = (team.members || []).find(m => (m.email || '').toLowerCase().trim() === cleanEmail)
    if (member) {
      member.earlyExit = false
      member.earlyExitAt = null
      if (useTiDB && pool) {
        await pool.query('UPDATE team_members SET early_exit = false, early_exit_at = NULL WHERE team_id = ? AND LOWER(email) = ?', [team.id, cleanEmail])
      }
    }

    team.acceptedCount = (team.members || []).filter(m => (m.status === 'accepted' || m.status === 'confirmed') && !m.earlyExit).length
    await saveFullStore({ teams: store.teams })
    res.json({ success: true, team })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Ops: Problem Statements
app.get('/api/ops/problem-statements', async (req, res) => {
  try {
    const store = await getFullStore()
    res.json({ success: true, problemStatements: store.problemStatements || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/ops/problem-statements', async (req, res) => {
  try {
    const { passkey, problemStatements } = req.body || {}
    if (passkey !== ADMIN_VAULT_KEY) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const store = await getFullStore()
    store.problemStatements = problemStatements
    await saveFullStore({
      problemStatements,
      opsState: { ...(store.opsState || {}), problemStatements }
    })
    res.json({ success: true, problemStatements })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Static Assets & SPA Fallback (for single container deployment or production previews)
const distDir = path.resolve(__dirname, 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.use((req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.resolve(distDir, 'index.html'))
    } else {
      res.status(404).json({ error: 'Endpoint not found' })
    }
  })
} else {
  app.get('/', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'CodeFiesta 5.0 Arena Backend API',
      health: '/api/health',
      uptime: Math.floor(process.uptime())
    })
  })
}

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`)
  console.log(`🚀 CODEFIESTA 5.0 PRODUCTION SERVER RUNNING ON PORT ${PORT}`)
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'production'}`)
  console.log(`📦 Database: ${useTiDB ? 'TiDB Cloud MySQL' : 'Local JSON Store'}`)
  console.log(`=======================================================`)
})
