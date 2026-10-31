-- Metadata only. Do not select customer records or connection credentials.
SELECT current_user, current_database(), version();
SELECT c.relname,c.relkind,c.relowner::regrole,c.relrowsecurity,c.relforcerowsecurity,c.relacl
FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p','S') ORDER BY 1;
SELECT a.attrelid::regclass,a.attname,a.attacl FROM pg_attribute a
WHERE a.attrelid IN (SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace)
AND a.attacl IS NOT NULL;
SELECT defaclrole::regrole,defaclnamespace::regnamespace,defaclobjtype,defaclacl
FROM pg_default_acl WHERE defaclrole IN ('postgres'::regrole,'supabase_admin'::regrole);
SELECT rolname,rolsuper,rolbypassrls,rolinherit FROM pg_roles
WHERE rolname IN ('postgres','anon','authenticated','service_role');
SELECT member::regrole,roleid::regrole FROM pg_auth_members;
SELECT n.nspname,p.proname,p.prosecdef,p.proacl FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public';
-- Run separately on a complete Supabase restore (not a public-only laboratory):
-- SELECT id,public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id='productos-imagenes';
