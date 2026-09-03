'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Plus, Minus, Sparkles, AlertCircle, Layers, Tag, Lock, ChevronRight } from 'lucide-react';
import { ETIQUETAS_PACK_CONFIG, EtiquetaPack } from '@/lib/constants/packs';

export interface PackItemDTO {
  productoId: string;
  nombre: string;
  presentacion: string;
  cantidad: number;
  codigo?: string | null;
  imagen?: string | null;
  precioUnitario?: number | null;
}

export interface PackDTO {
  id: string;
  nombre: string;
  descripcion: string;
  imagen: string;
  etiqueta?: string | null;
  precioPromocional: number;
  precioPssEquivalente?: number | null;
  descuento?: number | null;
  destacado: boolean;
  disponible: boolean;
  motivoNoDisponible?: string;
  items: PackItemDTO[];
}

interface PackCardProps {
  pack: PackDTO;
  onAgregarAlCarrito: (pack: PackDTO, cantidad: number) => void;
  onFiltrarEtiqueta?: (etiqueta: string) => void;
  usuarioLogueado?: boolean;
  estadoCliente?: string | null;
}

export function PackCard({
  pack,
  onAgregarAlCarrito,
  onFiltrarEtiqueta,
  usuarioLogueado = false,
  estadoCliente = null,
}: PackCardProps) {
  const [cantidad, setCantidad] = useState(1);

  const esActivo = estadoCliente === 'ACTIVO';
  const esPendiente = usuarioLogueado && estadoCliente === 'PENDIENTE_APROBACION';
  const esNoRegistrado = !usuarioLogueado;
  const estaBloqueado = !esActivo;

  const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  const totalUnidades = (pack.items || []).reduce((acc, curr) => acc + curr.cantidad, 0);
  const metaEtiqueta = pack.etiqueta ? ETIQUETAS_PACK_CONFIG[pack.etiqueta as EtiquetaPack] : null;

  const MAX_ITEMS_CARD = 4;
  const itemsVisibles = (pack.items || []).slice(0, MAX_ITEMS_CARD);
  const totalItemsCount = pack.items?.length || 0;
  const hayMasItems = totalItemsCount > MAX_ITEMS_CARD;
  const itemsRestantes = totalItemsCount - MAX_ITEMS_CARD;

  const porcentajeAhorro =
    pack.descuento && pack.descuento > 0
      ? pack.descuento
      : pack.precioPssEquivalente && pack.precioPssEquivalente > pack.precioPromocional
      ? Math.round(((pack.precioPssEquivalente - pack.precioPromocional) / pack.precioPssEquivalente) * 100)
      : null;

  const handleIncrementar = () => {
    setCantidad((prev) => prev + 1);
  };

  const handleDecrementar = () => {
    setCantidad((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleAgregar = () => {
    if (!pack.disponible || estaBloqueado) return;
    onAgregarAlCarrito(pack, cantidad);
    setCantidad(1);
  };

  return (
    <div
      id={`pack-card-${pack.id}`}
      className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all duration-200 flex flex-col justify-between ${
        estaBloqueado
          ? 'border-amber-200/80 bg-linear-to-b from-white to-amber-50/20'
          : pack.disponible
          ? 'border-amber-200 hover:border-amber-400 hover:shadow-md'
          : 'border-neutral-200 opacity-80'
      }`}
    >
      <div>
        {/* Contenedor de Imagen con Badges y Enlace a Detalle */}
        <Link
          href={`/catalogo/packs/${pack.id}`}
          className="block relative h-52 w-full bg-neutral-100 overflow-hidden group cursor-pointer"
        >
          <Image
            src={pack.imagen}
            alt={pack.nombre}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />

          {/* Badges superiores */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-600 text-white shadow-sm flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {totalUnidades > 0 ? `Combo Exclusivo (${totalUnidades} unid.)` : 'Combo Promocional'}
            </span>

            {pack.destacado && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gold-500 text-white shadow-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Destacado
              </span>
            )}

            {porcentajeAhorro && porcentajeAhorro > 0 && !estaBloqueado && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
                {porcentajeAhorro}% OFF
              </span>
            )}
          </div>

          {/* Banner de indisponibilidad por stock */}
          {!pack.disponible && !estaBloqueado && (
            <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-[2px] flex items-center justify-center p-4 text-center z-10">
              <div className="bg-red-950/90 border border-red-500/50 rounded-xl p-3 text-red-200 text-xs font-bold flex items-center gap-2 max-w-[260px]">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{pack.motivoNoDisponible || 'Uno o más productos del pack no tienen stock'}</span>
              </div>
            </div>
          )}
        </Link>

        {/* Información del Pack */}
        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                {estaBloqueado && <Lock className="w-3 h-3 text-amber-600" />}
                <span>Pack Promocional Profesional</span>
              </span>

              {pack.etiqueta && (
                <button
                  type="button"
                  onClick={() => onFiltrarEtiqueta?.(pack.etiqueta!)}
                  className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border transition-all ${
                    metaEtiqueta?.badgeBg || 'bg-amber-50'
                  } ${metaEtiqueta?.badgeText || 'text-amber-800'} ${
                    metaEtiqueta?.badgeBorder || 'border-amber-200'
                  } ${onFiltrarEtiqueta ? 'hover:scale-105 cursor-pointer' : ''}`}
                  title={onFiltrarEtiqueta ? `Filtrar solo packs "${pack.etiqueta}"` : undefined}
                >
                  <Tag className="w-3 h-3" />
                  <span>{pack.etiqueta}</span>
                </button>
              )}
            </div>

            <Link href={`/catalogo/packs/${pack.id}`} className="group block cursor-pointer">
              <h3 className="font-bold text-neutral-900 text-lg leading-snug mt-0.5 group-hover:text-amber-700 transition-colors line-clamp-2 min-h-[2.85rem] flex items-center">
                {pack.nombre}
              </h3>
            </Link>
            {pack.descripcion ? (
              <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed line-clamp-3 min-h-[3.5rem]">
                {pack.descripcion}
              </p>
            ) : (
              <div className="min-h-[3.5rem]" />
            )}
          </div>

          {/* Listado de Productos Incluidos (si los tiene asignados) */}
          {pack.items && pack.items.length > 0 ? (
            <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3 space-y-2 min-h-[162px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] font-extrabold text-amber-900 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-amber-700" />
                    <span>Productos que incluye el combo:</span>
                  </span>
                  <span className="bg-amber-200/80 px-2 py-0.5 rounded-full text-amber-950 font-black">
                    {totalUnidades} u.
                  </span>
                </div>

                <ul className="space-y-1 text-xs text-neutral-700">
                  {itemsVisibles.map((it, idx) => (
                    <li key={`${it.productoId || idx}-${idx}`} className="flex items-start justify-between gap-2 text-[11px]">
                      <span className="line-clamp-1 text-neutral-800 font-medium" title={`${it.nombre}${it.presentacion ? ` (${it.presentacion})` : ''}`}>
                        • {it.nombre || 'Producto'} {it.presentacion ? <span className="text-neutral-500 font-normal">({it.presentacion})</span> : null}
                      </span>
                      <span className="font-bold text-amber-800 shrink-0 bg-white/80 px-1.5 py-0.5 rounded border border-amber-200/50 text-[10px]">
                        x{it.cantidad}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 5ta línea: Ver más para ver todos los productos en la ficha completa del pack */}
              <div className="pt-1.5 border-t border-amber-200/70 mt-1">
                <Link
                  href={`/catalogo/packs/${pack.id}`}
                  className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center justify-between group/vermas transition-colors"
                >
                  <span className="underline underline-offset-2">
                    {hayMasItems
                      ? `Ver más (${itemsRestantes} ${itemsRestantes === 1 ? 'producto más' : 'productos más'})`
                      : 'Ver más detalles en la página del pack'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-700 group-hover/vermas:translate-x-0.5 transition-transform shrink-0" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-50 border border-neutral-200/60 rounded-xl p-3 min-h-[162px] flex flex-col justify-between text-xs text-neutral-500">
              <p className="italic text-[11px]">Combo promocional profesional de productos seleccionados.</p>
              <div className="pt-1.5 border-t border-neutral-200/60">
                <Link
                  href={`/catalogo/packs/${pack.id}`}
                  className="text-[11px] font-bold text-neutral-700 hover:text-neutral-900 flex items-center justify-between group/vermas transition-colors"
                >
                  <span className="underline underline-offset-2">Ver más detalles</span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover/vermas:translate-x-0.5 transition-transform shrink-0" />
                </Link>
              </div>
            </div>
          )}

          {/* Bloque de Precios */}
          <div className="pt-2 border-t border-neutral-100">
            {estaBloqueado ? (
              <div className="p-3 rounded-xl bg-amber-100/60 border border-amber-300/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Precio Salón Profesional Directo de Fábrica:</span>
                  <span className="inline-block select-none filter blur-[5px] opacity-80 font-black text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded tracking-wider pointer-events-none">
                    {formatoMoneda.format(pack.precioPromocional)}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-tight">
                  {esPendiente
                    ? 'Tu cuenta de salón está en proceso de verificación. Muy pronto podrás acceder a este beneficio.'
                    : 'Exclusivo para salones de belleza y peluquerías profesionales verificados.'}
                </p>
              </div>
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-amber-700 font-bold block">
                    Precio Salón Profesional Directo de Fábrica
                  </span>
                  <span className="text-2xl font-black text-neutral-900">
                    {formatoMoneda.format(pack.precioPromocional)}
                  </span>
                </div>

                {pack.precioPssEquivalente && pack.precioPssEquivalente > pack.precioPromocional && (
                  <div className="text-right">
                    <span className="text-[11px] text-neutral-400 block line-through">
                      Salón Profesional: {formatoMoneda.format(pack.precioPssEquivalente)}
                    </span>
                    {porcentajeAhorro && porcentajeAhorro > 0 && (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-0.5">
                        {porcentajeAhorro}% OFF
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controles de Compra */}
      <div className="p-5 pt-0">
        {estaBloqueado ? (
          <div>
            {esNoRegistrado ? (
              <Link
                href="/registro"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-600/20 cursor-pointer text-center"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Registrar Salón para Comprar Packs</span>
              </Link>
            ) : (
              <div className="w-full py-2.5 px-4 rounded-xl bg-amber-200/70 border border-amber-300 text-amber-950 text-xs font-bold text-center flex items-center justify-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Aprobación de Salón Requerida</span>
              </div>
            )}
          </div>
        ) : pack.disponible ? (
          <div className="flex items-center gap-2">
            {/* Selector de Cantidad */}
            <div className="flex items-center bg-neutral-50 border border-neutral-300 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={handleDecrementar}
                aria-label="Disminuir cantidad"
                className="w-8 h-8 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-xs font-bold text-neutral-900">
                {cantidad}
              </span>
              <button
                type="button"
                onClick={handleIncrementar}
                aria-label="Aumentar cantidad"
                className="w-8 h-8 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Botón Agregar */}
            <button
              type="button"
              id={`btn-agregar-pack-${pack.id}`}
              onClick={handleAgregar}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-600/20 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Sumar Combo</span>
            </button>
          </div>
        ) : (
          <div className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-400 text-xs font-semibold text-center cursor-not-allowed">
            No disponible por falta de stock
          </div>
        )}
      </div>
    </div>
  );
}
