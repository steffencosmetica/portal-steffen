'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { guardarPackAction, PackItemInput } from '@/app/actions/admin/packs';
import { ETIQUETAS_PACK, ETIQUETAS_PACK_CONFIG, EtiquetaPack } from '@/lib/constants/packs';
import { obtenerUnidadesExhibidora } from '@/lib/services/reventa';
import {
  Package,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Save,
  Calendar,
  Sparkles,
  DollarSign,
  Layers,
  Tag,
  Image as ImageIcon
} from 'lucide-react';

export interface ProductoOption {
  id: string;
  nombre: string;
  categoria: string;
  presentacion: string;
  precioPss: number;
  precioEcommerce?: number;
  precioReventa?: number | null;
  stock: number;
  activo: boolean;
  imagen: string;
}

interface PackFormProps {
  packInicial?: {
    id: string;
    nombre: string;
    descripcion: string;
    imagen: string;
    etiqueta?: string | null;
    precioPromocional?: number;
    descuentoDistribuidor?: number | null;
    descuentoDirecto?: number | null;
    precioOriginal?: number | null;
    precioDistribuidor?: number | null;
    precioDirecto?: number | null;
    activo: boolean;
    destacado: boolean;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    items: Array<{
      productoId: string;
      cantidad: number;
    }>;
  };
  productosDisponibles: ProductoOption[];
}

