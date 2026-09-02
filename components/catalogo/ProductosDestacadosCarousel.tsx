'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/context/CartContext';
import { ProductoDTO } from './ProductoCard';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles, CheckCircle2, Plus, ShoppingBag } from 'lucide-react';

interface ProductosDestacadosCarouselProps {
  productos: ProductoDTO[];
  usuarioLogueado?: boolean;
  estadoCliente?: string | null;
}

const formatoMoneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function ProductosDestacadosCarousel({
  productos,
  usuarioLogueado = false,
  estadoCliente = null,
}: ProductosDestacadosCarouselProps) {
  // Mostrar todos los productos seleccionados por el administrador para el Home
  const listaProductos = productos;
  const totalPaginas = Math.max(1, Math.ceil(listaProductos.length / 3));

  const [pagina, setPagina] = useState<number>(0);
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  const { agregarItem } = useCart();

  const irSiguiente = () => {
    if (totalPaginas <= 1) return;
    setPagina((prev) => (prev + 1 < totalPaginas ? prev + 1 : 0));
  };

  const irAnterior = () => {
    if (totalPaginas <= 1) return;
    setPagina((prev) => (prev - 1 >= 0 ? prev - 1 : totalPaginas - 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 45) {
      irSiguiente();
    } else if (diff < -45) {
      irAnterior();
    }
    touchStartX.current = null;
  };

  const handleAgregarProducto = (e: React.MouseEvent, producto: ProductoDTO) => {
    e.preventDefault();
    e.stopPropagation();

    agregarItem(producto.id, 1, 'PRODUCTO', undefined, {
      nombre: producto.nombre,
      imagen: producto.imagen,
      categoria: producto.categoria,
      presentacion: producto.presentacion,
      precioUnitario: producto.precioVisible,
    });

    setToastMensaje(`Se agregó "${producto.nombre}" al pedido.`);
    setTimeout(() => {
      setToastMensaje((curr) => (curr ? null : curr));
    }, 2500);
  };

  // Dividir los productos en grupos de 3 para la fila
  const grupos: ProductoDTO[][] = [];
  for (let i = 0; i < listaProductos.length; i += 3) {
    grupos.push(listaProductos.slice(i, i + 3));
  }

  // Si no hay productos cargados en la página, no renderizar sección vacía
  if (listaProductos.length === 0) {
    return null;
  }

  return (
    <section id="productos-destacados-section" className="space-y-4">
      {/* Notificación Toast flotante al agregar al carrito */}
      {toastMensaje && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 bg-neutral-950 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-gold-500/40 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-xs"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs font-medium leading-snug truncate">{toastMensaje}</p>
        </div>
      )}

      {/* Cabecera Compacta */}
      <div className="flex items-center justify-between gap-4 pb-2.5 border-b border-neutral-200/80">
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gold-50 border border-gold-200/70 text-gold-700 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 tracking-tight leading-tight">
              Productos Destacados
            </h2>
            <p className="text-neutral-500 text-xs hidden sm:block">
              Líneas seleccionadas para el trabajo profesional y cuidado intensivo en salón.
            </p>
          </div>
        </div>

        <Link
          href="/catalogo"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-800 hover:text-gold-950 transition-colors group shrink-0"
        >
          <span>Ver catálogo</span>
          <ArrowRight className="w-3.5 h-3.5 text-gold-600 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Fila con Flecha Izquierda + 3 Productos en la Misma Fila + Flecha Derecha */}
      <div className="relative flex items-center gap-2 sm:gap-3 max-w-4xl sm:max-w-5xl mx-auto w-full">
        {/* Flecha Izquierda */}
        <button
          type="button"
          id="btn-destacados-prev"
          onClick={irAnterior}
          disabled={totalPaginas <= 1}
          aria-label="Ver productos anteriores"
          className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 flex items-center justify-center transition-all duration-200 shadow-xs cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none z-10"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Contenedor del Carrusel (muestra exactamente 3 productos en la misma fila) */}
        <div
          className="overflow-hidden flex-1 rounded-xl"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex transition-transform duration-500 ease-out will-change-transform"
            style={{ transform: `translateX(-${pagina * 100}%)` }}
          >
            {grupos.map((grupo, gIdx) => (
              <div key={gIdx} className="w-full shrink-0">
                <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                  {grupo.map((prod) => {
                    const esProfesional = prod.tipoPrecio === 'PROFESIONAL';

                    return (
                      <div
                        key={prod.id}
                        className="group bg-white rounded-xl border border-neutral-200/90 hover:border-gold-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden h-[290px] sm:h-[320px]"
                      >
                        {/* Imagen con Mayor Proporción y Formato Cuadradito */}
                        <Link
                          href={`/catalogo/${prod.id}`}
                          className="relative h-44 sm:h-52 w-full bg-neutral-100/90 overflow-hidden block shrink-0"
                        >
                          <Image
                            src={prod.imagen}
                            alt={prod.nombre}
                            fill
                            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 30vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />

                          {/* Presentación */}
                          {prod.presentacion && (
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium bg-white/95 text-neutral-700 backdrop-blur-xs rounded border border-neutral-200/60 shadow-2xs">
                              {prod.presentacion}
                            </span>
                          )}

                          {/* Badge Destacado */}
                          {prod.destacado && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-bold bg-neutral-950/85 text-gold-300 rounded flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5 text-gold-400" />
                              <span className="hidden sm:inline">Top</span>
                            </span>
                          )}
                        </Link>

                        {/* Textos y Detalles */}
                        <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between min-h-0">
                          <div className="space-y-0.5">
                            <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gold-700 truncate leading-tight">
                              {prod.categoria}
                            </span>
                            <Link href={`/catalogo/${prod.id}`} className="block">
                              <h3 className="font-bold text-neutral-900 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-gold-700 transition-colors">
                                {prod.nombre}
                              </h3>
                            </Link>
                          </div>

                          {/* Zona de Precio y Botón Agregar */}
                          <div className="pt-1.5 border-t border-neutral-100 flex items-center justify-between gap-1 mt-0.5">
                            <div className="min-w-0">
                              <span className="block text-[8px] sm:text-[9px] font-medium uppercase text-neutral-400 leading-none">
                                {esProfesional ? 'Salón' : 'Público'}
                              </span>
                              <span className="text-xs sm:text-sm font-extrabold text-neutral-900 leading-tight truncate block">
                                {formatoMoneda.format(prod.precioVisible)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleAgregarProducto(e, prod)}
                              title="Agregar al pedido"
                              className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md bg-neutral-900 text-white hover:bg-gold-500 hover:text-neutral-950 text-[10px] sm:text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 active:scale-95"
                            >
                              <Plus className="w-3 h-3" />
                              <span className="hidden sm:inline">Agregar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flecha Derecha */}
        <button
          type="button"
          id="btn-destacados-next"
          onClick={irSiguiente}
          disabled={totalPaginas <= 1}
          aria-label="Ver siguientes productos"
          className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-neutral-800 bg-neutral-950 text-gold-400 hover:bg-gold-500 hover:text-neutral-950 hover:border-gold-500 flex items-center justify-center transition-all duration-200 shadow-xs cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none z-10"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Indicadores de Página Minimalistas si hay más de 3 productos */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {Array.from({ length: totalPaginas }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              id={`btn-destacados-dot-${idx}`}
              onClick={() => setPagina(idx)}
              aria-label={`Ver página ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                pagina === idx ? 'w-6 bg-gold-500' : 'w-1.5 bg-neutral-300 hover:bg-neutral-400'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
