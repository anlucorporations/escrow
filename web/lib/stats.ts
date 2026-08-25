// Tipos compartidos de estadísticas de la plataforma (landing + API).

export interface PlatformStats {
  totalOperations: number
  completedOperations: number
  activeOperations: number
  tokens: number
  users: number
  /** Capa de datos (M1+): opcionales si la BD no está disponible */
  items?: number
  usersByLevel?: Record<string, number>
  ratings?: number
  avgRating?: number
}
