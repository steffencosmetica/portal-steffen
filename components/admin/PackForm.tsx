'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { guardarPackAction, PackItemInput } from '@/app/actions/admin/packs';
import { ETIQUETAS_PACK, ETIQUETAS_PACK_CONFIG, EtiquetaPack } from '@/lib/constants/packs';
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
    precioPromocional: number;
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
  const [precioPromocional, setPrecioPromocional] = useState<string>(
    packInicial?.precioPromocional ? String(packInicial.precioPromocional) : ''
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

  // Cálculos dinámicos de referencia
  const sumaPssEquivalente = useMemo(() => {
    return items.reduce((acc, curr) => {
      const prod = productosMap.get(curr.productoId);
      return acc + (prod ? prod.precioPss * curr.cantidad : 0);
    }, 0);
  }, [items, productosMap]);

  const precioPromoNum = Number(precioPromocional) || 0;
  const ahorroCalculado = sumaPssEquivalente > 0 && precioPromoNum > 0 ? sumaPssEquivalente - precioPromoNum : 0;
  const porcentajeDescuento =
    sumaPssEquivalente > 0 && precioPromoNum > 0 && precioPromoNum < sumaPssEquivalente
      ? Math.round(((sumaPssEquivalente - precioPromoNum) / sumaPssEquivalente) * 100)
      : 0;

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
    if (!precioPromocional || isNaN(Number(precioPromocional)) || Number(precioPromocional) <= 0) {
      setErrorMensaje('Ingresá un precio promocional válido mayor a cero.');
      return;
    }
    if (items.length === 0) {
      setErrorMensaje('Debes incluir al menos un producto en el combo.');
      return;
    }

    startTransition(async () => {
      const res = await guardarPackAction(packInicial?.id || null, {
        nombre,
        descripcion,
        imagen,
        etiqueta: etiqueta || null,
        precioPromocional: Number(precioPromocional),
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

            {/* Precio Promocional Único */}
            <div className="pt-2">
              <label htmlFor="pack-precio" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Precio Promocional Profesional (ARS) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-bold">$</span>
                <input
                  id="pack-precio"
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={precioPromocional}
                  onChange={(e) => setPrecioPromocional(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border border-neutral-300 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-bold text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Este es el precio final que abonará el profesional por el combo completo.
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
                          <p className="text-neutral-500 text-[11px]">
                            {prod.presentacion} • Salón Profesional: {formatoMoneda.format(prod.precioPss)}
                          </p>
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

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Suma Salón Profesional Individual:</span>
                <span className="font-semibold text-neutral-900">{formatoMoneda.format(sumaPssEquivalente)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Precio Promocional:</span>
                <span className="font-bold text-neutral-900">{formatoMoneda.format(precioPromoNum)}</span>
              </div>

              {ahorroCalculado > 0 && (
                <div className="pt-2 border-t border-neutral-100 flex justify-between items-center text-emerald-700 bg-emerald-50 p-2.5 rounded-xl font-bold">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Ahorro ({porcentajeDescuento}%)</span>
                  </div>
                  <span>{formatoMoneda.format(ahorroCalculado)}</span>
                </div>
              )}
            </div>
          </div>

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
