// Servicio desacoplado para Cálculo de Descuentos Dinámicos
// Reglas Técnicas:
// 1. Todo cálculo se hace exclusivamente en el servidor.
// 2. Los porcentajes y tramos se obtienen de la tabla 'ReglaDeDescuento' (PostgreSQL vía Prisma), nunca hardcodeados.

import { prisma } from '@/lib/prisma';
import { TipoDescuento, EstadoPedido, EstadoZona } from '@prisma/client';

export interface CalculoDescuentoResultado {
  tipoAplicado: TipoDescuento | 'SIN_DESCUENTO';
  porcentaje: number;
  montoDescuento: number;
  subtotalPss: number;
  total: number;
  reglaId: string | null;
  etiqueta: string;
}

let reglasSincronizadas = false;

/**
 * Asegura que existan las reglas de descuento base en caso de que la tabla esté vacía
 * o actualiza las existentes a las nuevas condiciones oficiales:
 * - Primer Pedido: 20% OFF
 * - Reposición 0 a 40 días: 25% OFF
 * - Reposición 41 a 55 días: 15% OFF (15 días posteriores)
 * - > 55 días: Sin beneficio (0%)
 */
export async function inicializarReglasSiEstanVacias() {
  if (reglasSincronizadas) return;
  try {
    const conteo = await prisma.reglaDeDescuento.count({
      where: { activa: true },
    });
    if (conteo === 0) {
      await prisma.reglaDeDescuento.createMany({
        data: [
          {
            tipo: TipoDescuento.PRIMER_PEDIDO,
            porcentaje: 20,
            activa: true,
            orden: 1,
          },
          {
            tipo: TipoDescuento.REPOSICION,
            diasDesde: 0,
            diasHasta: 40,
            porcentaje: 25,
            activa: true,
            orden: 2,
          },
          {
            tipo: TipoDescuento.REPOSICION,
            diasDesde: 41,
            diasHasta: 55,
            porcentaje: 15,
            activa: true,
            orden: 3,
          },
        ],
      });
      console.log('Reglas de descuento iniciales creadas en base de datos.');
    } else {
      // Sincronizar condiciones oficiales:
      // 1. Primer Pedido -> 20%
      await prisma.reglaDeDescuento.updateMany({
        where: {
          tipo: TipoDescuento.PRIMER_PEDIDO,
          porcentaje: { not: 20 },
        },
        data: {
          porcentaje: 20,
        },
      });

      // 2. Reposición Tramo 1: 0 a 40 días -> 25% OFF
      const reglasRepo0 = await prisma.reglaDeDescuento.findFirst({
        where: {
          tipo: TipoDescuento.REPOSICION,
          diasDesde: 0,
        },
      });

      if (reglasRepo0) {
        await prisma.reglaDeDescuento.update({
          where: { id: reglasRepo0.id },
          data: {
            diasDesde: 0,
            diasHasta: 40,
            porcentaje: 25,
            activa: true,
          },
        });
      } else {
        await prisma.reglaDeDescuento.create({
          data: {
            tipo: TipoDescuento.REPOSICION,
            diasDesde: 0,
            diasHasta: 40,
            porcentaje: 25,
            activa: true,
            orden: 2,
          },
        });
      }

      // 3. Reposición Tramo 2: 41 a 55 días (15 días posteriores) -> 15% OFF
      const reglasRepoPosterior = await prisma.reglaDeDescuento.findFirst({
        where: {
          tipo: TipoDescuento.REPOSICION,
          diasDesde: { gt: 0 },
        },
      });

      if (reglasRepoPosterior) {
        await prisma.reglaDeDescuento.update({
          where: { id: reglasRepoPosterior.id },
          data: {
            diasDesde: 41,
            diasHasta: 55,
            porcentaje: 15,
            activa: true,
          },
        });
      } else {
        await prisma.reglaDeDescuento.create({
          data: {
            tipo: TipoDescuento.REPOSICION,
            diasDesde: 41,
            diasHasta: 55,
            porcentaje: 15,
            activa: true,
            orden: 3,
          },
        });
      }

      // Desactivar cualquier regla de reposición redundante con diasDesde > 55
      await prisma.reglaDeDescuento.updateMany({
        where: {
          tipo: TipoDescuento.REPOSICION,
          diasDesde: { gt: 41 },
        },
        data: {
          activa: false,
        },
      });
    }
    reglasSincronizadas = true;
  } catch (error) {
    console.error('Error al inicializar/sincronizar reglas de descuento:', error);
  }
}

/**
 * Calcula el descuento dinámico para un cliente basándose en sus pedidos históricos,
 * días transcurridos desde su última compra completada, zona geográfica y la tabla ReglaDeDescuento.
 *
 * @param clienteId ID del cliente (obtenido de forma segura desde la sesión en el servidor)
 * @param subtotalPss Subtotal PSS de los productos vigentes
 * @param clientePreCargado Opcional: objeto cliente previamente recuperado para evitar consultas redundantes
 */
