'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EstadoZona } from '@prisma/client';
import { eliminarZonaAction } from '@/app/actions/admin/zonas';
import { 
  Search, 
  X, 
  MapPin, 
  Plus, 
  Edit3, 
  Trash2, 
  Truck, 
  Users, 
  AlertCircle,
  Loader2,
  Building2,
  CheckCircle,
  Clock,
  ShieldAlert,
  Navigation
} from 'lucide-react';

export interface ZonaListItemDTO {
  id: string;
  provincia: string;
  localidad: string;
  estado: EstadoZona;
  distribuidorId: string | null;
  latitud?: number | null;
  longitud?: number | null;
  distribuidor: {
    id: string;
    nombre: string;
    empresa: string | null;
    whatsapp: string;
    estado: string;
  } | null;
  clientesCount: number;
}

interface ZonasListClientProps {
  zonasIniciales: ZonaListItemDTO[];
}

export function EstadoZonaBadge({ estado }: { estado: EstadoZona }) {
  switch (estado) {
    case EstadoZona.CON_DISTRIBUIDOR:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <CheckCircle className="w-3 h-3 text-emerald-600" />
          Con Distribuidor
        </span>
      );
    case EstadoZona.COBERTURA_PARCIAL:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-300">
          <Clock className="w-3 h-3 text-sky-600" />
          Cobertura Parcial
        </span>
      );
    case EstadoZona.SIN_DISTRIBUIDOR:
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
          <Building2 className="w-3 h-3 text-amber-700" />
          Venta Directa Fábrica
        </span>
      );
  }
}

