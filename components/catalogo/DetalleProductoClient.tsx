'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/lib/context/CartContext';
import { ProductoDTO, ProductoCard } from './ProductoCard';
import { 
  Sparkles, 
  Star, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Check, 
  Lock, 
  ArrowLeft, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  MessageSquare, 
  CheckCircle2, 
  Send,
  Building2,
  MapPin,
  HelpCircle,
  Tag,
  Share2
} from 'lucide-react';
import { agregarComentarioAction } from '@/app/actions/comentarios';
import { parsearVariantes, obtenerPreciosEfectivosProducto } from '@/lib/utils/variantes';

export interface ComentarioDTO {
  id: string;
  nombreSalon: string;
  nombreAutor: string;
  localidad: string | null;
  calificacion: number;
  comentario: string;
  verificado: boolean;
  createdAt: string;
}

interface DetalleProductoClientProps {
  producto: ProductoDTO;
  productosRelacionados: ProductoDTO[];
  comentariosIniciales: ComentarioDTO[];
  usuarioLogueado?: boolean;
  estadoCliente?: string | null;
  salonNombre?: string;
  clienteAutorNombre?: string;
  clienteUbicacion?: string;
  esAdmin?: boolean;
  descuentoEstimadoPorcentaje?: number | null;
}

export function DetalleProductoClient({
  producto,
  productosRelacionados,
  comentariosIniciales,
  usuarioLogueado = false,
  estadoCliente = null,
  salonNombre = '',
  clienteAutorNombre = '',
  clienteUbicacion = '',
  esAdmin = false,
  descuentoEstimadoPorcentaje = null,
}: DetalleProductoClientProps) {
  const [cantidad, setCantidad] = useState<number>(1);
  const [agregadoReciente, setAgregadoReciente] = useState<boolean>(false);
  const [pestañaActiva, setPestañaActiva] = useState<'descripcion' | 'uso' | 'rendimiento'>('descripcion');
  const [copiadoLink, setCopiadoLink] = useState<boolean>(false);

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

  // Estado de comentarios
  const [comentarios, setComentarios] = useState<ComentarioDTO[]>(comentariosIniciales);
  const [mostrarFormComentario, setMostrarFormComentario] = useState<boolean>(false);
  const [formCalificacion, setFormCalificacion] = useState<number>(5);
  const [hoverCalificacion, setHoverCalificacion] = useState<number>(0);
  const [formComentario, setFormComentario] = useState<string>('');
  const [enviandoComentario, setEnviandoComentario] = useState<boolean>(false);
  const [errorComentario, setErrorComentario] = useState<string | null>(null);
  const [exitoComentario, setExitoComentario] = useState<string | null>(null);

  const { agregarItem } = useCart();

  const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  const esActivo = estadoCliente === 'ACTIVO';
  const esPendiente = estadoCliente === 'PENDIENTE_APROBACION';
  const puedeOpinar = usuarioLogueado && (esActivo || esAdmin);

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
    agregarItem(producto.id, cantidad, 'PRODUCTO', varianteSeleccionada, {
      nombre: producto.nombre,
      imagen: producto.imagen,
      categoria: producto.categoria,
      presentacion: producto.presentacion,
      precioUnitario: precioVisibleCalculado,
    });
    setAgregadoReciente(true);
    setTimeout(() => setAgregadoReciente(false), 2500);
  };

  const handleCopiarEnlace = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiadoLink(true);
      setTimeout(() => setCopiadoLink(false), 2000);
    }
  };

  const handleEnviarComentario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorComentario(null);
    setExitoComentario(null);

    if (!puedeOpinar) {
      setErrorComentario('Debes iniciar sesión con una cuenta de salón profesional autorizada para publicar tu opinión.');
      return;
    }

    if (!formComentario.trim() || formComentario.trim().length < 5) {
      setErrorComentario('Por favor escribí un comentario de al menos 5 caracteres.');
      return;
    }

    setEnviandoComentario(true);
    try {
      const res = await agregarComentarioAction({
        productoId: producto.id,
        calificacion: formCalificacion,
        comentario: formComentario,
      });

      if (res.success && res.comentario) {
        setComentarios((prev) => [res.comentario!, ...prev]);
        setExitoComentario('¡Gracias por tu reseña! Tu opinión técnica de salón ha sido publicada.');
        setFormComentario('');
        setFormCalificacion(5);
        setTimeout(() => {
          setMostrarFormComentario(false);
          setExitoComentario(null);
        }, 3000);
      } else {
        setErrorComentario(res.error || 'Ocurrió un error al enviar el comentario.');
      }
    } catch {
      setErrorComentario('Ocurrió un error de conexión al enviar el comentario.');
    } finally {
      setEnviandoComentario(false);
    }
  };

  // Cálculo del promedio de estrellas
  const promedioEstrellas = comentarios.length > 0
    ? (comentarios.reduce((acc, curr) => acc + curr.calificacion, 0) / comentarios.length).toFixed(1)
    : '5.0';

  const precioConDescuento = descuentoEstimadoPorcentaje && descuentoEstimadoPorcentaje > 0
    ? precioVisibleCalculado * (1 - descuentoEstimadoPorcentaje / 100)
    : null;

  return (
    <div id="detalle-producto-client" className="space-y-12">
      {/* Navegación Breadcrumb y Volver */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-500 font-medium">
          <Link href="/catalogo" className="hover:text-gold-600 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Catálogo</span>
          </Link>
          <span>/</span>
          <span className="text-neutral-700">{producto.categoria}</span>
          <span>/</span>
          <span className="text-neutral-900 font-bold truncate max-w-[200px] sm:max-w-xs">
            {producto.nombre}
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
              <span>Compartir producto</span>
            </>
          )}
        </button>
      </div>

      {/* Grid Principal: Galería de Fotos a la izquierda + Ficha de Compra a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Columna Izquierda: Imagen y Galería (5 columnas en LG) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative w-full aspect-square bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm flex items-center justify-center p-4">
            <Image
              src={producto.imagen}
              alt={producto.nombre}
              fill
              sizes="(max-width: 768px) 100vw, 45vw"
              className="object-contain p-4 hover:scale-105 transition-transform duration-300"
              priority
              referrerPolicy="no-referrer"
            />

            {/* Badges Flotantes */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              {producto.destacado && (
                <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold uppercase tracking-wider bg-gold-500 text-white rounded-full shadow-md">
                  <Sparkles className="w-3.5 h-3.5 fill-white" /> Destacado
                </span>
              )}
              {producto.recomendado && (
                <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white rounded-full shadow-md">
                  <Star className="w-3.5 h-3.5 fill-white" /> Recomendado para Salones
                </span>
              )}
            </div>

            <div className="absolute bottom-4 right-4 z-10">
              <span className="px-3 py-1.5 text-xs font-bold bg-neutral-900/90 text-white backdrop-blur-md rounded-xl shadow-md border border-neutral-700">
                {producto.presentacion}
              </span>
            </div>
          </div>

          {/* Mini-garantías para salones */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-white border border-neutral-200 rounded-2xl">
              <Truck className="w-4 h-4 mx-auto text-gold-600 mb-1" />
              <p className="text-[11px] font-bold text-neutral-800">Despacho Rápido</p>
              <p className="text-[10px] text-neutral-500">Directo de Fábrica</p>
            </div>
            <div className="p-3 bg-white border border-neutral-200 rounded-2xl">
              <ShieldCheck className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
              <p className="text-[11px] font-bold text-neutral-800">100% Profesional</p>
              <p className="text-[10px] text-neutral-500">Fórmula Premium</p>
            </div>
            <div className="p-3 bg-white border border-neutral-200 rounded-2xl">
              <RotateCcw className="w-4 h-4 mx-auto text-blue-600 mb-1" />
              <p className="text-[11px] font-bold text-neutral-800">Stock Garantizado</p>
              <p className="text-[10px] text-neutral-500">Para Salones</p>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Ficha del Producto, Precios y Agregar al Carrito (7 columnas en LG) */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          {/* Categoría, Subcategoría y Valoración */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-full bg-gold-50 text-gold-800 border border-gold-200">
                {producto.categoria}
              </span>
              {producto.subcategoria && (
                <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700">
                  {producto.subcategoria}
                </span>
              )}
            </div>

            {/* Estrellas y cantidad de opiniones */}
            <a
              href="#seccion-comentarios"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-gold-600 transition-colors"
            >
              <div className="flex items-center text-amber-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                ))}
              </div>
              <span className="font-bold text-neutral-900">{promedioEstrellas}</span>
              <span className="text-neutral-500">({comentarios.length} {comentarios.length === 1 ? 'opinión' : 'opiniones'})</span>
            </a>
          </div>

          {/* Título Principal */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight leading-snug">
              {producto.nombre}
            </h1>
            <div className="flex items-center gap-3 text-xs text-neutral-500 font-medium">
              <span>Presentación: <strong className="text-neutral-800">{producto.presentacion}</strong></span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Stock disponible ({producto.stock > 0 ? `${producto.stock} unidades` : 'Inmediato'})
              </span>
            </div>
          </div>

          {/* Selector de Variantes (si tiene) */}
          {variantesDisponibles.length > 0 && (
            <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Seleccionar Variante / Opción:
                </span>
                <span className="text-xs font-semibold text-gold-700">
                  {varianteSeleccionada || 'Elegir opción'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {variantesDisponibles.map((v) => {
                  const isSelected =
                    (varianteSeleccionada || '').trim().toLowerCase() ===
                    v.nombre.trim().toLowerCase();

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
                      className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all border flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                          : 'bg-white text-neutral-800 border-neutral-300 hover:border-neutral-500 hover:bg-neutral-100'
                      }`}
                    >
                      <span>{v.nombre}</span>
                      {tienePrecioDiferente && (
                        <span
                          className={`text-xs font-bold ${
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

          {/* Bloque de Precio y Beneficios */}
          <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <span className="block text-xs uppercase tracking-wider text-neutral-500 font-bold">
                  {producto.tipoPrecio === 'PROFESIONAL' ? 'Precio Salón Profesional Directo de Fábrica' : 'Precio Público Sugerido'}
                </span>
                <div className="flex items-baseline gap-3 mt-0.5">
                  <span className="text-3xl font-black text-neutral-900 tracking-tight">
                    {formatoMoneda.format(precioVisibleCalculado)}
                  </span>
                  {descuentoEstimadoPorcentaje && descuentoEstimadoPorcentaje > 0 && precioConDescuento && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm line-through text-neutral-400 font-semibold">
                        {formatoMoneda.format(precioVisibleCalculado)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-gold-500 text-white text-xs font-extrabold">
                        {descuentoEstimadoPorcentaje}% OFF
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {producto.tipoPrecio === 'PROFESIONAL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  Tarifa Salón
                </span>
              )}
            </div>

            {/* Aviso de descuento activo en el carrito */}
            {descuentoEstimadoPorcentaje && descuentoEstimadoPorcentaje > 0 && precioConDescuento && (
              <p className="text-xs text-gold-800 bg-gold-50/80 border border-gold-200 rounded-xl p-2.5 flex items-center gap-2">
                <Tag className="w-4 h-4 text-gold-600 shrink-0" />
                <span>
                  Con tu beneficio activo del <strong>{descuentoEstimadoPorcentaje}% OFF</strong> pagás <strong>{formatoMoneda.format(precioConDescuento)}</strong> por unidad al confirmar tu pedido.
                </span>
              </p>
            )}

            {/* Tarjeta de Precio Profesional Bloqueado (para cuentas pendientes) */}
            {precioBloqueadoCalculado !== null && (
              <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Precio Profesional Salón:</span>
                  <span className="inline-block select-none filter blur-[4.5px] opacity-75 font-black text-amber-950 bg-amber-200/60 px-2 py-0.5 rounded tracking-wider pointer-events-none">
                    {formatoMoneda.format(precioBloqueadoCalculado)}
                  </span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Tu cuenta está en proceso de aprobación comercial. Podés ir armando tu pedido con la referencia pública o aguardar la confirmación para acceder a la lista directa.
                </p>
              </div>
            )}

            {/* Invitación a registrarse si es visitante no logueado */}
            {producto.tipoPrecio === 'PUBLICO' && !precioBloqueadoCalculado && !usuarioLogueado && (
              <div className="p-3.5 rounded-xl bg-gold-50 border border-gold-200 text-xs text-gold-900 space-y-1.5">
                <p className="font-bold text-gold-950 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-gold-700" />
                  ¿Tenés un salón de belleza o peluquería?
                </p>
                <p className="text-gold-800">
                  Registrate como salón profesional para desbloquear las listas de precios salón profesional directas de fábrica y tu 20% OFF de bienvenida.
                </p>
                <Link
                  href="/registro"
                  className="inline-flex items-center gap-1 text-xs font-bold text-gold-700 hover:text-gold-900 underline mt-1"
                >
                  <span>Registrar mi salón ahora →</span>
                </Link>
              </div>
            )}
          </div>

          {/* Selector de Cantidad y Botón de Compra */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Selector numérico */}
              <div className="flex items-center justify-between sm:justify-start bg-neutral-100 border border-neutral-300 rounded-2xl p-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleDecrement}
                  aria-label="Disminuir cantidad"
                  className="w-10 h-10 rounded-xl bg-white text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={handleCantidadChange}
                  aria-label="Cantidad"
                  className="w-16 text-center text-sm font-bold text-neutral-900 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={handleIncrement}
                  aria-label="Aumentar cantidad"
                  className="w-10 h-10 rounded-xl bg-white text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Botón Principal Agregar al Carrito */}
              <button
                type="button"
                id={`btn-detalle-agregar-${producto.id}`}
                onClick={handleAgregarAlCarrito}
                className={`flex-1 py-4 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md ${
                  agregadoReciente
                    ? 'bg-emerald-600 text-white scale-[0.99] shadow-emerald-600/30'
                    : 'bg-gold-500 hover:bg-gold-400 active:scale-[0.99] text-white shadow-gold-500/25'
                }`}
              >
                {agregadoReciente ? (
                  <>
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>¡Agregado al Carrito ({cantidad} {cantidad === 1 ? 'u' : 'u'})!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" />
                    <span>Agregar al Carrito ({cantidad} {cantidad === 1 ? 'unidad' : 'unidades'})</span>
                  </>
                )}
              </button>
            </div>

            {/* Accesos rápidos de cantidad para salones (+3, +6, +12) */}
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="font-semibold">Cantidades habituales para salón:</span>
              {[3, 6, 12].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCantidad(num)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    cantidad === num
                      ? 'bg-gold-50 border-gold-400 text-gold-800'
                      : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  +{num} u.
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

          {/* Pestañas de Información Técnica */}
          <div className="pt-4 border-t border-neutral-100 space-y-4">
            <div className="flex border-b border-neutral-200 gap-4 text-xs sm:text-sm font-bold">
              <button
                type="button"
                onClick={() => setPestañaActiva('descripcion')}
                className={`pb-2.5 transition-colors relative cursor-pointer ${
                  pestañaActiva === 'descripcion'
                    ? 'text-gold-700 border-b-2 border-gold-500'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Descripción Completa
              </button>
              <button
                type="button"
                onClick={() => setPestañaActiva('uso')}
                className={`pb-2.5 transition-colors relative cursor-pointer ${
                  pestañaActiva === 'uso'
                    ? 'text-gold-700 border-b-2 border-gold-500'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Modo de Uso Profesional
              </button>
              <button
                type="button"
                onClick={() => setPestañaActiva('rendimiento')}
                className={`pb-2.5 transition-colors relative cursor-pointer ${
                  pestañaActiva === 'rendimiento'
                    ? 'text-gold-700 border-b-2 border-gold-500'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Rendimiento en Salón
              </button>
            </div>

            <div className="text-xs sm:text-sm text-neutral-600 leading-relaxed min-h-[90px]">
              {pestañaActiva === 'descripcion' && (
                <div className="space-y-2">
                  <p className="whitespace-pre-line">{producto.descripcion}</p>
                  <p className="text-neutral-500 text-xs">
                    Formulado bajo rigurosos estándares profesionales para satisfacer las exigencias de estilistas y salones de alta gama.
                  </p>
                </div>
              )}
              {pestañaActiva === 'uso' && (
                <div className="space-y-3 bg-neutral-50 p-4 sm:p-5 rounded-2xl border border-neutral-200/80">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-gold-600 shrink-0" />
                    <p className="font-bold text-neutral-900 text-xs sm:text-sm">Protocolo Técnico y Modo de Uso en Salón:</p>
                  </div>
                  {producto.modoUso ? (
                    <div className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                      {producto.modoUso}
                    </div>
                  ) : (
                    <ol className="list-decimal list-inside space-y-1.5 text-neutral-700 text-xs">
                      <li>Diagnóstico capilar previo y lavado con shampoo técnico Steffen.</li>
                      <li>Aplicar la cantidad adecuada de producto de medios a puntas masajeando suavemente mechón por mechón.</li>
                      <li>Dejar actuar el tiempo de pose sugerido según el diagnóstico y enjuagar con abundante agua tibia.</li>
                      <li>Proceder al peinado o finalización deseada con protección térmica.</li>
                    </ol>
                  )}
                </div>
              )}
              {pestañaActiva === 'rendimiento' && (
                <div className="space-y-3 bg-neutral-50 p-4 sm:p-5 rounded-2xl border border-neutral-200/80">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="font-bold text-neutral-900 text-xs sm:text-sm">Rendimiento y Rentabilidad para el Profesional:</p>
                  </div>
                  {producto.rendimientoSalon ? (
                    <div className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                      {producto.rendimientoSalon}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-700 leading-relaxed">
                      Presentación profesional de <strong>{producto.presentacion}</strong> con formulación de alta concentración de activos. Diseñado para maximizar el costo por servicio en el lavacabezas del salón y asegurar alta fidelización en reventa a clientas.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE COMENTARIOS Y OPINIONES DE SALONES */}
      <section id="seccion-comentarios" className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-200 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gold-600" />
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
                Opiniones de Salones Profesionales
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500">
              Experiencias y testimonios reales de salones autorizados que utilizan este producto en sus servicios.
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Tarjeta de promedio */}
            <div className="flex items-center gap-3 bg-amber-50/80 border border-amber-200 px-4 py-2.5 rounded-2xl">
              <div className="text-center">
                <span className="text-2xl font-black text-amber-900">{promedioEstrellas}</span>
                <span className="text-xs text-amber-700 font-semibold block">/ 5.0</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                  ))}
                </div>
                <p className="text-[11px] text-amber-800 font-bold">
                  {comentarios.length} {comentarios.length === 1 ? 'reseña de salón' : 'reseñas de salones'}
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-dejar-opinion-salon"
              onClick={() => setMostrarFormComentario(!mostrarFormComentario)}
              className="py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-sm"
            >
              {mostrarFormComentario ? 'Cerrar Formulario' : 'Dejar mi Opinión'}
            </button>
          </div>
        </div>

        {/* Formulario / Mensaje de Estado para agregar opinión */}
        {mostrarFormComentario && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 sm:p-6 animate-in fade-in slide-in-from-top-3 duration-300 space-y-4">
            {puedeOpinar ? (
              <form onSubmit={handleEnviarComentario} className="space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                  <div>
                    <h3 className="font-bold text-neutral-900 text-sm sm:text-base">
                      Tu Opinión Profesional como Salón Verificado
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Tus datos de salón y ubicación se cargan automáticamente desde tu cuenta autorizada.
                    </p>
                  </div>
                  <span className="text-xs text-neutral-500">* Requerido</span>
                </div>

                {/* Tarjeta de Datos Autocompletados del Salón */}
                <div className="bg-gold-50/70 border border-gold-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gold-500 text-white rounded-xl font-bold shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                        <span>{salonNombre || (esAdmin ? 'Steffen Cosmética Capilar (Oficial)' : 'Salón Profesional')}</span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Cuenta Autorizada
                        </span>
                      </div>
                      <p className="text-neutral-600 mt-0.5 flex items-center gap-1.5">
                        <span>Profesional: <strong>{clienteAutorNombre || 'Estilista'}</strong></span>
                        {clienteUbicacion && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-gold-600" />
                              {clienteUbicacion}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-gold-800 bg-white/80 px-2.5 py-1 rounded-lg border border-gold-200 font-medium">
                    Datos validados por el sistema
                  </span>
                </div>

                {errorComentario && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                    {errorComentario}
                  </div>
                )}
                {exitoComentario && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium">
                    {exitoComentario}
                  </div>
                )}

                {/* Selector de Calificación en Estrellas */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Calificación del Producto *
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormCalificacion(star)}
                        onMouseEnter={() => setHoverCalificacion(star)}
                        onMouseLeave={() => setHoverCalificacion(0)}
                        aria-label={`Calificar con ${star} estrellas`}
                        className="p-1 text-neutral-300 hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            (hoverCalificacion || formCalificacion) >= star
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-neutral-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs text-neutral-700 font-bold ml-2">
                      {formCalificacion === 5 ? 'Excelente (5/5)' : `${formCalificacion} de 5 estrellas`}
                    </span>
                  </div>
                </div>

                {/* Texto de la opinión */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Tu Reseña Técnica o Testimonio *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formComentario}
                    onChange={(e) => setFormComentario(e.target.value)}
                    placeholder="Escribí tu experiencia: resultados en el cabello, textura, rendimiento en lavacabezas, fragancia o sugerencias técnicas para colegas..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-300 focus:outline-none focus:border-gold-500 bg-white leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setMostrarFormComentario(false)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviandoComentario}
                    className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {enviandoComentario ? (
                      <span>Publicando...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Publicar Opinión de Salón</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : esPendiente ? (
              <div className="p-4 sm:p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
                  <Lock className="w-4 h-4 text-amber-700" />
                  <span>Cuenta de Salón en Proceso de Autorización</span>
                </div>
                <p>
                  Tu cuenta de salón se encuentra actualmente en revisión por nuestro equipo comercial. Una vez que tu cuenta sea autorizada, podrás publicar reseñas y valoraciones de productos.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarFormComentario(false)}
                    className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 font-semibold rounded-lg text-xs transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-neutral-900 text-white rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gold-500/20 text-gold-400 rounded-lg">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      Opiniones Exclusivas de Salones Profesionales
                    </h4>
                    <p className="text-xs text-neutral-300 mt-1">
                      Para garantizar la veracidad técnica de las reseñas, solo salones profesionales registrados y autorizados por Steffen pueden opinar sobre los productos.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href="/login"
                    className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-white font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm"
                  >
                    Iniciar Sesión de Salón
                  </Link>
                  <Link
                    href="/registro"
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs rounded-xl transition-colors border border-neutral-700"
                  >
                    Registrar mi Peluquería
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lista de Comentarios */}
        <div className="space-y-4">
          {comentarios.length === 0 ? (
            <div className="text-center py-10 bg-neutral-50 rounded-2xl border border-dashed border-neutral-300 p-6 space-y-2">
              <MessageSquare className="w-8 h-8 text-neutral-400 mx-auto" />
              <p className="text-sm font-bold text-neutral-800">Todavía no hay comentarios para este producto</p>
              <p className="text-xs text-neutral-500">¿Probaste este producto en tu salón? ¡Sé el primero en dejar tu opinión técnica!</p>
              <button
                type="button"
                onClick={() => setMostrarFormComentario(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold-500 text-white text-xs font-bold hover:bg-gold-600 transition-colors cursor-pointer"
              >
                Escribir primera reseña
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {comentarios.map((c) => (
                <div
                  key={c.id}
                  className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/90 space-y-3 hover:border-gold-300 transition-colors"
                >
                  {/* Encabezado del Comentario */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gold-100 text-gold-800 font-black text-sm flex items-center justify-center border border-gold-200 shrink-0">
                        {c.nombreSalon.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-neutral-900 text-xs sm:text-sm">
                            {c.nombreSalon}
                          </h4>
                          {c.verificado && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Salón Verificado
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                          <span>{c.nombreAutor}</span>
                          {c.localidad && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                {c.localidad}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Estrellas */}
                    <div className="flex items-center text-amber-400 shrink-0">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= c.calificacion
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-neutral-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Cuerpo del comentario */}
                  <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                    "{c.comentario}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECCIÓN DE PRODUCTOS RELACIONADOS */}
      {productosRelacionados.length > 0 && (
        <section className="space-y-6 pt-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              Productos Relacionados y Recomendados
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Complementá el servicio de tu salón con otras fórmulas de la línea {producto.categoria}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {productosRelacionados.map((rel) => (
              <div
                key={rel.id}
                className="group relative flex flex-col justify-between bg-white border border-neutral-200 hover:border-gold-400 rounded-2xl p-4 transition-all duration-200 hover:shadow-lg shadow-sm"
              >
                <div>
                  <Link href={`/catalogo/${rel.id}`} className="block relative w-full aspect-square bg-neutral-100 rounded-xl overflow-hidden mb-3 border border-neutral-200">
                    <Image
                      src={rel.imagen}
                      alt={rel.nombre}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-2 right-2 z-10">
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-white/95 text-neutral-700 backdrop-blur-md rounded-md border border-neutral-200">
                        {rel.presentacion}
                      </span>
                    </div>
                  </Link>

                  <p className="text-[11px] font-semibold text-gold-700 mb-1">{rel.categoria}</p>
                  <Link href={`/catalogo/${rel.id}`} className="font-bold text-neutral-900 text-sm leading-snug line-clamp-2 mb-2 group-hover:text-gold-700 transition-colors">
                    {rel.nombre}
                  </Link>
                  <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed mb-3">
                    {rel.descripcion}
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-[10px] uppercase text-neutral-500 font-semibold">
                      {rel.tipoPrecio === 'PROFESIONAL' ? 'Precio Salón' : 'Precio Público'}
                    </span>
                    <span className="text-base font-extrabold text-neutral-900">
                      {formatoMoneda.format(rel.precioVisible)}
                    </span>
                  </div>

                  <Link
                    href={`/catalogo/${rel.id}`}
                    className="py-1.5 px-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-white font-bold text-xs transition-colors"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
