'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/context/CartContext';
import { 
  obtenerProductosDelCarritoAction, 
  ItemCarritoServerResponse, 
  CalculoDescuentoResultado 
} from '@/app/actions/cart';
import { obtenerWhatsappContactoUrlAction } from '@/app/actions/whatsapp';
import { 
  MessageCircle, 
  ShoppingBag, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowRight, 
  Sparkles,
  Loader2,
  Package
} from 'lucide-react';

const formatoMoneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function FloatingActions() {
  const pathname = usePathname();
  const { items, cantidadTotal, actualizarCantidad, quitarItem, cargando: cargandoCart } = useCart();
  
  const [miniCartAbierto, setMiniCartAbierto] = useState(false);
  const [itemsDetallados, setItemsDetallados] = useState<ItemCarritoServerResponse[]>([]);
  const [descuentoInfo, setDescuentoInfo] = useState<CalculoDescuentoResultado | null>(null);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [cargandoDetalles, setCargandoDetalles] = useState<boolean>(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string>(
    'https://api.whatsapp.com/send?phone=5492235590428&text=Hola%20Steffen!%20Quisiera%20hacer%20una%20consulta%20sobre%20los%20productos%20y%20pedidos%20en%20el%20portal%20profesional.'
  );

  const popoverRef = useRef<HTMLDivElement>(null);
  const cartBtnRef = useRef<HTMLButtonElement>(null);

  // Vista preliminar instantánea (0ms) construida desde los datos locales
  const itemsParaMostrar = useMemo<ItemCarritoServerResponse[]>(() => {
    if (itemsDetallados.length > 0) {
      return itemsDetallados;
    }
    return items.map((it) => ({
      id: it.id,
      tipo: it.tipo,
      productoId: it.tipo === 'PRODUCTO' ? it.id : undefined,
      packId: it.tipo === 'PACK' ? it.id : undefined,
      variante: it.variante || null,
      cantidad: it.cantidad,
      nombre: it.nombre || (it.tipo === 'PACK' ? 'Combo / Pack Promocional' : 'Producto Steffen'),
      categoria: it.categoria || (it.tipo === 'PACK' ? 'Packs y Promociones' : 'Cosmética Capilar'),
      presentacion: it.presentacion || (it.tipo === 'PACK' ? 'Combo Profesional' : 'Unidad'),
      imagen: it.imagen || 'https://picsum.photos/seed/steffen-prod/600/600',
      precioUnitarioPss: it.precioUnitario || 0,
      tipoPrecio: 'PROFESIONAL',
      subtotal: (it.precioUnitario || 0) * it.cantidad,
      disponible: true,
    }));
  }, [itemsDetallados, items]);

  const subtotalEfectivo = useMemo(() => {
    if (subtotal > 0) return subtotal;
    return itemsParaMostrar.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  }, [subtotal, itemsParaMostrar]);

  const totalEfectivo = useMemo(() => {
    if (descuentoInfo && descuentoInfo.total > 0) return descuentoInfo.total;
    return subtotalEfectivo;
  }, [descuentoInfo, subtotalEfectivo]);

  const handleActualizarCantidadMiniCart = (
    id: string,
    nuevaCantidad: number,
    tipo?: 'PRODUCTO' | 'PACK',
    variante?: string | null
  ) => {
    if (nuevaCantidad > 0) {
      actualizarCantidad(id, nuevaCantidad, tipo, variante);
    } else {
      quitarItem(id, tipo, variante);
    }
    setItemsDetallados((prev) => {
      if (nuevaCantidad <= 0) {
        return prev.filter(
          (i) => !(i.id === id && i.tipo === (tipo || 'PRODUCTO') && (i.variante || null) === (variante || null))
        );
      }
      return prev.map((i) => {
        if (i.id === id && i.tipo === (tipo || 'PRODUCTO') && (i.variante || null) === (variante || null)) {
          return {
            ...i,
            cantidad: nuevaCantidad,
            subtotal: i.precioUnitarioPss * nuevaCantidad,
          };
        }
        return i;
      });
    });
  };

  // Obtener URL oficial de WhatsApp en el cliente
  useEffect(() => {
    let montado = true;
    obtenerWhatsappContactoUrlAction().then((url) => {
      if (montado && url) {
        setWhatsappUrl(url);
      }
    });
    return () => {
      montado = false;
    };
  }, []);

  // Cerrar el popup al cambiar de ruta
  useEffect(() => {
    setMiniCartAbierto(false);
  }, [pathname]);

  // Cargar detalles de los productos del carrito cuando el popover esté abierto o cambien los items
  useEffect(() => {
    if (!miniCartAbierto || items.length === 0) {
      if (items.length === 0) {
        setItemsDetallados([]);
        setDescuentoInfo(null);
        setSubtotal(0);
      }
      return;
    }

    let cancelado = false;
    setCargandoDetalles(true);

    obtenerProductosDelCarritoAction(items)
      .then((res) => {
        if (!cancelado) {
          setItemsDetallados(res.itemsValidos);
          setDescuentoInfo(res.descuento);
          setSubtotal(res.subtotalPss);
        }
      })
      .catch((err) => {
        console.error('Error al sincronizar vista previa del carrito:', err);
      })
      .finally(() => {
        if (!cancelado) {
          setCargandoDetalles(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [miniCartAbierto, items]);

  // Cerrar al hacer clic fuera del popover y del botón de carrito
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        cartBtnRef.current &&
        !cartBtnRef.current.contains(event.target as Node)
      ) {
        setMiniCartAbierto(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMiniCartAbierto(false);
      }
    }

    if (miniCartAbierto) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [miniCartAbierto]);

  const hayItems = !cargandoCart && cantidadTotal > 0;

  return (
    <>
      {/* Ventana Flotante de Visualización Rápida del Carrito */}
      {miniCartAbierto && hayItems && (
        <div
          ref={popoverRef}
          id="popover-mini-carrito"
          role="dialog"
          aria-label="Vista previa del carrito"
          className="fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-[380px] max-w-[420px] max-h-[75vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Encabezado del Popover */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-neutral-900 text-white border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  Tu Carrito
                  <span className="text-[11px] font-medium text-gold-400 bg-neutral-800 px-2 py-0.5 rounded-full border border-gold-500/20">
                    {cantidadTotal} {cantidadTotal === 1 ? 'unidad' : 'unidades'}
                  </span>
                  {cargandoDetalles && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-400 shrink-0 ml-1" />
                  )}
                </h3>
              </div>
            </div>

            <button
              type="button"
              id="btn-cerrar-mini-carrito"
              onClick={() => setMiniCartAbierto(false)}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              aria-label="Cerrar vista previa del carrito"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cuerpo del Popover con scroll */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-neutral-100 max-h-[380px]">
            {itemsParaMostrar.length > 0 ? (
              itemsParaMostrar.map((item) => (
                <div
                  key={item.variante ? `${item.tipo}-${item.id}-${item.variante}` : `${item.tipo}-${item.id}`}
                  className="pt-3 first:pt-0 flex items-center justify-between gap-3 text-xs"
                >
                  {/* Imagen y descripción */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="relative w-11 h-11 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200 shrink-0 flex items-center justify-center">
                      {item.imagen ? (
                        <Image
                          src={item.imagen}
                          alt={item.nombre}
                          fill
                          sizes="44px"
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-900 truncate leading-tight">
                        {item.nombre}
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {item.presentacion}
                      </p>
                      <p className="text-[11px] font-medium text-gold-700 mt-0.5">
                        {formatoMoneda.format(item.precioUnitarioPss)} c/u
                      </p>
                    </div>
                  </div>

                  {/* Controles de cantidad y precio final */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center border border-neutral-200 rounded-lg bg-neutral-50 overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleActualizarCantidadMiniCart(item.id, item.cantidad - 1, item.tipo, item.variante)}
                        aria-label="Disminuir cantidad"
                        className="p-1 hover:bg-white text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
                      >
                        {item.cantidad === 1 ? (
                          <Trash2 className="w-3 h-3 text-red-500" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                      </button>

                      <span className="w-6 text-center font-bold text-neutral-800 text-[11px]">
                        {item.cantidad}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleActualizarCantidadMiniCart(item.id, item.cantidad + 1, item.tipo, item.variante)}
                        aria-label="Aumentar cantidad"
                        className="p-1 hover:bg-white text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-bold text-neutral-900 text-xs">
                      {formatoMoneda.format(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-neutral-500 text-xs">
                El carrito está vacío
              </div>
            )}
          </div>

          {/* Pie del Popover con Subtotal, Descuento y Botón al Carrito */}
          <div className="p-4 bg-neutral-50 border-t border-neutral-200 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-semibold text-neutral-900">
                  {formatoMoneda.format(subtotalEfectivo)}
                </span>
              </div>

              {descuentoInfo && descuentoInfo.montoDescuento > 0 && (
                <div className="flex justify-between items-center text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 text-[11px] font-medium">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    {descuentoInfo.etiqueta}
                  </span>
                  <span>-{formatoMoneda.format(descuentoInfo.montoDescuento)}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline text-sm font-bold text-neutral-900 pt-1 border-t border-neutral-200">
                <span>Total Estimado</span>
                <span className="text-gold-700 text-base">
                  {formatoMoneda.format(totalEfectivo)}
                </span>
              </div>
            </div>

            <Link
              href="/carrito"
              id="btn-ir-al-carrito-flotante"
              onClick={() => setMiniCartAbierto(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gold-500 hover:bg-gold-600 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer"
            >
              <span>Ver Carrito Completo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Contenedor de Botones Flotantes (Fijo abajo a la derecha) */}
      <aside
        id="contenedor-acciones-flotantes"
        aria-label="Acciones rápidas de contacto y carrito"
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex items-center gap-3"
      >
        {/* Botón Flotante del Carrito (aparece cuando hay items cargados) */}
        {hayItems && (
          <button
            ref={cartBtnRef}
            type="button"
            id="btn-flotante-carrito"
            onClick={() => setMiniCartAbierto((prev) => !prev)}
            aria-label={
              miniCartAbierto
                ? 'Cerrar vista rápida del carrito'
                : `Ver carrito (${cantidadTotal} productos)`
            }
            aria-expanded={miniCartAbierto}
            className={`relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-200 cursor-pointer shadow-xl hover:scale-105 active:scale-95 animate-in zoom-in-75 ${
              miniCartAbierto
                ? 'bg-gold-500 text-white ring-4 ring-gold-400/30'
                : 'bg-neutral-900 hover:bg-neutral-800 text-gold-400 border border-gold-500/40 hover:border-gold-400'
            }`}
            title="Ver carrito de compras"
          >
            <ShoppingBag className="w-6 h-6" />

            {/* Badge de cantidad total */}
            <span
              id="badge-flotante-carrito-cantidad"
              className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center text-[11px] font-extrabold bg-gold-500 text-white rounded-full border-2 border-white shadow-md animate-in zoom-in-50 duration-200"
            >
              {cantidadTotal > 99 ? '99+' : cantidadTotal}
            </span>
          </button>
        )}

        {/* Botón Flotante de WhatsApp (siempre presente en todas las páginas) */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          id="btn-flotante-whatsapp"
          aria-label="Contactar a Steffen por WhatsApp"
          className="relative flex items-center justify-center w-14 h-14 rounded-full hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer group focus:outline-none drop-shadow-xl hover:drop-shadow-2xl"
          title="Escribinos por WhatsApp"
        >
          <Image
            src="/whatsapp-logo.svg"
            alt="WhatsApp Steffen"
            width={56}
            height={56}
            className="w-full h-full object-contain transition-transform duration-200"
            referrerPolicy="no-referrer"
            priority
          />
        </a>
      </aside>
    </>
  );
}
