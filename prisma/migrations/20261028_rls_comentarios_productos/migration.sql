-- Transaccion explicita: RLS y revocacion se aplican juntas o no se aplica ninguna.
BEGIN;

-- EnableRowLevelSecurity
-- Sin politicas: la tabla solo es accesible desde el servidor via Prisma (rol propietario).
ALTER TABLE "comentarios_productos" ENABLE ROW LEVEL SECURITY;

-- RevokePrivileges
-- Supabase otorga por defecto todos los privilegios a anon y authenticated sobre tablas nuevas.
REVOKE ALL ON TABLE "comentarios_productos" FROM PUBLIC;
DO $$
DECLARE
    rol TEXT;
BEGIN
    FOREACH rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = rol) THEN
            EXECUTE format('REVOKE ALL ON TABLE "comentarios_productos" FROM %I', rol);
        END IF;
    END LOOP;
END $$;

COMMIT;
