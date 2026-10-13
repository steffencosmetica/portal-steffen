-- CreateTable
CREATE TABLE "registros_idempotencia" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "clienteId" TEXT,
    "guestSessionId" TEXT,
    "pedidoId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "resultadoJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registros_idempotencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registros_idempotencia_clave_key" ON "registros_idempotencia"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "registros_idempotencia_pedidoId_key" ON "registros_idempotencia"("pedidoId");

-- CreateIndex
CREATE INDEX "registros_idempotencia_clienteId_idx" ON "registros_idempotencia"("clienteId");

-- CreateIndex
CREATE INDEX "registros_idempotencia_guestSessionId_idx" ON "registros_idempotencia"("guestSessionId");

-- AddForeignKey
ALTER TABLE "registros_idempotencia" ADD CONSTRAINT "registros_idempotencia_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
