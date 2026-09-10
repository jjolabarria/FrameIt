export type PageResult<T> = { items: T[]; totalCount: number; page: number; pageSize: number; totalPages: number }
export type WorkspaceClient = { id: string; name: string; industry: string; projectCount: number; sessionCount: number }
export type WorkspaceProject = { id: string; clientId: string; clientName: string; name: string; code: string; sessionCount: number }
export type WorkspaceSession = { id: string; title: string; accessCode: string; clientId: string; clientName: string; projectId: string; projectName: string; projectCode: string; templateTitle: string; status: string; phase: string; updatedAtUtc: string; ratingCount: number }
export type WorkspaceOverview = { clients: number; projects: number; templates: number; liveSessions: number; recent: WorkspaceSession[]; active: WorkspaceSession[] }
export const projectPath = (clientId: string, projectId: string) => `/clientes/${clientId}/proyectos/${projectId}`
export function safeReturnPath(value: string | null) {
  return value && (value === '/' || /^\/(espacio|sesiones|clientes)(\/|\?|$)/.test(value)) && !value.includes('\\') ? value : '/sesiones'
}
