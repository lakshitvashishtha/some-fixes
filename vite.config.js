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
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body || '{}');
                const { teamId, verified, notes } = incoming;
                const isVerified = verified !== false;
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
                  status: isVerified ? 'verified' : 'rejected',
                  verifiedAt: isVerified ? new Date().toISOString() : null,
                  notes: notes || (isVerified ? 'UTR matched and authorized by Admin' : 'Invalid UTR rejected by admin'),
                };
                team.status = isVerified ? 'confirmed' : 'rejected';

                writeDb(db);
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({
                  success: true,
                  team,
                  isVerified,
                  emailDispatched: isVerified ? {
                    to: team.leader?.email,
                    teamName: team.name,
                    subject: `[CONFIRMED] Codefiesta 5.0 Official Pass Issued — ${team.name}`
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

                const utr = String(incoming.payment?.utr || incoming.utr || '').trim();
                if (utr) {
                  const duplicateUtr = allTeams.find((t) => (t.payment?.utr || '').trim().toLowerCase() === utr.toLowerCase());
                  if (duplicateUtr) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: `UTR "${utr}" has already been submitted by squad "${duplicateUtr.name}". Each squad registration requires a unique payment transaction.` }));
                    return;
                  }
                }

                const newTeam = {
                  id: 'team_' + Math.random().toString(36).slice(2, 9),
                  ...incoming,
                  name: targetName,
                  status: 'registered',
                  createdAt: new Date().toISOString(),
                };

                db.teams = [newTeam, ...allTeams];
                writeDb(db);

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ success: true, team: newTeam }));
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
