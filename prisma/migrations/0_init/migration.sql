-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('CLIENTE_PROFESIONAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "EstadoCliente" AS ENUM ('PENDIENTE_APROBACION', 'ACTIVO', 'INACTIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "EstadoZona" AS ENUM ('SIN_DISTRIBUIDOR', 'COBERTURA_PARCIAL', 'CON_DISTRIBUIDOR');

-- CreateEnum
CREATE TYPE "TipoDescuento" AS ENUM ('PRIMER_PEDIDO', 'REPOSICION');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('CARRITO', 'PEDIDO_RECIBIDO', 'CONTACTADO', 'PAGO_PENDIENTE', 'PAGADO', 'PREPARANDO', 'DESPACHADO', 'COMPLETADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'CLIENTE_PROFESIONAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "alertaAprobacionVista" BOOLEAN NOT NULL DEFAULT false,
    "beneficioActual" TEXT DEFAULT '20% OFF primer pedido',
    "fechaVencimientoBeneficio" TIMESTAMP(3),
    "cantidadPedidos" INTEGER NOT NULL DEFAULT 0,
    "montoAcumulado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "nivelCliente" TEXT DEFAULT 'INICIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zonas" (
    "id" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "localidad" TEXT NOT NULL,
    "estado" "EstadoZona" NOT NULL DEFAULT 'SIN_DISTRIBUIDOR',
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "distribuidorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zonas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "subcategoria" TEXT,
    "descripcion" TEXT NOT NULL,
    "imagen" TEXT NOT NULL,
    "presentacion" TEXT NOT NULL,
    "modoUso" TEXT,
    "rendimientoSalon" TEXT,
    "precioPss" DECIMAL(10,2) NOT NULL,
    "precioEcommerce" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "precioReventa" DECIMAL(10,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "variantes" TEXT,
    "etiqueta" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ordenVisualizacion" INTEGER NOT NULL DEFAULT 0,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "recomendado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios_productos" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "clienteId" TEXT,
    "nombreSalon" TEXT NOT NULL,
    "nombreAutor" TEXT NOT NULL,
    "localidad" TEXT,
    "calificacion" INTEGER NOT NULL DEFAULT 5,
    "comentario" TEXT NOT NULL,
    "verificado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comentarios_productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "pack_items" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "pack_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reglas_de_descuento" (
    "id" TEXT NOT NULL,
    "tipo" "TipoDescuento" NOT NULL,
    "montoDesde" DECIMAL(10,2),
    "montoHasta" DECIMAL(10,2),
    "diasDesde" INTEGER,
    "diasHasta" INTEGER,
    "porcentaje" DECIMAL(5,2) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reglas_de_descuento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "numeroPedido" SERIAL NOT NULL,
    "clienteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCompletado" TIMESTAMP(3),
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

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_authUserId_key" ON "usuarios"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_usuarioId_key" ON "clientes"("usuarioId");

-- CreateIndex
CREATE INDEX "clientes_provincia_localidad_idx" ON "clientes"("provincia", "localidad");

-- CreateIndex
CREATE INDEX "clientes_estadoCliente_idx" ON "clientes"("estadoCliente");

-- CreateIndex
CREATE UNIQUE INDEX "zonas_provincia_localidad_key" ON "zonas"("provincia", "localidad");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigo_key" ON "productos"("codigo");

-- CreateIndex
CREATE INDEX "productos_categoria_idx" ON "productos"("categoria");

-- CreateIndex
CREATE INDEX "productos_activo_idx" ON "productos"("activo");

-- CreateIndex
CREATE INDEX "comentarios_productos_productoId_idx" ON "comentarios_productos"("productoId");

-- CreateIndex
CREATE INDEX "comentarios_productos_createdAt_idx" ON "comentarios_productos"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "packs_codigo_key" ON "packs"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "pack_items_packId_productoId_key" ON "pack_items"("packId", "productoId");

-- CreateIndex
CREATE INDEX "reglas_de_descuento_tipo_activa_idx" ON "reglas_de_descuento"("tipo", "activa");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_numeroPedido_key" ON "pedidos"("numeroPedido");

-- CreateIndex
CREATE INDEX "pedidos_clienteId_idx" ON "pedidos"("clienteId");

-- CreateIndex
CREATE INDEX "pedidos_estado_idx" ON "pedidos"("estado");

-- CreateIndex
CREATE INDEX "carritos_abandonados_clienteId_idx" ON "carritos_abandonados"("clienteId");

-- CreateIndex
CREATE INDEX "carritos_abandonados_recuperado_idx" ON "carritos_abandonados"("recuperado");

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zonas" ADD CONSTRAINT "zonas_distribuidorId_fkey" FOREIGN KEY ("distribuidorId") REFERENCES "distribuidores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_productos" ADD CONSTRAINT "comentarios_productos_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_productos" ADD CONSTRAINT "comentarios_productos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_items" ADD CONSTRAINT "pack_items_packId_fkey" FOREIGN KEY ("packId") REFERENCES "packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_items" ADD CONSTRAINT "pack_items_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_packId_fkey" FOREIGN KEY ("packId") REFERENCES "packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carritos_abandonados" ADD CONSTRAINT "carritos_abandonados_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

