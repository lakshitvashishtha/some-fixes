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
