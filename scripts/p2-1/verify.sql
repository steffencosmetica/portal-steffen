-- Raises on effective privileges, including inherited privileges / column ACLs.
DO $$
DECLARE c record; r text; p text;
BEGIN
  FOR c IN SELECT oid,relname,relkind,relrowsecurity FROM pg_class
    WHERE relnamespace='public'::regnamespace AND relkind IN ('r','p','S') LOOP
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF c.relkind='S' THEN
        IF has_sequence_privilege(r,c.oid,'USAGE,SELECT,UPDATE') THEN
          RAISE EXCEPTION 'Unexpected sequence access: % %',r,c.relname;
        END IF;
      ELSE
        IF NOT c.relrowsecurity THEN RAISE EXCEPTION 'RLS missing: %',c.relname; END IF;
        IF has_table_privilege(r,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
           OR has_any_column_privilege(r,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') THEN
          RAISE EXCEPTION 'Unexpected table access: % %',r,c.relname;
        END IF;
      END IF;
    END LOOP;
    IF c.relkind<>'S' AND NOT has_table_privilege('postgres',c.oid,'SELECT,INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION 'Owner access lost';
    END IF;
  END LOOP;
END $$;
SELECT 'P2-1 effective ACL/RLS assertions passed' AS result;
