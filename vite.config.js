import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

  return {
    name: 'shared-state-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
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
        if (req.url === '/api/ops/registrations' || req.url?.startsWith('/api/ops/registrations?')) {
          if (req.method === 'GET') {
            const db = readDb();
            const candidates = [];
            for (const t of db.teams || []) {
              const leaderCollege = t.leader?.college || 'Global Institute of Technology, Jaipur';
              const leaderName = t.leader?.name || (t.leader?.firstName ? `${t.leader.firstName} ${t.leader.lastName || ''}`.trim() : 'Leader');
              const members = Array.isArray(t.members) && t.members.length > 0 ? t.members : [
                {
                  id: 'mem_leader_' + t.id,
                  name: leaderName,
                  email: t.leader?.email,
                  college: leaderCollege,
                  role: 'leader',
                  status: 'accepted'
                }
              ];
              for (const m of members) {
                const isLeader = m.role === 'leader' || (t.leader?.email && m.email?.toLowerCase() === t.leader?.email?.toLowerCase());
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
                  mergedOpsState = {
                    ...mergedOpsState,
                    ...incoming.opsState,
                    tableAssignments: {
                      ...((mergedOpsState && mergedOpsState.tableAssignments) || {}),
                      ...((incoming.opsState && incoming.opsState.tableAssignments) || {}),
                    },
                  };
                }

                // Support direct problemStatements updates
                if (incoming.problemStatements) {
                  mergedOpsState.problemStatements = incoming.problemStatements;
                }

                // Ensure two-way sync between opsState.tableAssignments and team.tableNumber
                if (mergedOpsState && mergedOpsState.tableAssignments) {
                  mergedTeams = mergedTeams.map((t) => {
                    const assigned = mergedOpsState.tableAssignments[t.id];
                    if (assigned !== undefined) {
                      return { ...t, tableNumber: assigned || null };
                    }
                    return t;
                  });
                }

                if (mergedOpsState) {
                  mergedOpsState.tableAssignments = mergedOpsState.tableAssignments || {};
                  for (const t of mergedTeams) {
                    if (t.tableNumber && !mergedOpsState.tableAssignments[t.id]) {
                      mergedOpsState.tableAssignments[t.id] = t.tableNumber;
                    }
                  }
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
          res.end(JSON.stringify({ success: true, team: targetTeam || null }));
          return;
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
