-- P2-1 proposal. No production execution authorized.
-- Explicit transaction, like the existing security migrations.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $$
DECLARE t text; c record; r text;
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'P2-1 requires postgres; inspect connection role first';
  END IF;
  FOREACH t IN ARRAY ARRAY['usuarios','clientes','zonas','distribuidores',
    'productos','comentarios_productos','packs','pack_items','reglas_de_descuento',
    'pedidos','pedido_items','carritos_abandonados','registros_idempotencia',
    '_prisma_migrations'] LOOP
    IF to_regclass(format('public.%I',t)) IS NULL THEN
      RAISE EXCEPTION 'Missing expected table: %', t;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid=to_regclass(format('public.%I',t))
                   AND relowner='postgres'::regrole) THEN
      RAISE EXCEPTION 'Unexpected owner: %', t;
    END IF;
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated',t);
    -- Table ACLs do not remove independent column ACLs.
    FOR c IN SELECT attname FROM pg_attribute
             WHERE attrelid=to_regclass(format('public.%I',t))
               AND attnum>0 AND NOT attisdropped LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES (%I) ON TABLE public.%I FROM PUBLIC, anon, authenticated',c.attname,t);
    END LOOP;
    -- No FORCE: Prisma Migrate and the owner retain access.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  END LOOP;
  -- Application-owned sequences only; refuse unrelated public sequences.
  FOR c IN SELECT s.oid, s.relname FROM pg_class s JOIN pg_namespace n ON n.oid=s.relnamespace
           WHERE n.nspname='public' AND s.relkind='S' LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class p ON p.oid=d.refobjid
      WHERE d.objid=c.oid AND d.deptype IN ('a','i') AND p.relnamespace='public'::regnamespace
      AND p.relname IN ('usuarios','clientes','zonas','distribuidores','productos',
      'comentarios_productos','packs','pack_items','reglas_de_descuento','pedidos',
      'pedido_items','carritos_abandonados','registros_idempotencia','_prisma_migrations')) THEN
      RAISE EXCEPTION 'Unclassified public sequence: %', c.relname;
    END IF;
    EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE public.%I FROM PUBLIC, anon, authenticated',c.relname);
  END LOOP;
END $$;
-- Preserve all existing direct service_role grants; never touch managed schemas.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;
-- IMPORTANT: schema-level REVOKE cannot negate global defaults (notably PUBLIC EXECUTE).
-- Global defaults and supabase_admin defaults deliberately require separate review.
COMMIT;
