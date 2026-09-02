'use client';

import React, { useState, useTransition } from 'react';
import { EstadoPedido } from '@prisma/client';
import { actualizarEstadoPedidoAction } from '@/app/actions/admin/pedidos';
import { EstadoBadge } from './PedidosListClient';
import { Loader2, Check, AlertCircle } from 'lucide-react';

interface EstadoPedidoSelectorProps {
  pedidoId: string;
  estadoActual: EstadoPedido;
}

const OPCIONES_ESTADO: { label: string; valor: EstadoPedido }[] = [
  { label: 'Pedido Recibido', valor: EstadoPedido.PEDIDO_RECIBIDO },
  { label: 'Contactado', valor: EstadoPedido.CONTACTADO },
  { label: 'Pago Pendiente', valor: EstadoPedido.PAGO_PENDIENTE },
  { label: 'Pagado', valor: EstadoPedido.PAGADO },
  { label: 'Preparando', valor: EstadoPedido.PREPARANDO },
  { label: 'Despachado', valor: EstadoPedido.DESPACHADO },
  { label: 'Completado', valor: EstadoPedido.COMPLETADO },
  { label: 'Cancelado', valor: EstadoPedido.CANCELADO },
];

export function EstadoPedidoSelector({ pedidoId, estadoActual }: EstadoPedidoSelectorProps) {
  const [estado, setEstado] = useState<EstadoPedido>(estadoActual);
  const [isPending, startTransition] = useTransition();
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const handleChange = (nuevoEstado: EstadoPedido) => {
    if (nuevoEstado === estado || isPending) return;

    setMensajeExito(null);
    setMensajeError(null);

    startTransition(async () => {
      const res = await actualizarEstadoPedidoAction(pedidoId, nuevoEstado);
      if (res.success) {
        setEstado(nuevoEstado);
        setMensajeExito(`Estado actualizado con éxito.`);
        setTimeout(() => setMensajeExito(null), 3500);
      } else {
        setMensajeError(res.error || 'No se pudo actualizar el estado.');
      }
    });
  };

  return (
    <div className="space-y-3 bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Estado del Pedido
        </span>
        <EstadoBadge estado={estado} />
      </div>

      <div className="space-y-2">
        <label htmlFor="select-estado-pedido" className="block text-xs text-neutral-500 font-medium">
          Modificar estado actual:
        </label>
        <div className="flex items-center gap-3">
          <select
            id="select-estado-pedido"
            value={estado}
            disabled={isPending}
            onChange={(e) => handleChange(e.target.value as EstadoPedido)}
            className="flex-1 bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors cursor-pointer disabled:opacity-50"
          >
            {OPCIONES_ESTADO.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.label}
              </option>
            ))}
          </select>

          {isPending && (
            <div className="flex items-center gap-1.5 text-xs text-gold-700 font-semibold shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Guardando...</span>
            </div>
          )}
        </div>
      </div>

      {mensajeExito && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs animate-in fade-in">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{mensajeExito}</span>
        </div>
      )}

      {mensajeError && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span className="font-medium">{mensajeError}</span>
        </div>
      )}
    </div>
  );
}
