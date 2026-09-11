/* Single source of truth for the backend origin.
 * When unset, requests fall back to same-origin relative URLs or local state.
 */
export const BACKEND_URL = (
  import.meta.env?.VITE_BACKEND_URL ||
  import.meta.env?.BACKEND_URL ||
  ''
).replace(/\/+$/, '')
