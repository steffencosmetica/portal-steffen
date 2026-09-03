-- =============================================================================
-- PORTAL PROFESIONAL STEFFEN - SCHEMA SQL COMPLETO PARA SUPABASE / POSTGRESQL
-- =============================================================================
-- Podés copiar todo este contenido y pegarlo directamente en el SQL Editor de Supabase.

-- 1. Habilitar extensión para UUIDs (si no estuviera habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE "Rol" AS ENUM ('CLIENTE_PROFESIONAL', 'ADMIN');
CREATE TYPE "EstadoCliente" AS ENUM ('PENDIENTE_APROBACION', 'ACTIVO', 'INACTIVO', 'BLOQUEADO');
CREATE TYPE "EstadoZona" AS ENUM ('SIN_DISTRIBUIDOR', 'COBERTURA_PARCIAL', 'CON_DISTRIBUIDOR');
CREATE TYPE "TipoDescuento" AS ENUM ('PRIMER_PEDIDO', 'REPOSICION');
CREATE TYPE "EstadoPedido" AS ENUM ('CARRITO', 'PEDIDO_RECIBIDO', 'CONTACTADO', 'PAGO_PENDIENTE', 'PAGADO', 'PREPARANDO', 'DESPACHADO', 'COMPLETADO', 'CANCELADO');

-- 3. TABLA: usuarios (vínculo con Supabase Auth auth.users)
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'CLIENTE_PROFESIONAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- 4. TABLA: distribuidores
CREATE TABLE "distribuidores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "empresa" TEXT,
    "provincia" TEXT NOT NULL,
    "localidades" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribuidores_pkey" PRIMARY KEY ("id")
);

-- 5. TABLA: zonas
CREATE TABLE "zonas" (
    "id" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "localidad" TEXT NOT NULL,
    "estado" "EstadoZona" NOT NULL DEFAULT 'SIN_DISTRIBUIDOR',
    "distribuidorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zonas_pkey" PRIMARY KEY ("id")
);

-- 6. TABLA: clientes
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "salon" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "localidad" TEXT NOT NULL,
    "pais" TEXT NOT NULL DEFAULT 'Argentina',
    "instagram" TEXT,
    "cuit" TEXT,
    "tipoDeNegocio" TEXT NOT NULL,
    "yaComproSteffen" BOOLEAN NOT NULL DEFAULT false,
    "comoConocioSteffen" TEXT,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoAcceso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zonaId" TEXT,
    "estadoCliente" "EstadoCliente" NOT NULL DEFAULT 'PENDIENTE_APROBACION',
    "beneficioActual" TEXT DEFAULT '15% OFF primer pedido',
    "fechaVencimientoBeneficio" TIMESTAMP(3),
    "cantidadPedidos" INTEGER NOT NULL DEFAULT 0,
    "montoAcumulado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "nivelCliente" TEXT DEFAULT 'INICIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- 7. TABLA: productos
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "subcategoria" TEXT,
    "descripcion" TEXT NOT NULL,
    "imagen" TEXT NOT NULL,
    "presentacion" TEXT NOT NULL,
    "precioPss" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "variantes" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ordenVisualizacion" INTEGER NOT NULL DEFAULT 0,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "recomendado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- 8. TABLA: packs
CREATE TABLE "packs" (
    "id" TEXT NOT NULL,
    "codigo" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "imagen" TEXT NOT NULL,
    "etiqueta" TEXT,
    "precioOriginal" DECIMAL(10,2),
    "precioDistribuidor" DECIMAL(10,2),
    "precioDirecto" DECIMAL(10,2),
    "precioPromocional" DECIMAL(10,2) NOT NULL,
    "precioPssEquivalente" DECIMAL(10,2),
    "descuento" DECIMAL(5,2),
    "descuentoDistribuidor" DECIMAL(5,2),
    "descuentoDirecto" DECIMAL(5,2),
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "ordenVisualizacion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packs_pkey" PRIMARY KEY ("id")
);

-- 9. TABLA: pack_items
CREATE TABLE "pack_items" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "pack_items_pkey" PRIMARY KEY ("id")
);

-- 10. TABLA: reglas_de_descuento
CREATE TABLE "reglas_de_descuento" (
    "id" TEXT NOT NULL,
    "tipo" "TipoDescuento" NOT NULL,
    "montoDesde" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "montoHasta" DECIMAL(10,2),
    "porcentaje" DECIMAL(5,2) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reglas_de_descuento_pkey" PRIMARY KEY ("id")
);

