'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EstadoPedido } from '@prisma/client';
import { 
  Search, 
  X, 
  ShoppingBag, 
  Store, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  Filter
} from 'lucide-react';

export interface PedidoListItemDTO {
  id: string;
  numeroPedido: number;
  fecha: string;
  estado: EstadoPedido;
  subtotalPss: number;
  descuentoAplicado: number;
  porcentajeDescuento: number;
  total: number;
  cliente: {
    id: string;
    nombre: string;
    apellido: string;
    salon: string;
    whatsapp: string;
    localidad: string;
    provincia: string;
  };
  totalUnidades: number;
}

interface PedidosListClientProps {
  pedidosIniciales: PedidoListItemDTO[];
}

export function EstadoBadge({ estado }: { estado: EstadoPedido }) {
  switch (estado) {
    case EstadoPedido.PEDIDO_RECIBIDO:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gold-50 text-gold-800 border border-gold-300">
          Pedido Recibido
        </span>
      );
    case EstadoPedido.CONTACTADO:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-300">
          Contactado
        </span>
      );
    case EstadoPedido.PAGO_PENDIENTE:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
          Pago Pendiente
        </span>
      );
    case EstadoPedido.PAGADO:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
          Pagado
        </span>
      );
    case EstadoPedido.PREPARANDO:
    case 'EN_PREPARACION' as EstadoPedido:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300">
          Preparando
        </span>
      );
    case EstadoPedido.DESPACHADO:
    case 'ENVIADO' as EstadoPedido:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-300">
          Despachado
        </span>
      );
    case EstadoPedido.COMPLETADO:
    case 'ENTREGADO' as EstadoPedido:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-300">
          Completado
        </span>
      );
    case EstadoPedido.CANCELADO:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-300">
          Cancelado
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
          {estado}
        </span>
      );
  }
}

export function PedidosListClient({ pedidosIniciales }: PedidosListClientProps) {
  const [busqueda, setBusqueda] = useState<string>('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('TODOS');

  const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  const formatoFecha = (fechaIso: string) => {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(fechaIso));
  };

  const estadosDisponibles = [
    { label: 'Todos los pedidos', valor: 'TODOS' },
    { label: 'Recibidos', valor: EstadoPedido.PEDIDO_RECIBIDO },
    { label: 'Contactados', valor: EstadoPedido.CONTACTADO },
    { label: 'Pago Pendiente', valor: EstadoPedido.PAGO_PENDIENTE },
    { label: 'Pagados', valor: EstadoPedido.PAGADO },
    { label: 'Preparando', valor: EstadoPedido.PREPARANDO },
    { label: 'Despachados', valor: EstadoPedido.DESPACHADO },
    { label: 'Completados', valor: EstadoPedido.COMPLETADO },
    { label: 'Cancelados', valor: EstadoPedido.CANCELADO },
  ];

  const pedidosFiltrados = pedidosIniciales.filter((pedido) => {
    // 1. Filtro de estado
    if (estadoFiltro !== 'TODOS' && pedido.estado !== estadoFiltro) {
      return false;
    }

    // 2. Filtro de búsqueda
    if (busqueda.trim() !== '') {
      const termino = busqueda.toLowerCase().trim();
      const matchNumero = `#${pedido.numeroPedido}`.includes(termino) || pedido.numeroPedido.toString().includes(termino);
      const matchSalon = pedido.cliente.salon.toLowerCase().includes(termino);
      const matchNombre = `${pedido.cliente.nombre} ${pedido.cliente.apellido}`.toLowerCase().includes(termino);
      const matchLocalidad = pedido.cliente.localidad.toLowerCase().includes(termino);
      const matchProvincia = pedido.cliente.provincia.toLowerCase().includes(termino);

      return matchNumero || matchSalon || matchNombre || matchLocalidad || matchProvincia;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Controles de Búsqueda y Filtro por Estado */}
      <section className="bg-white border border-neutral-200 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
        {/* Buscador */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por número de pedido (#12), salón, cliente o localidad..."
            className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-9 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Pills de Estados */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-300">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mr-2 hidden md:inline-flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-gold-600" />
            Estado:
          </span>
          {estadosDisponibles.map((item) => {
            const isSelected = estadoFiltro === item.valor;
            return (
              <button
                key={item.valor}
                onClick={() => setEstadoFiltro(item.valor)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gold-500 text-white font-bold shadow-sm shadow-gold-500/20'
                    : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 border border-neutral-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Resultados */}
      <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
        <p>
          Mostrando <strong className="text-neutral-900">{pedidosFiltrados.length}</strong> de{' '}
          <strong className="text-neutral-700">{pedidosIniciales.length}</strong> pedidos registrados
        </p>
      </div>

      {/* Listado de Pedidos */}
      {pedidosFiltrados.length > 0 ? (
        <div className="space-y-3" id="tabla-pedidos-admin">
          {pedidosFiltrados.map((pedido) => (
            <Link
              key={pedido.id}
              href={`/admin/pedidos/${pedido.id}`}
              className="group block bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-gold-400 rounded-2xl p-4 md:p-5 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Info Principal: Pedido # y Salón */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-base font-black text-gold-700 tracking-tight">
                      #{pedido.numeroPedido}
                    </span>
                    <EstadoBadge estado={pedido.estado} />
                    <span className="text-xs text-neutral-400 flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3 text-neutral-400" />
                      {formatoFecha(pedido.fecha)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600">
                    <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-gold-600" />
                      {pedido.cliente.salon}
                    </span>
                    <span className="text-neutral-500 text-xs">
                      {pedido.cliente.nombre} {pedido.cliente.apellido}
                    </span>
                    <span className="text-neutral-400 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {pedido.cliente.localidad}, {pedido.cliente.provincia}
                    </span>
                  </div>
                </div>

                {/* Importes y Link */}
                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-100">
                  <div className="text-left md:text-right">
                    <span className="block text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                      Total a Transferir
                    </span>
                    <span className="text-lg font-black text-neutral-900">
                      {formatoMoneda.format(pedido.total)}
                    </span>
                    <span className="block text-[11px] text-neutral-500">
                      {pedido.totalUnidades} {pedido.totalUnidades === 1 ? 'unidad' : 'unidades'}
                      {pedido.descuentoAplicado > 0 && ` • -${formatoMoneda.format(pedido.descuentoAplicado)}`}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-400 group-hover:text-gold-700 group-hover:border-gold-300 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-bold text-neutral-900 mb-1">No se encontraron pedidos</h4>
          <p className="text-sm text-neutral-500 max-w-md mx-auto mb-6">
            No hay pedidos que coincidan con los filtros de búsqueda o estado actual.
          </p>
          <button
            onClick={() => {
              setBusqueda('');
              setEstadoFiltro('TODOS');
            }}
            className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors cursor-pointer border border-neutral-300"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
