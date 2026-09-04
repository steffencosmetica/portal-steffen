'use client';

import React, { useState, useRef, useTransition } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  FileCheck,
  AlertTriangle,
  ArrowLeft,
  Search,
  Filter,
  Check,
  X,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  ExternalLink,
  Package,
  Tag,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import {
  generarPlantillaExcelAction,
  previsualizarCargaMasivaAction,
  confirmarCargaMasivaAction,
  FilaValidada,
  ResumenCargaMasiva,
} from '@/app/actions/admin/carga-masiva';
import {
  generarPlantillaExcelPacksAction,
  previsualizarCargaMasivaPacksAction,
  confirmarCargaMasivaPacksAction,
  FilaPackValidada,
  ResumenCargaMasivaPacks,
} from '@/app/actions/admin/carga-masiva-packs';
import { ETIQUETAS_PACK_CONFIG, EtiquetaPack } from '@/lib/constants/packs';

const formatoMoneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export type ModoCargaMasiva = 'PRODUCTOS' | 'PACKS';

interface CargaMasivaClientProps {
  modoInicial?: ModoCargaMasiva;
}

export function CargaMasivaClient({ modoInicial = 'PRODUCTOS' }: CargaMasivaClientProps) {
  const [modo, setModo] = useState<ModoCargaMasiva>(modoInicial);
  const [paso, setPaso] = useState<'CARGAR' | 'PREVISUALIZAR' | 'RESULTADO'>('CARGAR');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Estados de proceso
  const [isDescargandoPlantilla, setIsDescargandoPlantilla] = useState(false);
  const [isPrevisualizando, setIsPrevisualizando] = useState(false);
  const [isConfirmando, startConfirmarTransition] = useTransition();

  // Estados de datos - Productos
  const [filasProductos, setFilasProductos] = useState<FilaValidada[]>([]);
  const [resumenPreviaProductos, setResumenPreviaProductos] = useState<{
    total: number;
    crear: number;
    actualizar: number;
    conError: number;
  } | null>(null);
  const [resumenFinalProductos, setResumenFinalProductos] = useState<ResumenCargaMasiva | null>(null);

  // Estados de datos - Packs
  const [filasPacks, setFilasPacks] = useState<FilaPackValidada[]>([]);
  const [resumenPreviaPacks, setResumenPreviaPacks] = useState<{
    total: number;
    crear: number;
    actualizar: number;
    conError: number;
  } | null>(null);
  const [resumenFinalPacks, setResumenFinalPacks] = useState<ResumenCargaMasivaPacks | null>(null);

  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  // Filtros en la tabla de previsualización
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'CREAR' | 'ACTUALIZAR' | 'ERRORES'>('TODOS');
  const [busquedaTabla, setBusquedaTabla] = useState('');

  const handleCambiarModo = (nuevoModo: ModoCargaMasiva) => {
    if (nuevoModo === modo) return;
    setModo(nuevoModo);
    setPaso('CARGAR');
    setArchivoSeleccionado(null);
    setFilasProductos([]);
    setFilasPacks([]);
    setResumenPreviaProductos(null);
    setResumenPreviaPacks(null);
    setResumenFinalProductos(null);
    setResumenFinalPacks(null);
    setErrorGeneral(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---------------------------------------------------------------------------
  // 1. DESCARGAR PLANTILLA EXCEL
  // ---------------------------------------------------------------------------
  const handleDescargarPlantilla = async () => {
    try {
      setIsDescargandoPlantilla(true);
      setErrorGeneral(null);

      const res =
        modo === 'PRODUCTOS'
          ? await generarPlantillaExcelAction()
          : await generarPlantillaExcelPacksAction();

      if (!res.success || !res.dataBase64) {
        setErrorGeneral(res.error || 'No se pudo generar la plantilla.');
        return;
      }

      const byteCharacters = atob(res.dataBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        res.filename ||
        (modo === 'PRODUCTOS'
          ? 'plantilla_productos_steffen.xlsx'
          : 'plantilla_packs_combos_steffen.xlsx');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error(err);
      setErrorGeneral('Error al descargar el archivo de plantilla.');
    } finally {
      setIsDescargandoPlantilla(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. MANEJO DE ARCHIVOS
  // ---------------------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setArchivoSeleccionado(file);
      setErrorGeneral(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls') ||
        file.type.includes('sheet') ||
        file.type.includes('excel')
      ) {
        setArchivoSeleccionado(file);
        setErrorGeneral(null);
      } else {
        setErrorGeneral('El archivo seleccionado debe ser una planilla de cálculo Excel (.xlsx o .xls).');
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 3. PREVISUALIZAR ARCHIVO
  // ---------------------------------------------------------------------------
  const handlePrevisualizar = async () => {
    if (!archivoSeleccionado) {
      setErrorGeneral('Por favor seleccioná un archivo Excel primero.');
      return;
    }

    try {
      setIsPrevisualizando(true);
      setErrorGeneral(null);

      const formData = new FormData();
      formData.append('archivo', archivoSeleccionado);
      formData.append('excel', archivoSeleccionado);

      if (modo === 'PRODUCTOS') {
        const res = await previsualizarCargaMasivaAction(formData);
        if (!res.success || !res.filas) {
          setErrorGeneral(res.error || 'Error al procesar el archivo Excel de productos.');
          return;
        }
        setFilasProductos(res.filas);
        setResumenPreviaProductos(res.resumen || null);
      } else {
        const res = await previsualizarCargaMasivaPacksAction(formData);
        if (!res.success || !res.filas) {
          setErrorGeneral(res.error || 'Error al procesar el archivo Excel de packs.');
          return;
        }
        setFilasPacks(res.filas);
        setResumenPreviaPacks(res.resumen || null);
      }

      setPaso('PREVISUALIZAR');
    } catch (err: any) {
      console.error(err);
      setErrorGeneral('Ocurrió un error inesperado al previsualizar el archivo.');
    } finally {
      setIsPrevisualizando(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. CONFIRMAR E IMPORTAR
  // ---------------------------------------------------------------------------
  const handleConfirmar = () => {
    if (modo === 'PRODUCTOS') {
      const filasValidas = filasProductos.filter((f) => f.errores.length === 0);
      if (filasValidas.length === 0) {
        setErrorGeneral('No hay ninguna fila de productos válida para importar. Corregí los errores y volvé a subirla.');
        return;
      }

      startConfirmarTransition(async () => {
        try {
          setErrorGeneral(null);
          const res = await confirmarCargaMasivaAction(filasValidas);
          if (!res.success) {
            setErrorGeneral(res.error || 'Error al procesar la carga masiva de productos.');
            return;
          }
          setResumenFinalProductos(res);
          setPaso('RESULTADO');
        } catch (err: any) {
          console.error(err);
          setErrorGeneral('Ocurrió un error crítico durante la importación de productos.');
        }
      });
    } else {
      const filasValidas = filasPacks.filter((f) => f.errores.length === 0);
      if (filasValidas.length === 0) {
        setErrorGeneral('No hay ninguna fila de packs válida para importar. Corregí los errores y volvé a subirla.');
        return;
      }

      startConfirmarTransition(async () => {
        try {
          setErrorGeneral(null);
          const res = await confirmarCargaMasivaPacksAction(filasValidas);
          if (!res.success) {
            setErrorGeneral(res.error || 'Error al procesar la carga masiva de packs.');
            return;
          }
          setResumenFinalPacks(res);
          setPaso('RESULTADO');
        } catch (err: any) {
          console.error(err);
          setErrorGeneral('Ocurrió un error crítico durante la importación de packs.');
        }
      });
    }
  };

  // ---------------------------------------------------------------------------
  // 5. FILTRADO DE FILAS EN PREVISUALIZACIÓN
  // ---------------------------------------------------------------------------
  const filasFiltradasProductos = filasProductos.filter((f) => {
    if (filtroTipo === 'CREAR' && f.accion !== 'CREAR') return false;
    if (filtroTipo === 'ACTUALIZAR' && f.accion !== 'ACTUALIZAR') return false;
    if (filtroTipo === 'ERRORES' && f.errores.length === 0) return false;

    if (busquedaTabla.trim() !== '') {
      const q = busquedaTabla.toLowerCase().trim();
      const matchCod = f.datos.codigo.toLowerCase().includes(q);
      const matchNom = f.datos.nombre.toLowerCase().includes(q);
      const matchCat = f.datos.categoria.toLowerCase().includes(q);
      const matchErr = f.errores.some((err) => err.toLowerCase().includes(q));
      return matchCod || matchNom || matchCat || matchErr;
    }
    return true;
  });

  const filasFiltradasPacks = filasPacks.filter((f) => {
    if (filtroTipo === 'CREAR' && f.accion !== 'CREAR') return false;
    if (filtroTipo === 'ACTUALIZAR' && f.accion !== 'ACTUALIZAR') return false;
    if (filtroTipo === 'ERRORES' && f.errores.length === 0) return false;

    if (busquedaTabla.trim() !== '') {
      const q = busquedaTabla.toLowerCase().trim();
      const matchCod = f.datos.codigo.toLowerCase().includes(q);
      const matchNom = f.datos.nombre.toLowerCase().includes(q);
      const matchEtq = f.datos.etiqueta ? f.datos.etiqueta.toLowerCase().includes(q) : false;
      const matchErr = f.errores.some((err) => err.toLowerCase().includes(q));
      return matchCod || matchNom || matchEtq || matchErr;
    }
    return true;
  });

  const totalValidas =
    modo === 'PRODUCTOS'
      ? filasProductos.filter((f) => f.errores.length === 0).length
      : filasPacks.filter((f) => f.errores.length === 0).length;

  const resumenPrevia = modo === 'PRODUCTOS' ? resumenPreviaProductos : resumenPreviaPacks;
  const resumenFinal = modo === 'PRODUCTOS' ? resumenFinalProductos : resumenFinalPacks;

  return (
    <div className="space-y-6">
      {/* Selector de Modo (Productos vs Packs) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-neutral-200 rounded-2xl p-2.5 shadow-sm">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            id="tab-modo-productos"
            onClick={() => handleCambiarModo('PRODUCTOS')}
            className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              modo === 'PRODUCTOS'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Package className="w-4 h-4 text-gold-600" />
            <span>Catálogo de Productos</span>
          </button>

          <button
            type="button"
            id="tab-modo-packs"
            onClick={() => handleCambiarModo('PACKS')}
            className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              modo === 'PACKS'
                ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${modo === 'PACKS' ? 'text-white' : 'text-amber-600'}`} />
            <span>Packs y Combos Promocionales</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-500 pr-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>
            {modo === 'PRODUCTOS'
              ? 'Planilla oficial para ítems individuales del catálogo'
              : 'Planilla oficial con precios diferenciados (Directo / Distribuidor)'}
          </span>
        </div>
      </div>

      {/* Alerta de Error General */}
      {errorGeneral && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Atención</p>
            <p>{errorGeneral}</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASO 1: CARGAR ARCHIVO */}
      {/* ========================================================================= */}
      {paso === 'CARGAR' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Zona de Subida */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Upload className={`w-4 h-4 ${modo === 'PACKS' ? 'text-amber-600' : 'text-gold-600'}`} />
                  <span>
                    {modo === 'PRODUCTOS'
                      ? 'Subir Planilla de Productos'
                      : 'Subir Planilla de Packs y Combos'}
                  </span>
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Arrastrá tu archivo Excel o seleccionalo desde tu equipo para comenzar la validación técnica.
                </p>
              </div>

              {/* Zona Drag & Drop */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  isDragOver
                    ? modo === 'PACKS'
                      ? 'border-amber-500 bg-amber-50/50 scale-[0.99]'
                      : 'border-gold-500 bg-gold-50/50 scale-[0.99]'
                    : archivoSeleccionado
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-neutral-300 hover:border-gold-400 hover:bg-neutral-50/80 bg-neutral-50/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs transition-colors ${
                    archivoSeleccionado
                      ? 'bg-emerald-100 text-emerald-700'
                      : modo === 'PACKS'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-gold-50 text-gold-600'
                  }`}
                >
                  {archivoSeleccionado ? (
                    <FileCheck className="w-7 h-7" />
                  ) : (
                    <FileSpreadsheet className="w-7 h-7" />
                  )}
                </div>

                {archivoSeleccionado ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-neutral-900 flex items-center justify-center gap-2">
                      <span>{archivoSeleccionado.name}</span>
                      <span className="text-xs font-normal text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {(archivoSeleccionado.size / 1024).toFixed(1)} KB
                      </span>
                    </p>
                    <p className="text-xs text-neutral-500">
                      Hacé clic para seleccionar otro archivo si lo deseás
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-neutral-800">
                      Arrastrá tu planilla Excel aquí o hacé clic para explorar
                    </p>
                    <p className="text-xs text-neutral-500">
                      Formatos compatibles: .xlsx y .xls (máximo 5 MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Botón de Previsualizar */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100">
                {archivoSeleccionado && (
                  <button
                    type="button"
                    onClick={() => {
                      setArchivoSeleccionado(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-100 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Quitar archivo
                  </button>
                )}

                <button
                  type="button"
                  id="btn-previsualizar-excel"
                  onClick={handlePrevisualizar}
                  disabled={!archivoSeleccionado || isPrevisualizando}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold text-sm shadow-sm transition-all cursor-pointer ${
                    !archivoSeleccionado || isPrevisualizando
                      ? 'bg-neutral-300 cursor-not-allowed opacity-70'
                      : modo === 'PACKS'
                      ? 'bg-amber-600 hover:bg-amber-700 active:scale-[0.99]'
                      : 'bg-gold-500 hover:bg-gold-600 active:scale-[0.99]'
                  }`}
                >
                  {isPrevisualizando ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analizando Planilla...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Validar y Previsualizar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Plantilla y Reglas */}
          <div className="space-y-6">
            {/* Tarjeta de Descarga de Plantilla */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    modo === 'PACKS'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    {modo === 'PRODUCTOS'
                      ? 'Plantilla de Productos'
                      : 'Plantilla de Packs y Combos'}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {modo === 'PRODUCTOS'
                      ? 'Descargá el formato oficial para catálogo de productos individuales.'
                      : 'Descargá la planilla con columnas para precios de Salón con/sin Distribuidor y precio tachado.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-descargar-plantilla"
                onClick={handleDescargarPlantilla}
                disabled={isDescargandoPlantilla}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
              >
                {isDescargandoPlantilla ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generando Plantilla...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-gold-400" />
                    <span>Descargar Plantilla Excel (.xlsx)</span>
                  </>
                )}
              </button>
            </div>

            {/* Tarjeta de Instrucciones y Reglas */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 space-y-3.5 text-xs text-neutral-600">
              <h4 className="font-bold text-neutral-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <Info className="w-4 h-4 text-gold-600" />
                <span>
                  {modo === 'PRODUCTOS'
                    ? 'Reglas para Productos'
                    : 'Reglas para Packs y Combos'}
                </span>
              </h4>

              {modo === 'PRODUCTOS' ? (
                <ul className="space-y-2 list-disc pl-4 text-neutral-600 leading-relaxed">
                  <li>
                    <strong className="text-neutral-800">Código (SKU):</strong> Identificador único. Si ya existe, se <strong>actualizarán</strong> sus datos; si no existe, se <strong>creará</strong> uno nuevo.
                  </li>
                  <li>
                    <strong className="text-neutral-800">Categoría:</strong> Debe coincidir exactamente con una de las categorías oficiales de Steffen.
                  </li>
                  <li>
                    <strong className="text-neutral-800">Modo de Uso y Rendimiento:</strong> Columnas opcionales para detallar la aplicación técnica y rendimiento en servicios.
                  </li>
                  <li>
                    <strong className="text-neutral-800">Precios:</strong> Precio Salón Profesional y Precio Ecommerce deben ser mayores a 0.
                  </li>
                  <li>
                    <strong className="text-neutral-800">Variantes (Opcional):</strong> Para tapas/válvulas con precios distintos (ej: disctop, bomba), cargá en la columna <code className="bg-neutral-200 px-1 py-0.5 rounded text-neutral-800 font-mono text-[11px]">variantes</code> en formato <code className="bg-neutral-200 px-1 py-0.5 rounded text-neutral-800 font-mono text-[11px]">Nombre:PrecioPSS:PrecioPublico</code> separadas por barra vertical <code className="bg-neutral-200 px-1 py-0.5 rounded text-neutral-800 font-mono text-[11px]">|</code> (Ej: <em>Disctop:14500:21500 | Bomba:16500:24500</em>).
                  </li>
                  <li>
                    <strong className="text-neutral-800">Stock:</strong> Número entero mayor o igual a 0.
                  </li>
                  <li>
                    <strong className="text-neutral-800">Imágenes (imagen_url):</strong> Podés incluir URLs públicas (http/https). El sistema las descargará y almacenará de forma segura.
                  </li>
                </ul>
              ) : (
                <ul className="space-y-2 list-disc pl-4 text-neutral-600 leading-relaxed">
                  <li>
                    <strong className="text-neutral-800">Código del Pack:</strong> Identificador único (ej: <code>PACK-SALON-01</code>). Permite crear o actualizar combos existentes.
                  </li>
                  <li>
                    <strong className="text-neutral-800">Productos del Pack (Columna &quot;productos&quot;):</strong> Ingresás los productos separándolos con una barra vertical <code>|</code> y la cantidad con dos puntos <code>:</code> (ej: <code>SH-ARGAN-1000:2 | MAS-NUTRI-1000:1 | SER-ARGAN-250:1</code> o con el nombre exacto <code>Shampoo Nutrición 1000ml:2 | Sérum 250ml:1</code>).
                  </li>
                  <li>
                    <strong className="text-neutral-800">Cálculo Automático del Precio Base:</strong> Ya <strong>no necesitás cargar ningún precio</strong>. El sistema calcula automáticamente el precio base sumando el precio Salón Profesional (PSS) de todos los productos que contiene el pack.
                  </li>
                  <li>
                    <strong className="text-neutral-800">Descuento con Distribuidor (Columna &quot;descuentoConDistribuidor&quot;):</strong> Porcentaje de descuento aplicado al pack para clientes que tienen distribuidor asignado (ej: <code>25</code> para 25% OFF).
                  </li>
                  <li>
                    <strong className="text-neutral-800">Descuento sin Distribuidor (Columna &quot;descuentoSinDistribuidor&quot;):</strong> Porcentaje de descuento aplicado al pack para clientes sin distribuidor asignado / venta directa de fábrica (ej: <code>15</code> para 15% OFF).
                  </li>
                  <li>
                    <strong className="text-neutral-800">Exclusividad de Salón:</strong> Los packs solo se muestran y están disponibles para salones profesionales registrados y aprobados.
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASO 2: PREVISUALIZACIÓN */}
      {/* ========================================================================= */}
      {paso === 'PREVISUALIZAR' && resumenPrevia && (
        <div className="space-y-6">
          {/* Barra superior de estado y acciones */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-gold-600" />
                <span>
                  {modo === 'PRODUCTOS'
                    ? 'Previsualización de Productos'
                    : 'Previsualización de Packs y Combos'}
                </span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {modo === 'PRODUCTOS'
                  ? 'Revisá los productos detectados antes de aplicar los cambios a la base de datos.'
                  : 'Revisá los packs y precios calculados antes de confirmar la importación.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setPaso('CARGAR')}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cambiar Archivo</span>
              </button>

              <button
                type="button"
                id="btn-confirmar-importacion"
                onClick={handleConfirmar}
                disabled={isConfirmando || totalValidas === 0}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer ${
                  isConfirmando || totalValidas === 0
                    ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                    : modo === 'PACKS'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white active:scale-[0.99]'
                    : 'bg-gold-500 hover:bg-gold-600 text-white active:scale-[0.99]'
                }`}
              >
                {isConfirmando ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirmar e Importar ({totalValidas})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tarjetas de Resumen Numérico */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Total en Excel</p>
              <p className="text-2xl font-black text-neutral-900 mt-1">{resumenPrevia.total}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">filas procesadas</p>
            </div>

            <div className="bg-white border border-emerald-200 bg-emerald-50/30 rounded-2xl p-4 shadow-xs">
              <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Nuevos a Crear</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{resumenPrevia.crear}</p>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">códigos nuevos</p>
            </div>

            <div className="bg-white border border-blue-200 bg-blue-50/30 rounded-2xl p-4 shadow-xs">
              <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">A Actualizar</p>
              <p className="text-2xl font-black text-blue-700 mt-1">{resumenPrevia.actualizar}</p>
              <p className="text-[11px] text-blue-600/80 mt-0.5">códigos existentes</p>
            </div>

            <div
              className={`bg-white border rounded-2xl p-4 shadow-xs ${
                resumenPrevia.conError > 0
                  ? 'border-red-200 bg-red-50/40'
                  : 'border-neutral-200'
              }`}
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  resumenPrevia.conError > 0 ? 'text-red-700' : 'text-neutral-500'
                }`}
              >
                Con Errores
              </p>
              <p
                className={`text-2xl font-black mt-1 ${
                  resumenPrevia.conError > 0 ? 'text-red-700' : 'text-neutral-900'
                }`}
              >
                {resumenPrevia.conError}
              </p>
              <p
                className={`text-[11px] mt-0.5 ${
                  resumenPrevia.conError > 0 ? 'text-red-600' : 'text-neutral-400'
                }`}
              >
                {resumenPrevia.conError > 0 ? 'serán omitidas' : 'sin errores'}
              </p>
            </div>
          </div>

          {/* Filtros de la Tabla */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-neutral-500 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-gold-600" />
                Ver:
              </span>

              <button
                type="button"
                onClick={() => setFiltroTipo('TODOS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  filtroTipo === 'TODOS'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Todos ({modo === 'PRODUCTOS' ? filasProductos.length : filasPacks.length})
              </button>

              <button
                type="button"
                onClick={() => setFiltroTipo('CREAR')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  filtroTipo === 'CREAR'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Nuevos ({resumenPrevia.crear})
              </button>

              <button
                type="button"
                onClick={() => setFiltroTipo('ACTUALIZAR')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  filtroTipo === 'ACTUALIZAR'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                Actualizaciones ({resumenPrevia.actualizar})
              </button>

              {resumenPrevia.conError > 0 && (
                <button
                  type="button"
                  onClick={() => setFiltroTipo('ERRORES')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    filtroTipo === 'ERRORES'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  Con Errores ({resumenPrevia.conError})
                </button>
              )}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busquedaTabla}
                onChange={(e) => setBusquedaTabla(e.target.value)}
                placeholder="Filtrar en la tabla..."
                className="w-full bg-white border border-neutral-300 rounded-xl pl-9 pr-7 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 transition-colors"
              />
              {busquedaTabla && (
                <button
                  onClick={() => setBusquedaTabla('')}
                  className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Previsualización: PRODUCTOS */}
          {modo === 'PRODUCTOS' ? (
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[540px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-3.5 text-center w-12">#</th>
                      <th className="py-3 px-3.5">Acción</th>
                      <th className="py-3 px-3.5">Código (SKU)</th>
                      <th className="py-3 px-3.5 min-w-[200px]">Nombre del Producto</th>
                      <th className="py-3 px-3.5">Categoría</th>
                      <th className="py-3 px-3.5">Presentación</th>
                      <th className="py-3 px-3.5 text-right">Salón Profesional</th>
                      <th className="py-3 px-3.5 text-right">Público</th>
                      <th className="py-3 px-3.5 text-right">Reventa Sug.</th>
                      <th className="py-3 px-3.5 text-center">Stock</th>
                      <th className="py-3 px-3.5">Imagen</th>
                      <th className="py-3 px-3.5 min-w-[200px]">Estado / Errores</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filasFiltradasProductos.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-neutral-400">
                          No se encontraron filas con el filtro aplicado.
                        </td>
                      </tr>
                    ) : (
                      filasFiltradasProductos.map((fila) => {
                        const tieneError = fila.errores.length > 0;

                        return (
                          <tr
                            key={fila.numeroFila}
                            className={`hover:bg-neutral-50/80 transition-colors ${
                              tieneError ? 'bg-red-50/30' : ''
                            }`}
                          >
                            <td className="py-3 px-3.5 text-center font-mono text-neutral-400 font-medium">
                              {fila.numeroFila}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              {tieneError ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                  OMITIR
                                </span>
                              ) : fila.accion === 'CREAR' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  CREAR
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                  ACTUALIZAR
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 font-mono font-bold text-neutral-900 whitespace-nowrap">
                              {fila.datos.codigo || <span className="text-red-500 italic">Vacío</span>}
                            </td>
                            <td className="py-3 px-3.5 font-medium text-neutral-900">
                              {fila.datos.nombre || <span className="text-red-500 italic">Vacío</span>}
                            </td>
                            <td className="py-3 px-3.5 text-neutral-600 whitespace-nowrap">
                              {fila.datos.categoria}
                            </td>
                            <td className="py-3 px-3.5 text-neutral-600 whitespace-nowrap">
                              {fila.datos.presentacion}
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono font-semibold text-gold-700 whitespace-nowrap">
                              {formatoMoneda.format(fila.datos.precioPss)}
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono text-neutral-700 whitespace-nowrap">
                              {formatoMoneda.format(fila.datos.precioEcommerce)}
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono text-emerald-700 whitespace-nowrap">
                              {fila.datos.precioReventa ? (
                                formatoMoneda.format(fila.datos.precioReventa)
                              ) : (
                                <span className="text-neutral-300">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-center font-semibold text-neutral-800 whitespace-nowrap">
                              {fila.datos.stock} u.
                            </td>
                            <td className="py-3 px-3.5 text-neutral-500 whitespace-nowrap">
                              {fila.datos.imagen_url ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md" title={fila.datos.imagen_url}>
                                  <ExternalLink className="w-3 h-3 text-gold-600" />
                                  URL presente
                                </span>
                              ) : (
                                <span className="text-[11px] text-neutral-400">Sin URL</span>
                              )}
                            </td>
                            <td className="py-3 px-3.5">
                              {tieneError ? (
                                <div className="space-y-1">
                                  {fila.errores.map((err, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-red-600 text-[11px]">
                                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                      <span>{err}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-medium">
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  Lista para importar
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Tabla de Previsualización: PACKS */
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[540px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-3.5 text-center w-12">#</th>
                      <th className="py-3 px-3.5">Acción</th>
                      <th className="py-3 px-3.5">Código Pack</th>
                      <th className="py-3 px-3.5 min-w-[200px]">Nombre del Pack / Combo</th>
                      <th className="py-3 px-3.5">Etiqueta</th>
                      <th className="py-3 px-3.5 min-w-[180px]">Productos Incluidos</th>
                      <th className="py-3 px-3.5 text-right">Precio Base (Suma PSS)</th>
                      <th className="py-3 px-3.5 text-right">Desc. c/Distribuidor</th>
                      <th className="py-3 px-3.5 text-right">Desc. s/Distribuidor</th>
                      <th className="py-3 px-3.5 text-center">Destacado</th>
                      <th className="py-3 px-3.5">Imagen</th>
                      <th className="py-3 px-3.5 min-w-[200px]">Estado / Errores</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filasFiltradasPacks.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-neutral-400">
                          No se encontraron filas con el filtro aplicado.
                        </td>
                      </tr>
                    ) : (
                      filasFiltradasPacks.map((fila) => {
                        const tieneError = fila.errores.length > 0;
                        const metaEtiqueta = fila.datos.etiqueta
                          ? ETIQUETAS_PACK_CONFIG[fila.datos.etiqueta as EtiquetaPack]
                          : null;

                        return (
                          <tr
                            key={fila.numeroFila}
                            className={`hover:bg-neutral-50/80 transition-colors ${
                              tieneError ? 'bg-red-50/30' : ''
                            }`}
                          >
                            <td className="py-3 px-3.5 text-center font-mono text-neutral-400 font-medium">
                              {fila.numeroFila}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              {tieneError ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                  OMITIR
                                </span>
                              ) : fila.accion === 'CREAR' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  CREAR
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                  ACTUALIZAR
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 font-mono font-bold text-neutral-900 whitespace-nowrap">
                              {fila.datos.codigo || <span className="text-red-500 italic">Vacío</span>}
                            </td>
                            <td className="py-3 px-3.5 font-medium text-neutral-900">
                              {fila.datos.nombre || <span className="text-red-500 italic">Vacío</span>}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              {fila.datos.etiqueta ? (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    metaEtiqueta?.badgeBg || 'bg-amber-50'
                                  } ${metaEtiqueta?.badgeText || 'text-amber-800'} ${
                                    metaEtiqueta?.badgeBorder || 'border-amber-200'
                                  }`}
                                >
                                  {fila.datos.etiqueta}
                                </span>
                              ) : (
                                <span className="text-neutral-400 italic text-[11px]">Sin etiqueta</span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-xs">
                              {fila.datos.productos ? (
                                <div className="max-w-[240px] truncate text-neutral-700 font-mono text-[11px] bg-neutral-100 px-2 py-1 rounded" title={fila.datos.productos}>
                                  {fila.datos.productos}
                                </div>
                              ) : (
                                <span className="text-neutral-400 italic text-[11px]">Sin asignar</span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono font-semibold text-neutral-800 whitespace-nowrap">
                              {fila.datos.precioBaseCalculado > 0 ? (
                                <div>
                                  <span>{formatoMoneda.format(fila.datos.precioBaseCalculado)}</span>
                                  <div className="text-[10px] font-normal text-neutral-400">Total productos</div>
                                </div>
                              ) : (
                                <span className="text-red-500 italic text-[11px]">$0</span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono whitespace-nowrap">
                              <div className="font-bold text-emerald-800">
                                {formatoMoneda.format(fila.datos.precioDistribuidorCalculado)}
                              </div>
                              <div className="text-[10px] font-semibold text-emerald-600">
                                {fila.datos.descuentoConDistribuidor}% OFF
                              </div>
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono whitespace-nowrap">
                              <div className="font-bold text-amber-800">
                                {formatoMoneda.format(fila.datos.precioDirectoCalculado)}
                              </div>
                              <div className="text-[10px] font-semibold text-amber-600">
                                {fila.datos.descuentoSinDistribuidor}% OFF
                              </div>
                            </td>
                            <td className="py-3 px-3.5 text-center whitespace-nowrap">
                              {fila.datos.destacado ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                  <Sparkles className="w-3 h-3 text-amber-600" />
                                  Sí
                                </span>
                              ) : (
                                <span className="text-neutral-400 text-[11px]">No</span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-neutral-500 whitespace-nowrap">
                              {fila.datos.imagen_url ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md" title={fila.datos.imagen_url}>
                                  <ExternalLink className="w-3 h-3 text-gold-600" />
                                  URL
                                </span>
                              ) : (
                                <span className="text-[11px] text-neutral-400">Predeterminada</span>
                              )}
                            </td>
                            <td className="py-3 px-3.5">
                              {tieneError ? (
                                <div className="space-y-1">
                                  {fila.errores.map((err, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-red-600 text-[11px]">
                                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                      <span>{err}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-medium">
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  Listo para importar
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASO 3: RESULTADO FINAL */}
      {/* ========================================================================= */}
      {paso === 'RESULTADO' && resumenFinal && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                ¡Carga Masiva Completada con Éxito!
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {modo === 'PRODUCTOS'
                  ? 'El catálogo oficial de productos ha sido actualizado en la base de datos.'
                  : 'Los packs y combos promocionales han sido actualizados con sus precios de salón correspondientes.'}
              </p>
            </div>
          </div>

          {/* Métricas de Resultado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                {modo === 'PRODUCTOS' ? 'Productos Creados' : 'Packs Creados'}
              </p>
              <p className="text-3xl font-black text-emerald-800 mt-1">{resumenFinal.creados}</p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                {modo === 'PRODUCTOS' ? 'Productos Actualizados' : 'Packs Actualizados'}
              </p>
              <p className="text-3xl font-black text-blue-800 mt-1">{resumenFinal.actualizados}</p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-100 border border-neutral-200">
              <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">Omitidos por Error</p>
              <p className="text-3xl font-black text-neutral-700 mt-1">{resumenFinal.omitidos}</p>
            </div>
          </div>

          {/* Advertencias de Descarga de Imágenes */}
          {resumenFinal.advertencias && resumenFinal.advertencias.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-neutral-100">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5 text-amber-700">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Advertencias en Imágenes ({resumenFinal.advertencias.length})</span>
              </h3>
              <p className="text-xs text-neutral-500">
                Los siguientes ítems se crearon o actualizaron correctamente, pero sus imágenes remotas no pudieron descargarse automáticamente:
              </p>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {resumenFinal.advertencias.map((adv, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 flex items-start gap-2"
                  >
                    <span className="font-mono font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded text-[10px]">
                      {adv.codigo}
                    </span>
                    <span>{adv.mensaje}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones de Navegación Final */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-neutral-100">
            <Link
              href={modo === 'PRODUCTOS' ? '/admin/productos' : '/admin/packs'}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold text-sm shadow-sm transition-all cursor-pointer ${
                modo === 'PACKS'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-gold-500 hover:bg-gold-600'
              }`}
            >
              <span>
                {modo === 'PRODUCTOS'
                  ? 'Ir al Catálogo de Productos'
                  : 'Ir al Listado de Packs'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={() => {
                setArchivoSeleccionado(null);
                setFilasProductos([]);
                setFilasPacks([]);
                setResumenPreviaProductos(null);
                setResumenPreviaPacks(null);
                setResumenFinalProductos(null);
                setResumenFinalPacks(null);
                setPaso('CARGAR');
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Importar Otro Archivo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
