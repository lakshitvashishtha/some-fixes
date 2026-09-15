import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendOtpEmail, sendRegistrationEmail, sendPaymentVerifiedEmail } from './mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sharedStatePlugin() {
  const dbPath = path.resolve(__dirname, 'scratch/shared_db.json');

  const readDb = () => {
    try {
      if (fs.existsSync(dbPath)) {
        const content = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (e) {
      console.error('[sharedStatePlugin] Error reading DB:', e);
    }
    return { teams: [], users: [], opsState: null };
  };

  const writeDb = (data) => {
    try {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('[sharedStatePlugin] Error writing DB:', e);
    }
  };

  const viteOtpLimits = new Map();
  const viteActiveOtps = new Map();

  const getViteOtp = (email) => {
    const mem = viteActiveOtps.get(email);
    if (mem) return mem;
    const db = readDb();
    return db.activeOtps?.[email] || null;
  };

  const saveViteOtp = (email, record) => {
    viteActiveOtps.set(email, record);
    try {
      const db = readDb();
      if (!db.activeOtps) db.activeOtps = {};
      db.activeOtps[email] = record;
      writeDb(db);
    } catch {}
  };

  const deleteViteOtp = (email) => {
    viteActiveOtps.delete(email);
    try {
      const db = readDb();
      if (db.activeOtps && db.activeOtps[email]) {
        delete db.activeOtps[email];
        writeDb(db);
      }
    } catch {}
  };

  const sseClients = new Set();
  const broadcastDevEvent = (eventType, payload = {}) => {
    const timestamp = new Date().toISOString();
    const dataString = JSON.stringify({ ...payload, eventType, timestamp });
    const msg = `event: ${eventType}\ndata: ${dataString}\n\n`;
    for (const client of sseClients) {
      try { client.write(msg); } catch { sseClients.delete(client); }
    }
  };

  return {
    name: 'shared-state-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/realtime/events') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
          });
          res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`);
          sseClients.add(res);
          req.on('close', () => { sseClients.delete(res); });
          return;
        }
        if (req.url === '/api/health' || req.url === '/health' || req.url === '/api/ping') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({
            status: 'ok',
            app: 'CodeFiesta 5.0 Dev Server',
            timestamp: new Date().toISOString()
          }));
          return;
        }

        if (req.url === '/api/ops/admin-login' || req.url === '/api/ops/verify-admin') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const clean = String(incoming.passkey || '').trim();
                const expected = String(process.env.ADMIN_VAULT_KEY || 'cf5_master_access_2026').trim();
                if (clean === expected) {
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.end(JSON.stringify({ success: true, authorized: true, token: 'ops_session_valid' }));
                  return;
                }
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ error: 'Access Denied: Invalid Master Passkey' }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // POST /api/auth/login
        if (req.url === '/api/auth/login') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const cleanEmail = String(incoming.email || '').trim().toLowerCase();
                const password = String(incoming.password || '').trim();

                if (!cleanEmail) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Email address is required.' }));
                  return;
                }
                if (!password) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Password is required.' }));
                  return;
                }

                const db = readDb();
                let user = (db.users || []).find(
                  (u) => (u.email || '').toLowerCase() === cleanEmail
                );

                // If user not in db.users, check if registered as leader or teammate in any team
                if (!user) {
                  for (const t of db.teams || []) {
                    if (
                      (t.leader_email || '').toLowerCase() === cleanEmail ||
                      (t.leaderEmail || '').toLowerCase() === cleanEmail ||
                      (t.leader?.email || '').toLowerCase() === cleanEmail
                    ) {
                      user = {
                        id: t.leader?.id || ('usr_' + t.id),
                        email: cleanEmail,
                        firstName: t.leader?.firstName || t.leader?.name?.split(' ')[0] || '',
                        lastName: t.leader?.lastName || t.leader?.name?.split(' ').slice(1).join(' ') || '',
                        name: t.leader?.name || `${t.leader?.firstName || ''} ${t.leader?.lastName || ''}`.trim() || 'Squad Leader',
                        phone: t.leader?.phone || '',
                        college: t.leader?.college || '',
                        rollNumber: t.leader?.rollNumber || '',
                        course: t.leader?.course || 'CSE',
                        year: t.leader?.year || '1st',
                        gender: t.leader?.gender || 'male',
                        password: t.leader?.password || password,
                        registeredAt: t.createdAt || new Date().toISOString(),
                      };
                      break;
                    }
                    const member = (t.members || []).find((m) => (m.email || '').toLowerCase() === cleanEmail);
                    if (member) {
                      user = {
                        id: member.id || ('usr_' + t.id),
                        email: cleanEmail,
                        firstName: member.firstName || member.name?.split(' ')[0] || '',
                        lastName: member.lastName || member.name?.split(' ').slice(1).join(' ') || '',
                        name: member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Squad Member',
                        phone: member.phone || '',
                        college: member.college || '',
                        rollNumber: member.rollNumber || '',
                        course: member.course || 'CSE',
                        year: member.year || '1st',
                        gender: member.gender || 'male',
                        password: member.password || password,
                        registeredAt: new Date().toISOString(),
                      };
                      break;
                    }
                  }
                }

                if (!user) {
                  res.statusCode = 401;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'No account registered with this email. Please check credentials or register first.' }));
                  return;
                }

                // Strictly verify password if one was set
                if (user.password && user.password !== password) {
                  res.statusCode = 401;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Invalid password. Please check your credentials.' }));
                  return;
                }

                if (!user.password) {
                  user.password = password;
                }

                // Ensure user is recorded in db.users
                db.users = (db.users || []).filter((u) => (u.email || '').toLowerCase() !== cleanEmail);
                db.users.push(user);
                writeDb(db);

                const safeUser = { ...user };
                delete safeUser.password;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ success: true, user: safeUser }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // POST /api/auth/register
        if (req.url === '/api/auth/register') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const cleanEmail = String(incoming.email || '').trim().toLowerCase();
                if (!cleanEmail) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Email address is required.' }));
                  return;
                }

                const db = readDb();
                const existing = (db.users || []).find((u) => (u.email || '').toLowerCase() === cleanEmail);
                if (existing) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Email is already registered.' }));
                  return;
                }

                const newUser = {
                  id: 'usr_' + Math.random().toString(36).slice(2, 11),
                  email: cleanEmail,
                  password: String(incoming.password || ''),
                  firstName: String(incoming.firstName || ''),
                  lastName: String(incoming.lastName || ''),
                  name: incoming.name || `${incoming.firstName || ''} ${incoming.lastName || ''}`.trim() || 'Hacker',
                  phone: String(incoming.phone || ''),
                  college: String(incoming.college || ''),
                  rollNumber: String(incoming.rollNumber || ''),
                  course: String(incoming.course || 'CSE'),
                  year: String(incoming.year || '1st'),
                  gender: String(incoming.gender || 'male'),
                  registeredAt: new Date().toISOString(),
                };

                db.users = [...(db.users || []), newUser];
                writeDb(db);

                const safeUser = { ...newUser };
                delete safeUser.password;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ success: true, user: safeUser }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // POST /api/auth/check-email
        if (req.url === '/api/auth/check-email') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const cleanEmail = String(incoming.email || '').trim().toLowerCase();
                const db = readDb();
                const exists = (db.users || []).some((u) => (u.email || '').toLowerCase() === cleanEmail) ||
                  (db.teams || []).some((t) =>
                    (t.leader_email || '').toLowerCase() === cleanEmail ||
                    (t.leaderEmail || '').toLowerCase() === cleanEmail ||
                    (t.leader?.email || '').toLowerCase() === cleanEmail ||
                    (t.members || []).some((m) => (m.email || '').toLowerCase() === cleanEmail)
                  );
                if (exists) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ exists: true, error: `Email "${cleanEmail}" is already registered. Please log in instead.` }));
                  return;
                }
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ exists: false, available: true }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // POST /api/auth/send-otp
        if (req.url === '/api/auth/send-otp') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', async () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const cleanEmail = String(incoming.email || '').toLowerCase().trim();
                if (!cleanEmail || !cleanEmail.includes('@')) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Please enter a valid email address.' }));
                  return;
                }

                const db = readDb();
                const inUsers = (db.users || []).some((u) => (u.email || '').toLowerCase() === cleanEmail);
                const inTeams = (db.teams || []).some((t) =>
                  (t.leader_email || '').toLowerCase() === cleanEmail ||
                  (t.leaderEmail || '').toLowerCase() === cleanEmail ||
                  (t.leader?.email || '').toLowerCase() === cleanEmail ||
                  (t.members || []).some((m) => (m.email || '').toLowerCase() === cleanEmail)
                );
                if (!inUsers && !inTeams) {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    error: 'Not a registered user. No account found with this email. Please register your squad first.',
                    notRegistered: true,
                  }));
                  return;
                }

                const today = new Date().toISOString().slice(0, 10);
                let rateRecord = viteOtpLimits.get(cleanEmail) || { date: today, attempts: 0 };
                if (rateRecord.date !== today) {
                  rateRecord = { date: today, attempts: 0 };
                }

                if (rateRecord.attempts >= 5) {
                  res.statusCode = 429;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Daily login limit reached (5 attempts per day). Please try again tomorrow or contact support@codefiesta.in.' }));
                  return;
                }

                rateRecord.attempts += 1;
                viteOtpLimits.set(cleanEmail, rateRecord);

                const otp = String(Math.floor(100000 + Math.random() * 900000));
                saveViteOtp(cleanEmail, {
                  otp,
                  expiresAt: Date.now() + 10 * 60 * 1000, // Exactly 10 minutes (600,000 ms)
                  createdAt: Date.now(),
                });

                let emailDelivered = false;
                try {
                  await sendOtpEmail({
                    to: cleanEmail, // Directly dispatched to the candidate's email
                    otp,
                    attemptsLeft: 5 - rateRecord.attempts,
                  });
                  emailDelivered = true;
                  console.log(`[Vite Dev] Successfully delivered OTP email via Zoho SMTP to ${cleanEmail}`);
                } catch (sendErr) {
                  console.error('[Vite Dev] SMTP send failed:', sendErr?.message || sendErr);
                }

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({
                  success: true,
                  delivered: emailDelivered,
                  message: emailDelivered
                    ? `Official 6-digit login OTP dispatched to ${cleanEmail} from support@protechy.in.`
                    : `Login OTP generated for ${cleanEmail}. (Check inbox or spam)`,
                  attemptsLeft: 5 - rateRecord.attempts,
                  devOtp: otp,
                }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // POST /api/auth/verify-otp (Enforces 10-minute validity)
        if (req.url === '/api/auth/verify-otp') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const cleanEmail = String(incoming.email || '').toLowerCase().trim();
                const otp = String(incoming.otp || '').trim();
                if (!cleanEmail || !otp) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Email and 6-digit OTP are required.' }));
                  return;
                }

                const record = getViteOtp(cleanEmail);
                if (!record) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'No active OTP found for this email. Please request a verification code.' }));
                  return;
                }
                if (Date.now() > record.expiresAt) {
                  deleteViteOtp(cleanEmail);
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'OTP has expired. Verification codes are valid for 10 minutes only. Please request a new code.' }));
                  return;
                }
                if (record.otp !== otp) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Invalid verification code. Please check the 6-digit OTP sent to your email.' }));
                  return;
                }
                deleteViteOtp(cleanEmail);

                const db = readDb();
                let matchedUser = (db.users || []).find((u) => (u.email || '').toLowerCase() === cleanEmail);
                if (!matchedUser) {
                  for (const t of db.teams || []) {
                    if (
                      (t.leader?.email && t.leader.email.toLowerCase() === cleanEmail) ||
                      (t.leaderEmail && t.leaderEmail.toLowerCase() === cleanEmail) ||
                      (t.leader_email && t.leader_email.toLowerCase() === cleanEmail)
                    ) {
                      matchedUser = {
                        id: t.leader?.id || ('usr_' + t.id),
                        email: cleanEmail,
                        name: t.leader?.name || `${t.leader?.firstName || ''} ${t.leader?.lastName || ''}`.trim() || 'Squad Leader',
                        firstName: t.leader?.firstName || '',
                        lastName: t.leader?.lastName || '',
                        phone: t.leader?.phone || '',
                        college: t.leader?.college || t.college || '',
                        role: 'leader',
                        teamId: t.id,
                        teamName: t.name,
                      };
                      break;
                    }
                    const m = (t.members || []).find((mem) => (mem.email || '').toLowerCase() === cleanEmail);
                    if (m) {
                      matchedUser = {
                        id: m.id || ('usr_' + t.id),
                        email: cleanEmail,
                        name: m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Operative',
                        firstName: m.firstName || '',
                        lastName: m.lastName || '',
                        phone: m.phone || '',
                        college: m.college || t.college || '',
                        role: m.role || 'member',
                        teamId: t.id,
                        teamName: t.name,
                      };
                      break;
                    }
                  }
                }

                if (!matchedUser) {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    error: 'Not a registered user. No account found with this email. Please register your squad first.',
                    notRegistered: true,
                  }));
                  return;
                }

                const safeUser = { ...matchedUser };
                delete safeUser.password;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ success: true, user: safeUser }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // GET /api/auth/me
        if (req.url === '/api/auth/me' || req.url?.startsWith('/api/auth/me?')) {
          const userEmail = String(req.headers['x-user-email'] || '').trim().toLowerCase();
          const db = readDb();
          let user = userEmail ? (db.users || []).find((u) => (u.email || '').toLowerCase() === userEmail) : null;
          if (!user && userEmail) {
            for (const t of db.teams || []) {
              if (
                (t.leader_email || '').toLowerCase() === userEmail ||
                (t.leaderEmail || '').toLowerCase() === userEmail ||
                (t.leader?.email || '').toLowerCase() === userEmail
              ) {
                user = {
                  id: t.leader?.id || ('usr_' + t.id),
                  email: userEmail,
                  name: t.leader?.name || `${t.leader?.firstName || ''} ${t.leader?.lastName || ''}`.trim() || 'Leader',
                  phone: t.leader?.phone || '',
                  college: t.leader?.college || '',
                  rollNumber: t.leader?.rollNumber || '',
                  course: t.leader?.course || 'CSE',
                  year: t.leader?.year || '1st',
                  gender: t.leader?.gender || 'male',
                };
                break;
              }
              const member = (t.members || []).find((m) => (m.email || '').toLowerCase() === userEmail);
              if (member) {
                user = {
                  id: member.id || ('usr_' + t.id),
                  email: userEmail,
                  name: member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Team Member',
                  firstName: member.firstName || '',
                  lastName: member.lastName || '',
                  phone: member.phone || '',
                  college: member.college || t.college || '',
                  role: 'member',
                  isLeader: false,
                  teamId: t.id,
                  teamName: t.name,
                };
                break;
              }
            }
          }
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          if (user) {
            const safe = { ...user };
            delete safe.password;
            res.end(JSON.stringify({ success: true, user: safe }));
          } else {
            res.end(JSON.stringify({ success: false, user: null }));
          }
          return;
        }

        // POST /api/auth/logout
        if (req.url === '/api/auth/logout') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ success: true }));
          return;
        }
        if (req.url === '/api/ops/registrations' || req.url?.startsWith('/api/ops/registrations?')) {
          if (req.method === 'GET') {
            const db = readDb();
            const candidates = [];
            for (const t of db.teams || []) {
              const leaderCollege = t.college || t.leader?.college || 'Global Institute of Technology, Jaipur';
              const leaderName = t.leader?.name || (t.leader?.firstName ? `${t.leader.firstName} ${t.leader.lastName || ''}`.trim() : 'Leader');
              const leaderEmail = (t.leader?.email || t.leader_email || t.leaderEmail || '').toLowerCase().trim();

              const leaderObj = {
                id: t.leader?.id || ('mem_leader_' + t.id),
                name: leaderName,
                firstName: t.leader?.firstName || '',
                lastName: t.leader?.lastName || '',
                email: t.leader?.email || t.leaderEmail || '',
                phone: t.leader?.phone || '',
                college: leaderCollege,
                rollNumber: t.leader?.rollNumber || '',
                course: t.leader?.course || 'CSE',
                year: t.leader?.year || '1st',
                gender: t.leader?.gender || 'male',
                role: 'leader',
                status: 'accepted',
                isConfirmed: true
              };

              const rawMembers = Array.isArray(t.members) ? t.members : [];
              const hasLeaderInMembers = rawMembers.some(m => m.role === 'leader' || (leaderEmail && (m.email || '').toLowerCase().trim() === leaderEmail));
              const members = hasLeaderInMembers ? rawMembers : [leaderObj, ...rawMembers];

              for (const m of members) {
                const isLeader = m.role === 'leader' || (leaderEmail && (m.email || '').toLowerCase().trim() === leaderEmail);
                const isConfirmed = isLeader || m.status === 'accepted' || m.status === 'confirmed';
                const candidateStatus = isConfirmed ? 'accepted' : (m.status || 'pending');
                candidates.push({
                  candidateId: m.id || m.email,
                  candidateName: m.name || (isLeader ? leaderName : 'Operative'),
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
                  team: t
                });
              }
            }
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ success: true, candidates, teams: db.teams || [] }));
            return;
          }
        }

        if (req.url === '/api/teams/all' || req.url?.startsWith('/api/teams/all?')) {
          if (req.method === 'GET') {
            const db = readDb();
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ success: true, teams: db.teams || [] }));
            return;
          }
        }

        if (req.url === '/api/shared-store' || req.url?.startsWith('/api/shared-store?')) {
          if (req.method === 'GET') {
            const data = readDb();
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ success: true, data }));
            return;
          }
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const current = readDb();

                // Support wipe mode: if wipe=true is sent, replace instead of merge
                const wipeTeams = incoming.wipe === true || incoming.wipeTeams === true;
                const wipeUsers = incoming.wipe === true || incoming.wipeUsers === true;

                // Merge teams by ID (or wipe)
                let mergedTeams = current.teams || [];
                if (wipeTeams) {
                  mergedTeams = Array.isArray(incoming.teams) ? incoming.teams : [];
                } else if (Array.isArray(incoming.teams)) {
                  const teamMap = new Map((current.teams || []).map((t) => [t.id, t]));
                  for (const t of incoming.teams) {
                    teamMap.set(t.id, t);
                  }
                  mergedTeams = Array.from(teamMap.values());
                }

                // Merge users by email (or wipe)
                let mergedUsers = current.users || [];
                if (wipeUsers) {
                  mergedUsers = Array.isArray(incoming.users) ? incoming.users : [];
                } else if (Array.isArray(incoming.users)) {
                  const userMap = new Map((current.users || []).map((u) => [u.email?.toLowerCase(), u]));
                  for (const u of incoming.users) {
                    if (u.email) userMap.set(u.email.toLowerCase(), u);
                  }
                  mergedUsers = Array.from(userMap.values());
                }

                // Merge opsState
                let mergedOpsState = current.opsState || {};
                if (incoming.opsState) {
                  let mergedEvals = mergedOpsState.evaluations || [];
                  if (incoming.opsState.evaluations) {
                    const evalMap = new Map();
                    (mergedOpsState.evaluations || []).forEach((e) => {
                      if (e && (e.id || e.teamId)) evalMap.set(e.id || `${e.teamId}_${e.round || 'round1'}`, e);
                    });
                    (incoming.opsState.evaluations || []).forEach((e) => {
                      if (e && (e.id || e.teamId)) evalMap.set(e.id || `${e.teamId}_${e.round || 'round1'}`, e);
                    });
                    mergedEvals = Array.from(evalMap.values());
                  }

                  let mergedGate = mergedOpsState.gateCheckins || {};
                  if (incoming.opsState.gateCheckins) {
                    mergedGate = { ...mergedGate, ...incoming.opsState.gateCheckins };
                    for (const [tid, checkins] of Object.entries(incoming.opsState.gateCheckins)) {
                      mergedGate[tid] = { ...(mergedGate[tid] || {}), ...checkins };
                    }
                  }

                  mergedOpsState = {
                    ...mergedOpsState,
                    ...incoming.opsState,
                    evaluations: incoming.opsState.evaluations ? mergedEvals : (mergedOpsState.evaluations || []),
                    gateCheckins: incoming.opsState.gateCheckins ? mergedGate : (mergedOpsState.gateCheckins || {}),
                    tableAssignments: incoming.opsState.tableAssignments !== undefined
                      ? incoming.opsState.tableAssignments
                      : ((mergedOpsState && mergedOpsState.tableAssignments) || {}),
                  };
                }

                // Support direct problemStatements updates
                if (incoming.problemStatements) {
                  mergedOpsState.problemStatements = incoming.problemStatements;
                }

                // Ensure two-way sync between opsState.tableAssignments and team.tableNumber
                if (mergedOpsState && mergedOpsState.tableAssignments !== undefined) {
                  mergedTeams = mergedTeams.map((t) => {
                    const assigned = mergedOpsState.tableAssignments[t.id];
                    return { ...t, tableNumber: assigned || null };
                  });
                }

                const merged = {
                  teams: mergedTeams,
                  users: mergedUsers,
                  opsState: mergedOpsState,
                  updatedAt: new Date().toISOString(),
                };

                writeDb(merged);
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ success: true, data: merged }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // POST /api/ops/verify-payment
        if (req.url === '/api/ops/verify-payment') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', async () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const { teamId, verified, notes, teamData, candidate } = incoming;
                const isVerified = verified !== false;
                const db = readDb();
                let team = (db.teams || []).find((t) => t.id === teamId || t.code === teamId);
                if (!team && (teamData || candidate)) {
                  team = teamData || candidate;
                  db.teams = db.teams || [];
                  db.teams.push(team);
                }

                if (!team) {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Team not found' }));
                  return;
                }

                team.payment = {
                  ...(team.payment || {}),
                  status: isVerified ? 'verified' : 'rejected',
                  verifiedAt: isVerified ? new Date().toISOString() : null,
                  notes: notes || (isVerified ? 'UTR matched and authorized by Admin' : 'Invalid UTR rejected by admin'),
                };
                team.status = isVerified ? 'confirmed' : 'rejected';

                let emailDelivered = false;
                let emailError = null;
                const leaderEmail = team.leader?.email || team.leader_email || incoming.leaderEmail || teamData?.leader?.email;
                const leaderName = team.leader?.name || (team.leader?.firstName ? `${team.leader.firstName} ${team.leader.lastName || ''}`.trim() : 'Participant');

                if (isVerified && leaderEmail) {
                  try {
                    console.log(`[Vite Dev] Dispatching selection confirmed email via Zoho SMTP to: ${leaderEmail} (Team: ${team.name})`);
                    const info = await sendPaymentVerifiedEmail({
                      to: leaderEmail,
                      leaderName,
                      teamName: team.name
                    });
                    emailDelivered = !!info;
                    console.log(`[Vite Dev] ✓ Verified payment email sent to ${leaderEmail}`);
                  } catch (err) {
                    emailError = err.message;
                    console.error('[Verify Payment Dev Email Dispatch Failed]:', err.message);
                  }
                }

                writeDb(db);
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({
                  success: true,
                  team,
                  isVerified,
                  emailDispatched: isVerified ? {
                    to: leaderEmail,
                    teamName: team.name,
                    subject: `Registration & Payment Confirmed: Welcome to CODEFIESTA 5.0! — Team ${team.name}`,
                    delivered: emailDelivered,
                    error: emailError
                  } : null
                }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // POST /api/ops/revert-payment
        if (req.url === '/api/ops/revert-payment') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const { teamId } = incoming;
                const db = readDb();
                const team = (db.teams || []).find((t) => t.id === teamId || t.code === teamId);
                if (!team) {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Team not found' }));
                  return;
                }

                team.payment = {
                  ...(team.payment || {}),
                  status: 'submitted',
                  verifiedAt: null,
                  notes: 'Payment verification reverted by Admin',
                };
                team.status = 'registered';

                writeDb(db);
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ success: true, team }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // POST /api/ops/assign-table
        if (req.url === '/api/ops/assign-table') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const { teamId, tableNumber } = incoming;
                if (!teamId) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Team ID is required.' }));
                  return;
                }

                const cleanTable = String(tableNumber || '').toUpperCase().trim();
                const finalTable = cleanTable && cleanTable !== 'UNASSIGNED' && cleanTable !== 'CLEAR' && cleanTable !== 'NONE' ? cleanTable : null;

                const db = readDb();
                const team = (db.teams || []).find((t) => t.id === teamId || t.code === teamId || (t.name && t.name.toLowerCase() === String(teamId).toLowerCase()));
                const targetTeamId = team ? team.id : teamId;

                if (team) {
                  team.tableNumber = finalTable;
                }

                db.opsState = db.opsState || {};
                db.opsState.tableAssignments = db.opsState.tableAssignments || {};
                if (finalTable) {
                  db.opsState.tableAssignments[targetTeamId] = finalTable;
                } else {
                  delete db.opsState.tableAssignments[targetTeamId];
                  if (team) team.tableNumber = null;
                }

                writeDb(db);
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({
                  success: true,
                  teamId: targetTeamId,
                  tableNumber: finalTable,
                  tableAssignments: db.opsState.tableAssignments,
                }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // POST /api/teams/check-name
        if (req.url === '/api/teams/check-name') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const targetName = String(incoming.name || '').trim().toLowerCase();
                if (!targetName) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Squad name is required.' }));
                  return;
                }
                const db = readDb();
                const taken = (db.teams || []).some((t) => (t.name || '').trim().toLowerCase() === targetName);
                if (taken) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: `Squad name "${incoming.name}" is already taken by another team. Please choose a unique name.` }));
                  return;
                }
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ available: true }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // POST /api/teams/create
        if (req.url === '/api/teams/create') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const targetName = String(incoming.name || '').trim();
                if (!targetName) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Squad name cannot be empty.' }));
                  return;
                }

                const db = readDb();
                const allTeams = db.teams || [];

                if (allTeams.some((t) => (t.name || '').trim().toLowerCase() === targetName.toLowerCase())) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: `Squad name "${targetName}" is already taken by another team. Please choose a unique name.` }));
                  return;
                }

                // Incomplete or dropped registrations without payment are strictly NOT saved on the server
                const utr = String(incoming.payment?.utr || incoming.utr || '').trim();
                if (!utr || utr.length < 6) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Valid payment UTR reference is required to register a squad. Incomplete registrations without payment are not saved on the server.' }));
                  return;
                }

                const duplicateUtr = allTeams.find((t) => (t.payment?.utr || '').trim().toLowerCase() === utr.toLowerCase());
                if (duplicateUtr) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: `UTR "${utr}" has already been submitted by squad "${duplicateUtr.name}". Each squad registration requires a unique payment transaction.` }));
                  return;
                }

                const newTeam = {
                  id: 'team_' + Math.random().toString(36).slice(2, 9),
                  ...incoming,
                  name: targetName,
                  status: 'registered',
                  createdAt: new Date().toISOString(),
                };

                // Also save leader as user in db.users
                const leaderEmail = String(incoming.leader?.email || incoming.leader_email || '').trim().toLowerCase();
                if (leaderEmail) {
                  const leaderUser = {
                    id: incoming.leader?.id || ('usr_' + newTeam.id),
                    email: leaderEmail,
                    firstName: incoming.leader?.firstName || '',
                    lastName: incoming.leader?.lastName || '',
                    name: incoming.leader?.name || `${incoming.leader?.firstName || ''} ${incoming.leader?.lastName || ''}`.trim() || 'Leader',
                    phone: incoming.leader?.phone || '',
                    college: incoming.leader?.college || '',
                    rollNumber: incoming.leader?.rollNumber || '',
                    course: incoming.leader?.course || 'CSE',
                    year: incoming.leader?.year || '1st',
                    gender: incoming.leader?.gender || 'male',
                    password: incoming.leader?.password || incoming.password || '',
                    registeredAt: new Date().toISOString(),
                  };
                  db.users = (db.users || []).filter((u) => (u.email || '').toLowerCase() !== leaderEmail);
                  db.users.push(leaderUser);
                }

                db.teams = [newTeam, ...allTeams];
                writeDb(db);

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                const safeLeaderUser = leaderEmail ? (db.users || []).find((u) => (u.email || '').toLowerCase() === leaderEmail) : null;
                res.end(JSON.stringify({ success: true, team: newTeam, user: safeLeaderUser }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // POST /api/teams/:teamId/payment
        if (req.method === 'POST' && req.url?.includes('/payment') && req.url?.startsWith('/api/teams/')) {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const incoming = JSON.parse(body || '{}');
              const teamId = req.url.split('?')[0].replace('/api/teams/', '').replace('/payment', '').split('/')[0];
              const cleanUtr = String(incoming.utr || '').trim();

              const db = readDb();
              const allTeams = db.teams || [];
              const team = allTeams.find((t) => t.id === teamId || t.code === teamId);

              if (!team) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Team not found' }));
                return;
              }

              if (cleanUtr) {
                const duplicateTeam = allTeams.find((t) =>
                  t.id !== team.id &&
                  t.code !== team.id &&
                  (t.payment?.utr || '').trim().toLowerCase() === cleanUtr.toLowerCase()
                );
                if (duplicateTeam) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    error: `UTR "${cleanUtr}" has already been submitted by squad "${duplicateTeam.name}". Each squad registration requires a unique payment transaction.`
                  }));
                  return;
                }
              }

              team.payment = {
                ...(team.payment || {}),
                status: 'submitted',
                utr: cleanUtr,
                amount: team.payment?.amount || 800,
                submittedAt: new Date().toISOString(),
                notes: null,
              };
              if (team.status === 'rejected') {
                team.status = 'registered';
              }

              writeDb(db);
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ success: true, payment: team.payment, team }));
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // GET /api/teams/my
        if (req.url === '/api/teams/my' || req.url?.startsWith('/api/teams/my?')) {
          if (req.method === 'GET') {
            const userEmail = (req.headers['x-user-email'] || '').toLowerCase().trim();
            const db = readDb();
            const myTeams = (db.teams || []).filter((t) => {
              if (!userEmail) return true;
              return (
                t.leader?.email?.toLowerCase() === userEmail ||
                t.leader_email?.toLowerCase() === userEmail ||
                (t.members || []).some((m) => m.email?.toLowerCase() === userEmail)
              );
            });
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ success: true, teams: myTeams }));
            return;
          }
        }

        // Handle direct DELETE /api/teams/:id/members/:email
        if (req.method === 'DELETE' && req.url?.startsWith('/api/teams/') && req.url?.includes('/members/')) {
          const parts = req.url.split('?')[0].replace('/api/teams/', '').split('/members/');
          const teamId = decodeURIComponent(parts[0] || '').trim();
          const emailToDelete = decodeURIComponent(parts[1] || '').toLowerCase().trim();

          const current = readDb();
          const targetTeam = (current.teams || []).find((t) => t.id === teamId || t.code === teamId);
          if (targetTeam) {
            targetTeam.members = (targetTeam.members || []).filter(
              (m) => (m.email || '').toLowerCase().trim() !== emailToDelete
            );
            targetTeam.invites = (targetTeam.invites || []).filter(
              (i) => (i.email || '').toLowerCase().trim() !== emailToDelete
            );
            targetTeam.size = Math.max(1, targetTeam.members.length);
            targetTeam.acceptedCount = (targetTeam.members || []).filter(
              (m) => (m.status === 'accepted' || m.status === 'confirmed') && !m.earlyExit
            ).length;
            writeDb(current);
          }

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          broadcastDevEvent('team:updated', { team: targetTeam, removedEmail: emailToDelete });
          res.end(JSON.stringify({ success: true, team: targetTeam || null }));
          return;
        }

        // POST /api/teams/:id/members (Add Teammate)
        if (req.method === 'POST' && req.url?.startsWith('/api/teams/') && req.url?.endsWith('/members')) {
          const teamId = decodeURIComponent(req.url.split('?')[0].replace('/api/teams/', '').replace('/members', '')).trim();
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const incoming = JSON.parse(body || '{}');
              const cleanEmail = String(incoming.email || '').toLowerCase().trim();
              if (!cleanEmail || !cleanEmail.includes('@')) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Valid email address is required' }));
                return;
              }
              const current = readDb();
              const targetTeam = (current.teams || []).find((t) => t.id === teamId || t.code === teamId);
              if (!targetTeam) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Team not found' }));
                return;
              }
              targetTeam.members = Array.isArray(targetTeam.members) ? targetTeam.members : [];
              if (targetTeam.members.some((m) => (m.email || '').toLowerCase().trim() === cleanEmail)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'This teammate is already in your squad.' }));
                return;
              }
              const memberName = incoming.name || `${incoming.firstName || ''} ${incoming.lastName || ''}`.trim() || 'Operative';
              const newMember = {
                id: 'mem_' + Math.random().toString(36).slice(2, 11),
                teamId: targetTeam.id,
                firstName: incoming.firstName || '',
                lastName: incoming.lastName || '',
                name: memberName,
                email: cleanEmail,
                phone: incoming.phone || '',
                college: incoming.college || targetTeam.college || targetTeam.leader?.college || 'Global Institute of Technology, Jaipur',
                role: 'member',
                status: 'accepted',
                isConfirmed: true,
                earlyExit: false,
              };
              targetTeam.members.push(newMember);
              targetTeam.size = targetTeam.members.length;
              targetTeam.acceptedCount = targetTeam.members.filter((m) => (m.status === 'accepted' || m.status === 'confirmed') && !m.earlyExit).length;
              writeDb(current);

              broadcastDevEvent('team:updated', { team: targetTeam, member: newMember });
              broadcastDevEvent('codefiesta_teams_updated', { teams: current.teams });

              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ success: true, team: targetTeam, member: newMember }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // PATCH /api/teams/:id/members/:email (Edit Teammate)
        if (req.method === 'PATCH' && req.url?.startsWith('/api/teams/') && req.url?.includes('/members/')) {
          const parts = req.url.split('?')[0].replace('/api/teams/', '').split('/members/');
          const teamId = decodeURIComponent(parts[0] || '').trim();
          const targetEmail = decodeURIComponent(parts[1] || '').toLowerCase().trim();
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const incoming = JSON.parse(body || '{}');
              const current = readDb();
              const targetTeam = (current.teams || []).find((t) => t.id === teamId || t.code === teamId);
              if (!targetTeam) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Team not found' }));
                return;
              }
              const member = (targetTeam.members || []).find((m) => (m.email || '').toLowerCase().trim() === targetEmail);
              if (!member) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Member not found in team' }));
                return;
              }
              if (incoming.firstName !== undefined) member.firstName = incoming.firstName;
              if (incoming.lastName !== undefined) member.lastName = incoming.lastName;
              if (incoming.name || incoming.firstName || incoming.lastName) {
                member.name = incoming.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.name;
              }
              if (incoming.phone !== undefined) member.phone = incoming.phone;
              if (incoming.college !== undefined) member.college = incoming.college;

              writeDb(current);
              broadcastDevEvent('team:updated', { team: targetTeam, member });
              broadcastDevEvent('codefiesta_teams_updated', { teams: current.teams });

              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ success: true, team: targetTeam, member }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // POST /api/mentor/login
        if (req.url === '/api/mentor/login') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const cleanEmail = String(incoming.email || '').toLowerCase().trim();
                const password = String(incoming.password || '');
                const db = readDb();
                const found = (db.opsState?.mentors || []).find(
                  (m) => (m.email || '').toLowerCase() === cleanEmail && m.password === password
                );
                if (found) {
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.end(JSON.stringify({ success: true, mentor: found }));
                  return;
                }
                if (
                  (cleanEmail === 'mentor.ai@codefiesta.in' && password === 'mentor_access_cf5') ||
                  (cleanEmail === 'mentor@codefiesta.in' && password === 'mentor123')
                ) {
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.end(JSON.stringify({
                    success: true,
                    mentor: {
                      id: 'men_default',
                      name: 'Dr. Rajesh Sharma',
                      email: cleanEmail,
                      track: 'agentic_ai',
                      tables: 'T-01 - T-20',
                    },
                  }));
                  return;
                }
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid mentor credentials.' }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // POST /api/mentor/evaluate
        if (req.url === '/api/mentor/evaluate') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const db = readDb();
                const opsState = db.opsState || {};
                const roundKey = incoming.round === 'round2' ? 'round2' : 'round1';
                const roundLabel = roundKey === 'round2' ? 'Second Assessment' : 'First Assessment';

                if (!opsState.evaluationRounds?.[roundKey]) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: `${roundLabel} is currently LOCKED by Admin Ops. Please wait for the ground round announcement.` }));
                  return;
                }

                const existing = (opsState.evaluations || []).find(
                  (e) => e.teamId === incoming.teamId && (e.round === roundKey || (!e.round && roundKey === 'round1'))
                );
                if (existing && existing.locked) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: `Evaluation for ${roundLabel} is permanently locked and cannot be modified.` }));
                  return;
                }

                const total =
                  Number(incoming.scores?.innovation || 0) +
                  Number(incoming.scores?.tech || 0) +
                  Number(incoming.scores?.feasibility || 0) +
                  Number(incoming.scores?.pitch || 0);

                const evalItem = {
                  id: 'eval_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                  teamId: incoming.teamId,
                  teamName: incoming.teamName || 'Squad',
                  tableNumber: incoming.tableNumber || (opsState.tableAssignments?.[incoming.teamId] || null),
                  round: roundKey,
                  roundName: roundLabel,
                  mentorEmail: incoming.mentorEmail,
                  mentorName: incoming.mentorName || 'Evaluator',
                  scores: {
                    innovation: Number(incoming.scores?.innovation || 0),
                    tech: Number(incoming.scores?.tech || 0),
                    feasibility: Number(incoming.scores?.feasibility || 0),
                    pitch: Number(incoming.scores?.pitch || 0),
                  },
                  innovation: Number(incoming.scores?.innovation || 0),
                  tech: Number(incoming.scores?.tech || 0),
                  feasibility: Number(incoming.scores?.feasibility || 0),
                  pitch: Number(incoming.scores?.pitch || 0),
                  total,
                  notes: incoming.notes || incoming.comments || '',
                  comments: incoming.notes || incoming.comments || '',
                  locked: true,
                  lockedAt: new Date().toISOString(),
                  timestamp: new Date().toISOString(),
                };

                opsState.evaluations = [
                  ...(opsState.evaluations || []).filter(
                    (e) => !(e.teamId === incoming.teamId && (e.round === roundKey || (!e.round && roundKey === 'round1')))
                  ),
                  evalItem,
                ];
                db.opsState = opsState;
                writeDb(db);

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ success: true, evaluation: evalItem }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // POST /api/gate/login
        if (req.url === '/api/gate/login') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const cleanEmail = String(incoming.email || '').toLowerCase().trim();
                const password = String(incoming.password || '');
                const db = readDb();
                const found = (db.opsState?.coordinators || []).find(
                  (c) => (c.email || '').toLowerCase() === cleanEmail && c.password === password
                );
                if (found) {
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.end(JSON.stringify({ success: true, coordinator: found }));
                  return;
                }
                if (
                  (cleanEmail === 'gate.coordinator@codefiesta.in' && password === 'gate_access_cf5') ||
                  (cleanEmail === 'coordinator@codefiesta.in' && password === 'gate123')
                ) {
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.end(JSON.stringify({
                    success: true,
                    coordinator: {
                      id: 'coord_default',
                      name: 'Main Gate Staff',
                      email: cleanEmail,
                      gate: 'Sitapura Main Entrance',
                    },
                  }));
                  return;
                }
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid gate coordinator credentials.' }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // POST /api/gate/scan
        if (req.url === '/api/gate/scan') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const db = readDb();
                const opsState = db.opsState || {};
                const input = String(incoming.code || incoming.passId || '').trim();
                if (!input) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'No QR payload or pass ID provided.' }));
                  return;
                }

                let targetEmail = '';
                let targetTeamId = '';
                let targetPassId = '';

                if (input.startsWith('CF5:')) {
                  const parts = input.split(':');
                  targetTeamId = parts[1] || '';
                  targetEmail = (parts[2] || '').toLowerCase();
                  targetPassId = parts[3] || '';
                } else if (input.includes('@')) {
                  targetEmail = input.toLowerCase();
                } else {
                  targetPassId = input;
                }

                const allTeams = db.teams || [];
                let foundTeam = null;
                let foundMember = null;

                for (const t of allTeams) {
                  for (const m of t.members || []) {
                    const pId = `CF5-${(m.id || m.email || '0000').slice(-6).toUpperCase()}`;
                    if (
                      (targetEmail && (m.email || '').toLowerCase() === targetEmail) ||
                      (targetPassId && pId === targetPassId.toUpperCase()) ||
                      (targetPassId && (m.id || '').endsWith(targetPassId))
                    ) {
                      foundTeam = t;
                      foundMember = m;
                      break;
                    }
                  }
                  if (foundTeam) break;
                }

                if (!foundTeam) {
                  const u = (db.users || []).find(
                    (usr) =>
                      (targetEmail && (usr.email || '').toLowerCase() === targetEmail) ||
                      (targetPassId && `CF5-${(usr.id || '0000').slice(-6).toUpperCase()}` === targetPassId.toUpperCase())
                  );
                  if (u) {
                    foundMember = {
                      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email.split('@')[0],
                      email: u.email,
                      college: u.college || 'Participant',
                      role: 'leader',
                      status: 'accepted',
                    };
                    foundTeam = allTeams.find((t) => (t.members || []).some((m) => m.email === u.email)) || {
                      id: 'team_solo_' + u.id,
                      name: 'SOLO OPERATIVE',
                      size: 1,
                      members: [foundMember],
                      tableNumber: opsState.tableAssignments?.[u.id] || null,
                    };
                  }
                }

                if (!foundTeam || !foundMember) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'QR Code verification failed: No matching registered participant found.' }));
                  return;
                }

                opsState.gateCheckins = opsState.gateCheckins || {};
                opsState.gateCheckins[foundTeam.id] = opsState.gateCheckins[foundTeam.id] || {};

                const checkinTime = new Date().toISOString();
                opsState.gateCheckins[foundTeam.id][foundMember.email.toLowerCase()] = checkinTime;
                db.opsState = opsState;
                writeDb(db);

                const acceptedMembers = (foundTeam.members || []).filter(
                  (m) => m.status === 'accepted' || m.role === 'leader'
                );
                const teamSize = Math.max(acceptedMembers.length, foundTeam.size || 1);

                const roster = acceptedMembers.map((m) => {
                  const isHere = !!opsState.gateCheckins[foundTeam.id][(m.email || '').toLowerCase()];
                  return {
                    ...m,
                    checkedIn: isHere,
                    checkedInAt: opsState.gateCheckins[foundTeam.id][(m.email || '').toLowerCase()] || null,
                  };
                });

                const checkedInCount = roster.filter((m) => m.checkedIn).length;
                const isComplete = checkedInCount >= acceptedMembers.length && acceptedMembers.length > 0;

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({
                  success: true,
                  team: {
                    id: foundTeam.id,
                    name: foundTeam.name,
                    size: teamSize,
                    tableNumber: opsState.tableAssignments?.[foundTeam.id] || foundTeam.tableNumber || null,
                    roster,
                  },
                  scannedMember: {
                    name: foundMember.name || (foundMember.email || '').split('@')[0],
                    email: foundMember.email,
                    college: foundMember.college,
                    checkedInAt: checkinTime,
                  },
                  checkedInCount,
                  totalMembers: acceptedMembers.length,
                  isComplete,
                }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // POST /api/ops/toggle-round
        if (req.url === '/api/ops/toggle-round') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const db = readDb();
                const opsState = db.opsState || {};
                opsState.evaluationRounds = opsState.evaluationRounds || { round1: true, round2: false };
                if (incoming.round) {
                  opsState.evaluationRounds[incoming.round] = incoming.enabled !== false;
                }
                db.opsState = opsState;
                writeDb(db);
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ success: true, evaluationRounds: opsState.evaluationRounds }));
              } catch (err) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    sharedStatePlugin(),
  ],
  envPrefix: ['VITE_', 'HTS_', 'BACKEND_URL'],
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: ['**/scratch/**', '**/node_modules/**'],
    },
  },
});
