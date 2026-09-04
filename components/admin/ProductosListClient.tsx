'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  cambiarEstadoActivoProductoAction,
  cambiarDestacadoProductoAction,
  eliminarProductoAction 
} from '@/app/actions/admin/productos';
import { CATEGORIAS_PRODUCTO } from '@/lib/constants/categorias';
import { 
  Search, 
  X, 
  Plus, 
  Package, 
  Sparkles, 
  Star, 
  Edit, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  Loader2, 
  Filter, 
  Eye, 
  EyeOff,
  Layers,
  ChevronRight,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';

export interface ProductoListItemDTO {
  id: string;
  codigo?: string | null;
  nombre: string;
  categoria: string;
  subcategoria: string | null;
  presentacion: string;
  imagen: string;
  precioPss: number;
  precioEcommerce: number;
  precioReventa?: number | null;
  stock: number;
  activo: boolean;
  destacado: boolean;
  recomendado: boolean;
  ordenVisualizacion: number;
}

interface ProductosListClientProps {
  productosIniciales: ProductoListItemDTO[];
}

export function ProductosListClient({ productosIniciales }: ProductosListClientProps) {
  const router = useRouter();
  const [productos, setProductos] = useState<ProductoListItemDTO[]>(productosIniciales);
  const [busqueda, setBusqueda] = useState<string>('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('TODAS');
  const [estadoFiltro, setEstadoFiltro] = useState<'TODOS' | 'EN_HOME' | 'ACTIVOS' | 'INACTIVOS'>('TODOS');
  
  const [productoCambiandoId, setProductoCambiandoId] = useState<string | null>(null);
  const [productoCambiandoDestacadoId, setProductoCambiandoDestacadoId] = useState<string | null>(null);
  const [notificacion, setNotificacion] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  
  // Estado para modal de eliminación
  const [productoAEliminar, setProductoAEliminar] = useState<ProductoListItemDTO | null>(null);
  const [mensajeErrorEliminar, setMensajeErrorEliminar] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  // Confirmar eliminación del producto
  const handleConfirmarEliminar = () => {
    if (!productoAEliminar) return;

    setMensajeErrorEliminar(null);
    startTransition(async () => {
      const res = await eliminarProductoAction(productoAEliminar.id);

      if (res.success) {
        const nombreEliminado = productoAEliminar.nombre;
        setProductos((prev) => prev.filter((p) => p.id !== productoAEliminar.id));
        setProductoAEliminar(null);
        setNotificacion({
          tipo: 'exito',
          texto: `El producto "${nombreEliminado}" fue eliminado exitosamente del catálogo.`,
        });
        setTimeout(() => setNotificacion(null), 4000);
        router.refresh();
      } else {
        setMensajeErrorEliminar(
          res.error || 'Ocurrió un error al intentar eliminar el producto.'
        );
      }
    });
  };

  // Toggle rápido de activo/inactivo
  const handleToggleActivo = (e: React.MouseEvent, producto: ProductoListItemDTO) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPending) return;

    const nuevoEstado = !producto.activo;
    setProductoCambiandoId(producto.id);
    setNotificacion(null);

    startTransition(async () => {
      const res = await cambiarEstadoActivoProductoAction(producto.id, nuevoEstado);
      setProductoCambiandoId(null);

      if (res.success) {
        setProductos((prev) =>
          prev.map((p) => (p.id === producto.id ? { ...p, activo: nuevoEstado } : p))
        );
        setNotificacion({
          tipo: 'exito',
          texto: `"${producto.nombre}" ahora está ${nuevoEstado ? 'ACTIVO' : 'INACTIVO'} en el catálogo.`,
        });
        setTimeout(() => setNotificacion(null), 3500);
      } else {
        setNotificacion({
          tipo: 'error',
          texto: res.error || 'No se pudo cambiar el estado del producto.',
        });
      }
    });
  };

  // Casilla interactiva: Toggle rápido para mostrar/quitar del Home (destacado)
  const handleToggleDestacado = (e: React.MouseEvent | React.ChangeEvent, producto: ProductoListItemDTO) => {
    e.stopPropagation();

    if (isPending) return;

    const nuevoDestacado = !producto.destacado;
    setProductoCambiandoDestacadoId(producto.id);
    setNotificacion(null);

    // Actualización optimista inmediata
    setProductos((prev) =>
      prev.map((p) => (p.id === producto.id ? { ...p, destacado: nuevoDestacado } : p))
    );

    startTransition(async () => {
      const res = await cambiarDestacadoProductoAction(producto.id, nuevoDestacado);
      setProductoCambiandoDestacadoId(null);

      if (res.success) {
        setNotificacion({
          tipo: 'exito',
          texto: nuevoDestacado
            ? `"${producto.nombre}" ahora se mostrará en el Home.`
            : `"${producto.nombre}" fue quitado del Home.`,
        });
        setTimeout(() => setNotificacion(null), 3500);
      } else {
        // Revertir si hubo error
        setProductos((prev) =>
          prev.map((p) => (p.id === producto.id ? { ...p, destacado: !nuevoDestacado } : p))
        );
        setNotificacion({
          tipo: 'error',
          texto: res.error || 'No se pudo actualizar la casilla de Home.',
        });
      }
    });
  };

  // Filtrado de productos
  const productosFiltrados = productos.filter((producto) => {
    // 1. Filtro de Categoría
    if (categoriaFiltro !== 'TODAS' && producto.categoria !== categoriaFiltro) {
      return false;
    }

    // 2. Filtro de Estado
    if (estadoFiltro === 'EN_HOME' && !producto.destacado) return false;
    if (estadoFiltro === 'ACTIVOS' && !producto.activo) return false;
    if (estadoFiltro === 'INACTIVOS' && producto.activo) return false;

    // 3. Búsqueda de texto
    if (busqueda.trim() !== '') {
      const termino = busqueda.toLowerCase().trim();
      const matchCodigo = producto.codigo?.toLowerCase().includes(termino) || false;
      const matchNombre = producto.nombre.toLowerCase().includes(termino);
      const matchCat = producto.categoria.toLowerCase().includes(termino);
      const matchSubcat = producto.subcategoria?.toLowerCase().includes(termino) || false;
      const matchPres = producto.presentacion.toLowerCase().includes(termino);

      return matchCodigo || matchNombre || matchCat || matchSubcat || matchPres;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Notificación Toast */}
      {notificacion && (
        <div
          className={`flex items-center gap-2.5 p-3.5 rounded-xl text-xs md:text-sm font-medium animate-in fade-in shadow-sm ${
            notificacion.tipo === 'exito'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {notificacion.tipo === 'exito' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{notificacion.texto}</span>
        </div>
      )}

      {/* Barra de Búsqueda y Botones de Acción */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, nombre, categoría, presentación..."
            className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-9 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/admin/productos/carga-masiva"
            id="btn-carga-masiva-productos"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-sm border border-neutral-300 shadow-sm transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Carga Masiva</span>
          </Link>

          <Link
            href="/admin/productos/nuevo"
            id="btn-nuevo-producto"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </Link>
        </div>
      </div>

      {/* Controles de Filtros */}
      <section className="bg-white border border-neutral-200 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
        {/* Filtro por Estado */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-gold-600" />
            Estado:
          </span>
          {(['TODOS', 'EN_HOME', 'ACTIVOS', 'INACTIVOS'] as const).map((estado) => {
            const isSelected = estadoFiltro === estado;
            const cantidadEnHome = productos.filter((p) => p.destacado).length;

            return (
              <button
                key={estado}
                onClick={() => setEstadoFiltro(estado)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gold-500 text-white font-bold shadow-sm'
                    : estado === 'EN_HOME' && cantidadEnHome > 0
                    ? 'bg-gold-50 text-gold-900 border border-gold-300 hover:bg-gold-100 font-semibold'
                    : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 border border-neutral-200'
                }`}
              >
                {estado === 'EN_HOME' && (
                  <Sparkles className={`w-3.5 h-3.5 ${isSelected ? 'text-white fill-white' : 'text-gold-600 fill-gold-500'}`} />
                )}
                <span>
                  {estado === 'TODOS'
                    ? 'Todos los Estados'
                    : estado === 'EN_HOME'
                    ? `En el Home (${cantidadEnHome})`
                    : estado === 'ACTIVOS'
                    ? 'Solo Activos'
                    : 'Solo Inactivos'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filtro por Categorías */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-300">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-gold-600" />
            Categoría:
          </span>

          <button
            onClick={() => setCategoriaFiltro('TODAS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              categoriaFiltro === 'TODAS'
                ? 'bg-gold-500 text-white font-bold'
                : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 border border-neutral-200'
            }`}
          >
            Todas ({productos.length})
          </button>

          {CATEGORIAS_PRODUCTO.map((cat) => {
            const isSelected = categoriaFiltro === cat;
            const count = productos.filter((p) => p.categoria === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setCategoriaFiltro(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-gold-500 text-white font-bold'
                    : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 border border-neutral-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </section>

      {/* Contador de Resultados */}
      <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
        <p>
          Mostrando <strong className="text-neutral-900">{productosFiltrados.length}</strong> de{' '}
          <strong className="text-neutral-700">{productos.length}</strong> productos registrados
        </p>
      </div>

      {/* Listado de Productos */}
      {productosFiltrados.length > 0 ? (
        <div className="space-y-3" id="tabla-productos-admin">
          {productosFiltrados.map((prod) => {
            const estaCambiando = productoCambiandoId === prod.id;
            const estaCambiandoDestacado = productoCambiandoDestacadoId === prod.id;

            return (
              <div
                key={prod.id}
                className={`group bg-white hover:bg-neutral-50 border rounded-2xl p-4 md:p-5 transition-all shadow-sm hover:shadow-md ${
                  prod.activo
                    ? 'border-neutral-200 hover:border-neutral-300'
                    : 'border-neutral-200 opacity-60 bg-neutral-100/50 hover:opacity-100'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Foto e Información Principal */}
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Miniatura */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white border border-neutral-200 overflow-hidden shrink-0">
                      {prod.imagen ? (
                        <Image
                          src={prod.imagen}
                          alt={prod.nombre}
                          fill
                          className="object-contain p-1.5"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Textos y Badges */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {prod.codigo && (
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-900 text-white shadow-xs">
                            {prod.codigo}
                          </span>
                        )}

                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {prod.categoria}
                        </span>

                        {prod.subcategoria && (
                          <span className="text-[11px] text-neutral-500">
                            • {prod.subcategoria}
                          </span>
                        )}

                        {prod.destacado && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold-50 text-gold-900 border border-gold-300 shadow-xs">
                            <Sparkles className="w-3 h-3 text-gold-600 fill-gold-500" />
                            En Home
                          </span>
                        )}

                        {prod.recomendado && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                            <Star className="w-3 h-3 text-indigo-600" />
                            Recomendado
                          </span>
                        )}

                        {prod.activo ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-300">
                            Inactivo
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-neutral-900 group-hover:text-gold-700 transition-colors truncate">
                        {prod.nombre}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600">
                        <span>Presentación: <strong className="text-neutral-800">{prod.presentacion}</strong></span>
                        <span>•</span>
                        <span>Salón Profesional: <strong className="text-gold-700 font-mono">{formatoMoneda.format(prod.precioPss)}</strong></span>
                        <span>•</span>
                        <span>Público: <strong className="text-neutral-900 font-mono">{formatoMoneda.format(prod.precioEcommerce)}</strong></span>
                        {prod.precioReventa ? (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                              Reventa sug.: <strong className="font-mono text-emerald-800">{formatoMoneda.format(prod.precioReventa)}</strong>
                            </span>
                          </>
                        ) : null}
                        <span>•</span>
                        <span>
                          Stock:{' '}
                          <strong className={prod.stock === 0 ? 'text-red-600 font-bold' : 'text-neutral-800'}>
                            {prod.stock} u.
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones Rápidas y Link a Edición */}
                  <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-100 shrink-0">
                    {/* Casilla rápida para mostrar / quitar del Home */}
                    <label
                      onClick={(e) => e.stopPropagation()}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer select-none transition-all border ${
                        prod.destacado
                          ? 'bg-gold-50 border-gold-300 text-gold-950 shadow-xs ring-1 ring-gold-400/40'
                          : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-600'
                      }`}
                      title={prod.destacado ? 'Desmarcar casilla para quitar del Home' : 'Marcar casilla para mostrar en el Home'}
                    >
                      {estaCambiandoDestacado ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gold-600 shrink-0" />
                      ) : (
                        <input
                          type="checkbox"
                          checked={prod.destacado}
                          onChange={(e) => handleToggleDestacado(e, prod)}
                          disabled={isPending || estaCambiandoDestacado}
                          className="w-4 h-4 rounded border-neutral-300 text-gold-600 focus:ring-gold-500 bg-white cursor-pointer"
                        />
                      )}
                      <span className="flex items-center gap-1">
                        <Sparkles className={`w-3.5 h-3.5 ${prod.destacado ? 'text-gold-600 fill-gold-500' : 'text-neutral-400'}`} />
                        <span className={prod.destacado ? 'font-bold text-gold-900' : ''}>
                          {prod.destacado ? 'En Home' : 'Mostrar en Home'}
                        </span>
                      </span>
                    </label>

                    {/* Toggle Activo / Inactivo */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleActivo(e, prod)}
                      disabled={isPending || estaCambiando}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                        prod.activo
                          ? 'bg-neutral-100 text-neutral-700 hover:text-red-700 hover:bg-neutral-200 border border-neutral-300'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
                      }`}
                    >
                      {estaCambiando ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : prod.activo ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Desactivar</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Activar</span>
                        </>
                      )}
                    </button>

                    {/* Botón Editar */}
                    <Link
                      href={`/admin/productos/${prod.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-100 hover:bg-gold-500 hover:text-white text-neutral-800 text-xs font-bold transition-all border border-neutral-300"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Editar</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Link>

                    {/* Botón Eliminar Producto */}
                    <button
                      type="button"
                      onClick={() => {
                        setMensajeErrorEliminar(null);
                        setProductoAEliminar(prod);
                      }}
                      disabled={isPending || estaCambiando}
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200 cursor-pointer disabled:opacity-50"
                      title={`Eliminar ${prod.nombre}`}
                      aria-label={`Eliminar producto ${prod.nombre}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-4">
            <Package className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-bold text-neutral-900 mb-1">No se encontraron productos</h4>
          <p className="text-sm text-neutral-500 max-w-md mx-auto mb-6">
            No hay productos que coincidan con la búsqueda o categoría seleccionada.
          </p>
          <button
            onClick={() => {
              setBusqueda('');
              setCategoriaFiltro('TODAS');
              setEstadoFiltro('TODOS');
            }}
            className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors cursor-pointer border border-neutral-300"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación de Producto */}
      {productoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  ¿Eliminar producto?
                </h3>
                <p className="text-xs text-neutral-500">
                  Esta acción eliminará el producto del catálogo permanentemente.
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {productoAEliminar.codigo && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-900 text-white">
                    {productoAEliminar.codigo}
                  </span>
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">
                  {productoAEliminar.categoria}
                </span>
              </div>
              <p className="text-sm font-bold text-neutral-900">
                {productoAEliminar.nombre}
              </p>
              <p className="text-xs text-neutral-600">
                Presentación: <strong className="text-neutral-800">{productoAEliminar.presentacion}</strong>
              </p>
            </div>

            {mensajeErrorEliminar && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div className="space-y-1">
                  <p className="font-bold">No fue posible eliminar el producto</p>
                  <p>{mensajeErrorEliminar}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setProductoAEliminar(null);
                  setMensajeErrorEliminar(null);
                }}
                className="px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirmar-eliminar-producto"
                disabled={isPending}
                onClick={handleConfirmarEliminar}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar y Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
