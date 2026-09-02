'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/lib/context/CartContext';
import { ProductoDTO, ProductoCard } from './ProductoCard';
import { PackDTO, PackCard } from './PackCard';
import { ETIQUETAS_PACK, ETIQUETAS_PACK_CONFIG, EtiquetaPack } from '@/lib/constants/packs';
import { 
  Search, 
  ShoppingBag, 
  ArrowUpDown, 
  X, 
  CheckCircle2, 
  Package, 
  Sparkles, 
  Layers,
  Tag,
  Briefcase,
  TrendingUp,
  Sparkle
} from 'lucide-react';

interface CatalogoClientProps {
  productosIniciales: ProductoDTO[];
  packsIniciales?: PackDTO[];
  salonNombre?: string;
  usuarioId?: string;
  usuarioLogueado?: boolean;
  estadoCliente?: string | null;
}

type CriterioOrden = 'destacados' | 'precio_asc' | 'precio_desc' | 'nombre_asc';
type VistaCatalogo = 'PRODUCTOS' | 'PACKS';

export function CatalogoClient({
  productosIniciales,
  packsIniciales = [],
  usuarioLogueado = false,
  estadoCliente = null,
}: CatalogoClientProps) {
  const searchParams = useSearchParams();
  const vistaParam = searchParams?.get('vista')?.toLowerCase() === 'packs' ? 'PACKS' : 'PRODUCTOS';
  const etiquetaParam = searchParams?.get('etiqueta') || '';

  const normalizarEtiquetaUrl = (val: string): string => {
    if (!val) return 'TODAS';
    const lower = val.toLowerCase().trim();
    if (lower.includes('trabajar') || lower.includes('steffen')) return 'Trabajar Steffen';
    if (lower.includes('reventa') || lower.includes('vender') || lower.includes('salon') || lower.includes('salón')) return 'Reventa';
    if (lower.includes('rutina') || lower.includes('tratamiento') || lower.includes('cabello')) return 'Rutinas de tratamiento';
    return 'TODAS';
  };

  const [vistaActiva, setVistaActiva] = useState<VistaCatalogo>(vistaParam);
  const [prevVistaParam, setPrevVistaParam] = useState<VistaCatalogo>(vistaParam);

  if (prevVistaParam !== vistaParam) {
    setPrevVistaParam(vistaParam);
    setVistaActiva(vistaParam);
  }

  const [busqueda, setBusqueda] = useState<string>('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('TODAS');
  const [etiquetaPackSeleccionada, setEtiquetaPackSeleccionada] = useState<string>(() => normalizarEtiquetaUrl(etiquetaParam));
  const [orden, setOrden] = useState<CriterioOrden>('destacados');

  useEffect(() => {
    if (etiquetaParam) {
      const match = normalizarEtiquetaUrl(etiquetaParam);
      if (match !== 'TODAS') {
        setEtiquetaPackSeleccionada(match);
        setVistaActiva('PACKS');
      }
    }
  }, [etiquetaParam]);
  const { agregarItem, cantidadTotal } = useCart();

  const [toastMensaje, setToastMensaje] = useState<string | null>(null);

  const esActivo = estadoCliente === 'ACTIVO';
  const tienePacksDisponibles = packsIniciales.length > 0;

  // Extraer categorías únicas de productos
  const categorias = useMemo(() => {
    const setCat = new Set<string>();
    productosIniciales.forEach((p) => {
      if (p.categoria) setCat.add(p.categoria);
    });
    return ['TODAS', ...Array.from(setCat)];
  }, [productosIniciales]);

  // Conteos de packs por etiqueta
  const conteoPacksPorEtiqueta = useMemo(() => {
    const counts: Record<string, number> = {
      TODAS: packsIniciales.length,
    };
    for (const etq of ETIQUETAS_PACK) {
      counts[etq] = packsIniciales.filter((p) => {
        if (!p.etiqueta) return false;
        if (p.etiqueta === etq) return true;
        if (etq === 'Reventa' && (p.etiqueta === 'Vender más en mi salón' || p.etiqueta === 'Reventa')) return true;
        if (etq === 'Rutinas de tratamiento' && p.etiqueta === 'Rutinas segun necesidad') return true;
        return false;
      }).length;
    }
    return counts;
  }, [packsIniciales]);

  // Filtrado de productos
  const productosFiltrados = useMemo(() => {
    let result = [...productosIniciales];

    if (busqueda.trim() !== '') {
      const termino = busqueda.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(termino) ||
          p.descripcion.toLowerCase().includes(termino) ||
          p.categoria.toLowerCase().includes(termino) ||
          (p.subcategoria && p.subcategoria.toLowerCase().includes(termino))
      );
    }

    if (categoriaSeleccionada !== 'TODAS') {
      result = result.filter((p) => p.categoria === categoriaSeleccionada);
    }

    result.sort((a, b) => {
      if (orden === 'destacados') {
        if (a.destacado && !b.destacado) return -1;
        if (!a.destacado && b.destacado) return 1;
        return a.ordenVisualizacion - b.ordenVisualizacion;
      }
      if (orden === 'precio_asc') {
        return a.precioVisible - b.precioVisible;
      }
      if (orden === 'precio_desc') {
        return b.precioVisible - a.precioVisible;
      }
      if (orden === 'nombre_asc') {
        return a.nombre.localeCompare(b.nombre);
      }
      return a.ordenVisualizacion - b.ordenVisualizacion;
    });

    return result;
  }, [productosIniciales, busqueda, categoriaSeleccionada, orden]);

  // Filtrado de packs
  const packsFiltrados = useMemo(() => {
    let result = [...packsIniciales];

    if (etiquetaPackSeleccionada !== 'TODAS') {
      result = result.filter((p) => {
        if (!p.etiqueta) return false;
        if (p.etiqueta === etiquetaPackSeleccionada) return true;
        if (etiquetaPackSeleccionada === 'Reventa' && (p.etiqueta === 'Vender más en mi salón' || p.etiqueta === 'Reventa')) {
          return true;
        }
        if (etiquetaPackSeleccionada === 'Rutinas de tratamiento' && p.etiqueta === 'Rutinas segun necesidad') {
          return true;
        }
        return false;
      });
    }

    if (busqueda.trim() !== '') {
      const termino = busqueda.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(termino) ||
          p.descripcion.toLowerCase().includes(termino) ||
          (p.etiqueta && p.etiqueta.toLowerCase().includes(termino)) ||
          p.items.some((it) => it.nombre.toLowerCase().includes(termino))
      );
    }

    result.sort((a, b) => {
      if (orden === 'destacados') {
        if (a.destacado && !b.destacado) return -1;
        if (!a.destacado && b.destacado) return 1;
        return 0;
      }
      if (orden === 'precio_asc') {
        return a.precioPromocional - b.precioPromocional;
      }
      if (orden === 'precio_desc') {
        return b.precioPromocional - a.precioPromocional;
      }
      if (orden === 'nombre_asc') {
        return a.nombre.localeCompare(b.nombre);
      }
      return 0;
    });

    return result;
  }, [packsIniciales, busqueda, orden, etiquetaPackSeleccionada]);

  const handleAgregarProducto = (producto: ProductoDTO, cantidad: number, variante?: string | null) => {
    agregarItem(producto.id, cantidad, 'PRODUCTO', variante, {
      nombre: producto.nombre,
      imagen: producto.imagen,
      categoria: producto.categoria,
      presentacion: producto.presentacion,
      precioUnitario: producto.precioVisible,
    });
    const detalleVariante = variante ? ` (${variante})` : '';
    setToastMensaje(`Se agregaron ${cantidad} u. de "${producto.nombre}${detalleVariante}" al pedido.`);
    setTimeout(() => {
      setToastMensaje((curr) => (curr ? null : curr));
    }, 3000);
  };

  const handleAgregarPack = (pack: PackDTO, cantidad: number) => {
    agregarItem(pack.id, cantidad, 'PACK', null, {
      nombre: pack.nombre,
      imagen: pack.imagen,
      categoria: 'Packs y Promociones',
      presentacion: `Combo (${pack.items?.reduce((acc, curr) => acc + curr.cantidad, 0) || 0} unid.)`,
      precioUnitario: pack.precioPromocional,
    });
    setToastMensaje(`Se agregaron ${cantidad} u. del combo "${pack.nombre}" al pedido.`);
    setTimeout(() => {
      setToastMensaje((curr) => (curr ? null : curr));
    }, 3000);
  };

  return (
    <div id="catalogo-cliente-root" className="space-y-6">
      {/* Toast Notification Flotante */}
      {toastMensaje && (
        <div
          id="toast-agregado"
          className="fixed bottom-6 right-6 z-50 bg-white border border-emerald-300 text-neutral-900 px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-xs md:text-sm">
            <p className="font-bold text-emerald-800">Ítem agregado</p>
            <p className="text-neutral-600">{toastMensaje}</p>
          </div>
          <button
            onClick={() => setToastMensaje(null)}
            className="text-neutral-400 hover:text-neutral-600 ml-2 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Botones Grandes de Selección de Vista: Productos vs. Packs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:gap-4" id="selectores-grandes-catalogo">
        {/* Botón Grande: Productos */}
        <button
          type="button"
          id="btn-vista-productos"
          onClick={() => setVistaActiva('PRODUCTOS')}
          className={`relative p-4 md:p-5 rounded-2xl border-2 transition-all duration-200 text-left flex items-start gap-4 cursor-pointer overflow-hidden ${
            vistaActiva === 'PRODUCTOS'
              ? 'border-neutral-900 bg-white shadow-lg ring-4 ring-neutral-900/5'
              : 'border-neutral-200 bg-white/70 hover:border-neutral-400 hover:bg-white text-neutral-600'
          }`}
        >
          <div
            className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
              vistaActiva === 'PRODUCTOS'
                ? 'bg-neutral-900 text-gold-400 shadow-md'
                : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            <Package className="w-6 h-6 md:w-7 md:h-7" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`text-base md:text-lg font-bold tracking-tight ${
                vistaActiva === 'PRODUCTOS' ? 'text-neutral-900' : 'text-neutral-700'
              }`}>
                Productos Individuales
              </h3>
              <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                vistaActiva === 'PRODUCTOS'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-200 text-neutral-700'
              }`}>
                {productosIniciales.length}
              </span>
            </div>
            <p className="text-xs md:text-sm text-neutral-500 line-clamp-1">
              Shampoos, tratamientos, sérums y líneas completas por unidad
            </p>
          </div>

          {vistaActiva === 'PRODUCTOS' && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded-full shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Activo</span>
            </div>
          )}
        </button>

        {/* Botón Grande: Packs y Combos */}
        <button
          type="button"
          id="btn-vista-packs"
          onClick={() => setVistaActiva('PACKS')}
          className={`relative p-4 md:p-5 rounded-2xl border-2 transition-all duration-200 text-left flex items-start gap-4 cursor-pointer overflow-hidden ${
            vistaActiva === 'PACKS'
              ? 'border-amber-600 bg-amber-50/70 shadow-lg ring-4 ring-amber-500/10'
              : 'border-neutral-200 bg-white/70 hover:border-amber-400 hover:bg-amber-50/30 text-neutral-600'
          }`}
        >
          <div
            className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
              vistaActiva === 'PACKS'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            <Sparkles className="w-6 h-6 md:w-7 md:h-7" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`text-base md:text-lg font-bold tracking-tight ${
                vistaActiva === 'PACKS' ? 'text-amber-950' : 'text-neutral-700'
              }`}>
                Packs &amp; Combos Promocionales
              </h3>
              <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                vistaActiva === 'PACKS'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {packsIniciales.length}
              </span>
            </div>
            <p className="text-xs md:text-sm text-neutral-500 line-clamp-1">
              Kits de lanzamiento, rutinas para salón y combos con mayor ahorro
            </p>
          </div>

          {vistaActiva === 'PACKS' ? (
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded-full shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
              <span>Activo</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 text-[10px] font-extrabold text-amber-700 bg-amber-100/70 border border-amber-200 px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider">
              <span>Ahorro</span>
            </div>
          )}
        </button>
      </div>

      {/* Barra de Controles: Buscador, Categorías y Orden */}
      <section className="bg-white border border-neutral-200 rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
        {/* Fila 1: Buscador y Ordenamiento */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              id="input-busqueda-catalogo"
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={
                vistaActiva === 'PACKS'
                  ? 'Buscar combos por nombre, contenido o descripción...'
                  : 'Buscar por nombre, categoría o tipo de tratamiento...'
              }
              className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-9 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="w-4 h-4 text-neutral-500 hidden sm:block" />
            <label htmlFor="select-orden" className="text-xs text-neutral-600 whitespace-nowrap font-medium">
              Ordenar por:
            </label>
            <select
              id="select-orden"
              value={orden}
              onChange={(e) => setOrden(e.target.value as CriterioOrden)}
              className="bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-neutral-800 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors cursor-pointer"
            >
              <option value="destacados">Destacados primero</option>
              <option value="nombre_asc">Nombre (A - Z)</option>
              <option value="precio_asc">Precio: Menor a Mayor</option>
              <option value="precio_desc">Precio: Mayor a Menor</option>
            </select>
          </div>
        </div>

        {/* Fila 2: Categorías de productos (solo en vista de productos) */}
        {vistaActiva === 'PRODUCTOS' && (
          <div className="pt-2 border-t border-neutral-200">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-neutral-300">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mr-2 hidden md:inline-block">
                Categorías:
              </span>
              {categorias.map((cat) => {
                const isSelected = categoriaSeleccionada === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoriaSeleccionada(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gold-500 text-white font-bold shadow-sm shadow-gold-500/20'
                        : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 border border-neutral-200'
                    }`}
                  >
                    {cat === 'TODAS' ? 'Todas las categorías' : cat}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Fila 2: Filtro por Etiqueta de Packs (solo en vista de packs) */}
        {vistaActiva === 'PACKS' && (
          <div className="pt-2 border-t border-neutral-200">
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-neutral-300">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mr-1 hidden md:inline-flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                Tipo de Pack:
              </span>

              {/* Opción Todas */}
              <button
                type="button"
                onClick={() => setEtiquetaPackSeleccionada('TODAS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  etiquetaPackSeleccionada === 'TODAS'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200'
                }`}
              >
                <span>Todos los combos</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  etiquetaPackSeleccionada === 'TODAS' ? 'bg-neutral-700 text-neutral-100' : 'bg-neutral-200 text-neutral-700'
                }`}>
                  {conteoPacksPorEtiqueta['TODAS'] || 0}
                </span>
              </button>

              {/* Botones de cada Etiqueta de Pack */}
              {ETIQUETAS_PACK.map((etq) => {
                const isSelected = etiquetaPackSeleccionada === etq;
                const meta = ETIQUETAS_PACK_CONFIG[etq];
                const count = conteoPacksPorEtiqueta[etq] || 0;

                return (
                  <button
                    key={etq}
                    type="button"
                    onClick={() => setEtiquetaPackSeleccionada(isSelected ? 'TODAS' : etq)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? `${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder} ring-2 ring-gold-500/30 shadow-xs`
                        : 'bg-white text-neutral-700 hover:bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <span>{meta.titulo}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-white/80 text-neutral-800'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Barra de Resultados */}
      <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
        <p>
          {vistaActiva === 'PRODUCTOS' ? (
            <>
              Mostrando <strong className="text-neutral-900">{productosFiltrados.length}</strong> productos
              {categoriaSeleccionada !== 'TODAS' && (
                <span>
                  {' '}en <span className="text-gold-700 font-semibold">{categoriaSeleccionada}</span>
                </span>
              )}
            </>
          ) : (
            <>
              Mostrando <strong className="text-neutral-900">{packsFiltrados.length}</strong> combos y packs promocionales
              {etiquetaPackSeleccionada !== 'TODAS' && (
                <span>
                  {' '}en la sección <span className="text-amber-800 font-bold underline decoration-amber-400 decoration-2">&quot;{etiquetaPackSeleccionada}&quot;</span>
                </span>
              )}
            </>
          )}
          {busqueda && (
            <span>
              {' '}para &quot;<span className="text-neutral-800">{busqueda}</span>&quot;
            </span>
          )}
        </p>

        {cantidadTotal > 0 && (
          <Link
            href="/carrito"
            className="flex items-center gap-2 text-gold-700 hover:text-gold-800 font-semibold transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{cantidadTotal} {cantidadTotal === 1 ? 'unidad' : 'unidades'} en tu pedido →</span>
          </Link>
        )}
      </div>

      {/* Render de Vista de Packs */}
      {vistaActiva === 'PACKS' && (
        <div id="seccion-packs-catalogo">
          {packsFiltrados.length > 0 ? (
            <div
              id="grid-packs"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {packsFiltrados.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  onAgregarAlCarrito={handleAgregarPack}
                  onFiltrarEtiqueta={(etq) => setEtiquetaPackSeleccionada(etq)}
                  usuarioLogueado={usuarioLogueado}
                  estadoCliente={estadoCliente}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
              <Layers className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-neutral-900 mb-1">No se encontraron combos</h4>
              <p className="text-sm text-neutral-500 max-w-md mx-auto mb-6">
                {etiquetaPackSeleccionada !== 'TODAS'
                  ? `No hay packs disponibles en la categoría "${etiquetaPackSeleccionada}" que coincidan con la búsqueda.`
                  : 'No encontramos ningún pack que coincida con tus criterios de búsqueda.'}
              </p>
              <div className="flex justify-center gap-2">
                {etiquetaPackSeleccionada !== 'TODAS' && (
                  <button
                    onClick={() => setEtiquetaPackSeleccionada('TODAS')}
                    className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors cursor-pointer border border-amber-300"
                  >
                    Ver todos los tipos de packs
                  </button>
                )}
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors cursor-pointer border border-neutral-300"
                  >
                    Restablecer búsqueda
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Render de Vista de Productos */}
      {vistaActiva === 'PRODUCTOS' && (
        <div>
          {productosFiltrados.length > 0 ? (
            <div
              id="grid-productos"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {productosFiltrados.map((producto) => (
                <ProductoCard
                  key={producto.id}
                  producto={producto}
                  onAgregarAlCarrito={handleAgregarProducto}
                  usuarioLogueado={usuarioLogueado}
                  estadoCliente={estadoCliente}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-neutral-900 mb-1">No se encontraron productos</h4>
              <p className="text-sm text-neutral-500 max-w-md mx-auto mb-6">
                No encontramos ningún producto que coincida con tus criterios de búsqueda o categoría seleccionada.
              </p>
              <button
                onClick={() => {
                  setBusqueda('');
                  setCategoriaSeleccionada('TODAS');
                }}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors cursor-pointer border border-neutral-300"
              >
                Restablecer filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
