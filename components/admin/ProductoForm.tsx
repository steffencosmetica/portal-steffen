'use client';

import React, { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  guardarProductoAction,
  eliminarProductoAction,
  GuardarProductoData 
} from '@/app/actions/admin/productos';
import { CATEGORIAS_PRODUCTO, CategoriaProducto } from '@/lib/constants/categorias';
import { subirImagenProductoAction } from '@/app/actions/admin/imagenes';
import { parsearVariantes, serializarVariantes, VarianteProducto } from '@/lib/utils/variantes';
import { 
  Upload, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Save, 
  ArrowLeft, 
  Sparkles, 
  Star, 
  Eye, 
  Package, 
  DollarSign, 
  Layers,
  X,
  Plus,
  Trash2,
  Split
} from 'lucide-react';

export interface ProductoFormData {
  id?: string;
  codigo?: string | null;
  nombre: string;
  categoria: string;
  subcategoria: string;
  descripcion: string;
  modoUso?: string | null;
  rendimientoSalon?: string | null;
  imagen: string;
  presentacion: string;
  precioPss: number | string;
  precioEcommerce: number | string;
  precioReventa?: number | string | null;
  stock: number | string;
  variantes?: string | null;
  ordenVisualizacion: number | string;
  destacado: boolean;
  recomendado: boolean;
  activo: boolean;
}

interface ProductoFormProps {
  productoInicial?: ProductoFormData;
  modo: 'crear' | 'editar';
}

interface VarianteItemForm {
  id: string;
  nombre: string;
  precioPss: string;
  precioEcommerce: string;
  stock: string;
}