export async function calcularDescuentoParaCliente(
  clienteId: string,
  subtotalPss: number,
  clientePreCargado?: any
): Promise<CalculoDescuentoResultado> {
  // Retorno seguro por defecto ante cualquier inconsistencia
  const resultadoVacio: CalculoDescuentoResultado = {
    tipoAplicado: 'SIN_DESCUENTO',
    porcentaje: 0,
    montoDescuento: 0,
    subtotalPss,
    total: subtotalPss,
    reglaId: null,
    etiqueta: 'Sin descuento',
  };

  if (subtotalPss <= 0 || !clienteId) {
    return resultadoVacio;
  }

  try {
    // Asegurar que las reglas existan en la BD si es la primera ejecución
    if (!reglasSincronizadas) {
      await inicializarReglasSiEstanVacias();
    }

    // 1. Obtener cliente con su zona (o reutilizar si ya fue provisto)
    const cliente = clientePreCargado || (await prisma.cliente.findUnique({
      where: { id: clienteId },
      include: { zona: true },
    }));

    if (!cliente) {
      console.warn(`Cliente con ID ${clienteId} no encontrado al calcular descuentos.`);
      return resultadoVacio;
    }

    // 2. Contar pedidos confirmados previos (excluyendo CARRITO y CANCELADO)
    const pedidosEfectivosCount = await prisma.pedido.count({
      where: {
        clienteId: cliente.id,
        estado: {
          notIn: [EstadoPedido.CARRITO, EstadoPedido.CANCELADO],
        },
      },
    });

    let reglaSeleccionada = null;

    // Regla 1: Si no tiene ningún pedido efectivo previo -> Aplica PRIMER_PEDIDO (20%), sin chequear zona ni estado de aprobación
    if (pedidosEfectivosCount === 0) {
      reglaSeleccionada = await prisma.reglaDeDescuento.findFirst({
        where: {
          tipo: TipoDescuento.PRIMER_PEDIDO,
          activa: true,
        },
      });

      if (!reglaSeleccionada) {
        console.warn('No se encontró regla activa de PRIMER_PEDIDO.');
        return resultadoVacio;
      }
    } else {
      // Regla 2: Si no es primer pedido, chequear zona sin distribuidor
      const esZonaDirecta = !cliente.zona || cliente.zona.estado === EstadoZona.SIN_DISTRIBUIDOR;
      if (!esZonaDirecta) {
        // Tiene zona con distribuidor -> SIN_DESCUENTO inmediatamente
        return resultadoVacio;
      }

      // Regla 3: Si es elegible por zona, buscar el pedido más reciente COMPLETADO
      const ultimoPedidoCompletado = await prisma.pedido.findFirst({
        where: {
          clienteId: cliente.id,
          estado: EstadoPedido.COMPLETADO,
        },
        orderBy: [
          { fechaCompletado: 'desc' },
          { fecha: 'desc' },
        ],
      });

      if (!ultimoPedidoCompletado) {
        // Si no tiene ningún pedido completado histórico -> SIN_DESCUENTO
        return resultadoVacio;
      }

      // Calcular días transcurridos desde fechaCompletado (o fecha del pedido como fallback) hasta hoy
      const fechaReferencia =
        ultimoPedidoCompletado.fechaCompletado ||
        ultimoPedidoCompletado.fecha ||
        ultimoPedidoCompletado.createdAt;
      const diffMs = Date.now() - new Date(fechaReferencia).getTime();
      const diasTranscurridos = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      // Buscar en ReglaDeDescuento (tipo REPOSICION, activas) el tramo correspondiente
      const reglasReposicion = await prisma.reglaDeDescuento.findMany({
        where: {
          tipo: TipoDescuento.REPOSICION,
          activa: true,
        },
        orderBy: {
          diasDesde: 'asc',
        },
      });

      for (const regla of reglasReposicion) {
        const desde = regla.diasDesde ?? 0;
        const hasta = regla.diasHasta;

        if (diasTranscurridos >= desde) {
          if (hasta === null || hasta === undefined || diasTranscurridos <= hasta) {
            reglaSeleccionada = regla;
            break;
          }
        }
      }

      if (!reglaSeleccionada) {
        // Pasaron más días del tramo máximo (ej: >90 días) -> SIN_DESCUENTO
        return resultadoVacio;
      }
    }

    // 4. Calcular importes
    const porcentaje = Number(reglaSeleccionada.porcentaje);
    const montoDescuento = Math.round((subtotalPss * porcentaje) / 100);
    const total = Math.max(0, subtotalPss - montoDescuento);

    const etiqueta =
      reglaSeleccionada.tipo === TipoDescuento.PRIMER_PEDIDO
        ? `Descuento primer pedido (${porcentaje}% OFF)`
        : `Descuento por reposición (${porcentaje}% OFF)`;

    return {
      tipoAplicado: reglaSeleccionada.tipo,
      porcentaje,
      montoDescuento,
      subtotalPss,
      total,
      reglaId: reglaSeleccionada.id,
      etiqueta,
    };
  } catch (error) {
    console.error('Error crítico al calcular descuentos para el cliente:', error);
    return resultadoVacio;
  }
}

