import { io } from 'socket.io-client'
import { BACKEND_URL } from './config.js'

// One shared socket per browser tab. Credentials are sent so the server's
// shared session middleware can authenticate the connection and route events
// to the right personal room.
let socket = null

export function getSocket() {
  if (!socket) {
    socket = io(BACKEND_URL || '/', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })
  }
  return socket
}

export function joinTeamRoom(teamId) {
  const s = getSocket()
  s.emit('team:subscribe', teamId)
}

export function leaveTeamRoom(teamId) {
  const s = getSocket()
  s.emit('team:unsubscribe', teamId)
}