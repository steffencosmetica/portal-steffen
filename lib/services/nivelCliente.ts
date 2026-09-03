import { prisma } from '@/lib/prisma';
import { TipoDescuento, EstadoPedido, EstadoZona } from '@prisma/client';

export interface ClienteConZonaMinimo {
  id: string;
  zona?: {
    id?: string;
    estado?: EstadoZona | string;
    localidad?: string;
    provincia?: string;
  } | null;
}

export interface EstadoNivelCliente {
  esElegible: boolean; // Zona sin distribuidor + no es primer pedido
  motivoNoElegible?: 'PRIMER_PEDIDO' | 'CON_DISTRIBUIDOR' | 'SIN_CLIENTE';
  fechaUltimaCompraCompletada: Date | null;
  diasTranscurridos: number | null;
  porcentajeActual: number | null; // 15, 12, o null
  diasRestantesParaCorte: number | null; // Días restantes hasta el próximo límite
  mensajePrincipal: string;
  mensajeSecundario: string;
}

/**
 * Obtiene el estado del nivel y beneficios de reposición para un cliente en base a sus compras completadas.
 * 
 * Reglas:
 * - Elegible si la zona es SIN_DISTRIBUIDOR (o venta directa) Y ya tiene al menos 1 pedido efectivo previo.
 * - Si no tiene compras completadas: estado elegible pero sin historial completado.
 * - Si tiene compras completadas: calcula días transcurridos y evalúa el tramo activo de REPOSICION.
 */
export async function obtenerEstadoNivelCliente(
  cliente: ClienteConZonaMinimo | null | undefined
): Promise<EstadoNivelCliente> {
  if (!cliente || !cliente.id) {
    return {
      esElegible: false,
      motivoNoElegible: 'SIN_CLIENTE',
      fechaUltimaCompraCompletada: null,
      diasTranscurridos: null,
      porcentajeActual: null,
      diasRestantesParaCorte: null,
      mensajePrincipal: '',
      mensajeSecundario: '',
    };
  }

  // 1. Obtener cliente completo con su zona si no fue provista
  let zonaCliente = cliente.zona;
  if (zonaCliente === undefined) {
    const clienteDb = await prisma.cliente.findUnique({
      where: { id: cliente.id },
      include: { zona: true },
    });
    zonaCliente = clienteDb?.zona || null;
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

  // Si no tiene pedidos previos, está en etapa de PRIMER_PEDIDO
  if (pedidosEfectivosCount === 0) {
    let porcentajePrimerPedido = 20;
    try {
      const regla = await prisma.reglaDeDescuento.findFirst({
        where: { tipo: TipoDescuento.PRIMER_PEDIDO, activa: true },
      });
      if (regla) {
        porcentajePrimerPedido = Number(regla.porcentaje);
      }
    } catch {
      // fallback a 20
    }

    return {
      esElegible: false,
      motivoNoElegible: 'PRIMER_PEDIDO',
      fechaUltimaCompraCompletada: null,
      diasTranscurridos: null,
      porcentajeActual: porcentajePrimerPedido,
      diasRestantesParaCorte: null,
      mensajePrincipal: '¡Bienvenido a Steffen!',
      mensajeSecundario: `Tenés un ${porcentajePrimerPedido}% OFF disponible para tu primera compra.`,
    };
  }

  // Si tiene pedidos previos, chequear que la zona sea SIN_DISTRIBUIDOR
  const esZonaDirecta = !zonaCliente || zonaCliente.estado === EstadoZona.SIN_DISTRIBUIDOR;
  if (!esZonaDirecta) {
    return {
      esElegible: false,
      motivoNoElegible: 'CON_DISTRIBUIDOR',
      fechaUltimaCompraCompletada: null,
      diasTranscurridos: null,
      porcentajeActual: null,
      diasRestantesParaCorte: null,
      mensajePrincipal: 'Distribución Oficial Asignada',
      mensajeSecundario: 'Tus pedidos son gestionados por el representante oficial de tu zona.',
    };
  }

  // 3. Cliente elegible para beneficios por reposición: buscar el pedido más reciente COMPLETADO
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
    return {
      esElegible: true,
      fechaUltimaCompraCompletada: null,
      diasTranscurridos: null,
      porcentajeActual: null,
      diasRestantesParaCorte: null,
      mensajePrincipal: 'Programa de Reposición para Salones',
      mensajeSecundario: 'Hacé tu próximo pedido para empezar a acceder a descuentos por reposición.',
    };
  }

  const fechaUltima =
    ultimoPedidoCompletado.fechaCompletado ||
    ultimoPedidoCompletado.fecha ||
    ultimoPedidoCompletado.createdAt;
  const diffMs = Date.now() - new Date(fechaUltima).getTime();
  const diasTranscurridos = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  // 4. Buscar reglas de reposición activas en la BD
  const reglasReposicion = await prisma.reglaDeDescuento.findMany({
    where: {
      tipo: TipoDescuento.REPOSICION,
      activa: true,
    },
    orderBy: {
      diasDesde: 'asc',
    },
  });

  let porcentajeActual: number | null = null;
  let diasRestantesParaCorte: number | null = null;
  let mensajeSecundario = '';

  // Evaluar tramos
  for (const regla of reglasReposicion) {
    const desde = regla.diasDesde ?? 0;
    const hasta = regla.diasHasta;

    if (diasTranscurridos >= desde) {
      if (hasta === null || hasta === undefined || diasTranscurridos <= hasta) {
        porcentajeActual = Number(regla.porcentaje);
        if (hasta !== null && hasta !== undefined) {
          diasRestantesParaCorte = Math.max(0, hasta - diasTranscurridos);
        }
        break;
      }
    }
  }

  const pluralDiasTranscurridos = diasTranscurridos === 1 ? '1 día' : `${diasTranscurridos} días`;
  const mensajePrincipal = `Llevás ${pluralDiasTranscurridos} desde tu última compra completada.`;

  if (porcentajeActual === 25) {
    const pluralRestantes = diasRestantesParaCorte === 1 ? '1 día' : `${diasRestantesParaCorte} días`;
    mensajeSecundario = `Te quedan ${pluralRestantes} para mantener tu 25% OFF (hasta el día 40). Luego baja al 15% OFF por los siguientes 15 días.`;
  } else if (porcentajeActual === 15) {
    const pluralRestantes = diasRestantesParaCorte === 1 ? '1 día' : `${diasRestantesParaCorte} días`;
    mensajeSecundario = `Te quedan ${pluralRestantes} para aprovechar tu 15% OFF antes de los 55 días. Pasado ese plazo, finaliza el beneficio.`;
  } else if (porcentajeActual !== null && porcentajeActual > 0) {
    const pluralRestantes = diasRestantesParaCorte === 1 ? '1 día' : `${diasRestantesParaCorte} días`;
    mensajeSecundario = `Te quedan ${pluralRestantes} para mantener tu ${porcentajeActual}% OFF.`;
  } else {
    if (diasTranscurridos > 55) {
      mensajeSecundario = 'Tu beneficio de reposición caducó a los 55 días. Hacé tu próximo pedido para reactivar tus descuentos.';
    } else {
      mensajeSecundario = 'Hacé tu próximo pedido para empezar a acceder a descuentos por reposición.';
    }
  }

  return {
    esElegible: true,
    fechaUltimaCompraCompletada: new Date(fechaUltima),
    diasTranscurridos,
    porcentajeActual,
    diasRestantesParaCorte,
    mensajePrincipal,
    mensajeSecundario,
  };
}
