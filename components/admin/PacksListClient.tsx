'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cambiarEstadoActivoPackAction, eliminarPackAction } from '@/app/actions/admin/packs';
import { ETIQUETAS_PACK, ETIQUETAS_PACK_CONFIG, EtiquetaPack } from '@/lib/constants/packs';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Tag,
  Loader2,
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';

export interface PackItemAdminView {
  id: string;
  productoId: string;
  cantidad: number;
  producto: {
    id: string;
    nombre: string;
    presentacion: string;
    precioPss: number;
    stock: number;
    activo: boolean;
  };
}

export interface PackAdminView {
  id: string;
  nombre: string;
  descripcion: string;
  imagen: string;
  etiqueta?: string | null;
  precioPromocional: number;
  precioPssEquivalente?: number | null;
  descuento?: number | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  activo: boolean;
  destacado: boolean;
  createdAt: string;
  items: PackItemAdminView[];
}

interface PacksListClientProps {
  packsIniciales: PackAdminView[];
}

export function PacksListClient({ packsIniciales }: PacksListClientProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'ACTIVOS' | 'INACTIVOS'>('TODOS');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<string>('TODAS');
  const [packAEliminar, setPackAEliminar] = useState<PackAdminView | null>(null);
  const [isPending, startTransition] = useTransition();

  const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  const packsFiltrados = packsIniciales.filter((p) => {
    const matchBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.etiqueta && p.etiqueta.toLowerCase().includes(busqueda.toLowerCase()));

    const matchEstado =
      filtroEstado === 'TODOS'
        ? true
        : filtroEstado === 'ACTIVOS'
        ? p.activo
        : !p.activo;

    const matchEtiqueta =
      filtroEtiqueta === 'TODAS'
        ? true
        : p.etiqueta === filtroEtiqueta;

    return matchBusqueda && matchEstado && matchEtiqueta;
  });

  const handleToggleActivo = (pack: PackAdminView) => {
    startTransition(async () => {
      await cambiarEstadoActivoPackAction(pack.id, !pack.activo);
    });
  };

  const handleConfirmarEliminar = () => {
    if (!packAEliminar) return;
    startTransition(async () => {
      await eliminarPackAction(packAEliminar.id);
      setPackAEliminar(null);
    });
  };

  return (
    <div className="space-y-6" id="admin-packs-list-root">
      {/* Barra de Filtros y Acción Superior */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <div className="flex flex-1 flex-wrap gap-3 max-w-2xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, descripción o etiqueta..."
              className="w-full bg-white border border-neutral-300 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-gold-500"
            />
          </div>

          <select
            value={filtroEtiqueta}
            onChange={(e) => setFiltroEtiqueta(e.target.value)}
            className="bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-gold-500"
          >
            <option value="TODAS">Todas las etiquetas</option>
            {ETIQUETAS_PACK.map((etq) => (
              <option key={etq} value={etq}>
                {etq}
              </option>
            ))}
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as 'TODOS' | 'ACTIVOS' | 'INACTIVOS')}
            className="bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-gold-500"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="ACTIVOS">Solo Activos</option>
            <option value="INACTIVOS">Solo Inactivos</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/packs/carga-masiva"
            id="btn-carga-masiva-packs"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-xs md:text-sm transition-all shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-700" />
            <span>Carga Masiva Excel</span>
          </Link>

          <Link
            href="/admin/packs/nuevo"
            id="btn-crear-pack"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gold-600 hover:bg-gold-500 text-white font-bold text-xs md:text-sm transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Pack</span>
          </Link>
        </div>
      </div>

      {/* Grid de Cards de Packs */}
      {packsFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white border border-neutral-200 rounded-2xl p-6">
          <Package className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-800">No se encontraron packs</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {busqueda || filtroEstado !== 'TODOS'
              ? 'Probá ajustando los filtros o el término de búsqueda.'
              : 'Todavía no hay combos o packs promocionales creados en el catálogo.'}
          </p>
          {!busqueda && filtroEstado === 'TODOS' && (
            <Link
              href="/admin/packs/nuevo"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-600 text-white font-bold text-xs hover:bg-gold-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Crear el Primer Pack</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packsFiltrados.map((pack) => {
            const ahora = new Date();
            const fechaIni = pack.fechaInicio ? new Date(pack.fechaInicio) : null;
            const fechaFin = pack.fechaFin ? new Date(pack.fechaFin) : null;
            const vigente = (!fechaIni || fechaIni <= ahora) && (!fechaFin || fechaFin >= ahora);

            const totalUnidades = pack.items.reduce((acc, curr) => acc + curr.cantidad, 0);

            return (
              <div
                key={pack.id}
                id={`pack-card-${pack.id}`}
                className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm hover:border-neutral-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Encabezado con imagen y badges */}
                  <div className="relative h-44 w-full bg-neutral-100 border-b border-neutral-100">
                    <Image
                      src={pack.imagen}
                      alt={pack.nombre}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />

                    {/* Badges Flotantes */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase backdrop-blur-md shadow-sm ${
                          pack.activo
                            ? 'bg-emerald-600/90 text-white'
                            : 'bg-neutral-800/90 text-neutral-200'
                        }`}
                      >
                        {pack.activo ? 'Activo' : 'Inactivo'}
                      </span>

                      {pack.destacado && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/90 text-white backdrop-blur-md flex items-center gap-1 shadow-sm">
                          <Sparkles className="w-3 h-3" />
                          Destacado
                        </span>
                      )}
                    </div>

                    {!vigente && (
                      <div className="absolute bottom-3 left-3 right-3 bg-red-600/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Fuera de vigencia temporal</span>
                      </div>
                    )}
                  </div>

                  {/* Cuerpo de la Card */}
                  <div className="p-5 space-y-4">
                    <div>
                      {pack.etiqueta && (
                        <div className="mb-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                              ETIQUETAS_PACK_CONFIG[pack.etiqueta as EtiquetaPack]?.badgeBg || 'bg-neutral-100'
                            } ${
                              ETIQUETAS_PACK_CONFIG[pack.etiqueta as EtiquetaPack]?.badgeText || 'text-neutral-700'
                            } ${
                              ETIQUETAS_PACK_CONFIG[pack.etiqueta as EtiquetaPack]?.badgeBorder || 'border-neutral-200'
                            }`}
                          >
                            <Tag className="w-3 h-3" />
                            {pack.etiqueta}
                          </span>
                        </div>
                      )}
                      <h4 className="font-bold text-neutral-900 text-base leading-snug line-clamp-1">
                        {pack.nombre}
                      </h4>
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                        {pack.descripcion}
                      </p>
                    </div>

                    {/* Lista resumida de productos incluidos */}
                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                        Contenido del combo ({totalUnidades} unidades):
                      </span>
                      <ul className="space-y-1 text-xs text-neutral-700">
                        {pack.items.slice(0, 3).map((item) => (
                          <li key={item.id} className="flex justify-between items-center text-[11px]">
                            <span className="line-clamp-1">
                              • {item.cantidad}x {item.producto?.nombre} ({item.producto?.presentacion})
                            </span>
                            {item.producto && item.producto.stock < item.cantidad && (
                              <span className="text-[10px] text-red-600 font-bold ml-1 shrink-0">
                                (Sin stock)
                              </span>
                            )}
                          </li>
                        ))}
                        {pack.items.length > 3 && (
                          <li className="text-[10px] text-neutral-400 italic">
                            + {pack.items.length - 3} producto(s) más...
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Precios */}
                    <div className="flex items-baseline justify-between pt-2 border-t border-neutral-100">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                          Precio Combo Profesional
                        </span>
                        <span className="text-xl font-black text-neutral-900">
                          {formatoMoneda.format(pack.precioPromocional)}
                        </span>
                      </div>

                      {pack.precioPssEquivalente && pack.precioPssEquivalente > pack.precioPromocional && (
                        <div className="text-right">
                          <span className="text-[10px] text-neutral-400 block line-through">
                            Salón Profesional: {formatoMoneda.format(pack.precioPssEquivalente)}
                          </span>
                          <span className="text-xs font-bold text-emerald-600">
                            Ahorro: {Math.round(((pack.precioPssEquivalente - pack.precioPromocional) / pack.precioPssEquivalente) * 100)}% ({formatoMoneda.format(pack.precioPssEquivalente - pack.precioPromocional)})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer de Acciones */}
                <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggleActivo(pack)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      pack.activo
                        ? 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {pack.activo ? (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Activar</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/catalogo/packs/${pack.id}`}
                      target="_blank"
                      className="p-2 rounded-lg bg-white border border-neutral-300 text-neutral-500 hover:text-amber-700 hover:border-amber-300 transition-colors cursor-pointer"
                      title="Ver ficha del pack en catálogo"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>

                    <Link
                      href={`/admin/packs/${pack.id}`}
                      className="p-2 rounded-lg bg-white border border-neutral-300 text-neutral-700 hover:text-gold-700 hover:border-gold-300 transition-colors cursor-pointer"
                      title="Editar pack"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setPackAEliminar(pack)}
                      className="p-2 rounded-lg bg-white border border-neutral-300 text-neutral-400 hover:text-red-600 hover:border-red-300 transition-colors cursor-pointer"
                      title="Eliminar pack"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {packAEliminar && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-neutral-900">¿Eliminar este pack promocional?</h3>
              <p className="text-xs md:text-sm text-neutral-500 mt-1 leading-relaxed">
                Vas a eliminar el combo <strong className="text-neutral-800 font-semibold">{packAEliminar.nombre}</strong>. Los pedidos históricos que hayan incluido este combo mantendrán su registro intacto.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setPackAEliminar(null)}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmarEliminar}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Eliminar Pack</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
