# P2-1: cierre de seguridad SQL

Migración: `20261030120000_p2_1_sql_privileges`.
SHA-256 de los bytes aplicados: `cf0e5a30df8d0994f066731363a6f144454b5683f8db0a3265d4648c3055785a`. No editar esta migración.

## Resultado

El operador confirmó la aplicación en Supabase Cloud: cuatro migraciones exitosas, RLS en las 14 tablas, permisos por rol verificados y datos comerciales sin cambios. Confirmó catálogo, login, carrito y panel administrativo funcionando. El cierre local cotejó las cuatro migraciones y sus checksums con el snapshot posterior conservado fuera de Git; no realizó conexiones a Cloud.

La migración revoca permisos de PUBLIC, anon y authenticated sobre tablas, columnas y secuencias de aplicación, incluida _prisma_migrations. Activa RLS sin FORCE; postgres propietario conserva acceso para Prisma Migrate. Conserva grants directos de service_role y no modifica auth, storage ni defaults de supabase_admin.

Los defaults de postgres se restringen en public. Un REVOKE por esquema no elimina el EXECUTE global de PUBLIC en funciones futuras: cada función nueva requiere revisar y declarar sus permisos explícitamente.

## Archivos reutilizables

- diagnose.sql: consultas de metadatos y permisos, sin filas comerciales.
- verify.sql: assertions de permisos efectivos y RLS; requiere PostgreSQL 17 por MAINTAIN. No reemplaza las pruebas funcionales ni la comparación de service_role con un snapshot previo.

Estas consultas no se ejecutan automáticamente. La migración y cualquier operación productiva requieren autorización independiente.

## Operación e historial

Backups, snapshots, logs, resultados, rollback específico y paquete protegido congelado permanecen fuera del commit. El paquete operativo está vinculado al HEAD, checksums y estado previos al despliegue: no reutilizarlo después de este commit sin nueva preparación y revisión. No regenerarlo ni ejecutarlo automáticamente.

El rollback de permisos debe usar exclusivamente el snapshot previo correspondiente. No borrar registros, editar migraciones aplicadas ni eliminar entradas de _prisma_migrations. Si se decide revertir permisos, preparar una migración compensatoria revisada que mantenga coherente el historial; no marcar como rolled-back una migración exitosa.

Data API es una decisión separada. Este cierre no modifica ni acredita su configuración actual. No se cambia Vercel, Auth, Storage ni reglas comerciales.