export function ZonasListClient({ zonasIniciales }: ZonasListClientProps) {
  const router = useRouter();
  const [zonas, setZonas] = useState<ZonaListItemDTO[]>(zonasIniciales);
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  
  // Modal de eliminación
  const [zonaAEliminar, setZonaAEliminar] = useState<ZonaListItemDTO | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filtrado
  const zonasFiltradas = zonas.filter((z) => {
    const cumpleEstado = filtroEstado === 'TODOS' || z.estado === filtroEstado;
    if (!cumpleEstado) return false;

    if (!busqueda.trim()) return true;
    const term = busqueda.toLowerCase().trim();
    const provincia = z.provincia.toLowerCase();
    const localidad = z.localidad.toLowerCase();
    const distribuidor = (z.distribuidor?.nombre || '').toLowerCase();
    const empresa = (z.distribuidor?.empresa || '').toLowerCase();

    return (
      provincia.includes(term) ||
      localidad.includes(term) ||
      distribuidor.includes(term) ||
      empresa.includes(term)
    );
  });

  const handleEliminar = () => {
    if (!zonaAEliminar) return;

    setMensajeError(null);
    startTransition(async () => {
      const res = await eliminarZonaAction(zonaAEliminar.id);
      if (res.success) {
        setZonas((prev) => prev.filter((z) => z.id !== zonaAEliminar.id));
        setZonaAEliminar(null);
        router.refresh();
      } else {
        setMensajeError(res.error || 'No se pudo eliminar la zona.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros y Acciones */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Input de Búsqueda */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por localidad, provincia o distribuidor..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5 rounded-full"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Botón Nueva Zona */}
          <Link
            href="/admin/zonas/nuevo"
            className="inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-600 text-white font-bold text-sm px-4 py-2 rounded-xl transition-all shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Zona</span>
          </Link>
        </div>

        {/* Filtros de Estado */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-neutral-100 text-xs">
          <span className="font-semibold text-neutral-500 whitespace-nowrap">Estado:</span>
          <button
            onClick={() => setFiltroEstado('TODOS')}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filtroEstado === 'TODOS'
                ? 'bg-neutral-900 text-white font-bold'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Todas ({zonas.length})
          </button>
          <button
            onClick={() => setFiltroEstado(EstadoZona.SIN_DISTRIBUIDOR)}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filtroEstado === EstadoZona.SIN_DISTRIBUIDOR
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            Venta Directa Fábrica ({zonas.filter((z) => z.estado === EstadoZona.SIN_DISTRIBUIDOR).length})
          </button>
          <button
            onClick={() => setFiltroEstado(EstadoZona.COBERTURA_PARCIAL)}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filtroEstado === EstadoZona.COBERTURA_PARCIAL
                ? 'bg-sky-600 text-white font-bold'
                : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
            }`}
          >
            Cobertura Parcial ({zonas.filter((z) => z.estado === EstadoZona.COBERTURA_PARCIAL).length})
          </button>
          <button
            onClick={() => setFiltroEstado(EstadoZona.CON_DISTRIBUIDOR)}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filtroEstado === EstadoZona.CON_DISTRIBUIDOR
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Con Distribuidor ({zonas.filter((z) => z.estado === EstadoZona.CON_DISTRIBUIDOR).length})
          </button>
        </div>
      </div>

      {/* Listado de Zonas */}
      {zonasFiltradas.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-800">
            No se encontraron zonas geográficas
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {busqueda || filtroEstado !== 'TODOS'
              ? 'Probá ajustando los términos de búsqueda o los filtros aplicados.'
              : 'Todavía no hay zonas geográficas registradas en la base de datos.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4 font-semibold">Localidad y Provincia</th>
                  <th className="py-3.5 px-4 font-semibold">Estado de Cobertura</th>
                  <th className="py-3.5 px-4 font-semibold">Distribuidor Asignado</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Salones Registrados</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {zonasFiltradas.map((zona) => (
                  <tr key={zona.id} className="hover:bg-neutral-50/80 transition-colors">
                    {/* Localidad y Provincia */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-neutral-900">
                            {zona.localidad}
                          </span>
                          {zona.latitud !== null && zona.latitud !== undefined && (
                            <span 
                              title={`Zona geolocalizada por GPS (${zona.latitud.toFixed(3)}, ${zona.longitud?.toFixed(3)})`}
                              className="inline-flex items-center text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded"
                            >
                              <Navigation className="w-2.5 h-2.5 mr-0.5 text-emerald-600" />
                              GPS
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gold-600" />
                          {zona.provincia}
                        </span>
                      </div>
                    </td>

                    {/* Estado de Cobertura */}
                    <td className="py-3.5 px-4 align-top">
                      <EstadoZonaBadge estado={zona.estado} />
                    </td>

                    {/* Distribuidor Asignado */}
                    <td className="py-3.5 px-4 align-top">
                      {zona.distribuidor ? (
                        <div className="space-y-0.5">
                          <Link
                            href={`/admin/distribuidores/${zona.distribuidor.id}`}
                            className="font-bold text-neutral-900 hover:text-gold-700 transition-colors flex items-center gap-1"
                          >
                            <Truck className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                            <span>{zona.distribuidor.nombre}</span>
                          </Link>
                          {zona.distribuidor.empresa && (
                            <span className="text-xs text-neutral-500 block">
                              {zona.distribuidor.empresa}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400 italic">
                          Sin distribuidor asignado
                        </span>
                      )}
                    </td>

                    {/* Salones Registrados */}
                    <td className="py-3.5 px-4 align-top text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                        <Users className="w-3 h-3 text-neutral-500" />
                        <span>{zona.clientesCount} {zona.clientesCount === 1 ? 'salón' : 'salones'}</span>
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-4 align-top text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/zonas/${zona.id}`}
                          className="p-1.5 text-neutral-600 hover:text-gold-700 hover:bg-gold-50 rounded-lg transition-colors border border-transparent hover:border-gold-200"
                          title="Editar zona"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            setMensajeError(null);
                            setZonaAEliminar(zona);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                          title="Eliminar zona"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {zonaAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  ¿Eliminar zona geográfica?
                </h3>
                <p className="text-xs text-neutral-500">
                  Esta acción eliminará la zona de la base de datos.
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Estás a punto de eliminar la zona <strong className="text-neutral-900">{zonaAEliminar.localidad}, {zonaAEliminar.provincia}</strong>.
              {zonaAEliminar.clientesCount > 0 && (
                <span className="block mt-2 font-medium text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  ⚠️ <strong>Aviso:</strong> Esta zona tiene {zonaAEliminar.clientesCount} cliente(s) profesional(es) asignado(s). Al eliminarla, los clientes simplemente quedarán sin zona asignada (no se borrarán).
                </span>
              )}
            </p>

            {mensajeError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{mensajeError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setZonaAEliminar(null);
                  setMensajeError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleEliminar}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar Eliminación</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
