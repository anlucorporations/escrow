// Tipos compartidos de estadísticas de la plataforma (landing + API).

export interface PlatformStats {
  totalOperations: number
  completedOperations: number
  activeOperations: number
  tokens: number
  users: number
}
