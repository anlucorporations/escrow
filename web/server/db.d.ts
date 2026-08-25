// Declaración de tipos para la capa de datos (server/db.js)

export type DbRow = Record<string, unknown>

export declare function isPostgres(): boolean

export declare function sqliteFile(): string

export declare function query(sql: string, params?: unknown[]): Promise<DbRow[] | DbRow | { changes: number }>

export declare function first(sql: string, params?: unknown[]): Promise<DbRow | null>

export declare function initSchema(): Promise<void>
