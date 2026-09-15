import { io } from 'socket.io-client'
import { BACKEND_URL } from './config.js'

// ============================================================================
// RESILIENT REAL-TIME HUB (Vercel <-> Render <-> Multi-Tab)
// ============================================================================

const eventListeners = new Map()
let broadcastChannel = null
let sseConnection = null
let sseReconnectTimer = null
let sseReconnectDelay = 1500

// 1. Cross-Tab Channel for instant multi-tab sync without network latency
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('cf5_realtime_channel')
    broadcastChannel.onmessage = (event) => {
      if (event?.data?.type) {
        dispatchToClient(event.data.type, event.data.payload, false)
      }
    }
  }
} catch {}

// Central dispatcher to window and registered callbacks
function dispatchToClient(eventType, payload, mirrorCrossTab = true) {
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    try {
      window.dispatchEvent(new CustomEvent(eventType, { detail: payload }))
    } catch {}
  }

  const listeners = eventListeners.get(eventType)
  if (listeners && listeners.size > 0) {
    listeners.forEach((callback) => {
      try {
        callback(payload)
      } catch (err) {
        console.warn(`[Realtime] Listener error on ${eventType}:`, err)
      }
    })
  }

  if (mirrorCrossTab && broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: eventType, payload })
    } catch {}
  }
}

// 2. Native Server-Sent Events (SSE) stream (Primary zero-drop real-time transport)
export function initRealtimeStream() {
  if (typeof window === 'undefined') return
  if (sseConnection) return

  const sseUrl = `${(BACKEND_URL || '').replace(/\/+$/, '')}/api/realtime/events`

  try {
    sseConnection = new EventSource(sseUrl, { withCredentials: true })

    const knownEvents = [
      'connected',
      'team:updated',
      'team:created',
      'codefiesta_teams_updated',
      'hackathon:state-updated',
      'payment:verified',
      'payment:submitted',
      'payment:reverted',
      'table:assigned',
      'evaluations:updated',
      'gate:checkedin'
    ]

    knownEvents.forEach((eventName) => {
      sseConnection.addEventListener(eventName, (e) => {
        try {
          const data = JSON.parse(e.data || '{}')
          dispatchToClient(eventName, data)
        } catch {
          dispatchToClient(eventName, e.data)
        }
      })
    })

    sseConnection.onopen = () => {
      sseReconnectDelay = 1500
    }

    sseConnection.onerror = () => {
      try { sseConnection.close() } catch {}
      sseConnection = null

      clearTimeout(sseReconnectTimer)
      sseReconnectTimer = setTimeout(() => {
        sseReconnectDelay = Math.min(sseReconnectDelay * 1.5, 10000)
        initRealtimeStream()
      }, sseReconnectDelay)
    }
  } catch (err) {
    console.warn('[Realtime] SSE stream notice:', err.message)
  }
}

// Auto-initialize real-time stream when imported in browser
if (typeof window !== 'undefined') {
  initRealtimeStream()
}

// 3. Socket.io Client (Secondary transport when available on server)
let socket = null

export function getSocket() {
  if (!socket) {
    try {
      socket = io(BACKEND_URL || '/', {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 10000,
      })

      // Forward socket events to central dispatcher
      const forwardEvents = [
        'team:updated',
        'codefiesta_teams_updated',
        'hackathon:state-updated',
        'payment:verified',
        'payment:submitted',
        'table:assigned',
        'evaluations:updated',
        'gate:checkedin'
      ]

      forwardEvents.forEach((ev) => {
        socket.on(ev, (data) => dispatchToClient(ev, data))
      })

      socket.on('connect_error', () => {
        // Silent: SSE stream handles primary delivery seamlessly
      })
    } catch {
      // Fallback dummy emitter
      socket = {
        emit: () => {},
        on: (event, cb) => addListener(event, cb),
        off: (event, cb) => removeListener(event, cb),
      }
    }
  }
  return socket
}

function addListener(event, callback) {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set())
  }
  eventListeners.get(event).add(callback)
}

function removeListener(event, callback) {
  if (eventListeners.has(event)) {
    eventListeners.get(event).delete(callback)
  }
}

export function subscribeToRealtime(event, callback) {
  addListener(event, callback)
  const s = getSocket()
  if (s?.on) s.on(event, callback)
  return () => {
    removeListener(event, callback)
    if (s?.off) s.off(event, callback)
  }
}

export function broadcastClientEvent(eventType, payload) {
  dispatchToClient(eventType, payload, true)
}

export function joinTeamRoom(teamId) {
  const s = getSocket()
  if (s?.emit) s.emit('team:subscribe', teamId)
}

export function leaveTeamRoom(teamId) {
  const s = getSocket()
  if (s?.emit) s.emit('team:unsubscribe', teamId)
}