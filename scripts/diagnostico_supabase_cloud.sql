-- ============================================================================
-- PORTAL PROFESIONAL STEFFEN — SCRIPT DIAGNÓSTICO DE METADATOS EN SUPABASE CLOUD
-- Entorno: Supabase Cloud SQL Editor
-- Tipo: ESTRICTAMENTE DE SOLO LECTURA (Cero DDL/DML, Cero Datos Personales)
-- ============================================================================

SELECT jsonb_pretty(jsonb_build_object(
  '1_metadata_entorno', jsonb_build_object(
    'fecha_inspeccion', NOW(),
    'version_postgresql', version(),
    'base_de_datos', current_database(),
    'usuario_actual', current_user
  ),

  -- Verificación condicional segura: nunca ejecuta un SELECT directo si la tabla no existe
  '2_prisma_migrations_status', jsonb_build_object(
    'existe_tabla', (to_regclass('public._prisma_migrations') IS NOT NULL),
    'migraciones_registradas', (
      CASE 
        WHEN to_regclass('public._prisma_migrations') IS NOT NULL THEN
          query_to_xml(
            'SELECT id, migration_name, started_at, finished_at, rolled_back_at, applied_steps_count FROM public._prisma_migrations ORDER BY started_at ASC',
            true, false, ''
          )::text
        ELSE
          'TABLA_NO_EXISTE'
      END
    )
  ),

  '3_tablas_public', (
    SELECT jsonb_agg(table_name ORDER BY table_name)
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ),

  '4_enums_public', (
    SELECT jsonb_agg(jsonb_build_object(
      'enum_name', t.typname,
      'enum_values', (
        SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
        FROM pg_enum e
        WHERE e.enumtypid = t.oid
      )
    ) ORDER BY t.typname)
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
  ),

  '5_columnas_public', (
    SELECT jsonb_agg(jsonb_build_object(
      'tabla', table_name,
      'columna', column_name,
      'posicion', ordinal_position,
      'tipo_dato', data_type,
      'udt_name', udt_name,
      'longitud_maxima', character_maximum_length,
      'precision_numerica', numeric_precision,
      'escala_numerica', numeric_scale,
      'es_nullable', is_nullable,
      'valor_default', column_default
    ) ORDER BY table_name, ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'public'
  ),

  '6_claves_primarias', (
    SELECT jsonb_agg(jsonb_build_object(
      'tabla', tc.table_name,
      'constraint_name', tc.constraint_name,
      'columna', kcu.column_name,
      'posicion', kcu.ordinal_position
    ) ORDER BY tc.table_name, kcu.ordinal_position)
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
  ),

  '7_indices_y_uniques', (
    SELECT jsonb_agg(jsonb_build_object(
      'tabla', t.relname,
      'indice', i.relname,
      'es_unique', ix.indisunique,
      'es_primary', ix.indisprimary,
      'definicion_sql', pg_get_indexdef(ix.indexrelid)
    ) ORDER BY t.relname, i.relname)
    FROM pg_index ix
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
  ),

  '8_claves_foraneas_y_delete_rules', (
    SELECT jsonb_agg(jsonb_build_object(
      'tabla_origen', tc.table_name,
      'columna_origen', kcu.column_name,
      'tabla_destino', ccu.table_name,
      'columna_destino', ccu.column_name,
      'constraint_name', tc.constraint_name,
      'delete_rule_sql', rc.delete_rule,
      'update_rule_sql', rc.update_rule,
      'pg_confdeltype', c.confdeltype -- 'r'=RESTRICT, 'c'=CASCADE, 'n'=SET NULL, 'a'=NO ACTION
    ) ORDER BY tc.table_name, kcu.column_name)
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN pg_constraint c
      ON c.conname = tc.constraint_name
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
  ),

  '9_seguridad_rls_triggers_funciones', jsonb_build_object(
    'politicas_rls', (
      SELECT jsonb_agg(jsonb_build_object(
        'tabla', tablename,
        'politica', policyname,
        'roles', roles,
        'comando', cmd,
        'permissive', permissive
      ) ORDER BY tablename, policyname)
      FROM pg_policies
      WHERE schemaname = 'public'
    ),
    'triggers', (
      SELECT jsonb_agg(jsonb_build_object(
        'tabla', event_object_table,
        'trigger_name', trigger_name,
        'evento', event_manipulation,
        'timing', action_timing,
        'action_orientation', action_orientation
      ) ORDER BY event_object_table, trigger_name)
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
    ),
    'funciones_public', (
      SELECT jsonb_agg(jsonb_build_object(
        'funcion', routine_name,
        'tipo_retorno', data_type
      ) ORDER BY routine_name)
      FROM information_schema.routines
      WHERE routine_schema = 'public'
    )
  ),

  '10_tabla_idempotencia_especifica', jsonb_build_object(
    'existe_tabla', (to_regclass('public.registros_idempotencia') IS NOT NULL),
    'columnas', (
      SELECT jsonb_agg(jsonb_build_object(
        'columna', column_name,
        'posicion', ordinal_position,
        'tipo_dato', data_type,
        'udt_name', udt_name,
        'es_nullable', is_nullable,
        'valor_default', column_default
      ) ORDER BY ordinal_position)
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'registros_idempotencia'
    ),
    'indices', (
      SELECT jsonb_agg(jsonb_build_object(
        'indice', i.relname,
        'es_unique', ix.indisunique,
        'definicion_sql', pg_get_indexdef(ix.indexrelid)
      ) ORDER BY i.relname)
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = 'registros_idempotencia'
    ),
    'fk_pedidoId_confdeltype', (
      SELECT c.confdeltype
      FROM pg_constraint c
      WHERE c.conname = 'registros_idempotencia_pedidoId_fkey'
    ),
    'fk_pedidoId_delete_rule', (
      SELECT rc.delete_rule
      FROM information_schema.referential_constraints rc
      WHERE rc.constraint_name = 'registros_idempotencia_pedidoId_fkey'
    )
  ),

  '11_extensiones_instaladas', (
    SELECT jsonb_agg(jsonb_build_object(
      'extension', extname,
      'version', extversion
    ) ORDER BY extname)
    FROM pg_extension
  )
)) AS diagnostico_supabase_cloud;
