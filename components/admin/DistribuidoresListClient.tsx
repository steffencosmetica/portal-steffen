'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { eliminarDistribuidorAction } from '@/app/actions/admin/distribuidores';
import { 
  Search, 
  X, 
  Truck, 
  Plus, 
  Edit3, 
  Trash2, 
  Phone, 
  MapPin, 
  Building2, 
  AlertCircle,
  Loader2,
  ExternalLink,
  Layers
} from 'lucide-react';

export interface DistribuidorListItemDTO {
  id: string;
  nombre: string;
  empresa: string | null;
  provincia: string;
  localidades: string;
  whatsapp: string;
  estado: string; // ACTIVO | INACTIVO
  observaciones: string | null;
  zonasCount: number;
}

interface DistribuidoresListClientProps {
  distribuidoresIniciales: DistribuidorListItemDTO[];
}

export function DistribuidoresListClient({ distribuidoresIniciales }: DistribuidoresListClientProps) {
  const router = useRouter();
  const [distribuidores, setDistribuidores] = useState<DistribuidorListItemDTO[]>(distribuidoresIniciales);
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  
  // Modal de eliminación
  const [distribuidorAEliminar, setDistribuidorAEliminar] = useState<DistribuidorListItemDTO | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filtrado reactivo
  const distribuidoresFiltrados = distribuidores.filter((dist) => {
    const cumpleEstado = filtroEstado === 'TODOS' || dist.estado === filtroEstado;
    if (!cumpleEstado) return false;

    if (!busqueda.trim()) return true;
    const term = busqueda.toLowerCase().trim();
    const nombre = dist.nombre.toLowerCase();
    const empresa = (dist.empresa || '').toLowerCase();
    const provincia = dist.provincia.toLowerCase();
    const localidades = dist.localidades.toLowerCase();

    return (
      nombre.includes(term) ||
      empresa.includes(term) ||
      provincia.includes(term) ||
      localidades.includes(term)
    );
  });

  const handleEliminar = () => {
    if (!distribuidorAEliminar) return;

    setMensajeError(null);
    startTransition(async () => {
      const res = await eliminarDistribuidorAction(distribuidorAEliminar.id);
      if (res.success) {
        setDistribuidores((prev) => prev.filter((d) => d.id !== distribuidorAEliminar.id));
        setDistribuidorAEliminar(null);
        router.refresh();
      } else {
        setMensajeError(res.error || 'No se pudo eliminar el distribuidor.');
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
              placeholder="Buscar por nombre, empresa, provincia o localidades..."
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

          {/* Botón Nuevo Distribuidor */}
          <Link
            href="/admin/distribuidores/nuevo"
            className="inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-600 text-white font-bold text-sm px-4 py-2 rounded-xl transition-all shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Distribuidor</span>
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
            Todos ({distribuidores.length})
          </button>
          <button
            onClick={() => setFiltroEstado('ACTIVO')}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filtroEstado === 'ACTIVO'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Activos ({distribuidores.filter((d) => d.estado === 'ACTIVO').length})
          </button>
          <button
            onClick={() => setFiltroEstado('INACTIVO')}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filtroEstado === 'INACTIVO'
                ? 'bg-neutral-700 text-white font-bold'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Inactivos ({distribuidores.filter((d) => d.estado === 'INACTIVO').length})
          </button>
        </div>
      </div>

      {/* Listado de Distribuidores */}
      {distribuidoresFiltrados.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-800">
            No se encontraron distribuidores
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {busqueda || filtroEstado !== 'TODOS'
              ? 'Probá ajustando los términos de búsqueda o los filtros aplicados.'
              : 'Todavía no hay distribuidores oficiales registrados en la plataforma.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4 font-semibold">Distribuidor / Empresa</th>
                  <th className="py-3.5 px-4 font-semibold">Ubicación y Cobertura</th>
                  <th className="py-3.5 px-4 font-semibold">WhatsApp</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Estado</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Zonas Asignadas</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {distribuidoresFiltrados.map((dist) => {
                  const wsNumber = dist.whatsapp.replace(/\D/g, '');
                  return (
                    <tr key={dist.id} className="hover:bg-neutral-50/80 transition-colors">
                      {/* Distribuidor / Empresa */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-0.5">
                          <span className="font-bold text-neutral-900 block">
                            {dist.nombre}
                          </span>
                          {dist.empresa ? (
                            <span className="text-xs text-neutral-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-neutral-400" />
                              {dist.empresa}
                            </span>
                          ) : (
                            <span className="text-[11px] text-neutral-400 italic">Particular</span>
                          )}
                        </div>
                      </td>

                      {/* Ubicación y Cobertura */}
                      <td className="py-3.5 px-4 align-top max-w-xs">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-800">
                            <MapPin className="w-3.5 h-3.5 text-gold-600" />
                            {dist.provincia}
                          </span>
                          <p className="text-xs text-neutral-600 line-clamp-2">
                            {dist.localidades}
                          </p>
                        </div>
                      </td>

                      {/* WhatsApp */}
                      <td className="py-3.5 px-4 align-top">
                        {wsNumber ? (
                          <a
                            href={`https://wa.me/${wsNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{dist.whatsapp}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        ) : (
                          <span className="text-neutral-400 text-xs">{dist.whatsapp || '-'}</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            dist.estado === 'ACTIVO'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : 'bg-neutral-100 text-neutral-600 border border-neutral-300'
                          }`}
                        >
                          {dist.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Zonas Asignadas */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                          <Layers className="w-3 h-3 text-neutral-500" />
                          <span>{dist.zonasCount} {dist.zonasCount === 1 ? 'zona' : 'zonas'}</span>
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/distribuidores/${dist.id}`}
                            className="p-1.5 text-neutral-600 hover:text-gold-700 hover:bg-gold-50 rounded-lg transition-colors border border-transparent hover:border-gold-200"
                            title="Editar distribuidor"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setMensajeError(null);
                              setDistribuidorAEliminar(dist);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                            title="Eliminar distribuidor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {distribuidorAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  ¿Eliminar distribuidor?
                </h3>
                <p className="text-xs text-neutral-500">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Estás a punto de eliminar a <strong className="text-neutral-900">{distribuidorAEliminar.nombre}</strong>
              {distribuidorAEliminar.empresa ? ` (${distribuidorAEliminar.empresa})` : ''}.
              {distribuidorAEliminar.zonasCount > 0 && (
                <span className="block mt-2 font-semibold text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  ⚠️ Atención: Tiene {distribuidorAEliminar.zonasCount} zona(s) asignada(s). Para poder eliminarlo, primero deberás reasignar o desvincular esas zonas.
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
                  setDistribuidorAEliminar(null);
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
