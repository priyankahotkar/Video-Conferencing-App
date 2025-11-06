import { io } from 'socket.io-client';

// Prefer explicit VITE_SOCKET_URL; fallback to http://localhost:8080
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080';

export function createSocket() {
  const socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ['websocket'],
  });
  return socket;
}


