'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { EstadoCliente, EstadoPedido } from '@prisma/client';
import { actualizarClienteAction } from '@/app/actions/admin/clientes';
import { EstadoClienteBadge } from './ClientesListClient';
import { EstadoBadge } from './PedidosListClient';
import { 
  Store, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Info, 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ShoppingBag, 
  ChevronRight,
  Calendar,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

interface ZonaDTO {
  id: string;
  provincia: string;
  localidad: string;
  estado: string;
}

interface PedidoHistorialDTO {
  id: string;
  numeroPedido: number;
  fecha: string;
  estado: EstadoPedido;
  total: number;
  totalItems: number;
}

interface ClienteDetalleDTO {
  id: string;
  nombre: string;
  apellido: string;
  salon: string;
  whatsapp: string;
  email: string;
  provincia: string;
  localidad: string;
  pais: string;
  tipoDeNegocio: string;
  instagram: string | null;
  cuit: string | null;
  yaComproSteffen: boolean;
  comoConocioSteffen: string | null;
  estadoCliente: EstadoCliente;
  zonaId: string | null;
  fechaRegistro: string;
}

interface ClienteDetalleFormProps {
  cliente: ClienteDetalleDTO;
  zonasDisponibles: ZonaDTO[];
  pedidosHistorial: PedidoHistorialDTO[];
}

export function ClienteDetalleForm({
  cliente,
  zonasDisponibles,
  pedidosHistorial,
}: ClienteDetalleFormProps) {
  const [nombre, setNombre] = useState(cliente.nombre);
  const [apellido, setApellido] = useState(cliente.apellido);
  const [whatsapp, setWhatsapp] = useState(cliente.whatsapp);
  const [email, setEmail] = useState(cliente.email);
  const [estadoCliente, setEstadoCliente] = useState<EstadoCliente>(cliente.estadoCliente);
  const [zonaId, setZonaId] = useState<string>(cliente.zonaId || '');

  const [isPending, startTransition] = useTransition();
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeExito(null);
    setMensajeError(null);

    startTransition(async () => {
      const res = await actualizarClienteAction(cliente.id, {
        nombre,
        apellido,
        whatsapp,
        email,
        estadoCliente,
        zonaId: zonaId === '' ? null : zonaId,
      });

      if (res.success) {
        setMensajeExito('Datos del salón actualizados exitosamente.');
        setTimeout(() => setMensajeExito(null), 4000);
      } else {
        setMensajeError(res.error || 'Ocurrió un error al guardar los cambios.');
      }
    });
  };

  // Enlace directo a WhatsApp del salón
  const whatsappLimpio = whatsapp.replace(/\D/g, '');
  const urlWhatsapp = whatsappLimpio.length >= 8 ? `https://wa.me/${whatsappLimpio}` : null;

  return (
    <div className="space-y-8">
      {/* Mensajes de Retroalimentación */}
      {mensajeExito && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{mensajeExito}</span>
        </div>
      )}

      {mensajeError && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="font-medium">{mensajeError}</span>
        </div>
      )}

      {/* Grid Principal: Formulario y Panel Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Formulario de Edición */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-7 shadow-sm space-y-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-100">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Store className="w-5 h-5 text-gold-600" />
                  <span>{cliente.salon}</span>
                </h2>
                <span className="text-xs text-neutral-500">
                  Registrado el {formatoFecha(cliente.fechaRegistro)} • {cliente.tipoDeNegocio}
                </span>
              </div>

              <EstadoClienteBadge estado={estadoCliente} />
            </div>

            {/* Campos de Nombre y Apellido */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Nombre del Responsable *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Apellido del Responsable *
                </label>
                <input
                  type="text"
                  required
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                />
              </div>
            </div>

            {/* WhatsApp y Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  WhatsApp de Contacto *
                </label>
                <input
                  type="text"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ej: 5492235590428"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Email de Contacto Comercial *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                />
              </div>
            </div>

            {/* Nota visible obligatoria sobre el email */}
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
              <p>
                <strong className="text-neutral-800">Aviso importante:</strong> Este email es solo de contacto, no afecta el inicio de sesión del cliente en la plataforma.
              </p>
            </div>

            {/* Selectores de Estado y Zona */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Estado de la Cuenta *
                </label>
                <select
                  value={estadoCliente}
                  onChange={(e) => setEstadoCliente(e.target.value as EstadoCliente)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors cursor-pointer"
                >
                  <option value={EstadoCliente.PENDIENTE_APROBACION}>Pendiente de Aprobación</option>
                  <option value={EstadoCliente.ACTIVO}>Activo (Acceso Completo)</option>
                  <option value={EstadoCliente.INACTIVO}>Inactivo</option>
                  <option value={EstadoCliente.BLOQUEADO}>Bloqueado (Acceso Denegado)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Zona Geográfica Asignada
                </label>
                <select
                  value={zonaId}
                  onChange={(e) => setZonaId(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors cursor-pointer"
                >
                  <option value="">Sin zona asignada</option>
                  {zonasDisponibles.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.provincia} - {z.localidad} ({z.estado.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botón de Guardar */}
            <div className="pt-4 border-t border-neutral-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={isPending}
                id="btn-guardar-cliente"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando cambios...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Información Adicional de Registro */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3 text-xs text-neutral-600 shadow-sm">
            <h3 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
              Ficha Técnica del Salón
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-neutral-400 block">Ubicación declarada:</span>
                <span className="text-neutral-700 font-medium">{cliente.localidad}, {cliente.provincia} ({cliente.pais})</span>
              </div>
              {cliente.cuit && (
                <div>
                  <span className="text-neutral-400 block">CUIT / Identificación:</span>
                  <span className="text-neutral-700 font-mono font-medium">{cliente.cuit}</span>
                </div>
              )}
              {cliente.instagram && (
                <div>
                  <span className="text-neutral-400 block">Instagram Profesional:</span>
                  <span className="text-neutral-700 font-medium">{cliente.instagram}</span>
                </div>
              )}
              {cliente.comoConocioSteffen && (
                <div>
                  <span className="text-neutral-400 block">Origen / Recomendación:</span>
                  <span className="text-neutral-700 font-medium">{cliente.comoConocioSteffen}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel Lateral: Contacto Rápido e Historial de Pedidos */}
        <div className="space-y-6">
          {/* Contacto Directo */}
          {urlWhatsapp && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Contacto Directo
              </h3>
              <a
                href={urlWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                <span>Escribir por WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
              </a>
            </div>
          )}

          {/* Historial Compacto de Pedidos (Datos Históricos sin recalcular) */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-gold-600" />
                Historial de Pedidos ({pedidosHistorial.length})
              </h3>
            </div>

            {pedidosHistorial.length > 0 ? (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {pedidosHistorial.map((ped) => (
                  <Link
                    key={ped.id}
                    href={`/admin/pedidos/${ped.id}`}
                    className="group block bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 hover:border-gold-300 rounded-xl p-3 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-gold-700">
                        #{ped.numeroPedido}
                      </span>
                      <EstadoBadge estado={ped.estado} />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatoFecha(ped.fecha)}
                      </span>
                      <span className="font-bold text-neutral-900">
                        {formatoMoneda.format(ped.total)}
                      </span>
                    </div>

                    <div className="flex items-center justify-end text-[10px] text-neutral-500 group-hover:text-gold-700 transition-colors pt-1">
                      <span>Ver detalle completo →</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400 text-xs">
                <ShoppingBag className="w-6 h-6 mx-auto mb-2 opacity-50 text-neutral-400" />
                <span>Este salón aún no ha realizado pedidos.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