-- 11. TABLA: pedidos
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "numeroPedido" SERIAL NOT NULL,
    "clienteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'CARRITO',
    "subtotalPss" DECIMAL(12,2) NOT NULL,
    "descuentoAplicado" DECIMAL(12,2) NOT NULL,
    "porcentajeDescuento" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "mensajeWhatsappGenerado" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- 12. TABLA: pedido_items
CREATE TABLE "pedido_items" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT,
    "packId" TEXT,
    "variante" TEXT,
    "cantidad" INTEGER NOT NULL,
    "precioUnitarioPss" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "pedido_items_pkey" PRIMARY KEY ("id")
);

-- 13. TABLA: carritos_abandonados
CREATE TABLE "carritos_abandonados" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "montoEstimado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fechaUltimaActividad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recuperado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carritos_abandonados_pkey" PRIMARY KEY ("id")
);

-- -----------------------------------------------------------------------------
-- ÍNDICES Y RESTRICCIONES ÚNICAS
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX "usuarios_authUserId_key" ON "usuarios"("authUserId");
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

CREATE UNIQUE INDEX "clientes_usuarioId_key" ON "clientes"("usuarioId");
CREATE INDEX "clientes_provincia_localidad_idx" ON "clientes"("provincia", "localidad");
CREATE INDEX "clientes_estadoCliente_idx" ON "clientes"("estadoCliente");

CREATE UNIQUE INDEX "zonas_provincia_localidad_key" ON "zonas"("provincia", "localidad");

CREATE INDEX "productos_categoria_idx" ON "productos"("categoria");
CREATE INDEX "productos_activo_idx" ON "productos"("activo");

CREATE UNIQUE INDEX "pack_items_packId_productoId_key" ON "pack_items"("packId", "productoId");

CREATE INDEX "reglas_de_descuento_tipo_activa_idx" ON "reglas_de_descuento"("tipo", "activa");

CREATE UNIQUE INDEX "pedidos_numeroPedido_key" ON "pedidos"("numeroPedido");
CREATE INDEX "pedidos_clienteId_idx" ON "pedidos"("clienteId");
CREATE INDEX "pedidos_estado_idx" ON "pedidos"("estado");

CREATE INDEX "carritos_abandonados_clienteId_idx" ON "carritos_abandonados"("clienteId");
CREATE INDEX "carritos_abandonados_recuperado_idx" ON "carritos_abandonados"("recuperado");

-- -----------------------------------------------------------------------------
-- CLAVES FORÁNEAS (RELACIONES)
-- -----------------------------------------------------------------------------

ALTER TABLE "clientes" 
    ADD CONSTRAINT "clientes_usuarioId_fkey" 
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clientes" 
    ADD CONSTRAINT "clientes_zonaId_fkey" 
    FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "zonas" 
    ADD CONSTRAINT "zonas_distribuidorId_fkey" 
    FOREIGN KEY ("distribuidorId") REFERENCES "distribuidores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pack_items" 
    ADD CONSTRAINT "pack_items_packId_fkey" 
    FOREIGN KEY ("packId") REFERENCES "packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pack_items" 
    ADD CONSTRAINT "pack_items_productoId_fkey" 
    FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pedidos" 
    ADD CONSTRAINT "pedidos_clienteId_fkey" 
    FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pedido_items" 
    ADD CONSTRAINT "pedido_items_pedidoId_fkey" 
    FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pedido_items" 
    ADD CONSTRAINT "pedido_items_productoId_fkey" 
    FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pedido_items" 
    ADD CONSTRAINT "pedido_items_packId_fkey" 
    FOREIGN KEY ("packId") REFERENCES "packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "carritos_abandonados" 
    ADD CONSTRAINT "carritos_abandonados_clienteId_fkey" 
    FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- DATOS INICIALES (REGLAS DE DESCUENTO POR DEFECTO Y ZONAS DE EJEMPLO)
-- -----------------------------------------------------------------------------

INSERT INTO "reglas_de_descuento" ("id", "tipo", "montoDesde", "montoHasta", "porcentaje", "activa", "orden", "updatedAt")
VALUES 
    (gen_random_uuid()::text, 'PRIMER_PEDIDO', 0, NULL, 15.00, true, 1, NOW()),
    (gen_random_uuid()::text, 'REPOSICION', 70000.00, 99999.99, 10.00, true, 2, NOW()),
    (gen_random_uuid()::text, 'REPOSICION', 100000.00, 199999.99, 12.00, true, 3, NOW()),
    (gen_random_uuid()::text, 'REPOSICION', 200000.00, NULL, 15.00, true, 4, NOW())
ON CONFLICT DO NOTHING;
