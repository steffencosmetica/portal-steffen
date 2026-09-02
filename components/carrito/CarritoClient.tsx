'use client';

import React, { useEffect, useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart, TipoItemCarrito } from '@/lib/context/CartContext';
import { 
  obtenerProductosDelCarritoAction, 
  ObtenerCarritoResultado,
  ItemCarritoServerResponse 
} from '@/app/actions/cart';
import { confirmarPedidoAction } from '@/app/actions/pedido';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowLeft, 
  AlertTriangle, 
  MessageSquare, 
  Percent,
  Loader2,
  PackageCheck,
  Sparkles,
  Lock
} from 'lucide-react';

interface CarritoClientProps {
  salonNombre?: string;
  usuarioId?: string;
  usuarioLogueado?: boolean;
  estadoCliente?: string | null;
}

export function CarritoClient({
  usuarioId,
  usuarioLogueado = false,
  estadoCliente = null,
}: CarritoClientProps) {
  const router = useRouter();
  const { items, actualizarCantidad, quitarItem, vaciarCarrito, setUsuarioId, cargando: contextCargando } = useCart();
  const [itemsDetalle, setItemsDetalle] = useState<ItemCarritoServerResponse[]>([]);
  const [subtotalPss, setSubtotalPss] = useState<number>(0);
  const [subtotalProductos, setSubtotalProductos] = useState<number>(0);
  const [subtotalPacks, setSubtotalPacks] = useState<number>(0);
  const [tieneDistribuidor, setTieneDistribuidor] = useState<boolean>(false);
  const [nombreDistribuidor, setNombreDistribuidor] = useState<string | null>(null);
  const [tipoPrecio, setTipoPrecio] = useState<'PUBLICO' | 'PROFESIONAL'>('PUBLICO');
  const [descuentoInfo, setDescuentoInfo] = useState<ObtenerCarritoResultado['descuento']>({
    tipoAplicado: 'SIN_DESCUENTO',
    porcentaje: 0,
    montoDescuento: 0,
    subtotalPss: 0,
    total: 0,
    reglaId: null,
    etiqueta: 'Sin descuento',
  });
  const [productosRemovidosAviso, setProductosRemovidosAviso] = useState<number>(0);
  const [mensajesAviso, setMensajesAviso] = useState<string[]>([]);
  const [errorConfirmacion, setErrorConfirmacion] = useState<string | null>(null);
  const [isSincronizando, startFetchTransition] = useTransition();
  const [isConfirmando, setIsConfirmando] = useState<boolean>(false);

  // Sincronizar el usuarioId en el contexto
  useEffect(() => {
    if (usuarioId) {
      setUsuarioId(usuarioId);
    }
  }, [usuarioId, setUsuarioId]);

  const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  // Vista preliminar instantánea (0ms) construida desde los items en localStorage
  const itemsParaMostrar = useMemo<ItemCarritoServerResponse[]>(() => {
    if (itemsDetalle.length > 0) {
      return itemsDetalle;
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
      tipoPrecio: (estadoCliente === 'ACTIVO' ? 'PROFESIONAL' : 'PUBLICO') as 'PUBLICO' | 'PROFESIONAL',
      subtotal: (it.precioUnitario || 0) * it.cantidad,
      disponible: true,
    }));
  }, [itemsDetalle, items, estadoCliente]);

  const subtotalEfectivo = useMemo(() => {
    if (subtotalPss > 0) return subtotalPss;
    return itemsParaMostrar.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  }, [subtotalPss, itemsParaMostrar]);

  const totalEfectivo = useMemo(() => {
    if (descuentoInfo.total > 0) return descuentoInfo.total;
    return subtotalEfectivo;
  }, [descuentoInfo.total, subtotalEfectivo]);

  // Modificación optimista inmediata de cantidades
  const handleActualizarCantidadItem = (
    id: string,
    nuevaCantidad: number,
    tipo?: TipoItemCarrito,
    variante?: string | null
  ) => {
    actualizarCantidad(id, nuevaCantidad, tipo, variante);
    setItemsDetalle((prev) => {
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

  const handleQuitarItemCarrito = (id: string, tipo?: TipoItemCarrito, variante?: string | null) => {
    quitarItem(id, tipo, variante);
    setItemsDetalle((prev) =>
      prev.filter(
        (i) => !(i.id === id && i.tipo === (tipo || 'PRODUCTO') && (i.variante || null) === (variante || null))
      )
    );
  };

  // Consultar datos frescos del servidor cada vez que los items en localStorage cambian
  useEffect(() => {
    if (contextCargando) return;

    let cancelado = false;

    startFetchTransition(async () => {
      if (items.length === 0) {
        if (!cancelado) {
          setItemsDetalle([]);
          setSubtotalPss(0);
          setSubtotalProductos(0);
          setSubtotalPacks(0);
          setTieneDistribuidor(false);
          setNombreDistribuidor(null);
          setTipoPrecio('PUBLICO');
          setDescuentoInfo({
            tipoAplicado: 'SIN_DESCUENTO',
            porcentaje: 0,
            montoDescuento: 0,
            subtotalPss: 0,
            total: 0,
            reglaId: null,
            etiqueta: 'Sin descuento',
          });
          setMensajesAviso([]);
        }
        return;
      }

      const resultado = await obtenerProductosDelCarritoAction(items);
      if (cancelado) return;

      // Si hubo productos/packs inactivos o no permitidos, quitarlos del estado del cliente
      if (resultado.itemsRemovidosIds && resultado.itemsRemovidosIds.length > 0) {
        resultado.itemsRemovidosIds.forEach((ri) => quitarItem(ri.id, ri.tipo));
        setProductosRemovidosAviso((prev) => prev + resultado.itemsRemovidosIds.length);
      }

      if (resultado.mensajesAviso && resultado.mensajesAviso.length > 0) {
        setMensajesAviso(resultado.mensajesAviso);
      }

      setItemsDetalle(resultado.itemsValidos);
      setSubtotalPss(resultado.subtotalPss);
      setSubtotalProductos(resultado.subtotalProductos || 0);
      setSubtotalPacks(resultado.subtotalPacks || 0);
      setTieneDistribuidor(Boolean(resultado.tieneDistribuidor));
      setNombreDistribuidor(resultado.nombreDistribuidor || null);
      setTipoPrecio(resultado.tipoPrecio);
      setDescuentoInfo(resultado.descuento);
    });

    return () => {
      cancelado = true;
    };
  }, [items, contextCargando, quitarItem]);

  // Manejo de la confirmación del pedido y envío a WhatsApp
  const handleConfirmarPedido = async () => {
    if (items.length === 0 || isConfirmando) return;

    if (!usuarioLogueado) {
      router.push('/login?redirect=/carrito');
      return;
    }

    setErrorConfirmacion(null);
    setIsConfirmando(true);

    try {
      const resultado = await confirmarPedidoAction(items);

      if (!resultado.success) {
        if (resultado.itemsRemovidosIds && resultado.itemsRemovidosIds.length > 0) {
          resultado.itemsRemovidosIds.forEach((id) => quitarItem(id));
          setProductosRemovidosAviso((prev) => prev + resultado.itemsRemovidosIds!.length);
        }
        setErrorConfirmacion(resultado.error || 'No se pudo procesar el pedido. Revisá tu carrito.');
        setIsConfirmando(false);
        return;
      }

      if (resultado.pedidoId && resultado.whatsappUrl) {
        vaciarCarrito();
        try {
          window.open(resultado.whatsappUrl, '_blank', 'noopener,noreferrer');
        } catch (e) {
          console.warn('Apertura de pestaña bloqueada por el navegador:', e);
        }
        router.push(`/pedido-enviado/${resultado.pedidoId}`);
      }
    } catch (err) {
      console.error('Error al confirmar pedido:', err);
      setErrorConfirmacion('Ocurrió un error inesperado. Por favor intentá nuevamente.');
      setIsConfirmando(false);
    }
  };

  // Si el carrito está completamente vacío
  if (!contextCargando && items.length === 0) {
    return (
      <div id="carrito-vacio" className="text-center py-16 max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-white border border-neutral-200 text-neutral-400 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">Tu carrito está vacío</h2>
        <p className="text-sm text-neutral-500 mb-8 leading-relaxed">
          Todavía no seleccionaste productos ni combos para tu pedido profesional. Explorá nuestro catálogo directo de fábrica.
        </p>
        <Link
          href="/catalogo"
          id="btn-ir-catalogo"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-white font-bold text-sm transition-all shadow-md shadow-gold-500/20 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ver Catálogo Profesional</span>
        </Link>
      </div>
    );
  }

  return (
    <div id="carrito-view-root" className="space-y-8">
      {/* Aviso de productos discontinuados / removidos automáticamente */}
      {productosRemovidosAviso > 0 && (
        <div
          id="aviso-removidos"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900 text-xs md:text-sm"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">Aviso de disponibilidad</p>
            <p className="mt-0.5 text-amber-800">
              Uno o más productos o packs ya no están disponibles en catálogo o no están autorizados para tu tipo de cuenta y fueron quitados de tu pedido.
            </p>
          </div>
        </div>
      )}

      {/* Avisos específicos */}
      {mensajesAviso.length > 0 && (
        <div className="space-y-2">
          {mensajesAviso.map((msg, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-neutral-500 shrink-0" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Mensaje de Error si la acción de confirmación falló */}
      {errorConfirmacion && (
        <div
          id="error-confirmacion"
          className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-xs md:text-sm"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-bold text-red-900">No se pudo enviar el pedido</p>
            <p className="mt-0.5 text-red-700">{errorConfirmacion}</p>
          </div>
        </div>
      )}

      {/* Grid Principal: Listado de Ítems (Izq) y Resumen de Totales (Der) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Columna Izquierda: Tabla/Lista de Ítems */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-gold-600" />
                Productos y Packs Seleccionados ({itemsParaMostrar.reduce((acc, curr) => acc + curr.cantidad, 0)})
              </h2>
              {isSincronizando && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gold-50 border border-gold-200 text-[10px] text-gold-700 font-medium animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin text-gold-500" />
                  Sincronizando precios...
                </span>
              )}
            </div>
            <button
              onClick={vaciarCarrito}
              disabled={isConfirmando}
              className="text-xs text-neutral-400 hover:text-red-600 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar pedido</span>
            </button>
          </div>

          {/* Listado de Productos con datos frescos de la BD */}
          <div className="space-y-3" id="lista-items-carrito">
            {itemsParaMostrar.map((item) => (
              <div
                key={item.variante ? `${item.tipo}-${item.id}-${item.variante}` : `${item.tipo}-${item.id}`}
                id={`item-carrito-${item.tipo.toLowerCase()}-${item.id}${item.variante ? `-${item.variante.toLowerCase().replace(/\s+/g, '-')}` : ''}`}
                className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-neutral-300 shadow-sm"
              >
                {/* Imagen y Detalles */}
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 shrink-0 bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200">
                    <Image
                      src={item.imagen}
                      alt={item.nombre}
                      fill
                      sizes="64px"
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        item.tipo === 'PACK' 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                          : 'text-gold-700 bg-gold-50'
                      }`}>
                        {item.tipo === 'PACK' ? 'COMBO / PACK' : item.categoria}
                      </span>

                      {item.variante && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-900 text-gold-400 border border-neutral-700">
                          {item.variante}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-neutral-900 text-sm line-clamp-1 mt-0.5">{item.nombre}</h3>
                    
                    {item.tipo === 'PACK' && item.productosIncluidos && (
                      <div className="text-[11px] text-neutral-500 mt-1 flex flex-wrap gap-1">
                        <span className="font-medium text-neutral-700">Incluye:</span>
                        {item.productosIncluidos.map((p, idx) => (
                          <span key={idx} className="bg-neutral-100 px-1.5 py-0.5 rounded text-[10px] text-neutral-600">
                            {p.cantidad}x {p.nombre}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-neutral-500 mt-1">
                      {item.tipo === 'PRODUCTO' && (
                        <>Presentación: <span className="text-neutral-700 font-medium">{item.presentacion}</span> • </>
                      )}
                      Precio unitario:{' '}
                      <strong className="text-neutral-800">{formatoMoneda.format(item.precioUnitarioPss)}</strong>
                      <span className="ml-1 text-[10px] text-neutral-500">
                        ({item.tipo === 'PACK' ? 'Precio Combo Profesional' : item.tipoPrecio === 'PROFESIONAL' ? 'Precio Salón Profesional' : 'Precio Público'})
                      </span>
                    </p>

                    {item.tipo === 'PACK' && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-[11px] text-amber-900 flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                        <div className="leading-snug">
                          <span className="font-bold text-amber-900 block">
                            Pack con precio promocional
                          </span>
                          <span className="text-amber-800">
                            {item.tieneDistribuidor || tieneDistribuidor ? (
                              <>
                                En cuentas con distribuidor asignado <strong>no aplica el descuento de la cuenta</strong> ya que el precio que posee el pack es promocional de por sí.
                              </>
                            ) : (
                              <>
                                Este pack posee un <strong>precio promocional cerrado</strong> de por sí y no acumula descuentos de reposición.
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    {item.precioProfesionalBloqueado !== undefined && item.precioProfesionalBloqueado !== null && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-neutral-600 font-medium bg-neutral-100/90 border border-neutral-200/80 rounded-md px-2 py-0.5 w-fit">
                        <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span>Precio Salón:</span>
                        <span className="inline-block select-none filter blur-[4.5px] opacity-75 text-neutral-700 font-bold tracking-wider bg-neutral-200/60 px-1.5 py-0.5 rounded pointer-events-none">
                          {formatoMoneda.format(item.precioProfesionalBloqueado)}
                        </span>
                        <span className="text-[10px] text-neutral-400 hidden sm:inline">(al aprobar tu cuenta)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cantidad y Subtotal */}
                <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                  {/* Selector Numérico */}
                  <div className="flex items-center bg-neutral-50 border border-neutral-300 rounded-xl p-1 shrink-0">
                    <button
                      type="button"
                      disabled={isConfirmando}
                      onClick={() => handleActualizarCantidadItem(item.id, item.cantidad - 1, item.tipo, item.variante)}
                      aria-label="Disminuir cantidad"
                      className="w-7 h-7 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-9 text-center text-xs font-bold text-neutral-900">
                      {item.cantidad}
                    </span>
                    <button
                      type="button"
                      disabled={isConfirmando}
                      onClick={() => handleActualizarCantidadItem(item.id, item.cantidad + 1, item.tipo, item.variante)}
                      aria-label="Aumentar cantidad"
                      className="w-7 h-7 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Subtotal del Ítem */}
                  <div className="text-right min-w-[90px]">
                    <span className="block text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Subtotal</span>
                    <span className="text-sm font-bold text-neutral-900">
                      {formatoMoneda.format(item.subtotal)}
                    </span>
                  </div>

                  {/* Quitar Ítem */}
                  <button
                    type="button"
                    disabled={isConfirmando}
                    onClick={() => handleQuitarItemCarrito(item.id, item.tipo, item.variante)}
                    aria-label="Eliminar ítem"
                    className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 text-xs md:text-sm text-neutral-600 hover:text-gold-700 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Continuar sumando productos al pedido</span>
            </Link>
          </div>
        </div>

        {/* Columna Derecha: Resumen de Totales y Reglas de Envío */}
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-neutral-900 tracking-tight pb-3 border-b border-neutral-200">
              Resumen del Pedido
            </h2>

            {/* Banner explicativo si no es ACTIVO */}
            {(!usuarioLogueado || estadoCliente !== 'ACTIVO') && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold">
                  {!usuarioLogueado
                    ? '¿Sos profesional o dueño de salón?'
                    : 'Cuenta profesional en revisión'}
                </p>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  {!usuarioLogueado
                    ? 'Iniciá sesión o registrá tu salón para acceder a un 20% OFF en tu primera compra, combos exclusivos y listas profesionales.'
                    : 'Tu solicitud está en revisión. Ya podés hacer tu pedido con precios públicos de referencia y aprovechar tu descuento de bienvenida.'}
                </p>
              </div>
            )}

            {/* Subtotales y Descuento */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>{tipoPrecio === 'PROFESIONAL' ? 'Subtotal Salón Profesional' : 'Subtotal Público'}</span>
                <span className="font-semibold text-neutral-900">
                  {formatoMoneda.format(subtotalEfectivo)}
                </span>
              </div>

              {/* Fila de Descuento Dinámico (para cualquier cliente logueado) */}
              {descuentoInfo.montoDescuento > 0 ? (
                <div className="flex justify-between items-center text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold block text-xs">
                        Descuento ({descuentoInfo.porcentaje}%)
                      </span>
                      <span className="text-[10px] text-emerald-600 block">
                        {descuentoInfo.etiqueta} (aplica a productos individuales)
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-sm">
                    -{formatoMoneda.format(descuentoInfo.montoDescuento)}
                  </span>
                </div>
              ) : (
                usuarioLogueado && (
                  <div className="flex justify-between text-xs text-neutral-400 px-1">
                    <span>Descuento aplicado</span>
                    <span>Sin descuento</span>
                  </div>
                )
              )}

              {/* Aviso si hay packs en el pedido */}
              {subtotalPacks > 0 && tieneDistribuidor && (
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    En tu cuenta con distribuidor asignado <strong>no aplica el descuento de la cuenta sobre los packs</strong>, ya que el precio que posee cada combo es promocional de por sí.
                  </p>
                </div>
              )}

              {/* Total Final */}
              <div className="pt-3 border-t border-neutral-200 flex justify-between items-baseline">
                <span className="text-base font-bold text-neutral-900">Total a Transferir</span>
                <span className="text-2xl font-black text-neutral-900 tracking-tight">
                  {formatoMoneda.format(totalEfectivo)}
                </span>
              </div>
            </div>

            {/* Botón de Confirmación Principal */}
            <button
              id="btn-confirmar-pedido-whatsapp"
              type="button"
              disabled={isConfirmando || itemsParaMostrar.length === 0}
              onClick={handleConfirmarPedido}
              className="w-full py-4 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {isConfirmando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Procesando y registrando pedido...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" />
                  <span>
                    {!usuarioLogueado ? 'Iniciar Sesión y Confirmar' : 'Confirmar Pedido por WhatsApp'}
                  </span>
                </>
              )}
            </button>

            {/* Reglas Claras de Envío y Transferencia */}
            <div className="pt-4 border-t border-neutral-100 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-neutral-500">
                <PackageCheck className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-neutral-700 font-semibold">Envío a todo el país:</strong> El costo de envío se coordinará y confirmará directamente por WhatsApp según tu localidad o transporte preferido.
                </p>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-neutral-500">
                <Sparkles className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-neutral-700 font-semibold">Pago por Transferencia:</strong> Al confirmar el pedido por WhatsApp, recibirás los datos para realizar la transferencia/deposito.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
