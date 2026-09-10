/* Single source of truth for the backend origin.
 *
 * Set BACKEND_URL in client/.env (e.g. http://localhost:3030). It is exposed to
 * the browser via `envPrefix` in vite.config.js. A trailing slash is stripped so
 * callers can safely concatenate paths like `${BACKEND_URL}/api/auth/login`.
 * When unset, requests fall back to same-origin relative URLs.
 */
export const BACKEND_URL = (import.meta.env.BACKEND_URL || '').replace(/\/+$/, '')