export function ProductoForm({ productoInicial, modo }: ProductoFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Estados del Formulario
  const [codigo, setCodigo] = useState(productoInicial?.codigo || '');
  const [nombre, setNombre] = useState(productoInicial?.nombre || '');
  const [categoria, setCategoria] = useState<string>(
    productoInicial?.categoria || CATEGORIAS_PRODUCTO[0]
  );
  const [subcategoria, setSubcategoria] = useState(productoInicial?.subcategoria || '');
  const [descripcion, setDescripcion] = useState(productoInicial?.descripcion || '');
  const [modoUso, setModoUso] = useState(productoInicial?.modoUso || '');
  const [rendimientoSalon, setRendimientoSalon] = useState(productoInicial?.rendimientoSalon || '');
  const [imagen, setImagen] = useState(productoInicial?.imagen || '');
  const [presentacion, setPresentacion] = useState(productoInicial?.presentacion || '');
  const [precioPss, setPrecioPss] = useState<string>(
    productoInicial?.precioPss !== undefined ? String(productoInicial.precioPss) : ''
  );
  const [precioEcommerce, setPrecioEcommerce] = useState<string>(
    productoInicial?.precioEcommerce !== undefined ? String(productoInicial.precioEcommerce) : ''
  );
  const [precioReventa, setPrecioReventa] = useState<string>(
    productoInicial?.precioReventa !== undefined && productoInicial?.precioReventa !== null
      ? String(productoInicial.precioReventa)
      : ''
  );
  const [stock, setStock] = useState<string>(
    productoInicial?.stock !== undefined ? String(productoInicial.stock) : '0'
  );
  const [ordenVisualizacion, setOrdenVisualizacion] = useState<string>(
    productoInicial?.ordenVisualizacion !== undefined ? String(productoInicial.ordenVisualizacion) : '0'
  );
  const [destacado, setDestacado] = useState<boolean>(productoInicial?.destacado ?? false);
  const [recomendado, setRecomendado] = useState<boolean>(productoInicial?.recomendado ?? false);
  const [activo, setActivo] = useState<boolean>(productoInicial?.activo ?? true);

  // Estados de Variantes
  const [variantes, setVariantes] = useState<VarianteItemForm[]>(() => {
    if (!productoInicial?.variantes) return [];
    const parsed = parsearVariantes(productoInicial.variantes);
    return parsed.map((v, idx) => ({
      id: `v-${idx}-${Date.now()}`,
      nombre: v.nombre,
      precioPss: v.precioPss !== undefined ? String(v.precioPss) : '',
      precioEcommerce: v.precioEcommerce !== undefined ? String(v.precioEcommerce) : '',
      stock: v.stock !== undefined ? String(v.stock) : '',
    }));
  });

  // Estados de subida de imagen
  const [isSubiendoImagen, setIsSubiendoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);
  const [exitoImagen, setExitoImagen] = useState<string | null>(null);

  // Estados de envío del formulario
  const [isPending, startTransition] = useTransition();
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Estados para modal de eliminación
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [mensajeErrorEliminar, setMensajeErrorEliminar] = useState<string | null>(null);
  const [isEliminando, setIsEliminando] = useState(false);

  // Acción de eliminar producto
  const handleEliminarProducto = async () => {
    if (!productoInicial?.id) return;

    setIsEliminando(true);
    setMensajeErrorEliminar(null);

    try {
      const res = await eliminarProductoAction(productoInicial.id);

      if (res.success) {
        setMostrarModalEliminar(false);
        router.push('/admin/productos');
        router.refresh();
      } else {
        setMensajeErrorEliminar(
          res.error || 'No se pudo eliminar el producto.'
        );
      }
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      setMensajeErrorEliminar('Error de conexión al intentar eliminar el producto.');
    } finally {
      setIsEliminando(false);
    }
  };

  // Manejo de Variantes
  const handleAgregarVariante = (nombreSugerido = '') => {
    setVariantes((prev) => [
      ...prev,
      {
        id: `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        nombre: nombreSugerido,
        precioPss: '',
        precioEcommerce: '',
        stock: '',
      },
    ]);
  };

  const handleEliminarVariante = (id: string) => {
    setVariantes((prev) => prev.filter((v) => v.id !== id));
  };

  const handleCambiarVariante = (id: string, campo: keyof VarianteItemForm, valor: string) => {
    setVariantes((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [campo]: valor } : v))
    );
  };

  const handleCargarEjemploVariantes = () => {
    setVariantes([
      {
        id: `v-1-${Date.now()}`,
        nombre: 'Con Bomba Dosificadora',
        precioPss: '',
        precioEcommerce: '',
        stock: '',
      },
      {
        id: `v-2-${Date.now()}`,
        nombre: 'Con Tapa Disc-Top',
        precioPss: '',
        precioEcommerce: '',
        stock: '',
      },
    ]);
  };

  // Manejar selección y subida inmediata de archivo de imagen
  const handleSeleccionarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorImagen(null);
    setExitoImagen(null);
    setIsSubiendoImagen(true);

    try {
      const formData = new FormData();
      formData.append('imagen', file);

      const res = await subirImagenProductoAction(formData);

      if (res.success && res.url) {
        setImagen(res.url);
        setExitoImagen('Imagen subida y procesada correctamente.');
        setTimeout(() => setExitoImagen(null), 3500);
      } else {
        setErrorImagen(res.error || 'Error al subir la imagen.');
      }
    } catch (err) {
      console.error('Error al subir imagen:', err);
      setErrorImagen('Error de conexión al procesar el archivo.');
    } finally {
      setIsSubiendoImagen(false);
      // Reset input para permitir volver a elegir el mismo archivo si es necesario
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Enviar formulario completo
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeError(null);
    setMensajeExito(null);

    if (!imagen) {
      setMensajeError('Debes subir una imagen para el producto antes de guardar.');
      return;
    }

    const precioNum = Number(precioPss);
    if (isNaN(precioNum) || precioNum <= 0) {
      setMensajeError('El Precio Salón Profesional debe ser mayor a 0.');
      return;
    }

    const precioEcomNum = Number(precioEcommerce);
    if (isNaN(precioEcomNum) || precioEcomNum <= 0) {
      setMensajeError('El Precio Público de Referencia (Ecommerce) debe ser mayor a 0.');
      return;
    }

    const stockNum = Number(stock);
    if (isNaN(stockNum) || stockNum < 0) {
      setMensajeError('El stock debe ser un número entero mayor o igual a 0.');
      return;
    }

    // Validar variantes si existen
    const variantesLimpias: VarianteProducto[] = [];
    for (const v of variantes) {
      const nom = v.nombre.trim();
      if (!nom) {
        setMensajeError('Todas las variantes agregadas deben tener un nombre (ej: "Con Bomba"). Elimina las que estén vacías.');
        return;
      }
      const pPss = v.precioPss.trim() !== '' ? Number(v.precioPss) : undefined;
      const pEcom = v.precioEcommerce.trim() !== '' ? Number(v.precioEcommerce) : undefined;
      const stk = v.stock.trim() !== '' ? Math.floor(Number(v.stock)) : undefined;

      if (pPss !== undefined && (isNaN(pPss) || pPss <= 0)) {
        setMensajeError(`El precio salón de la variante "${nom}" debe ser mayor a 0.`);
        return;
      }
      if (pEcom !== undefined && (isNaN(pEcom) || pEcom <= 0)) {
        setMensajeError(`El precio público de la variante "${nom}" debe ser mayor a 0.`);
        return;
      }

      variantesLimpias.push({
        nombre: nom,
        ...(pPss !== undefined ? { precioPss: pPss } : {}),
        ...(pEcom !== undefined ? { precioEcommerce: pEcom } : {}),
        ...(stk !== undefined ? { stock: stk } : {}),
      });
    }

    const ordenNum = Number(ordenVisualizacion);

    const payload: GuardarProductoData = {
      codigo: codigo.trim() || null,
      nombre: nombre.trim(),
      categoria,
      subcategoria: subcategoria.trim() || null,
      descripcion: descripcion.trim(),
      modoUso: modoUso.trim() || null,
      rendimientoSalon: rendimientoSalon.trim() || null,
      imagen: imagen.trim(),
      presentacion: presentacion.trim(),
      precioPss: precioNum,
      precioEcommerce: precioEcomNum,
      precioReventa: precioReventa.trim() !== '' ? Number(precioReventa) : null,
      stock: Math.floor(stockNum),
      variantes: serializarVariantes(variantesLimpias),
      ordenVisualizacion: isNaN(ordenNum) ? 0 : Math.max(0, Math.floor(ordenNum)),
      destacado,
      recomendado,
      activo,
    };

    startTransition(async () => {
      const res = await guardarProductoAction(productoInicial?.id || null, payload);

      if (res.success) {
        setMensajeExito(
          modo === 'crear'
            ? 'Producto creado exitosamente en el catálogo.'
            : 'Producto actualizado con éxito.'
        );
        setTimeout(() => {
          router.push('/admin/productos');
          router.refresh();
        }, 1200);
      } else {
        setMensajeError(res.error || 'Ocurrió un error al guardar el producto.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto">
      {/* Alertas de Notificación */}
      {mensajeExito && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-in fade-in shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{mensajeExito} Redirigiendo al catálogo...</span>
        </div>
      )}

      {mensajeError && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium animate-in fade-in shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{mensajeError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Columna Izquierda: Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tarjeta de Datos Básicos */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-7 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Package className="w-4 h-4 text-gold-600" />
              <span>Información General del Producto</span>
            </h2>

            {/* Código / SKU y Nombre */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Código / SKU <span className="text-[11px] font-normal text-neutral-400">(opcional - único)</span>
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ej: SER-ARG-250"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 font-mono placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors uppercase"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Sérum Nutritivo con Argán y Macadamia"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                />
              </div>
            </div>

            {/* Categoría y Subcategoría */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Categoría Oficial *
                </label>
                <select
                  required
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors cursor-pointer"
                >
                  {CATEGORIAS_PRODUCTO.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Subcategoría / Línea (opcional)
                </label>
                <input
                  type="text"
                  value={subcategoria}
                  onChange={(e) => setSubcategoria(e.target.value)}
                  placeholder="Ej: Nutrición Profunda, Anti-Frizz"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                />
              </div>
            </div>

            {/* Presentación */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">
                Presentación / Envase *
              </label>
              <input
                type="text"
                required
                value={presentacion}
                onChange={(e) => setPresentacion(e.target.value)}
                placeholder="Ej: 250 ml, 1000 ml, Pote 500 g, Caja 12 u"
                className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">
                Descripción Técnica y Comercial *
              </label>
              <textarea
                required
                rows={4}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalla los beneficios, activos principales y atributos generales del producto..."
                className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors resize-y leading-relaxed"
              />
            </div>

            {/* Modo de Uso Profesional en Salón */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-neutral-700">
                  Modo de Uso Profesional en Salón (opcional)
                </label>
                <span className="text-[10px] text-neutral-400 font-medium">Visible en pestaña de protocolo</span>
              </div>
              <textarea
                rows={3}
                value={modoUso}
                onChange={(e) => setModoUso(e.target.value)}
                placeholder="Paso a paso técnico de aplicación en lavacabezas o tocador (ej: Aplicar 2 a 4 gotas, masajear 2 minutos...)"
                className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors resize-y leading-relaxed"
              />
            </div>

            {/* Rendimiento y Rentabilidad en Salón */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-neutral-700">
                  Rendimiento y Rentabilidad en Salón (opcional)
                </label>
                <span className="text-[10px] text-neutral-400 font-medium">Visible en pestaña de rendimiento</span>
              </div>
              <textarea
                rows={3}
                value={rendimientoSalon}
                onChange={(e) => setRendimientoSalon(e.target.value)}
                placeholder="Estimación de servicios por envase y costo/beneficio por cliente (ej: Rinde aproximadamente 60 a 80 aplicaciones en tocador...)"
                className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors resize-y leading-relaxed"
              />
            </div>
          </div>

          {/* Tarjeta de Variantes (Opciones dentro del mismo producto) */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-7 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Split className="w-4 h-4 text-gold-600" />
                  <span>Variantes / Opciones del Producto</span>
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Permite elegir entre opciones (ej: con bomba dosificadora o tapa disc-top) dentro del mismo producto.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {variantes.length === 0 && (
                  <button
                    type="button"
                    onClick={handleCargarEjemploVariantes}
                    className="text-xs font-semibold text-neutral-600 hover:text-gold-700 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    + Ejemplo Bomba / Disc-top
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleAgregarVariante('')}
                  className="text-xs font-bold text-white bg-gold-500 hover:bg-gold-600 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Variante</span>
                </button>
              </div>
            </div>

            {variantes.length === 0 ? (
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-center space-y-2">
                <p className="text-xs text-neutral-600">
                  Este producto no tiene variantes configuradas. Se venderá como una sola presentación estándar.
                </p>
                <button
                  type="button"
                  onClick={() => handleAgregarVariante('')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-gold-700 hover:text-gold-800 underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Hacé clic aquí si querés agregar variantes (con tapa, con bomba, etc.)</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {variantes.map((v, index) => (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center text-[10px] font-mono">
                          {index + 1}
                        </span>
                        Variante #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEliminarVariante(v.id)}
                        className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="block text-[11px] font-semibold text-neutral-600">
                          Nombre de la Variante *
                        </label>
                        <input
                          type="text"
                          required
                          value={v.nombre}
                          onChange={(e) => handleCambiarVariante(v.id, 'nombre', e.target.value)}
                          placeholder="Ej: Con Bomba, Con Tapa Disc-top"
                          className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-gold-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-neutral-600">
                          Precio Salón PSS <span className="text-[10px] text-neutral-400">(opcional)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={v.precioPss}
                          onChange={(e) => handleCambiarVariante(v.id, 'precioPss', e.target.value)}
                          placeholder="Usa base si está vacío"
                          className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none focus:border-gold-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-neutral-600">
                          Precio Ecommerce <span className="text-[10px] text-neutral-400">(opcional)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={v.precioEcommerce}
                          onChange={(e) => handleCambiarVariante(v.id, 'precioEcommerce', e.target.value)}
                          placeholder="Usa base si está vacío"
                          className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none focus:border-gold-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <p className="text-[11px] text-neutral-400 italic">
                  💡 Si una variante tiene el mismo precio que el producto base, podés dejar los campos de precio vacíos.
                </p>
              </div>
            )}
          </div>

          {/* Tarjeta de Precios, Stock y Orden */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-7 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Valores Comerciales e Inventario</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Precio Salón Profesional ($ ARS) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={precioPss}
                  onChange={(e) => setPrecioPss(e.target.value)}
                  placeholder="Ej: 14500"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-gold-700 font-mono font-bold focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                />
                <span className="text-[11px] text-neutral-400 block">Precio exclusivo para salones de belleza / fábrica</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Precio Público Ecommerce ($ ARS) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={precioEcommerce}
                  onChange={(e) => setPrecioEcommerce(e.target.value)}
                  placeholder="Ej: 21500"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 font-mono font-bold focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                />
                <span className="text-[11px] text-neutral-400 block">Precio de referencia para clientes no activos / público</span>
              </div>

              {/* Campo especial: Precio Reventa */}
              <div className="space-y-1.5 sm:col-span-2 bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-neutral-800">
                    Precio Sugerido Reventa ($ ARS) <span className="text-neutral-400 font-normal">(Opcional)</span>
                  </label>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Uso exclusivo para Packs &quot;Reventa&quot;
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={precioReventa}
                  onChange={(e) => setPrecioReventa(e.target.value)}
                  placeholder="Ej: 21500 (si se deja vacío, tomará el precio público de referencia)"
                  className="w-full bg-white border border-emerald-300 rounded-xl px-4 py-2.5 text-sm text-emerald-900 font-mono font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                />
                <p className="text-[11px] text-neutral-500">
                  Este precio no es visible ni utilizado en el catálogo habitual; se usa como precio sugerido de reventa al calcular la facturación y ganancia potencial en los packs que llevan la etiqueta <strong>&quot;Reventa&quot;</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Stock Disponible *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="Ej: 50"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 font-mono focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                />
                <span className="text-[11px] text-neutral-400 block">Unidades en depósito</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Orden de Visualización
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={ordenVisualizacion}
                  onChange={(e) => setOrdenVisualizacion(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 font-mono focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                />
                <span className="text-[11px] text-neutral-400 block">0 = prioridad estándar</span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Imagen del Producto y Configuración de Visibilidad */}
        <div className="space-y-6">
          {/* Subida de Imagen a Supabase Storage */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-gold-600" />
                <span>Imagen del Producto</span>
              </h2>
            </div>

            {/* Input oculto para archivo */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleSeleccionarArchivo}
              className="hidden"
              id="input-imagen-producto"
            />

            {/* Preview de la imagen o placeholder */}
            <div className="space-y-3">
              {imagen ? (
                <div className="relative w-full aspect-square bg-neutral-50 rounded-2xl border border-neutral-200 overflow-hidden group shadow-inner">
                  <Image
                    src={imagen}
                    alt={nombre || 'Vista previa del producto'}
                    fill
                    className="object-contain p-4"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubiendoImagen}
                      className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      Cambiar Imagen
                    </button>
                    <button
                      type="button"
                      onClick={() => setImagen('')}
                      className="text-xs text-red-200 hover:text-white underline cursor-pointer"
                    >
                      Quitar imagen
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !isSubiendoImagen && fileInputRef.current?.click()}
                  className="w-full aspect-square bg-neutral-50 border-2 border-dashed border-neutral-300 hover:border-gold-500 rounded-2xl flex flex-col items-center justify-center p-6 text-center transition-colors cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200 text-neutral-400 group-hover:text-gold-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-all shadow-sm">
                    {isSubiendoImagen ? (
                      <Loader2 className="w-7 h-7 animate-spin text-gold-600" />
                    ) : (
                      <Upload className="w-7 h-7" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-neutral-800 block mb-1">
                    {isSubiendoImagen ? 'Subiendo imagen a Supabase...' : 'Seleccionar foto del producto'}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    JPG, PNG o WebP (Máx. 5 MB)
                  </span>
                </div>
              )}

              {/* Botón explícito para seleccionar archivo */}
              {!imagen && !isSubiendoImagen && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-2 border border-neutral-300 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-gold-600" />
                  <span>Examinar archivos locales</span>
                </button>
              )}

              {/* Feedback de subida */}
              {isSubiendoImagen && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-gold-50 border border-gold-300 text-gold-800 text-xs font-medium">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Subiendo al almacenamiento seguro...</span>
                </div>
              )}

              {exitoImagen && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{exitoImagen}</span>
                </div>
              )}

              {errorImagen && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorImagen}</span>
                </div>
              )}

              {/* Input manual de respaldo para URL */}
              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                  URL de Imagen (autocompletada tras la subida)
                </label>
                <input
                  type="url"
                  value={imagen}
                  onChange={(e) => setImagen(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-700 font-mono focus:outline-none focus:border-gold-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Tarjeta de Estados e Insignias */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Eye className="w-4 h-4 text-gold-600" />
              <span>Visibilidad y Destacados</span>
            </h2>

            <div className="space-y-3">
              {/* Activo en Catálogo */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200 hover:border-neutral-300 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-neutral-300 text-gold-500 focus:ring-gold-500 focus:ring-offset-white bg-white cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-neutral-900 block">
                    Producto Activo
                  </span>
                  <span className="text-[11px] text-neutral-500 block">
                    Visible en el catálogo público y disponible para pedidos.
                  </span>
                </div>
              </label>

              {/* Producto Destacado / Casilla para Home */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-gold-50/50 border border-gold-200 hover:border-gold-300 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={destacado}
                  onChange={(e) => setDestacado(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-neutral-300 text-gold-600 focus:ring-gold-500 focus:ring-offset-white bg-white cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-gold-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-gold-600 fill-gold-500" />
                    Mostrar en el Home (Página Principal)
                  </span>
                  <span className="text-[11px] text-neutral-600 block">
                    Al marcar esta casilla, el producto aparecerá en la sección de productos destacados del Home.
                  </span>
                </div>
              </label>

              {/* Producto Recomendado */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200 hover:border-neutral-300 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={recomendado}
                  onChange={(e) => setRecomendado(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-white bg-white cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-indigo-600" />
                    Recomendación Steffen
                  </span>
                  <span className="text-[11px] text-neutral-500 block">
                    Recomendado para incorporación en primeros pedidos.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Acciones del Formulario */}
          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={isPending || isSubiendoImagen || isEliminando}
              id="btn-guardar-producto"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando Producto...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{modo === 'crear' ? 'Crear Producto' : 'Guardar Cambios'}</span>
                </>
              )}
            </button>

            <Link
              href="/admin/productos"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold border border-neutral-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancelar y Volver al Listado</span>
            </Link>

            {modo === 'editar' && productoInicial?.id && (
              <div className="pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  id="btn-abrir-modal-eliminar"
                  disabled={isPending || isEliminando}
                  onClick={() => {
                    setMensajeErrorEliminar(null);
                    setMostrarModalEliminar(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 text-xs font-bold border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Eliminar este Producto</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {mostrarModalEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  ¿Eliminar este producto?
                </h3>
                <p className="text-xs text-neutral-500">
                  Esta acción no se puede deshacer y borrará el producto del catálogo.
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-1">
              <p className="text-sm font-bold text-neutral-900">
                {nombre || productoInicial?.nombre}
              </p>
              <p className="text-xs text-neutral-600">
                Categoría: <strong className="text-neutral-800">{categoria}</strong> • Presentación: <strong className="text-neutral-800">{presentacion}</strong>
              </p>
            </div>

            {mensajeErrorEliminar && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div className="space-y-1">
                  <p className="font-bold">No se pudo eliminar el producto</p>
                  <p>{mensajeErrorEliminar}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                disabled={isEliminando}
                onClick={() => {
                  setMostrarModalEliminar(false);
                  setMensajeErrorEliminar(null);
                }}
                className="px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirmar-eliminar-producto-form"
                disabled={isEliminando}
                onClick={handleEliminarProducto}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {isEliminando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar y Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