export function PackForm({ packInicial, productosDisponibles }: PackFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [nombre, setNombre] = useState(packInicial?.nombre || '');
  const [descripcion, setDescripcion] = useState(packInicial?.descripcion || '');
  const [etiqueta, setEtiqueta] = useState<string>(packInicial?.etiqueta || '');
  const [imagen, setImagen] = useState(
    packInicial?.imagen || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80'
  );

  const [descuentoDistribuidor, setDescuentoDistribuidor] = useState<string>(
    packInicial?.descuentoDistribuidor !== undefined && packInicial?.descuentoDistribuidor !== null
      ? String(packInicial.descuentoDistribuidor)
      : ''
  );
  const [descuentoDirecto, setDescuentoDirecto] = useState<string>(
    packInicial?.descuentoDirecto !== undefined && packInicial?.descuentoDirecto !== null
      ? String(packInicial.descuentoDirecto)
      : ''
  );

  const [activo, setActivo] = useState<boolean>(packInicial?.activo ?? true);
  const [destacado, setDestacado] = useState<boolean>(packInicial?.destacado ?? false);

  const [fechaInicio, setFechaInicio] = useState<string>(
    packInicial?.fechaInicio ? packInicial.fechaInicio.slice(0, 10) : ''
  );
  const [fechaFin, setFechaFin] = useState<string>(
    packInicial?.fechaFin ? packInicial.fechaFin.slice(0, 10) : ''
  );

  const [items, setItems] = useState<PackItemInput[]>(
    packInicial?.items && packInicial.items.length > 0
      ? packInicial.items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad }))
      : []
  );

  // Estado para selector de nuevo item
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState<string>('');
  const [cantidadInput, setCantidadInput] = useState<number>(1);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  const productosMap = useMemo(() => {
    return new Map(productosDisponibles.map((p) => [p.id, p]));
  }, [productosDisponibles]);

  // Cálculos dinámicos automáticos del precio base según productos
  const sumaPssEquivalente = useMemo(() => {
    return items.reduce((acc, curr) => {
      const prod = productosMap.get(curr.productoId);
      return acc + (prod ? prod.precioPss * curr.cantidad : 0);
    }, 0);
  }, [items, productosMap]);

  const descDistNum = Math.min(100, Math.max(0, Number(descuentoDistribuidor) || 0));
  const descDirectoNum = Math.min(100, Math.max(0, Number(descuentoDirecto) || 0));

  const precioConDistribuidorCalculado = useMemo(() => {
    if (sumaPssEquivalente <= 0) return 0;
    return Math.round(sumaPssEquivalente * (1 - descDistNum / 100));
  }, [sumaPssEquivalente, descDistNum]);

  const precioSinDistribuidorCalculado = useMemo(() => {
    if (sumaPssEquivalente <= 0) return 0;
    return Math.round(sumaPssEquivalente * (1 - descDirectoNum / 100));
  }, [sumaPssEquivalente, descDirectoNum]);

  const ahorroDist = sumaPssEquivalente > 0 && descDistNum > 0 ? sumaPssEquivalente - precioConDistribuidorCalculado : 0;
  const ahorroDirecto = sumaPssEquivalente > 0 && descDirectoNum > 0 ? sumaPssEquivalente - precioSinDistribuidorCalculado : 0;

  // Proyección de potencial de reventa si el pack es de tipo Reventa
  const esPackReventa = useMemo(() => {
    const et = (etiqueta || '').toLowerCase();
    const nom = (nombre || '').toLowerCase();
    return et.includes('reventa') || nom.includes('reventa');
  }, [etiqueta, nombre]);

  const proyeccionReventa = useMemo(() => {
    if (!esPackReventa || items.length === 0) return null;

    let facturacionTotal = 0;
    const itemsDetalle = items.map((it) => {
      const prod = productosMap.get(it.productoId);
      const precioSugerido =
        prod?.precioReventa && prod.precioReventa > 0
          ? prod.precioReventa
          : prod?.precioEcommerce && prod.precioEcommerce > 0
          ? prod.precioEcommerce
          : prod?.precioPss
          ? Math.round(prod.precioPss * 1.45)
          : 0;

      const subtotal = precioSugerido * it.cantidad;
      facturacionTotal += subtotal;

      return {
        nombre: prod?.nombre || 'Producto',
        presentacion: prod?.presentacion || '',
        cantidad: it.cantidad,
        precioSugerido,
        tienePrecioReventaEspecifico: Boolean(prod?.precioReventa && prod.precioReventa > 0),
        subtotal,
      };
    });

    const inversionEstimada =
      precioSinDistribuidorCalculado > 0
        ? precioSinDistribuidorCalculado
        : sumaPssEquivalente;

    const gananciaEstimada = Math.max(0, facturacionTotal - inversionEstimada);
    const retorno = inversionEstimada > 0 ? Math.round((gananciaEstimada / inversionEstimada) * 100) : 0;

    return {
      facturacionTotal,
      inversionEstimada,
      gananciaEstimada,
      retorno,
      itemsDetalle,
    };
  }, [esPackReventa, items, productosMap, precioSinDistribuidorCalculado, sumaPssEquivalente]);

  const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  const handleAgregarProducto = () => {
    if (!productoSeleccionadoId) {
      setErrorMensaje('Seleccioná un producto del catálogo para agregar al pack.');
      return;
    }
    if (cantidadInput <= 0) {
      setErrorMensaje('La cantidad debe ser mayor a cero.');
      return;
    }

    const indexExistente = items.findIndex((i) => i.productoId === productoSeleccionadoId);
    if (indexExistente >= 0) {
      const nuevosItems = [...items];
      nuevosItems[indexExistente] = {
        ...nuevosItems[indexExistente],
        cantidad: nuevosItems[indexExistente].cantidad + cantidadInput,
      };
      setItems(nuevosItems);
    } else {
      setItems([...items, { productoId: productoSeleccionadoId, cantidad: cantidadInput }]);
    }

    setProductoSeleccionadoId('');
    setCantidadInput(1);
    setErrorMensaje(null);
  };

  const handleEliminarItem = (productoId: string) => {
    setItems(items.filter((i) => i.productoId !== productoId));
  };

  const handleCambiarCantidadItem = (productoId: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      handleEliminarItem(productoId);
    } else {
      setItems(
        items.map((i) => (i.productoId === productoId ? { ...i, cantidad: nuevaCantidad } : i))
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMensaje(null);

    if (!nombre.trim()) {
      setErrorMensaje('El nombre del pack es obligatorio.');
      return;
    }
    if (!descripcion.trim()) {
      setErrorMensaje('La descripción del pack es obligatoria.');
      return;
    }
    if (!imagen.trim()) {
      setErrorMensaje('La URL de imagen es obligatoria.');
      return;
    }
    if (items.length === 0) {
      setErrorMensaje('Debes incluir al menos un producto en el combo para calcular su precio base.');
      return;
    }
    if (Number(descuentoDistribuidor) < 0 || Number(descuentoDistribuidor) > 100) {
      setErrorMensaje('El porcentaje de descuento con distribuidor debe estar entre 0% y 100%.');
      return;
    }
    if (Number(descuentoDirecto) < 0 || Number(descuentoDirecto) > 100) {
      setErrorMensaje('El porcentaje de descuento sin distribuidor debe estar entre 0% y 100%.');
      return;
    }

    startTransition(async () => {
      const res = await guardarPackAction(packInicial?.id || null, {
        nombre,
        descripcion,
        imagen,
        etiqueta: etiqueta || null,
        descuentoDistribuidor: Number(descuentoDistribuidor) || 0,
        descuentoDirecto: Number(descuentoDirecto) || 0,
        precioOriginal: sumaPssEquivalente,
        precioDistribuidor: precioConDistribuidorCalculado,
        precioDirecto: precioSinDistribuidorCalculado,
        precioPromocional: precioSinDistribuidorCalculado > 0 ? precioSinDistribuidorCalculado : precioConDistribuidorCalculado,
        activo,
        destacado,
        fechaInicio: fechaInicio ? new Date(`${fechaInicio}T00:00:00`).toISOString() : null,
        fechaFin: fechaFin ? new Date(`${fechaFin}T23:59:59`).toISOString() : null,
        items,
      });

      if (!res.success) {
        setErrorMensaje(res.error || 'No se pudo guardar el pack.');
      } else {
        router.push('/admin/packs');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto" id="form-pack">
      {errorMensaje && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error de validación</p>
            <p className="text-xs md:text-sm mt-0.5">{errorMensaje}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Información Básica del Pack */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
              <Package className="w-4 h-4 text-gold-600" />
              Datos del Pack / Combo
            </h3>

            {/* Nombre */}
            <div>
              <label htmlFor="pack-nombre" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Nombre del Combo *
              </label>
              <input
                id="pack-nombre"
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Pack Apertura Salón - Línea Completa"
                className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
              />
            </div>

            {/* Etiqueta / Tipo de Pack */}
            <div className="pt-1">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-gold-600" />
                  Tipo / Etiqueta de Pack
                </span>
                <span className="text-[11px] font-normal text-neutral-400">Para segmentar y filtrar en catálogo</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {ETIQUETAS_PACK.map((etq) => {
                  const meta = ETIQUETAS_PACK_CONFIG[etq];
                  const isSelected = etiqueta === etq;
                  return (
                    <button
                      key={etq}
                      type="button"
                      onClick={() => setEtiqueta(isSelected ? '' : etq)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-gold-600 bg-gold-50/50 ring-2 ring-gold-500/20 shadow-xs'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                          >
                            {meta.titulo}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed mt-1">
                          {meta.subtitulo}
                        </p>
                      </div>
                      <span className="text-[10px] text-neutral-400 mt-2 font-medium">
                        {isSelected ? '✓ Seleccionado' : '+ Seleccionar'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label htmlFor="pack-descripcion" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Descripción detallada *
              </label>
              <textarea
                id="pack-descripcion"
                required
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Explicá los beneficios del combo para el salón, tipo de cabello y rentabilidad..."
                className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
              />
            </div>

            {/* URL Imagen */}
            <div>
              <label htmlFor="pack-imagen" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                URL de Imagen *
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="pack-imagen"
                  type="url"
                  required
                  value={imagen}
                  onChange={(e) => setImagen(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
                />
                <div className="relative w-12 h-12 shrink-0 bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200">
                  {imagen ? (
                    <Image
                      src={imagen}
                      alt="Preview"
                      fill
                      sizes="48px"
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-neutral-400 m-auto mt-3.5" />
                  )}
                </div>
              </div>
            </div>

            {/* Sección de Precio Base Automático y Porcentajes de Descuento */}
            <div className="pt-2 space-y-4">
              {/* Cálculo Automático del Precio Base */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-950 uppercase tracking-wider block">
                      Precio Base del Pack (Calculado Automáticamente)
                    </span>
                    <span className="text-[11px] text-amber-800">
                      Suma del precio Salón Profesional (PSS) de los productos incluidos en el pack.
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-amber-950">
                      {formatoMoneda.format(sumaPssEquivalente)}
                    </span>
                    <span className="block text-[10px] text-amber-700 font-medium">
                      {items.length} {items.length === 1 ? 'producto' : 'productos'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Porcentajes de Descuento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Descuento Clientes CON Distribuidor */}
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                  <label htmlFor="pack-desc-dist" className="block text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    Descuento con Distribuidor Asignado (%)
                  </label>
                  <div className="relative">
                    <input
                      id="pack-desc-dist"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={descuentoDistribuidor}
                      onChange={(e) => setDescuentoDistribuidor(e.target.value)}
                      placeholder="0"
                      className="w-full bg-white border border-emerald-300 rounded-xl pr-8 pl-3.5 py-2.5 text-sm font-bold text-emerald-950 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600 text-sm font-bold">%</span>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-xs text-emerald-800">
                    <span>Precio resultante:</span>
                    <span className="font-bold font-mono text-sm text-emerald-950">
                      {formatoMoneda.format(precioConDistribuidorCalculado)}
                    </span>
                  </div>
                  {ahorroDist > 0 && (
                    <div className="text-[11px] text-emerald-700 font-medium text-right">
                      Ahorro para el salón: {formatoMoneda.format(ahorroDist)}
                    </div>
                  )}
                </div>

                {/* Descuento Clientes SIN Distribuidor (Directo Fábrica) */}
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
                  <label htmlFor="pack-desc-directo" className="block text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Descuento sin Distribuidor / Venta Directa (%)
                  </label>
                  <div className="relative">
                    <input
                      id="pack-desc-directo"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={descuentoDirecto}
                      onChange={(e) => setDescuentoDirecto(e.target.value)}
                      placeholder="0"
                      className="w-full bg-white border border-amber-300 rounded-xl pr-8 pl-3.5 py-2.5 text-sm font-bold text-amber-950 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-600 text-sm font-bold">%</span>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-xs text-amber-800">
                    <span>Precio resultante:</span>
                    <span className="font-bold font-mono text-sm text-amber-950">
                      {formatoMoneda.format(precioSinDistribuidorCalculado)}
                    </span>
                  </div>
                  {ahorroDirecto > 0 && (
                    <div className="text-[11px] text-amber-700 font-medium text-right">
                      Ahorro para el salón: {formatoMoneda.format(ahorroDirecto)}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-neutral-500 italic">
                * No se ingresa ningún precio fijo manualmente: el sistema calcula automáticamente el precio base y aplica los porcentajes ingresados para cada tipo de cuenta.
              </p>
            </div>
          </div>

          {/* Sección de Selección de Productos y Cantidades */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                <Layers className="w-4 h-4 text-gold-600" />
                Productos Incluidos ({items.length})
              </h3>
            </div>

            {/* Selector de nuevo producto */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-neutral-700 block">Agregar producto al combo:</span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-7">
                  <label htmlFor="select-producto-pack" className="block text-[11px] font-semibold text-neutral-500 mb-1">
                    Producto
                  </label>
                  <select
                    id="select-producto-pack"
                    value={productoSeleccionadoId}
                    onChange={(e) => setProductoSeleccionadoId(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-gold-500"
                  >
                    <option value="">-- Seleccionar producto --</option>
                    {productosDisponibles.map((prod) => (
                      <option key={prod.id} value={prod.id} disabled={!prod.activo}>
                        {prod.nombre} ({prod.presentacion}) - Salón Profesional: ${prod.precioPss} {prod.stock <= 0 ? '(Sin stock)' : ''} {!prod.activo ? '(Inactivo)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="input-cantidad-pack" className="block text-[11px] font-semibold text-neutral-500 mb-1">
                    Cantidad
                  </label>
                  <input
                    id="input-cantidad-pack"
                    type="number"
                    min="1"
                    value={cantidadInput}
                    onChange={(e) => setCantidadInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 text-center font-bold focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleAgregarProducto}
                    className="w-full py-2 px-3 rounded-xl bg-gold-600 hover:bg-gold-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de productos agregados */}
            {items.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-neutral-200 rounded-xl text-neutral-400 text-xs">
                No has agregado productos a este pack todavía.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
                {items.map((item) => {
                  const prod = productosMap.get(item.productoId);
                  if (!prod) return null;
                  return (
                    <div
                      key={item.productoId}
                      className="p-3 bg-white flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                          <Image
                            src={prod.imagen}
                            alt={prod.nombre}
                            fill
                            sizes="36px"
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 line-clamp-1">{prod.nombre}</p>
                          <div className="text-neutral-500 text-[11px] flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span>{prod.presentacion}</span>
                            <span>•</span>
                            <span>Salón: {formatoMoneda.format(prod.precioPss)}</span>
                            {prod.precioReventa ? (
                              <>
                                <span>•</span>
                                <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  Reventa sug: {formatoMoneda.format(prod.precioReventa)}
                                  {(() => {
                                    const u = obtenerUnidadesExhibidora(prod.nombre, prod.presentacion);
                                    return u && u > 1
                                      ? ` (${formatoMoneda.format(Math.round(prod.precioReventa / u))} c/u)`
                                      : '';
                                  })()}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-neutral-400">Cant:</span>
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) =>
                              handleCambiarCantidadItem(item.productoId, parseInt(e.target.value) || 1)
                            }
                            className="w-14 bg-neutral-50 border border-neutral-300 rounded-lg px-2 py-1 text-center font-bold text-xs text-neutral-900"
                          />
                        </div>
                        <span className="font-bold text-neutral-900 min-w-[70px] text-right">
                          {formatoMoneda.format(prod.precioPss * item.cantidad)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEliminarItem(item.productoId)}
                          className="text-neutral-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                          title="Quitar del pack"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Configuración, Vigencia y Resumen Matemático */}
        <div className="space-y-6">
          {/* Card Resumen de Ahorro y Rentabilidad */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gold-600" />
              Análisis del Combo
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-neutral-600 pb-2 border-b border-neutral-100">
                <span>Precio Base (Suma PSS):</span>
                <span className="font-bold text-neutral-900">{formatoMoneda.format(sumaPssEquivalente)}</span>
              </div>

              {/* Precio Distribuidor */}
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 space-y-1">
                <div className="flex justify-between items-center text-emerald-900 font-medium text-[11px]">
                  <span>Con Distribuidor ({descDistNum}% OFF):</span>
                  <span className="font-bold text-sm text-emerald-950">{formatoMoneda.format(precioConDistribuidorCalculado)}</span>
                </div>
                {ahorroDist > 0 && (
                  <div className="text-[10px] text-emerald-700 text-right">
                    Ahorro salón: {formatoMoneda.format(ahorroDist)}
                  </div>
                )}
              </div>

              {/* Precio Venta Directa */}
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 space-y-1">
                <div className="flex justify-between items-center text-amber-900 font-medium text-[11px]">
                  <span>Sin Distribuidor ({descDirectoNum}% OFF):</span>
                  <span className="font-bold text-sm text-amber-950">{formatoMoneda.format(precioSinDistribuidorCalculado)}</span>
                </div>
                {ahorroDirecto > 0 && (
                  <div className="text-[10px] text-amber-700 text-right">
                    Ahorro salón: {formatoMoneda.format(ahorroDirecto)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card Potencial de Reventa si es Pack Reventa */}
          {proyeccionReventa && (
            <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-neutral-900 text-white border border-emerald-800/70 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-800/50 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Potencial de Reventa Sugerido
                </h3>
                <span className="text-[10px] font-bold bg-emerald-800/90 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-600/50">
                  Pack Reventa
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center text-emerald-100/90">
                  <span>Facturación potencial con precio sugerido:</span>
                  <strong className="font-mono text-sm text-white font-bold">
                    {formatoMoneda.format(proyeccionReventa.facturacionTotal)}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-emerald-200/70">
                  <span>Inversión estimada del salón:</span>
                  <span className="font-mono text-xs text-emerald-200">
                    {formatoMoneda.format(proyeccionReventa.inversionEstimada)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2.5 border-t border-emerald-800/50 text-emerald-300 font-bold">
                  <span>Ganancia potencial estimada:</span>
                  <span className="font-mono text-base text-emerald-400">
                    {formatoMoneda.format(proyeccionReventa.gananciaEstimada)}
                  </span>
                </div>
                {proyeccionReventa.retorno > 0 && (
                  <p className="text-[11px] text-emerald-200 text-right pt-0.5">
                    Retorno proyectado: <strong className="text-white">+{proyeccionReventa.retorno}%</strong> sobre inversión
                  </p>
                )}
              </div>

              <p className="text-[11px] text-emerald-300/70 italic pt-1 border-t border-emerald-800/40 leading-relaxed">
                Calculado usando la columna &quot;precioReventa&quot; de los productos seleccionados. Este cálculo se mostrará automáticamente al cliente salón en el catálogo.
              </p>
            </div>
          )}

          {/* Card de Configuración de Estado y Vigencia */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold-600" />
              Vigencia y Estado
            </h3>

            {/* Checkbox Activo */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="w-4 h-4 text-gold-600 rounded border-neutral-300 focus:ring-gold-500"
              />
              <div>
                <span className="text-xs font-bold text-neutral-900 block">Pack Activo</span>
                <span className="text-[11px] text-neutral-500 block">Visible para compra por salones autorizados</span>
              </div>
            </label>

            {/* Checkbox Destacado */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={destacado}
                onChange={(e) => setDestacado(e.target.checked)}
                className="w-4 h-4 text-gold-600 rounded border-neutral-300 focus:ring-gold-500"
              />
              <div>
                <span className="text-xs font-bold text-neutral-900 block">Pack Destacado</span>
                <span className="text-[11px] text-neutral-500 block">Resaltar con insignia en el catálogo</span>
              </div>
            </label>

            {/* Vigencia Temporal Opcional */}
            <div className="pt-3 border-t border-neutral-100 space-y-3">
              <span className="text-xs font-bold text-neutral-700 block">Vigencia Temporal (Opcional):</span>
              <div>
                <label htmlFor="fecha-inicio" className="block text-[11px] font-semibold text-neutral-500 mb-1">
                  Fecha Inicio
                </label>
                <input
                  id="fecha-inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label htmlFor="fecha-fin" className="block text-[11px] font-semibold text-neutral-500 mb-1">
                  Fecha Fin
                </label>
                <input
                  id="fecha-fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            {/* Botón Guardar */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 px-4 rounded-xl bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-gold-600/20 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando Pack...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{packInicial?.id ? 'Actualizar Pack' : 'Crear Pack'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
