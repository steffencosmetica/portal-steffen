'use client';

import React, { useState, useTransition, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EstadoZona } from '@prisma/client';
import { guardarZonaAction } from '@/app/actions/admin/zonas';
import { PROVINCIAS_ARGENTINA } from '@/lib/constants/provincias';
import { GooglePlacesAutocomplete, PlaceSelectedData } from '@/components/GooglePlacesAutocomplete';
import { 
  MapPin, 
  ArrowLeft, 
  Save, 
  Loader2, 
  AlertCircle, 
  Truck, 
  CheckCircle2,
  Building2,
  Users,
  Info,
  Navigation,
  X
} from 'lucide-react';

export interface DistribuidorOpcionDTO {
  id: string;
  nombre: string;
  empresa: string | null;
  provincia: string;
  estado: string;
}

export interface ZonaInicialDTO {
  id: string;
  provincia: string;
  localidad: string;
  estado: EstadoZona;
  distribuidorId: string | null;
  latitud?: number | null;
  longitud?: number | null;
  clientesCount?: number;
}

interface ZonaFormProps {
  zonaInicial?: ZonaInicialDTO | null;
  distribuidoresActivos: DistribuidorOpcionDTO[];
}

export function ZonaForm({ zonaInicial, distribuidoresActivos }: ZonaFormProps) {
  const router = useRouter();
  const esEdicion = !!zonaInicial?.id;

  const [provincia, setProvincia] = useState<string>(zonaInicial?.provincia || 'Buenos Aires');
  const [localidad, setLocalidad] = useState<string>(zonaInicial?.localidad || '');
  const [latitud, setLatitud] = useState<number | null>(zonaInicial?.latitud ?? null);
  const [longitud, setLongitud] = useState<number | null>(zonaInicial?.longitud ?? null);
  const [direccionFormateada, setDireccionFormateada] = useState<string>('');
  const [estado, setEstado] = useState<EstadoZona>(zonaInicial?.estado || EstadoZona.SIN_DISTRIBUIDOR);
  const [distribuidorId, setDistribuidorId] = useState<string>(zonaInicial?.distribuidorId || '');

  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [buscandoGps, setBuscandoGps] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const handlePlaceSelected = useCallback((data: PlaceSelectedData) => {
    if (data.provincia) {
      setProvincia(data.provincia);
    }
    if (data.localidad) {
      setLocalidad(data.localidad);
    }
    setLatitud(data.lat);
    setLongitud(data.lng);
    setDireccionFormateada(data.direccionFormateada);
  }, []);

  const handleLimpiarCoordenadas = () => {
    setLatitud(null);
    setLongitud(null);
    setDireccionFormateada('');
  };

  const handleAutoGeolocalizar = async () => {
    if (!localidad.trim()) {
      setMensajeError('Ingresá primero una localidad para buscar sus coordenadas GPS.');
      return;
    }
    setBuscandoGps(true);
    setMensajeError(null);
    try {
      const query = `${localidad.trim()}, ${provincia}, Argentina`;
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}&provincia=${encodeURIComponent(provincia)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          const primero = data.results[0];
          setLatitud(primero.lat);
          setLongitud(primero.lng);
          setDireccionFormateada(primero.direccionFormateada);
          if (primero.provincia) {
            setProvincia(primero.provincia);
          }
          if (primero.localidad) {
            setLocalidad(primero.localidad);
          }
        } else {
          setMensajeError(`No se encontraron coordenadas exactas para "${localidad}, ${provincia}". Podés guardar la zona de todas formas.`);
        }
      }
    } catch (err) {
      console.warn('Error geolocalizando:', err);
    } finally {
      setBuscandoGps(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeError(null);
    setMensajeExito(null);

    // Validaciones
    if (!provincia.trim()) {
      setMensajeError('La provincia es obligatoria.');
      return;
    }
    if (!localidad.trim()) {
      setMensajeError('La localidad es obligatoria.');
      return;
    }

    if (estado !== EstadoZona.SIN_DISTRIBUIDOR && !distribuidorId) {
      setMensajeError('Si la zona tiene cobertura de distribuidor, debés seleccionar un distribuidor oficial.');
      return;
    }

    startTransition(async () => {
      const res = await guardarZonaAction(zonaInicial?.id || null, {
        provincia: provincia.trim(),
        localidad: localidad.trim(),
        estado,
        distribuidorId: estado === EstadoZona.SIN_DISTRIBUIDOR ? null : (distribuidorId || null),
        latitud,
        longitud,
      });

      if (res.success) {
        setMensajeExito(esEdicion ? 'Zona geográfica actualizada correctamente.' : 'Zona geográfica creada con éxito.');
        setTimeout(() => {
          router.push('/admin/zonas');
          router.refresh();
        }, 800);
      } else {
        setMensajeError(res.error || 'Ocurrió un error al guardar la zona.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Encabezado / Barra superior del formulario */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/zonas"
            className="p-2 rounded-xl border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            title="Volver a la lista de zonas"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">
              {esEdicion ? `Editar Zona: ${zonaInicial.localidad}, ${zonaInicial.provincia}` : 'Nueva Zona Geográfica'}
            </h1>
            <p className="text-xs text-neutral-500">
              {esEdicion
                ? 'Modificá la cobertura y asignación de distribuidor oficial para esta zona.'
                : 'Definí una nueva localidad y su estado de distribución mayorista o venta directa.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/zonas"
            className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gold-500 hover:bg-gold-600 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{esEdicion ? 'Guardar Cambios' : 'Crear Zona'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alertas de Error / Éxito */}
      {mensajeError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Error al guardar:</span>
            <span>{mensajeError}</span>
          </div>
        </div>
      )}

      {mensajeExito && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <span className="font-bold block">¡Operación exitosa!</span>
            <span>{mensajeExito}</span>
          </div>
        </div>
      )}

      {/* Bloques de Formulario */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Principal: Localización y Cobertura */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold-600" />
                <span>Ubicación Geográfica</span>
              </h2>
              {latitud !== null && longitud !== null && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-emerald-600" />
                  Geolocalizada
                </span>
              )}
            </div>

            {/* Búsqueda rápida de Ciudad o Localidad */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-neutral-700">
                  Buscar Ciudad o Localidad (Google Maps / Geocodificación)
                </label>
                <span className="text-[11px] text-neutral-400">
                  Autocompleta provincia, localidad y coordenadas
                </span>
              </div>
              <GooglePlacesAutocomplete
                onPlaceSelected={handlePlaceSelected}
                placeholder="Buscar ciudad o localidad en Argentina (ej. Junín, Pergamino, Rosario)..."
              />
            </div>

            {/* Coordenadas GPS asignadas */}
            {latitud !== null && longitud !== null ? (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-semibold block">Coordenadas del centro de la zona:</span>
                    <span className="text-emerald-700 text-[11px] font-mono">
                      Lat: {latitud.toFixed(5)}, Lng: {longitud.toFixed(5)}
                      {direccionFormateada ? ` (${direccionFormateada})` : ''}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLimpiarCoordenadas}
                  className="text-xs text-emerald-700 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-emerald-100/50 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  title="Quitar geolocalización GPS"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Quitar GPS</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-start justify-between gap-2 text-xs text-neutral-600">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                  <p>
                    Podés seleccionar la provincia y escribir la localidad manualmente. Si querés habilitar cálculo por proximidad (50 km), podés autocompletar con el buscador o pulsar "Detectar GPS".
                  </p>
                </div>
                {localidad.trim() && (
                  <button
                    type="button"
                    onClick={handleAutoGeolocalizar}
                    disabled={buscandoGps}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gold-700 hover:text-gold-900 bg-gold-50 border border-gold-300 hover:bg-gold-100 px-2.5 py-1.5 rounded-lg shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                    title="Obtener coordenadas GPS automáticamente para esta localidad"
                  >
                    {buscandoGps ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Navigation className="w-3.5 h-3.5 text-gold-600" />
                    )}
                    <span>Detectar GPS</span>
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Provincia *
                </label>
                <select
                  required
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors cursor-pointer"
                >
                  {PROVINCIAS_ARGENTINA.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-700">
                    Localidad / Ciudad *
                  </label>
                  {localidad.trim() && latitud === null && (
                    <button
                      type="button"
                      onClick={handleAutoGeolocalizar}
                      disabled={buscandoGps}
                      className="text-[11px] font-semibold text-gold-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {buscandoGps ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                      Obtener GPS
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={localidad}
                  onChange={(e) => setLocalidad(e.target.value)}
                  placeholder="Ej: Junín, Pergamino, Rosario"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Tarjeta de Cobertura y Distribuidor */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Truck className="w-4 h-4 text-gold-600" />
              <span>Esquema de Distribución y Precios</span>
            </h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Estado de Cobertura *
                </label>
                <select
                  value={estado}
                  onChange={(e) => {
                    const nuevoEstado = e.target.value as EstadoZona;
                    setEstado(nuevoEstado);
                    if (nuevoEstado === EstadoZona.SIN_DISTRIBUIDOR) {
                      setDistribuidorId('');
                    }
                  }}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors cursor-pointer"
                >
                  <option value={EstadoZona.SIN_DISTRIBUIDOR}>
                    SIN DISTRIBUIDOR — Venta Directa de Fábrica
                  </option>
                  <option value={EstadoZona.COBERTURA_PARCIAL}>
                    COBERTURA PARCIAL — Distribución Mixta / Derivación
                  </option>
                  <option value={EstadoZona.CON_DISTRIBUIDOR}>
                    CON DISTRIBUIDOR — Distribuidor Oficial Exclusivo
                  </option>
                </select>
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 space-y-1">
                  {estado === EstadoZona.SIN_DISTRIBUIDOR && (
                    <p>
                      🏭 Los salones de esta zona compran directamente a la fábrica de Steffen con descuentos de primer pedido y reposición.
                    </p>
                  )}
                  {estado === EstadoZona.COBERTURA_PARCIAL && (
                    <p>
                      🚚 Zona con presencia de distribuidor pero posibilidad de abastecimiento directo según acuerdo comercial.
                    </p>
                  )}
                  {estado === EstadoZona.CON_DISTRIBUIDOR && (
                    <p>
                      🤝 Los pedidos de salones de esta zona se derivan prioritariamente al distribuidor oficial asignado.
                    </p>
                  )}
                </div>
              </div>

              {/* Selector de Distribuidor (cuando aplica) */}
              {estado !== EstadoZona.SIN_DISTRIBUIDOR && (
                <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                  <label className="block text-xs font-semibold text-neutral-700">
                    Distribuidor Oficial Asignado *
                  </label>
                  {distribuidoresActivos.length === 0 ? (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>
                        No hay distribuidores activos registrados. Creá uno en el módulo de Distribuidores primero.
                      </span>
                    </div>
                  ) : (
                    <select
                      required
                      value={distribuidorId}
                      onChange={(e) => setDistribuidorId(e.target.value)}
                      className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors cursor-pointer"
                    >
                      <option value="">-- Seleccionar Distribuidor --</option>
                      {distribuidoresActivos.map((dist) => (
                        <option key={dist.id} value={dist.id}>
                          {dist.nombre} {dist.empresa ? `(${dist.empresa})` : ''} - {dist.provincia}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna Lateral: Información de Referencia */}
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Info className="w-4 h-4 text-gold-600" />
              <span>Reglas de Asignación</span>
            </h2>

            <div className="space-y-3 text-xs text-neutral-600 leading-relaxed">
              <p>
                Cada vez que un salón se registra indicando su provincia y localidad, el sistema busca automáticamente la zona geográfica correspondiente para determinar los precios y el canal de abastecimiento.
              </p>
              <p>
                Si no existe una zona cargada para su localidad, el sistema asume por defecto <strong>Venta Directa de Fábrica</strong>.
              </p>
            </div>

            {esEdicion && typeof zonaInicial.clientesCount === 'number' && (
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-gold-600" />
                  <span>Salones en esta zona:</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800">
                  {zonaInicial.clientesCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
