'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/lib/context/CartContext';
import { PackDTO, PackItemDTO } from './PackCard';
import {
  Sparkles,
  Layers,
  Plus,
  Minus,
  ShoppingBag,
  Check,
  Lock,
  ArrowLeft,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Building2,
  Tag,
  Share2,
  AlertCircle,
  Package,
  Boxes,
} from 'lucide-react';
import { ETIQUETAS_PACK_CONFIG, EtiquetaPack } from '@/lib/constants/packs';
import { limpiarDescripcionPack, calcularPotencialReventa, obtenerUnidadesExhibidora } from '@/lib/services/reventa';
import { TarjetaPotencialReventa } from './TarjetaPotencialReventa';

export interface DetallePackClientProps {
  pack: PackDTO;
  packsRelacionados?: PackDTO[];
  usuarioLogueado?: boolean;
  estadoCliente?: string | null;
  salonNombre?: string;
  tieneDistribuidor?: boolean;
  distribuidorNombre?: string | null;
}

export function DetallePackClient({
  pack,
  packsRelacionados = [],
  usuarioLogueado = false,
  estadoCliente = null,
  salonNombre = '',
  tieneDistribuidor = false,
  distribuidorNombre = null,
}: DetallePackClientProps) {
  const [cantidad, setCantidad] = useState<number>(1);
  const [agregadoReciente, setAgregadoReciente] = useState<boolean>(false);
  const [copiadoLink, setCopiadoLink] = useState<boolean>(false);
  const { agregarItem } = useCart();

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

  const { descripcionLimpia, beneficiosExclusivos } = useMemo(
    () => limpiarDescripcionPack(pack.descripcion),
    [pack.descripcion]
  );

  const potencial = useMemo(
    () => calcularPotencialReventa(pack),
    [pack]
  );

  const handleIncrement = () => setCantidad((prev) => prev + 1);
  const handleDecrement = () => setCantidad((prev) => (prev > 1 ? prev - 1 : 1));

  const handleCantidadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) {
      setCantidad(val);
    } else if (e.target.value === '') {
      setCantidad(1);
    }
  };

  const handleAgregarAlCarrito = () => {
    if (!pack.disponible || estaBloqueado) return;
    agregarItem(pack.id, cantidad, 'PACK', null, {
      nombre: pack.nombre,
      imagen: pack.imagen,
      categoria: 'Packs y Promociones',
      presentacion: `Combo (${totalUnidades} unid.)`,
      precioUnitario: pack.precioPromocional,
    });
    setAgregadoReciente(true);
    setTimeout(() => {
      setAgregadoReciente(false);
    }, 2000);
  };

  const handleCopiarEnlace = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiadoLink(true);
      setTimeout(() => setCopiadoLink(false), 2000);
    }
  };

  // Suma de los precios de lista individuales de cada producto en el pack
  const sumaPreciosItems = (pack.items || []).reduce(
    (acc, it) => acc + (it.precioUnitario && it.precioUnitario > 0 ? it.precioUnitario * it.cantidad : 0),
    0
  );

  // Subtotal base: si el pack trae precioPssEquivalente cargado desde la planilla, se usa ese valor base.
  // Caso contrario, se usa la suma calculada de los precios de lista individuales.
  const subtotalBase =
    pack.precioPssEquivalente && pack.precioPssEquivalente > 0
      ? pack.precioPssEquivalente
      : sumaPreciosItems > 0
      ? sumaPreciosItems
      : null;

  const ahorroMonto =
    subtotalBase && subtotalBase > pack.precioPromocional
      ? subtotalBase - pack.precioPromocional
      : null;

  const porcentajeAhorro =
    pack.descuento && pack.descuento > 0
      ? pack.descuento
      : subtotalBase && subtotalBase > pack.precioPromocional
      ? Math.round(((subtotalBase - pack.precioPromocional) / subtotalBase) * 100)
      : null;

  // Factor de descuento efectivo para prorratear en los productos del combo
  const factorDescuento = useMemo(() => {
    if (subtotalBase && subtotalBase > 0 && pack.precioPromocional < subtotalBase) {
      return pack.precioPromocional / subtotalBase;
    }
    if (pack.descuento && pack.descuento > 0) {
      return (100 - pack.descuento) / 100;
    }
    return null;
  }, [subtotalBase, pack.precioPromocional, pack.descuento]);

  const porcentajeDescuentoEfectivo =
    porcentajeAhorro ||
    (factorDescuento !== null && factorDescuento < 1
      ? Math.round((1 - factorDescuento) * 100)
      : null);

  return (
    <div id="detalle-pack-client" className="space-y-12">
      {/* Navegación Breadcrumb y Volver */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-500 font-medium">
          <Link href="/catalogo" className="hover:text-gold-600 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Catálogo</span>
          </Link>
          <span>/</span>
          <span className="text-amber-700 font-semibold">Packs & Combos</span>
          <span>/</span>
          <span className="text-neutral-900 font-bold truncate max-w-[200px] sm:max-w-xs">
            {pack.nombre}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopiarEnlace}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer shadow-xs"
        >
          {copiadoLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">¡Enlace copiado!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-neutral-500" />
              <span>Compartir pack</span>
            </>
          )}
        </button>
      </div>

      {/* Grid Principal: Imagen a la izquierda + Ficha de Compra a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Columna Izquierda: Imagen del Pack y Desglose de Productos (5 columnas en LG) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Foto Principal del Pack */}
          <div className="relative w-full aspect-square bg-white border border-amber-200 rounded-3xl overflow-hidden shadow-sm flex items-center justify-center p-4">
            <Image
              src={pack.imagen}
              alt={pack.nombre}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
              referrerPolicy="no-referrer"
            />

            {/* Badges superiores flotantes */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              <span className="px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-600 text-white shadow-md flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                {totalUnidades > 0 ? `Combo Exclusivo (${totalUnidades} unidades)` : 'Combo Promocional'}
              </span>

              {pack.destacado && (
                <span className="px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-gold-500 text-white shadow-md flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 fill-white" />
                  Destacado
                </span>
              )}

              {porcentajeAhorro && porcentajeAhorro > 0 && !estaBloqueado && (
                <span className="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-600 text-white shadow-md">
                  {porcentajeAhorro}% OFF vs Lista
                </span>
              )}
            </div>

            {/* Banner de indisponibilidad por stock */}
            {!pack.disponible && !estaBloqueado && (
              <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-[2px] flex items-center justify-center p-6 text-center z-20">
                <div className="bg-red-950/95 border border-red-500/60 rounded-2xl p-4 text-red-200 text-sm font-bold flex flex-col items-center gap-2 max-w-xs shadow-xl">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <span>{pack.motivoNoDisponible || 'Uno o más productos componentes no tienen stock disponible'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Desglose Gráfico de Artículos Incluidos en el Combo */}
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-700" />
                <span>Artículos que incluye el Combo ({pack.items?.length || 0}):</span>
              </h3>
              {totalUnidades > 0 && (
                <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                  {totalUnidades} u. totales
                </span>
              )}
            </div>

            {pack.items && pack.items.length > 0 ? (
              <div className="divide-y divide-amber-200/60 bg-white/95 rounded-xl border border-amber-200/80 overflow-hidden shadow-2xs">
                {pack.items.map((item, idx) => {
                  const subtotalItem = item.precioUnitario && item.precioUnitario > 0 ? item.precioUnitario * item.cantidad : null;

                  const tieneDescuento = factorDescuento !== null && factorDescuento < 1;
                  const precioFinalUnitario = item.precioUnitario && item.precioUnitario > 0 && tieneDescuento
                    ? Math.round(item.precioUnitario * factorDescuento)
                    : item.precioUnitario;

                  const subtotalFinal = subtotalItem && tieneDescuento
                    ? Math.round(subtotalItem * factorDescuento)
                    : subtotalItem;

                  const unidadesExhibidora = obtenerUnidadesExhibidora(item.nombre, item.presentacion);
                  const precioFinalPorUnidadExhibidora =
                    unidadesExhibidora && unidadesExhibidora > 1 && precioFinalUnitario
                      ? Math.round(precioFinalUnitario / unidadesExhibidora)
                      : null;

                  return (
                    <div key={item.productoId || idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Miniatura de imagen del producto según su SKU */}
                        {item.imagen ? (
                          <div className="relative w-12 h-12 rounded-lg bg-neutral-50 border border-neutral-200 overflow-hidden shrink-0">
                            <Image
                              src={item.imagen}
                              alt={item.nombre}
                              fill
                              sizes="48px"
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="font-bold text-neutral-900 leading-snug line-clamp-2">
                            {item.nombre}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-neutral-500">
                            {item.codigo && (
                              <span className="font-mono font-semibold bg-neutral-100 text-neutral-700 px-1.5 py-0.2 rounded text-[10px] border border-neutral-200">
                                SKU: {item.codigo}
                              </span>
                            )}
                            {item.presentacion && (
                              <span>{item.presentacion}</span>
                            )}
                          </div>

                          {!estaBloqueado && item.precioUnitario && item.precioUnitario > 0 && (
                            <div className="mt-1.5 space-y-1">
                              {tieneDescuento && precioFinalUnitario ? (
                                <>
                                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[11px]">
                                    <span className="text-neutral-400 line-through font-mono">
                                      {formatoMoneda.format(item.precioUnitario)}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-emerald-900 font-bold bg-emerald-50 border border-emerald-200/90 px-2 py-0.5 rounded text-[11px]">
                                      <span>Te queda a:</span>
                                      <strong className="font-mono text-emerald-950 font-extrabold text-xs">
                                        {formatoMoneda.format(precioFinalUnitario)}
                                      </strong>
                                      <span className="text-[10px] font-normal text-emerald-700">c/u</span>
                                      {porcentajeDescuentoEfectivo && (
                                        <span className="text-[9px] bg-emerald-600 text-white font-black px-1 rounded ml-0.5">
                                          -{porcentajeDescuentoEfectivo}%
                                        </span>
                                      )}
                                    </span>
                                  </div>

                                  {precioFinalPorUnidadExhibidora && (
                                    <p className="text-[10px] text-emerald-700 font-medium">
                                      ↳ Equivale a <strong className="font-mono">{formatoMoneda.format(precioFinalPorUnidadExhibidora)}</strong> por unidad individual ({unidadesExhibidora} u.)
                                    </p>
                                  )}

                                  {item.cantidad > 1 && subtotalFinal && (
                                    <p className="text-[11px] text-neutral-600">
                                      <span className="text-neutral-500">Subtotal ({item.cantidad}u):</span>{' '}
                                      <span className="text-neutral-400 line-through font-mono mr-1 text-[10px]">
                                        {formatoMoneda.format(subtotalItem!)}
                                      </span>
                                      <strong className="font-mono text-emerald-900 font-bold">
                                        {formatoMoneda.format(subtotalFinal)}
                                      </strong>
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-[11px] text-neutral-600">
                                  <span className="text-neutral-500">Lista unitario:</span>{' '}
                                  <span className="font-semibold text-neutral-800">{formatoMoneda.format(item.precioUnitario)}</span>
                                  {item.cantidad > 1 && (
                                    <span className="text-neutral-500 font-normal">
                                      {' '}• Subtotal ({item.cantidad}u): <strong className="text-neutral-800">{formatoMoneda.format(subtotalItem!)}</strong>
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cantidad e importe lateral */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-black text-amber-900 bg-amber-100 border border-amber-300/80 px-2.5 py-0.5 rounded-md">
                          x{item.cantidad}
                        </span>
                        {!estaBloqueado && (
                          <div className="text-right">
                            <span className="text-xs font-bold text-neutral-900 block">
                              {formatoMoneda.format(subtotalFinal || subtotalItem || 0)}
                            </span>
                            {tieneDescuento && subtotalItem && subtotalFinal && subtotalItem > subtotalFinal ? (
                              <span className="text-[10px] text-neutral-400 line-through block font-mono">
                                {formatoMoneda.format(subtotalItem)}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 italic p-3 bg-white/70 rounded-xl">
                Los productos detallados de este pack se describen en la ficha técnica.
              </p>
            )}

            {/* Resumen Económico Gráfico del Combo: Subtotal - Descuento = Total */}
            <div className="pt-2">
              {estaBloqueado ? (
                <div className="bg-amber-100/60 border border-amber-200 rounded-xl p-3 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-amber-950 font-bold text-xs">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Precios y Ahorro Reservados para Salones</span>
                  </div>
                  <p className="text-[11px] text-neutral-600">
                    Iniciá sesión o registrá tu salón para ver el desglose de precios individuales y el descuento de fábrica.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-amber-200/90 p-3.5 space-y-2.5 shadow-2xs">
                  {/* 1. Subtotal de lista base */}
                  <div className="flex items-center justify-between text-xs text-neutral-600">
                    <span>Suma individual de lista (Subtotal):</span>
                    <span className="font-semibold text-neutral-900">
                      {formatoMoneda.format(subtotalBase || pack.precioPromocional)}
                    </span>
                  </div>

                  {/* 2. Descuento aplicado */}
                  {ahorroMonto && ahorroMonto > 0 ? (
                    <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
                      <span className="flex items-center gap-1.5">
                        <span>Descuento aplicado al combo:</span>
                        {porcentajeAhorro && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                            {porcentajeAhorro}% OFF
                          </span>
                        )}
                      </span>
                      <span className="font-bold">
                        - {formatoMoneda.format(ahorroMonto)}
                      </span>
                    </div>
                  ) : null}

                  {/* 3. Total final del combo */}
                  <div className="border-t border-neutral-200/80 pt-2 flex items-baseline justify-between">
                    <div>
                      <span className="block font-black text-neutral-900 text-sm">
                        Precio Salón Profesional Directo de Fábrica:
                      </span>
                      <span className="text-[10px] text-neutral-500 font-normal">
                        Tarifa profesional bonificada
                      </span>
                    </div>
                    <span className="font-black text-xl text-neutral-900 tracking-tight">
                      {formatoMoneda.format(pack.precioPromocional)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Garantías de Compra Directa */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center text-xs text-neutral-600 shadow-xs">
            <div className="flex flex-col items-center gap-1 p-2">
              <Truck className="w-5 h-5 text-gold-600" />
              <span className="font-bold text-neutral-800">Envío Directo</span>
              <span className="text-[10px] text-neutral-500">A todo el país</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 border-x border-neutral-100">
              <ShieldCheck className="w-5 h-5 text-gold-600" />
              <span className="font-bold text-neutral-800">100% Original</span>
              <span className="text-[10px] text-neutral-500">Fórmula Steffen</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2">
              <Boxes className="w-5 h-5 text-gold-600" />
              <span className="font-bold text-neutral-800">Ahorro en Combo</span>
              <span className="text-[10px] text-neutral-500">Tarifa profesional</span>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Ficha del Pack, Precios y Compra (7 columnas en LG) */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          {/* Categoría y Etiqueta */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-700" />
                Pack Profesional Exclusivo
              </span>
              {pack.etiqueta && (
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    metaEtiqueta?.badgeBg || 'bg-amber-50'
                  } ${metaEtiqueta?.badgeText || 'text-amber-800'} ${
                    metaEtiqueta?.badgeBorder || 'border-amber-200'
                  }`}
                >
                  {pack.etiqueta}
                </span>
              )}
            </div>

            {totalUnidades > 0 && (
              <span className="text-xs font-extrabold text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full">
                {totalUnidades} unidades en total
              </span>
            )}
          </div>

          {/* Título Principal */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight leading-snug">
              {pack.nombre}
            </h1>
            {descripcionLimpia && (
              <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
                {descripcionLimpia}
              </p>
            )}

            {beneficiosExclusivos && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block text-amber-900 uppercase tracking-wide text-[11px]">
                    Beneficios Exclusivos Incluidos:
                  </span>
                  <span className="text-neutral-700 leading-relaxed mt-0.5 block">
                    {beneficiosExclusivos}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta Aparte: Potencial de Reventa Sugerido (debajo de la descripción) */}
          {potencial.esPackReventa && (
            <TarjetaPotencialReventa potencial={potencial} />
          )}

          {/* Bloque de Precio y Estado Comercial */}
          <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/90 space-y-3">
            {estaBloqueado ? (
              /* ESTADO BLOQUEADO: Usuario no logueado o no aprobado */
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Tarifa y Compra Exclusiva para Salones Profesionales</span>
                </div>

                <p className="text-xs text-neutral-700 leading-relaxed">
                  {esPendiente ? (
                    <>
                      Tu cuenta está en proceso de aprobación por nuestro equipo comercial. Una vez validada tu cuenta de salón profesional, podrás acceder al precio directo y agregar combos a tu pedido.
                    </>
                  ) : (
                    <>
                      Los packs y combos profesionales son de acceso exclusivo para salones de belleza y peluquerías registradas y aprobadas. Registrá tu salón para ver los precios y comprar.
                    </>
                  )}
                </p>

                {esNoRegistrado && (
                  <div className="pt-2">
                    <Link
                      href="/registro"
                      className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gold-500 hover:bg-gold-400 text-white font-bold text-xs sm:text-sm transition-colors shadow-sm"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Registrar Salón para Comprar Packs</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              /* ESTADO HABILITADO: Salón Profesional Aprobado */
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-amber-800 font-bold">
                      Precio Salón Profesional Directo de Fábrica
                    </span>
                    <div className="flex items-baseline gap-3 mt-1">
                      <span className="text-3xl font-black text-neutral-900 tracking-tight">
                        {formatoMoneda.format(pack.precioPromocional)}
                      </span>
                      {pack.precioPssEquivalente && pack.precioPssEquivalente > pack.precioPromocional && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm line-through text-neutral-400 font-semibold">
                            {formatoMoneda.format(pack.precioPssEquivalente)}
                          </span>
                          {porcentajeAhorro && porcentajeAhorro > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                              {porcentajeAhorro}% OFF
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Salón Habilitado
                  </span>
                </div>

                <p className="text-[11px] text-neutral-500 leading-normal">
                  * Tarifa profesional promocional final. Los combos ya cuentan con el precio especial bonificado.
                </p>
              </div>
            )}
          </div>

          {/* Selector de Cantidad y Botón de Compra */}
          {!estaBloqueado && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Selector numérico */}
                <div className="flex items-center justify-between sm:justify-start bg-neutral-100 border border-neutral-300 rounded-2xl p-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={!pack.disponible}
                    aria-label="Disminuir cantidad"
                    className="w-10 h-10 rounded-xl bg-white text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200 flex items-center justify-center transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={cantidad}
                    disabled={!pack.disponible}
                    onChange={handleCantidadChange}
                    aria-label="Cantidad"
                    className="w-16 text-center text-sm font-bold text-neutral-900 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={!pack.disponible}
                    aria-label="Aumentar cantidad"
                    className="w-10 h-10 rounded-xl bg-white text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200 flex items-center justify-center transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Botón Principal Agregar Pack al Carrito */}
                <button
                  type="button"
                  id={`btn-detalle-pack-agregar-${pack.id}`}
                  onClick={handleAgregarAlCarrito}
                  disabled={!pack.disponible}
                  className={`flex-1 py-4 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md ${
                    !pack.disponible
                      ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed shadow-none'
                      : agregadoReciente
                      ? 'bg-emerald-600 text-white scale-[0.99] shadow-emerald-600/30'
                      : 'bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-white shadow-amber-600/25'
                  }`}
                >
                  {agregadoReciente ? (
                    <>
                      <Check className="w-5 h-5 stroke-[3]" />
                      <span>¡Combo Agregado al Carrito ({cantidad} {cantidad === 1 ? 'pack' : 'packs'})!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5" />
                      <span>
                        {pack.disponible
                          ? `Agregar Combo al Pedido (${cantidad} ${cantidad === 1 ? 'pack' : 'packs'})`
                          : 'Combo Sin Stock'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Accesos rápidos de cantidad (+1, +2, +5 combos) */}
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span className="font-semibold">Cantidad para salón:</span>
                {[1, 2, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCantidad(num)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                      cantidad === num
                        ? 'bg-amber-50 border-amber-400 text-amber-800 font-bold'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    +{num} {num === 1 ? 'pack' : 'packs'}
                  </button>
                ))}
              </div>

              {/* Botón de acceso directo al Carrito si recién agregó */}
              {agregadoReciente && (
                <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Link
                    href="/carrito"
                    className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <span>Ver mi Carrito de Compras →</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
