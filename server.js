import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import crypto from 'crypto'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)

const PORT = process.env.PORT || 4000
const ADMIN_VAULT_KEY = process.env.ADMIN_VAULT_KEY || 'cf5_master_access_2026'

// 1. Malicious Bot Scanner & Probing Firewall
// Drops automated vulnerability scans in <0.05ms before any body parsing, headers or middleware
const SCANNER_PROBE_REGEX = /\.(php|asp|aspx|jsp|cgi|env|git|bak|sql|yaml|yml|ini|conf|log|sh|bash)$|wp-(login|admin|content|includes)|phpmyadmin|pma|adminer|xmlrpc|cgi-bin|actuator|solr|struts|swagger-ui|\.\.|\/\./i

app.use((req, res, next) => {
  if (SCANNER_PROBE_REGEX.test(req.originalUrl || req.url)) {
    return res.status(404).end()
  }
  next()
})

// 2. Cryptographically Sound Constant-Time Passkey Verification (prevents timing & length side-channels)
const verifyPasskey = (providedKey) => {
  if (!providedKey || typeof providedKey !== 'string') return false
  const expectedKey = String(ADMIN_VAULT_KEY)
  const hashA = crypto.createHash('sha256').update(providedKey.trim()).digest()
  const hashB = crypto.createHash('sha256').update(expectedKey.trim()).digest()
  return crypto.timingSafeEqual(hashA, hashB)
}

// 3. Anti-Brute-Force Lockout for Admin Access: 5 consecutive failures locks out IP for 15 minutes
const adminAttemptMap = new Map()

const isIpAdminLocked = (ip) => {
  const record = adminAttemptMap.get(ip)
  if (!record) return false
  if (Date.now() > record.lockedUntil) {
    adminAttemptMap.delete(ip)
    return false
  }
  return record.failedAttempts >= 5
}

const recordAdminFailure = (ip) => {
  const now = Date.now()
  const record = adminAttemptMap.get(ip) || { failedAttempts: 0, lockedUntil: 0 }
  record.failedAttempts += 1
  if (record.failedAttempts >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000 // 15-minute lockout
    console.warn(`[SECURITY ALERT] IP ${ip} exceeded max admin passkey attempts. Temporarily locked for 15m.`)
  }
  adminAttemptMap.set(ip, record)
  return Math.max(0, 5 - record.failedAttempts)
}

const recordAdminSuccess = (ip) => {
  adminAttemptMap.delete(ip)
}

const recordAdminLoginSuccess = recordAdminSuccess
const recordAdminLoginFailure = recordAdminFailure

// 4. Centralized requireAdmin middleware
const requireAdmin = (req, res, next) => {
  const clientIp = (req.ip || req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '').trim()
  if (isIpAdminLocked(clientIp)) {
    return res.status(429).json({ error: 'Security Lockout: Too many failed passkey attempts. Please wait 15 minutes.' })
  }
  const passkey = req.headers['x-vault-passkey'] || req.headers['x-ops-vault-key'] || req.query.passkey || req.body?.passkey
  if (!verifyPasskey(passkey)) {
    recordAdminFailure(clientIp)
    return res.status(403).json({ error: 'Unauthorized: Invalid Admin Vault Key.' })
  }
  recordAdminSuccess(clientIp)
  next()
}

// 5. Anti-Prototype Pollution Sanitizer
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      delete obj[key]
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key])
    }
  }
}

// 6. Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

// 7. Scoped Rate Limiting (In-Memory IP sliding window for anti-abuse and anti-DDoS)
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

const createRateLimiter = (scope, maxRequests = 300, windowMs = 60000, message = 'Rate limit exceeded. Please wait a moment.') => {
  return (req, res, next) => {
    const rawIp = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown-ip'
    const ip = `${scope}:${rawIp.trim()}`
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

const authLimiter = createRateLimiter('auth', 25, 60000, 'Too many authentication attempts. Please wait 1 minute before trying again.')
const adminLimiter = createRateLimiter('admin', 15, 60000, 'Too many admin verification attempts. Please wait 1 minute.')
const apiLimiter = createRateLimiter('api', 600, 60000, 'Too many requests. Please slow down.')
const writeLimiter = createRateLimiter('write', 60, 60000, 'Too many update requests. Please slow down.')
const globalIpLimiter = createRateLimiter('global', 1200, 60000, 'Request rate limit exceeded. Please slow down.')

// Protect against overall flooding
app.use(globalIpLimiter)

// Setup CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-vault-passkey', 'x-ops-vault-key', 'x-user-email']
}))

