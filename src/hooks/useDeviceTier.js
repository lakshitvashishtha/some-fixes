/**
 * useDeviceTier.js
 *
 * Detects device capability once at module load time (synchronous, no re-renders).
 * Returns stable boolean flags used across the app to gate expensive effects.
 *
 * Rules:
 *  isMobile       — viewport < 768 px OR touch-primary device
 *  isTouchDevice  — touch API present (phones, tablets, touch laptops)
 *  isLowEndDevice — <= 4 logical CPU cores OR browser reports low memory (< 4 GB)
 */

function detect() {
  if (typeof window === 'undefined') {
    return { isMobile: false, isTouchDevice: false, isLowEndDevice: false }
  }

  const isTouchDevice =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0

  const isMobile =
    isTouchDevice ||
    window.innerWidth < 768

  const cores = navigator.hardwareConcurrency ?? 4
  // navigator.deviceMemory is Chrome-only (GB), undefined elsewhere → assume fine
  const memory = navigator.deviceMemory ?? 8
  const isLowEndDevice = cores <= 4 || memory < 4

  return { isMobile, isTouchDevice, isLowEndDevice }
}

// Evaluated once — no hook overhead, no re-renders
const deviceTier = detect()

/**
 * Returns stable device tier flags. Safe to call in any component.
 * @returns {{ isMobile: boolean, isTouchDevice: boolean, isLowEndDevice: boolean }}
 */
export function useDeviceTier() {
  return deviceTier
}

// Also export the raw object for use outside React (e.g. in plain JS setup code)
export default deviceTier
