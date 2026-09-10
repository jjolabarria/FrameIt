export function readSession<T>(key: string, fallback: T): T {
  try { const value = sessionStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback }
}
export function writeSession(key: string, value: unknown) {
  try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* Private browsing can disable storage; keep the current in-memory draft. */ }
}
export function clearParticipantStorage(sessionId: string, participantId: string) {
  try { Object.keys(sessionStorage).filter(k => k.startsWith(`frameit.answer:${sessionId}:${participantId}:`)).forEach(k => sessionStorage.removeItem(k)) } catch { /* Storage is optional. */ }
}