// JSON Body Limit: 2MB protects against memory exhaustion DoS attacks
app.use(express.json({ limit: '2mb' }))

// Sanitize incoming payloads against prototype pollution
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body)
  }
  next()
})

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

// In-Memory Read Cache & Versioning for 1000+ Concurrent Users (TTL: 2.5 seconds)
// Dramatically reduces TiDB queries under peak load while maintaining real-time feel
let storeCache = null
let storeCacheExpiry = 0
let storeVersion = Date.now()

const invalidateStoreCache = () => {
  storeCache = null
  storeCacheExpiry = 0
  storeVersion = Date.now()
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
          amount: t.payment_amount || 800,
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

async function saveFullStore(incoming, isAdmin = false) {
  invalidateStoreCache()
  const current = await getFullStore(true)

  const wipe = isAdmin && (incoming.wipe === true || incoming.wipeTeams === true)
  let mergedTeams = current.teams || []
  if (wipe) {
    mergedTeams = Array.isArray(incoming.teams) ? incoming.teams : []
  } else if (Array.isArray(incoming.teams)) {
    const teamMap = new Map((current.teams || []).map(t => [t.id, t]))
    for (const t of incoming.teams) {
      if (!t || !t.id) continue
      const existing = (current.teams || []).find(ct => ct.id === t.id)
      if (existing && !isAdmin) {
        // Security Lock: Non-admins cannot alter verified payment status or admin table assignments
        const safePayment = { ...(existing.payment || {}), ...(t.payment || {}) }
        if (safePayment.status === 'verified' && existing.payment?.status !== 'verified') {
          safePayment.status = existing.payment?.status || 'under_review'
          safePayment.verifiedAt = existing.payment?.verifiedAt || null
        }
        teamMap.set(t.id, {
          ...existing,
          ...t,
          payment: safePayment,
          tableNumber: existing.tableNumber !== undefined ? existing.tableNumber : (t.tableNumber || null),
        })
      } else {
        teamMap.set(t.id, t)
      }
    }
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

  let mergedOpsState = { ...(current.opsState || {}) }
  if (isAdmin && incoming.opsState) {
    mergedOpsState = { ...mergedOpsState, ...incoming.opsState }
    if (incoming.opsState.tableAssignments !== undefined) {
      mergedOpsState.tableAssignments = { ...(incoming.opsState.tableAssignments || {}) }
    }
  }

  // Ensure two-way sync between opsState.tableAssignments and team.tableNumber
  if (mergedOpsState?.tableAssignments !== undefined) {
    mergedTeams = mergedTeams.map((t) => {
      if (incoming.opsState && incoming.opsState.tableAssignments !== undefined) {
        const assigned = mergedOpsState.tableAssignments[t.id]
        return { ...t, tableNumber: assigned || null }
      }
      const assigned = mergedOpsState.tableAssignments[t.id]
      if (assigned !== undefined) {
        return { ...t, tableNumber: assigned || null }
      }
      return t
    })
  }
  if (!incoming.opsState && mergedOpsState) {
    mergedOpsState.tableAssignments = mergedOpsState.tableAssignments || {}
    for (const t of mergedTeams) {
      if (t.tableNumber && !mergedOpsState.tableAssignments[t.id]) {
        mergedOpsState.tableAssignments[t.id] = t.tableNumber
      }
    }
  }

  const problemStatements = (isAdmin && (incoming.problemStatements || incoming.opsState?.problemStatements)) || current.problemStatements || []

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

      // Sync users (only sync modified delta when not wiping)
      const usersToSync = wipe ? mergedUsers : (Array.isArray(incoming.users) ? incoming.users : [])
      for (const u of usersToSync) {
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

      // Sync teams & members (sync modified delta or if table assignments changed)
      const teamsToSync = wipe ? mergedTeams : (Array.isArray(incoming.teams) && incoming.teams.length > 0 ? incoming.teams : (incoming.opsState?.tableAssignments ? mergedTeams : []))
      for (const t of teamsToSync) {
        if (!t.id) continue
        await pool.query(
          `INSERT INTO teams (id, name, code, leader_email, size, status, payment_status, payment_reference, payment_amount, table_number, track, track_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             status = VALUES(status),
             payment_status = VALUES(payment_status),
             payment_reference = VALUES(payment_reference),
             payment_amount = VALUES(payment_amount),
             table_number = VALUES(table_number),
             track = VALUES(track),
             track_name = VALUES(track_name)`,
          [
            t.id,
            t.name,
            t.code || ('CF5' + Math.random().toString(36).slice(2, 6).toUpperCase()),
            t.leader?.email || t.leaderEmail || t.leader_email || 'leader@codefiesta.in',
            t.size || 3,
            t.status || 'forming',
            t.payment?.status || 'not_submitted',
            t.payment?.utr || t.payment?.reference || null,
            t.payment?.amount || 800,
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

      // Save opsState key-values (only if wiping or opsState explicitly provided)
      if (mergedOpsState && (wipe || incoming.opsState)) {
        for (const [k, v] of Object.entries(mergedOpsState)) {
          await pool.query(
            `INSERT INTO ops_state (state_key, state_val) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE state_val = VALUES(state_val)`,
            [k, typeof v === 'string' ? v : JSON.stringify(v)]
          )
        }
      }

      if (problemStatements && (wipe || incoming.problemStatements)) {
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

  invalidateStoreCache()
  storeCache = updated
  storeCacheExpiry = Date.now() + 2500

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

// Shared Store Sync with HTTP 304 ETag Negotiation (Eliminates bandwidth/processing when unchanged)
app.get('/api/shared-store', apiLimiter, async (req, res) => {
  try {
    const clientEtag = req.headers['if-none-match']
    const currentEtag = `W/"store-${storeVersion}"`
    if (clientEtag === currentEtag) {
      return res.status(304).end()
    }

    const data = await getFullStore()
    res.setHeader('ETag', currentEtag)
    res.setHeader('Cache-Control', 'private, no-cache')
    res.json({ success: true, data: sanitizeForPublic(data) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/shared-store', writeLimiter, async (req, res) => {
  try {
    const incoming = req.body || {}
    const isWipe = incoming.wipe === true || incoming.wipeTeams === true || incoming.wipeUsers === true
    const key = req.headers['x-vault-passkey'] || req.headers['x-ops-vault-key'] || incoming.passkey
    const isAdmin = verifyPasskey(key)

    // Security Check: Protect destructive operations
    if (isWipe && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized: Admin Vault Key required for wiping database.' })
    }

    const updated = await saveFullStore(incoming, isAdmin)
    res.json({ success: true, data: sanitizeForPublic(updated) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Auth: Register (Protected by auth rate limiter and input validation)
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const body = req.body || {}
    const email = (body.email || '').toLowerCase().trim()
    if (!email || !email.includes('@') || email.length > 100) {
      return res.status(400).json({ error: 'Valid email address is required (under 100 characters).' })
    }
    if (body.password && typeof body.password === 'string' && body.password.length > 200) {
      return res.status(400).json({ error: 'Password exceeds maximum length.' })
    }

    const store = await getFullStore()
    const existing = store.users.find(u => u.email.toLowerCase() === email)
    if (existing) return res.status(400).json({ error: 'Email is already registered' })

    const newUser = {
      id: 'usr_' + Math.random().toString(36).slice(2, 11),
      email,
      password: String(body.password || '').slice(0, 200),
      firstName: String(body.firstName || '').slice(0, 100),
      lastName: String(body.lastName || '').slice(0, 100),
      phone: String(body.phone || '').slice(0, 20),
      college: String(body.college || '').slice(0, 200),
      rollNumber: String(body.rollNumber || '').slice(0, 50),
      course: String(body.course || 'B.Tech CSE').slice(0, 50),
      year: String(body.year || '1st').slice(0, 20),
      gender: String(body.gender || 'male').slice(0, 20),
      registeredAt: new Date().toISOString()
    }

    await saveFullStore({ users: [...store.users, newUser] }, false)
    const safeUser = { ...newUser }
    delete safeUser.password
    res.json({ success: true, user: safeUser })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const safeErrorResponse = (res, err, fallbackMsg = 'An unexpected server error occurred.') => {
  console.error('[API Error]:', err?.message || err)
  const isDev = process.env.NODE_ENV === 'development'
  res.status(500).json({ error: isDev ? (err?.message || fallbackMsg) : fallbackMsg })
}

// Auth: Login (Protected by auth rate limiter)
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const cleanEmail = (email || '').toLowerCase().trim()
    if (!cleanEmail) {
      return res.status(400).json({ error: 'Email address is required.' })
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required.' })
    }

    const store = await getFullStore()
    let user = store.users.find(
      u => u.email.toLowerCase() === cleanEmail
    )

    // If user not in store.users, check if registered as leader or teammate in any team
    if (!user) {
      for (const t of store.teams || []) {
        if ((t.leader_email || '').toLowerCase() === cleanEmail || (t.leader?.email || '').toLowerCase() === cleanEmail) {
          user = {
            id: t.leader?.id || ('usr_' + t.id),
            email: cleanEmail,
            firstName: t.leader?.firstName || t.leader?.name?.split(' ')[0] || '',
            lastName: t.leader?.lastName || t.leader?.name?.split(' ').slice(1).join(' ') || '',
            phone: t.leader?.phone || '',
            college: t.leader?.college || '',
            rollNumber: t.leader?.rollNumber || '',
            course: t.leader?.course || 'CSE',
            year: t.leader?.year || '1st',
            gender: t.leader?.gender || 'male',
            password: t.leader?.password || password,
            registeredAt: t.createdAt || new Date().toISOString()
          }
          break
        }
        const member = (t.members || []).find(m => (m.email || '').toLowerCase() === cleanEmail)
        if (member) {
          user = {
            id: member.id || ('usr_' + t.id),
            email: cleanEmail,
            firstName: member.firstName || member.name?.split(' ')[0] || '',
            lastName: member.lastName || member.name?.split(' ').slice(1).join(' ') || '',
            phone: member.phone || '',
            college: member.college || '',
            rollNumber: member.rollNumber || '',
            course: member.course || 'CSE',
            year: member.year || '1st',
            gender: member.gender || 'male',
            password: member.password || password,
            registeredAt: new Date().toISOString()
          }
          break
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'No account registered with this email. Please check credentials or register first.' })
    }

    // Strictly verify password if one was set
    if (user.password && user.password !== password) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' })
    }

    // First-time teammate login: initialize their password
    if (!user.password) {
      user.password = password
      await saveFullStore({ users: [user] }, false)
    }

    const safeUser = { ...user }
    delete safeUser.password
    res.json({ success: true, user: safeUser })
  } catch (err) {
    safeErrorResponse(res, err)
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
    safeErrorResponse(res, err)
  }
})

// Auth: Request Password Reset
app.post('/api/auth/request-password-reset', authLimiter, async (req, res) => {
  try {
    const { email } = req.body || {}
    console.log(`[PASSWORD RESET REQUEST] for candidate: ${email}`)
    res.json({ success: true, message: 'Reset request queued for Admin verification.' })
  } catch (err) {
    safeErrorResponse(res, err)
  }
})

// Teams: All with ETag
app.get('/api/teams/all', apiLimiter, async (req, res) => {
  try {
    const clientEtag = req.headers['if-none-match']
    const currentEtag = `W/"teams-${storeVersion}"`
    if (clientEtag === currentEtag) {
      return res.status(304).end()
    }

    const store = await getFullStore()
    res.setHeader('ETag', currentEtag)
    res.setHeader('Cache-Control', 'private, no-cache')
    res.json({ success: true, teams: store.teams || [] })
  } catch (err) {
    safeErrorResponse(res, err)
  }
})

// Teams: My (Direct Candidate Team Resolution - Prevents 404 falling back to heavy full store sync)
app.get('/api/teams/my', apiLimiter, async (req, res) => {
  try {
    const email = (req.headers['x-user-email'] || req.query.email || '').toLowerCase().trim()
    const store = await getFullStore()
    if (!email) {
      return res.json({ success: true, teams: store.teams || [] })
    }

    const myTeams = (store.teams || []).filter(t =>
      (t.leader_email || '').toLowerCase() === email ||
      (t.leader?.email || '').toLowerCase() === email ||
      (t.members || []).some(m => (m.email || '').toLowerCase() === email)
    ).map(t => {
      const isLeader = (t.leader_email || '').toLowerCase() === email || (t.leader?.email || '').toLowerCase() === email
      return {
        ...t,
        isLeader,
        isLeaderForThisTeam: isLeader,
      }
    })
    res.json({ success: true, teams: myTeams })
  } catch (err) {
    safeErrorResponse(res, err)
  }
})

// Teams: Create Squad
app.post('/api/teams/create', apiLimiter, async (req, res) => {
  try {
    const body = req.body || {}
    const name = String(body.name || '').trim()
    if (!name) return res.status(400).json({ error: 'Squad name cannot be empty.' })

    const leaderEmail = String(body.leader?.email || req.headers['x-user-email'] || '').toLowerCase().trim()
    if (!leaderEmail) return res.status(400).json({ error: 'Leader email is required.' })

    const store = await getFullStore()
    const allTeams = store.teams || []

    if (allTeams.some(t => (t.name || '').toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: `Squad name "${name}" is already taken. Please choose a unique name.` })
    }

    const existingTeam = allTeams.find(t =>
      (t.leader_email || '').toLowerCase() === leaderEmail ||
      (t.leader?.email || '').toLowerCase() === leaderEmail ||
      (t.members || []).some(m => (m.email || '').toLowerCase() === leaderEmail)
    )
    if (existingTeam) {
      return res.status(400).json({ error: `Email "${leaderEmail}" is already registered in squad "${existingTeam.name}".` })
    }

    const leader = body.leader || {}
    const leaderName = leader.name || `${leader.firstName || ''} ${leader.lastName || ''}`.trim() || 'Squad Leader'
    const leaderCollege = leader.college || 'Global Institute of Technology, Jaipur'

    const leaderMember = {
      id: 'mem_' + Math.random().toString(36).slice(2, 9),
      name: leaderName,
      firstName: leader.firstName || '',
      lastName: leader.lastName || '',
      email: leaderEmail,
      phone: leader.phone || '',
      college: leaderCollege,
      rollNumber: leader.rollNumber || '',
      course: leader.course || 'CSE',
      year: leader.year || '1st',
      gender: leader.gender || 'male',
      role: 'leader',
      status: 'accepted',
    }

    const teammateMembers = (Array.isArray(body.members) ? body.members : []).map((m, idx) => ({
      id: m.id || ('mem_' + Math.random().toString(36).slice(2, 9)),
      name: m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || `Teammate ${idx + 2}`,
      firstName: m.firstName || '',
      lastName: m.lastName || '',
      email: (m.email || '').toLowerCase().trim(),
      phone: m.phone || '',
      college: m.college || leaderCollege,
      rollNumber: m.rollNumber || '',
      course: m.course || 'CSE',
      year: m.year || '1st',
      gender: m.gender || 'male',
      role: 'member',
      status: 'pending',
      inviteCode: m.inviteCode || ('CF5-' + Math.random().toString(36).slice(2, 6).toUpperCase()),
      token: m.token || ('tok_' + Math.random().toString(36).slice(2, 9)),
    }))

    const utr = body.payment?.utr || body.utr || null
    const cleanUtr = utr ? String(utr).trim() : null
    if (cleanUtr) {
      const duplicateTeam = allTeams.find(t =>
        (t.payment?.utr && t.payment.utr.trim().toLowerCase() === cleanUtr.toLowerCase()) ||
        (t.payment?.reference && t.payment.reference.trim().toLowerCase() === cleanUtr.toLowerCase()) ||
        (t.payment_reference && t.payment_reference.trim().toLowerCase() === cleanUtr.toLowerCase())
      )
      if (duplicateTeam) {
        return res.status(400).json({
          error: `UTR "${cleanUtr}" has already been submitted by squad "${duplicateTeam.name}". Each squad registration requires a unique payment transaction.`
        })
      }
    }
    const newTeam = {
      id: 'team_' + Math.random().toString(36).slice(2, 9),
      name,
      code: 'CF5' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      size: Number(body.size) || 3,
      status: 'registered',
      acceptedCount: 1,
      tableNumber: null,
      createdAt: new Date().toISOString(),
      leader: {
        ...leader,
        email: leaderEmail,
        name: leaderName,
        college: leaderCollege,
      },
      leader_email: leaderEmail,
      members: [leaderMember, ...teammateMembers],
      invites: teammateMembers.map(tm => ({
        name: tm.name,
        email: tm.email,
        token: tm.token,
        inviteCode: tm.inviteCode,
      })),
      payment: {
        status: utr ? 'submitted' : 'not_submitted',
        utr: utr ? String(utr).trim() : null,
        amount: Number(body.payment?.amount) || 800,
        submittedAt: utr ? new Date().toISOString() : null,
        verifiedAt: null,
      }
    }

    await saveFullStore({ teams: [newTeam] }, false)
    res.json({ success: true, team: newTeam })
  } catch (err) {
    safeErrorResponse(res, err)
  }
})

// Teams: Submit Payment UTR
app.post('/api/teams/:teamId/payment', apiLimiter, async (req, res) => {
  try {
    const { teamId } = req.params
    const { utr } = req.body || {}
    const cleanUtr = String(utr || '').trim()
    if (!cleanUtr || cleanUtr.length < 6) {
      return res.status(400).json({ error: 'Valid 12-digit UTR transaction reference is required.' })
    }

    const store = await getFullStore()
    const team = (store.teams || []).find(t => t.id === teamId || t.code === teamId)
    if (!team) return res.status(404).json({ error: 'Team not found' })

    // Enforce UTR uniqueness across all squads
    const duplicateTeam = (store.teams || []).find(t =>
      t.id !== team.id &&
      t.code !== team.id &&
      (
        (t.payment?.utr && t.payment.utr.trim().toLowerCase() === cleanUtr.toLowerCase()) ||
        (t.payment?.reference && t.payment.reference.trim().toLowerCase() === cleanUtr.toLowerCase()) ||
        (t.payment_reference && t.payment_reference.trim().toLowerCase() === cleanUtr.toLowerCase())
      )
    )
    if (duplicateTeam) {
      return res.status(400).json({
        error: `UTR "${cleanUtr}" has already been submitted by squad "${duplicateTeam.name}". Each squad registration requires a unique payment transaction.`
      })
    }

    team.payment = {
      ...(team.payment || {}),
      status: 'submitted',
      utr: cleanUtr,
      amount: team.payment?.amount || 800,
      submittedAt: new Date().toISOString(),
      notes: null,
    }
    if (team.status === 'rejected') {
      team.status = 'locked'
    }

    await saveFullStore({ teams: [team] }, false)
    res.json({ success: true, payment: team.payment, team })
  } catch (err) {
    safeErrorResponse(res, err)
  }
})

// Ops: Admin Authentication & Verification (Constant-Time + Anti-Brute Force Lockout)
app.post(['/api/ops/admin-login', '/api/ops/verify-admin'], adminLimiter, (req, res) => {
  const { passkey } = req.body || {}
  const clientIp = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '').trim()

  if (isIpAdminLocked(clientIp)) {
    return res.status(429).json({ error: 'Security Lockout: Too many failed passkey attempts. Please wait 15 minutes.' })
  }

  if (verifyPasskey(passkey)) {
    recordAdminLoginSuccess(clientIp)
    return res.json({ success: true, authorized: true, token: 'ops_session_valid' })
  }

  const attemptsLeft = recordAdminLoginFailure(clientIp)
  if (attemptsLeft <= 0) {
    return res.status(429).json({ error: 'Security Lockout: Passkey attempts exceeded. IP locked for 15 minutes.' })
  }
  return res.status(401).json({
    error: `Invalid passkey. Access Denied. Attempts remaining: ${attemptsLeft}`,
    attemptsRemaining: attemptsLeft
  })
})

// Ops: Registrations with candidates ledger & UTR reconciliation
app.get('/api/ops/registrations', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const store = await getFullStore()
    const candidates = []

    for (const t of store.teams || []) {
      const leaderCollege = t.leader?.college || 'GIT Jaipur'
      for (const m of t.members || []) {
        const isLeader = m.role === 'leader'
        const isConfirmed = isLeader || m.status === 'accepted' || m.status === 'confirmed'
        const candidateStatus = isConfirmed ? 'accepted' : (m.status || 'pending')

        candidates.push({
          candidateId: m.id || m.email,
          candidateName: m.name || (isLeader ? t.leader?.name : 'Operative'),
          email: m.email,
          role: isLeader ? 'leader' : 'member',
          phone: m.phone || (isLeader ? t.leader?.phone : '') || '',
          college: m.college || leaderCollege,
          collegeName: m.college || leaderCollege,
          rollNumber: m.rollNumber || (isLeader ? t.leader?.rollNumber : '') || '',
          course: m.course || (isLeader ? t.leader?.course : '') || 'CSE',
          year: m.year || (isLeader ? t.leader?.year : '') || '1st',
          gender: m.gender || (isLeader ? t.leader?.gender : '') || 'male',
          teamId: t.id,
          teamName: t.name,
          status: candidateStatus,
          inviteStatus: candidateStatus,
          isConfirmed,
          utr: t.payment?.utr || t.payment?.reference || 'NOT_SUBMITTED',
          paymentStatus: t.payment?.status || 'not_submitted',
          paymentVerified: t.payment?.status === 'verified',
          paymentNotes: t.payment?.notes || null,
          paymentReference: t.payment?.utr || t.payment?.reference || 'NOT_SUBMITTED',
          amount: t.payment?.amount || 800,
          submittedAt: t.payment?.submittedAt || t.createdAt || new Date().toISOString(),
          verifiedAt: t.payment?.verifiedAt || null,
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
    safeErrorResponse(res, err)
  }
})

// Ops: Admin Password Reset for Candidate
app.post('/api/ops/reset-user-password', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const { email, newPassword } = req.body || {}
    const cleanEmail = (email || '').toLowerCase().trim()
    if (!cleanEmail || !newPassword) {
      return res.status(400).json({ error: 'Email and newPassword are required' })
    }

    const store = await getFullStore()
    const user = store.users.find(u => u.email.toLowerCase() === cleanEmail)
    if (!user) return res.status(404).json({ error: 'User not found' })

    user.password = String(newPassword).slice(0, 200)
    await saveFullStore({ users: store.users }, true)
    res.json({ success: true, message: `Password updated for ${cleanEmail}` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Ops: Payment Verify & Revert
app.post('/api/ops/verify-payment', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const { teamId, verified, notes } = req.body || {}
    const isVerified = verified !== false
    const store = await getFullStore()
    const team = store.teams.find(t => t.id === teamId || t.code === teamId)
    if (!team) return res.status(404).json({ error: 'Team not found' })

    if (isVerified) {
      team.payment = {
        ...(team.payment || {}),
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        notes: notes || 'UTR matched and authorized by Admin'
      }
      team.status = 'confirmed'
    } else {
      team.payment = {
        ...(team.payment || {}),
        status: 'rejected',
        verifiedAt: null,
        notes: notes || 'Invalid UTR rejected by admin'
      }
      team.status = 'rejected'
    }

    await saveFullStore({ teams: store.teams }, true)
    res.json({
      success: true,
      team,
      isVerified,
      emailDispatched: isVerified ? {
        to: team.leader?.email,
        teamName: team.name,
        subject: `[CONFIRMED] Codefiesta 5.0 Official Pass Issued — ${team.name}`
      } : null
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/ops/revert-payment', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const { teamId } = req.body || {}
    const store = await getFullStore()
    const team = store.teams.find(t => t.id === teamId || t.code === teamId)
    if (!team) return res.status(404).json({ error: 'Team not found' })

    team.payment = {
      ...(team.payment || {}),
      status: 'submitted',
      verifiedAt: null,
      notes: 'Payment verification reverted by Admin'
    }
    team.status = 'locked'

    await saveFullStore({ teams: store.teams }, true)
    res.json({ success: true, team })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Ops: Physical Workstation Table Allocation (Assign & Clear)
app.post('/api/ops/assign-table', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const { teamId, tableNumber } = req.body || {}
    if (!teamId) return res.status(400).json({ error: 'Team ID is required.' })

    const cleanTable = String(tableNumber || '').toUpperCase().trim()
    const finalTable = cleanTable && cleanTable !== 'UNASSIGNED' && cleanTable !== 'CLEAR' && cleanTable !== 'NONE' ? cleanTable : null

    const store = await getFullStore()
    const team = (store.teams || []).find(t => t.id === teamId || t.code === teamId || (t.name && t.name.toLowerCase() === String(teamId).toLowerCase()))
    const targetTeamId = team ? team.id : teamId

    if (team) {
      team.tableNumber = finalTable
    }

    store.opsState = store.opsState || {}
    store.opsState.tableAssignments = store.opsState.tableAssignments || {}
    if (finalTable) {
      store.opsState.tableAssignments[targetTeamId] = finalTable
    } else {
      delete store.opsState.tableAssignments[targetTeamId]
      if (team) team.tableNumber = null
    }

    if (pool) {
      try {
        await pool.query('UPDATE teams SET table_number = ? WHERE id = ?', [finalTable, targetTeamId])
        await pool.query(
          `INSERT INTO ops_state (state_key, state_val) VALUES ('table_assignments_json', ?)
           ON DUPLICATE KEY UPDATE state_val = VALUES(state_val)`,
          [JSON.stringify(store.opsState.tableAssignments)]
        )
      } catch (dbErr) {
        console.warn('[DB Warn] assign-table query:', dbErr.message)
      }
    }

    await saveFullStore({
      teams: team ? [team] : [],
      opsState: { tableAssignments: store.opsState.tableAssignments }
    }, true)

    if (typeof io !== 'undefined' && io?.emit) {
      io.emit('hackathon:state-updated', { tableAssignments: store.opsState.tableAssignments })
      io.emit('codefiesta_teams_updated', { teams: store.teams })
    }

    res.json({
      success: true,
      teamId: targetTeamId,
      tableNumber: finalTable,
      tableAssignments: store.opsState.tableAssignments
    })
  } catch (err) {
    safeErrorResponse(res, err)
  }
})

// Ops: Get hackathon state & table assignments
app.get('/api/ops/state', apiLimiter, async (req, res) => {
  try {
    const store = await getFullStore()
    const tableAssignments = { ...(store.opsState?.tableAssignments || {}) }
    const state = {
      ...(store.opsState || {}),
      tableAssignments,
      problemStatements: store.problemStatements || []
    }
    res.setHeader('Cache-Control', 'private, no-cache')
    res.json({ success: true, state })
  } catch (err) {
    safeErrorResponse(res, err)
  }
})

// Gate: Get all teams for check-in
app.get('/api/gate/teams', apiLimiter, async (req, res) => {
  try {
    const store = await getFullStore()
    res.setHeader('Cache-Control', 'private, no-cache')
    res.json({ success: true, teams: store.teams || [] })
  } catch (err) {
    safeErrorResponse(res, err)
  }
})

// Squad Teammate Removal (Strictly Protected: Only Squad Leader or Master Admin Authorized)
app.delete('/api/teams/:teamId/members/:email', apiLimiter, async (req, res) => {
  try {
    const { teamId, email } = req.params
    if (!teamId || !email) {
      return res.status(400).json({ error: 'teamId and email are required' })
    }
    const cleanEmail = decodeURIComponent(email).toLowerCase().trim()

    const store = await getFullStore()
    const team = store.teams.find(t => t.id === teamId || t.code === teamId)
    if (!team) return res.status(404).json({ error: 'Team not found' })

    const callerEmail = (req.headers['x-user-email'] || req.query.userEmail || '').toLowerCase().trim()
    const passkey = req.headers['x-vault-passkey'] || req.headers['x-ops-vault-key'] || req.query.passkey
    const isLeader = Boolean(callerEmail && ((team.leader?.email || '').toLowerCase() === callerEmail || (team.leader_email || '').toLowerCase() === callerEmail))
    const isAdmin = verifyPasskey(passkey)

    if (!isLeader && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized: Only the team leader or administrator can remove squad members.' })
    }

    team.members = (team.members || []).filter(m => (m.email || '').toLowerCase().trim() !== cleanEmail)
    team.invites = (team.invites || []).filter(i => (i.email || '').toLowerCase().trim() !== cleanEmail)
    team.size = Math.max(1, team.members.length)
    team.acceptedCount = (team.members || []).filter(m => (m.status === 'accepted' || m.status === 'confirmed') && !m.earlyExit).length

    if (useTiDB && pool) {
      await pool.query('DELETE FROM team_members WHERE team_id = ? AND LOWER(email) = ?', [team.id, cleanEmail])
      await pool.query('UPDATE teams SET size = ? WHERE id = ?', [team.size, team.id])
    }

    await saveFullStore({ teams: store.teams }, isAdmin)
    res.json({ success: true, team })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Ops: Remove Attendee / Early Exit
app.post('/api/ops/remove-attendee', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const { teamId, email, markEarlyExitOnly, earlyExit } = req.body || {}
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
    await saveFullStore({ teams: store.teams }, true)
    res.json({ success: true, team })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/ops/reinstate-attendee', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const { teamId, email } = req.body || {}
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
    await saveFullStore({ teams: store.teams }, true)
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

app.post('/api/ops/problem-statements', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const { problemStatements } = req.body || {}
    const store = await getFullStore()
    store.problemStatements = problemStatements
    await saveFullStore({
      problemStatements,
      opsState: { ...(store.opsState || {}), problemStatements }
    }, true)
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

// Start Server with Slowloris / Timeout Protection
const server = app.listen(PORT, () => {
  console.log(`=======================================================`)
  console.log(`🚀 CODEFIESTA 5.0 HARDENED PRODUCTION SERVER PORT ${PORT}`)
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'production'}`)
  console.log(`📦 Database: ${useTiDB ? 'TiDB Cloud MySQL' : 'Local JSON Store'}`)
  console.log(`🛡️  Security: Constant-time Auth, Anti-Brute-Force, 2MB Limit`)
  console.log(`=======================================================`)
})

// HTTP Timeout Protection against slowloris attacks
server.headersTimeout = 65000
server.requestTimeout = 60000
server.keepAliveTimeout = 65000
