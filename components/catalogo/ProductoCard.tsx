'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, Star, Plus, Minus, ShoppingBag, Check, Lock } from 'lucide-react';
import { parsearVariantes, obtenerPreciosEfectivosProducto, VarianteProducto } from '@/lib/utils/variantes';

export interface ProductoDTO {
  id: string;
  codigo?: string | null;
  nombre: string;
  categoria: string;
  subcategoria: string | null;
  descripcion: string;
  modoUso?: string | null;
  rendimientoSalon?: string | null;
  imagen: string;
  presentacion: string;
  precioPss: number;
  precioEcommerce: number;
  precioVisible: number;
  tipoPrecio: 'PUBLICO' | 'PROFESIONAL';
  precioProfesionalBloqueado?: number | null;
  stock: number;
  variantes?: string | VarianteProducto[] | null;
  activo: boolean;
  ordenVisualizacion: number;
  destacado: boolean;
  recomendado: boolean;
}

interface ProductoCardProps {
  producto: ProductoDTO;
  onAgregarAlCarrito: (producto: ProductoDTO, cantidad: number, variante?: string | null) => void;
  usuarioLogueado?: boolean;
  estadoCliente?: string | null;
}

export function ProductoCard({
  producto,
  onAgregarAlCarrito,
  usuarioLogueado = false,
  estadoCliente = null,
}: ProductoCardProps) {
  const [cantidad, setCantidad] = useState<number>(1);
  const [agregadoReciente, setAgregadoReciente] = useState<boolean>(false);

  // Parsear variantes si existen
  const variantesDisponibles = useMemo(() => {
    return Array.isArray(producto.variantes)
      ? producto.variantes
      : parsearVariantes(producto.variantes);
  }, [producto.variantes]);

  // Selección de variante (por defecto la primera si hay variantes)
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<string | null>(
    variantesDisponibles.length > 0 ? variantesDisponibles[0].nombre : null
  );

  // Calcular precio dinámico según la variante seleccionada
  const { precioVisibleCalculado, precioBloqueadoCalculado } = useMemo(() => {
    const { precioPss, precioEcommerce } = obtenerPreciosEfectivosProducto(
      {
        precioPss: producto.precioPss,
        precioEcommerce: producto.precioEcommerce,
        variantes: variantesDisponibles,
      },
      varianteSeleccionada
    );

    const precioVisibleCalculado =
      producto.tipoPrecio === 'PROFESIONAL' ? precioPss : precioEcommerce;

    const precioBloqueadoCalculado =
      producto.precioProfesionalBloqueado !== undefined && producto.precioProfesionalBloqueado !== null
        ? precioPss
        : null;

    return {
      precioVisibleCalculado,
      precioBloqueadoCalculado,
    };
  }, [producto, varianteSeleccionada, variantesDisponibles]);

  const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  const handleIncrement = () => {
    setCantidad((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setCantidad((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleCantidadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) {
      setCantidad(val);
    } else if (e.target.value === '') {
      setCantidad(1);
    }
  };

  const handleAgregar = () => {
    onAgregarAlCarrito(producto, cantidad, varianteSeleccionada);
    setAgregadoReciente(true);
    setTimeout(() => {
      setAgregadoReciente(false);
    }, 1600);
  };

  return (
    <div
      id={`producto-card-${producto.id}`}
      className="group relative flex flex-col justify-between bg-white border border-neutral-200 hover:border-gold-400 rounded-2xl p-4 transition-all duration-200 hover:shadow-lg shadow-sm"
    >
      {/* Zona Superior: Imagen y Badges */}
      <div>
        <Link
          href={`/catalogo/${producto.id}`}
          className="block relative w-full aspect-square bg-neutral-100 rounded-xl overflow-hidden mb-4 border border-neutral-200 cursor-pointer"
        >
          <Image
            src={producto.imagen}
            alt={producto.nombre}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />

          {/* Badges Flotantes */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
            {producto.destacado && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-gold-500 text-white rounded-full shadow-sm">
                <Sparkles className="w-3 h-3 fill-white" /> Destacado
              </span>
            )}
            {producto.recomendado && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-emerald-600 text-white rounded-full shadow-sm">
                <Star className="w-3 h-3 fill-white" /> Recomendado
              </span>
            )}
          </div>

          {/* Presentación en Badge Inferior */}
          <div className="absolute bottom-2.5 right-2.5 z-10">
            <span className="px-2.5 py-1 text-[11px] font-medium bg-white/95 text-neutral-700 backdrop-blur-md rounded-md border border-neutral-200 shadow-sm">
              {producto.presentacion}
            </span>
          </div>
        </Link>

        {/* Categoría y Subcategoría */}
        <div className="flex items-center gap-2 mb-1.5 text-xs text-neutral-500 font-medium">
          <span className="text-gold-700 font-semibold">{producto.categoria}</span>
          {producto.subcategoria && (
            <>
              <span className="text-neutral-300">•</span>
              <span className="text-neutral-500 line-clamp-1">{producto.subcategoria}</span>
            </>
          )}
        </div>

        {/* Nombre del Producto */}
        <Link href={`/catalogo/${producto.id}`} className="block">
          <h3 className="font-bold text-neutral-900 text-base leading-snug line-clamp-2 mb-2 group-hover:text-gold-700 transition-colors">
            {producto.nombre}
          </h3>
        </Link>

        {/* Descripción Breve */}
        <Link href={`/catalogo/${producto.id}`} className="block">
          <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed mb-3 hover:text-neutral-700 transition-colors">
            {producto.descripcion}
          </p>
        </Link>
      </div>

      {/* Zona Inferior: Variantes, Precio y Selector de Compra */}
      <div className="pt-3 border-t border-neutral-200 space-y-3">
        {/* Selector de Variantes (si tiene) */}
        {variantesDisponibles.length > 0 && (
          <div className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Opción / Variante:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {variantesDisponibles.map((v) => {
                const isSelected = (varianteSeleccionada || '').trim().toLowerCase() === v.nombre.trim().toLowerCase();
                const tienePrecioDiferente =
                  producto.tipoPrecio === 'PROFESIONAL'
                    ? v.precioPss && v.precioPss !== producto.precioPss
                    : v.precioEcommerce && v.precioEcommerce !== producto.precioEcommerce;

                const precioVariante =
                  producto.tipoPrecio === 'PROFESIONAL'
                    ? (v.precioPss || producto.precioPss)
                    : (v.precioEcommerce || producto.precioEcommerce);

                return (
                  <button
                    key={v.nombre}
                    type="button"
                    onClick={() => setVarianteSeleccionada(v.nombre)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-100'
                    }`}
                  >
                    <span>{v.nombre}</span>
                    {tienePrecioDiferente && (
                      <span
                        className={`ml-1 text-[10px] font-bold ${
                          isSelected ? 'text-gold-300' : 'text-neutral-500'
                        }`}
                      >
                        ({formatoMoneda.format(precioVariante)})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Precio Visible */}
        <div>
          <span className="block text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
            {producto.tipoPrecio === 'PROFESIONAL' ? 'Precio Salón Profesional' : 'Precio Público'}
          </span>
          <span className="text-xl font-extrabold text-neutral-900 tracking-tight">
            {formatoMoneda.format(precioVisibleCalculado)}
          </span>

          {/* Precio profesional bloqueado (para cuentas pendientes de aprobación) */}
          {precioBloqueadoCalculado !== null && (
            <div className="mt-2 p-2 rounded-xl bg-neutral-100/90 border border-neutral-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-600">
                <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Precio Salón:</span>
                <span className="inline-block select-none filter blur-[4.5px] opacity-75 font-extrabold text-neutral-700 bg-neutral-200/60 px-1.5 py-0.5 rounded tracking-wider pointer-events-none">
                  {formatoMoneda.format(precioBloqueadoCalculado)}
                </span>
              </div>
              <p className="text-[10px] text-neutral-500 leading-tight">
                Se desbloquea al aprobar tu cuenta profesional
              </p>
            </div>
          )}

          {/* Aviso contextual si el precio mostrado es PUBLICO (solo para no logueados o cuentas no pendientes) */}
          {producto.tipoPrecio === 'PUBLICO' && !precioBloqueadoCalculado && (
            <div className="mt-1.5">
              {!usuarioLogueado ? (
                <Link
                  href="/registro"
                  className="text-xs text-gold-700 hover:text-gold-800 font-semibold transition-colors flex items-center gap-1 group/link"
                >
                  <span>Precio Salón disponible al registrarte como profesional →</span>
                </Link>
              ) : (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 rounded-lg px-2 py-1 leading-snug font-medium">
                  Tu cuenta está pendiente de aprobación para acceder al precio salón
                </p>
              )}
            </div>
          )}
        </div>

        {/* Controles de Cantidad y Agregar */}
        <div className="flex items-center gap-2">
          {/* Selector numérico con botones + y - */}
          <div className="flex items-center bg-neutral-50 border border-neutral-300 rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={handleDecrement}
              aria-label="Disminuir cantidad"
              className="w-7 h-7 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={handleCantidadChange}
              aria-label="Cantidad"
              className="w-10 text-center text-xs font-bold text-neutral-900 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={handleIncrement}
              aria-label="Aumentar cantidad"
              className="w-7 h-7 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botón de Agregar al Carrito */}
          <button
            type="button"
            id={`btn-agregar-${producto.id}`}
            onClick={handleAgregar}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              agregadoReciente
                ? 'bg-emerald-600 text-white scale-[0.98]'
                : 'bg-gold-500 hover:bg-gold-400 text-white shadow-gold-500/20'
            }`}
          >
            {agregadoReciente ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>¡Agregado!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>Agregar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
