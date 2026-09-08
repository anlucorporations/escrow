-- =============================================================================
-- TrueKeate — Migración: columna `username` (nombre de usuario público)
-- Ajuste del director (2026-09): el menú de usuario muestra @username en vez de
-- la dirección de la wallet. Idempotente.
-- =============================================================================
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS username TEXT;
-- Unicidad débil: evita handles duplicados donde ya existan
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='usuarios' AND indexname='usuarios_username_key') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS usuarios_username_key ON usuarios(username) WHERE username IS NOT NULL;
  END IF;
END $$;

-- Relleno: derive de la parte local del correo (handle legible) o wallet
UPDATE usuarios
   SET username = COALESCE(
     NULLIF(regexp_replace(split_part(correo, '@', 1), '[^a-zA-Z0-9_.-]', '.', 'g'), ''),
     'u_' || left(replace(lower(wallet), '0x', ''), 8)
   )
 WHERE username IS NULL OR username = '';
