/**
 * Fixed port the local server always tries to bind to. Both the student
 * client's Socket.IO connection and the QR/join URL rely on this being
 * stable, since in dev the student page itself is served from the Vite
 * dev server (a different port) while the real-time server always lives
 * here.
 */
export const LOCAL_SERVER_PORT = 5390
