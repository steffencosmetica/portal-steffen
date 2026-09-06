'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Sparkles, X, Loader2, Search, Check, Navigation } from 'lucide-react';
import { normalizarProvinciaArgentina } from '@/lib/constants/provincias';

export interface PlaceSelectedData {
  direccionFormateada: string;
  provincia: string;
  localidad: string;
  lat: number | null;
  lng: number | null;
}

export interface GeocodeResultItem {
  direccionFormateada: string;
  provincia: string;
  localidad: string;
  lat: number;
  lng: number;
}

interface GooglePlacesAutocompleteProps {
  onPlaceSelected: (data: PlaceSelectedData) => void;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  value?: string;
  provinciaFilter?: string;
  onChangeText?: (val: string) => void;
}

// Control singleton para carga única del script de Google Maps en el navegador
let googleMapsScriptLoadingPromise: Promise<boolean> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  const windowWithGoogle = window as unknown as { google?: { maps?: { places?: unknown } } };
  if (windowWithGoogle.google?.maps?.places) {
    return Promise.resolve(true);
  }

  if (googleMapsScriptLoadingPromise) {
    return googleMapsScriptLoadingPromise;
  }

  googleMapsScriptLoadingPromise = new Promise((resolve) => {
    const existingScript = document.getElementById('google-maps-places-script');
    if (existingScript) {
      if ((window as any).google?.maps?.places) {
        resolve(true);
      } else {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-places-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey.trim())}&libraries=places&language=es&region=AR`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Google Places API: no se pudo cargar el script de Google Maps en el navegador.');
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return googleMapsScriptLoadingPromise;
}

export function GooglePlacesAutocomplete({
  onPlaceSelected,
  defaultValue = '',
  placeholder = 'Ingresá ciudad, localidad o dirección (ej. Pergamino, Junín, Rosario, Av. Santa Fe 1234)...',
  className = '',
  id = 'google-places-autocomplete-input',
  name = 'direccion',
  disabled = false,
  required = false,
  value,
  provinciaFilter,
  onChangeText,
}: GooglePlacesAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const listenerRef = useRef<any>(null);

  // Mantener referencias actualizadas de los callbacks
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  onPlaceSelectedRef.current = onPlaceSelected;

  const onChangeTextRef = useRef(onChangeText);
  onChangeTextRef.current = onChangeText;

  const [queryText, setQueryText] = useState<string>(value || defaultValue || '');
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const [hasAuthError, setHasAuthError] = useState<boolean>(false);

  // Estado del motor de búsqueda asistido (Geocoding / Auto-sugerencias instantáneas)
  const [sugerencias, setSugerencias] = useState<GeocodeResultItem[]>([]);
  const [cargandoSugerencias, setCargandoSugerencias] = useState<boolean>(false);
  const [mostrarDropdown, setMostrarDropdown] = useState<boolean>(false);
  const [indiceSeleccionado, setIndiceSeleccionado] = useState<number>(-1);
  const [lugarConfirmado, setLugarConfirmado] = useState<boolean>(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();

  // Escuchar errores de autenticación de Google Maps
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      console.warn('Google Maps: Error de autorización o restricción en la API Key.');
      setHasAuthError(true);
      if (typeof originalAuthFailure === 'function') {
        originalAuthFailure();
      }
    };
  }, []);

  // 1. Cargar script de Google Places en segundo plano si hay API key
  useEffect(() => {
    if (!apiKey) return;

    let isMounted = true;
    loadGoogleMapsScript(apiKey).then((loaded) => {
      if (isMounted) {
        setScriptLoaded(loaded);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  // 2. Callback para seleccionar un lugar desde sugerencias o geocode
  const handleSeleccionarLugar = useCallback((item: GeocodeResultItem) => {
    setQueryText(item.direccionFormateada);
    setLugarConfirmado(true);
    setMostrarDropdown(false);
    setSugerencias([]);
    setIndiceSeleccionado(-1);

    if (inputRef.current) {
      inputRef.current.value = item.direccionFormateada;
    }

    if (onChangeTextRef.current) {
      onChangeTextRef.current(item.direccionFormateada);
    }

    if (onPlaceSelectedRef.current) {
      onPlaceSelectedRef.current({
        direccionFormateada: item.direccionFormateada,
        provincia: item.provincia,
        localidad: item.localidad,
        lat: item.lat,
        lng: item.lng,
      });
    }
  }, []);

  // 3. Inicializar el widget Autocomplete nativo oficial de Google Maps si está disponible
  useEffect(() => {
    const windowWithGoogle = typeof window !== 'undefined' ? (window as any) : null;
    if (!inputRef.current || !windowWithGoogle?.google?.maps?.places?.Autocomplete || hasAuthError) {
      return;
    }

    try {
      if (listenerRef.current && windowWithGoogle.google.maps.event) {
        windowWithGoogle.google.maps.event.removeListener(listenerRef.current);
      }

      const autocomplete = new windowWithGoogle.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'ar' },
        fields: ['address_components', 'geometry', 'formatted_address', 'name'],
      });

      autocompleteRef.current = autocomplete;

      const listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place) return;

        const formattedAddress = place.formatted_address || place.name || '';
        let lat: number | null = null;
        let lng: number | null = null;

        if (place.geometry && place.geometry.location) {
          lat = typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat;
          lng = typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng;
        }

        let provincia = '';
        let localidad = '';
        let streetName = '';
        let streetNumber = '';

        if (Array.isArray(place.address_components)) {
          for (const comp of place.address_components) {
            const types = comp.types || [];
            if (types.includes('administrative_area_level_1')) {
              provincia = comp.long_name || comp.short_name || '';
            } else if (types.includes('locality')) {
              localidad = comp.long_name || '';
            } else if (!localidad && (types.includes('sublocality') || types.includes('sublocality_level_1'))) {
              localidad = comp.long_name || '';
            } else if (!localidad && types.includes('administrative_area_level_2')) {
              localidad = comp.long_name || '';
            }

            if (types.includes('route')) {
              streetName = comp.long_name || '';
            }
            if (types.includes('street_number')) {
              streetNumber = comp.long_name || '';
            }
          }
        }

        const provinciaNormalizada = normalizarProvinciaArgentina(provincia);
        const localidadFinal = localidad || (streetName ? `${streetName} ${streetNumber}`.trim() : formattedAddress.split(',')[0]);

        handleSeleccionarLugar({
          direccionFormateada: formattedAddress,
          provincia: provinciaNormalizada,
          localidad: localidadFinal,
          lat: lat ?? 0,
          lng: lng ?? 0,
        });
      });

      listenerRef.current = listener;
    } catch (err) {
      console.warn('No se pudo inicializar Google Places Autocomplete nativo:', err);
    }

    return () => {
      if (listenerRef.current && windowWithGoogle?.google?.maps?.event) {
        windowWithGoogle.google.maps.event.removeListener(listenerRef.current);
      }
    };
  }, [scriptLoaded, hasAuthError, handleSeleccionarLugar]);

  // 4. Buscar mediante API geocode del backend (con fallback Google Server / Nominatim)
  const ejecutarBusquedaGeocode = useCallback(
    async (texto: string, autoSeleccionarPrimero: boolean = false) => {
      const termino = texto.trim();
      if (!termino || termino.length < 2) {
        setSugerencias([]);
        setMostrarDropdown(false);
        return;
      }

      setCargandoSugerencias(true);
      try {
        const params = new URLSearchParams();
        params.set('q', termino);
        if (provinciaFilter) {
          params.set('provincia', provinciaFilter);
        }

        const res = await fetch(`/api/geocode?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const items: GeocodeResultItem[] = Array.isArray(data.results) ? data.results : [];
          setSugerencias(items);

          if (autoSeleccionarPrimero && items.length > 0) {
            handleSeleccionarLugar(items[0]);
          } else if (items.length > 0) {
            setMostrarDropdown(true);
            setIndiceSeleccionado(-1);
          } else {
            setMostrarDropdown(false);
          }
        }
      } catch (err) {
        console.warn('Error al buscar sugerencias de geocodificación:', err);
      } finally {
        setCargandoSugerencias(false);
      }
    },
    [provinciaFilter, handleSeleccionarLugar]
  );

  // Manejar el valor si es controlado desde afuera
  useEffect(() => {
    if (value !== undefined) {
      setQueryText(value);
      if (inputRef.current && inputRef.current.value !== value) {
        inputRef.current.value = value;
      }
    }
  }, [value]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMostrarDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Manejar escritura en el input con debounce para autocompletar
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevoTexto = e.target.value;
    setQueryText(nuevoTexto);
    setLugarConfirmado(false);

    if (onChangeTextRef.current) {
      onChangeTextRef.current(nuevoTexto);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (nuevoTexto.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        ejecutarBusquedaGeocode(nuevoTexto, false);
      }, 250);
    } else {
      setSugerencias([]);
      setMostrarDropdown(false);
    }
  };

  // Manejar teclado (Flechas, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!mostrarDropdown && sugerencias.length > 0) {
        setMostrarDropdown(true);
        return;
      }
      if (sugerencias.length > 0) {
        setIndiceSeleccionado((prev) => (prev < sugerencias.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (sugerencias.length > 0) {
        setIndiceSeleccionado((prev) => (prev > 0 ? prev - 1 : sugerencias.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (mostrarDropdown && indiceSeleccionado >= 0 && sugerencias[indiceSeleccionado]) {
        handleSeleccionarLugar(sugerencias[indiceSeleccionado]);
      } else if (mostrarDropdown && sugerencias.length > 0) {
        handleSeleccionarLugar(sugerencias[0]);
      } else if (queryText.trim().length >= 2) {
        ejecutarBusquedaGeocode(queryText, true);
      }
    } else if (e.key === 'Escape') {
      setMostrarDropdown(false);
    }
  };

  const handleLimpiarInput = () => {
    setQueryText('');
    setSugerencias([]);
    setMostrarDropdown(false);
    setLugarConfirmado(false);

    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
    if (onChangeTextRef.current) {
      onChangeTextRef.current('');
    }
    if (onPlaceSelectedRef.current) {
      onPlaceSelectedRef.current({
        direccionFormateada: '',
        provincia: '',
        localidad: '',
        lat: null,
        lng: null,
      });
    }
  };

  const handleBuscarManual = () => {
    if (queryText.trim().length >= 2) {
      ejecutarBusquedaGeocode(queryText, true);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <MapPin className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={queryText}
          disabled={disabled}
          required={required}
          onFocus={() => {
            if (sugerencias.length > 0) {
              setMostrarDropdown(true);
            }
          }}
          onKeyDown={handleKeyDown}
          onChange={handleInputChange}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-24 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors ${className}`}
        />

        {/* Acciones e indicadores dentro del input */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {cargandoSugerencias ? (
            <span className="p-1 text-gold-600">
              <Loader2 className="w-4 h-4 animate-spin" />
            </span>
          ) : queryText ? (
            <button
              type="button"
              onClick={handleLimpiarInput}
              className="p-1 text-neutral-400 hover:text-neutral-600 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Borrar texto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}

          {/* Botón Buscar / Confirmar */}
          <button
            type="button"
            onClick={handleBuscarManual}
            disabled={!queryText.trim() || cargandoSugerencias}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-gold-50 hover:bg-gold-100 border border-gold-300 text-gold-800 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Buscar y geolocalizar"
          >
            <Search className="w-3 h-3 text-gold-700" />
            <span className="hidden sm:inline">Buscar</span>
          </button>

          {/* Indicador de Google Maps activo */}
          {scriptLoaded && !hasAuthError && (
            <span className="p-1" title="Autocompletado de Google Maps activo">
              <Sparkles className="w-3.5 h-3.5 text-gold-500" />
            </span>
          )}
        </div>
      </div>

      {/* Menú flotante de resultados / sugerencias instantáneas */}
      {mostrarDropdown && sugerencias.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500 font-medium">
            <span>Ubicaciones encontradas ({sugerencias.length})</span>
            <span className="text-[10px] text-neutral-400">Clic para seleccionar</span>
          </div>

          <div className="divide-y divide-neutral-100">
            {sugerencias.map((item, idx) => {
              const estaResaltado = idx === indiceSeleccionado;
              return (
                <button
                  key={`${item.lat}-${item.lng}-${idx}`}
                  type="button"
                  onClick={() => handleSeleccionarLugar(item)}
                  onMouseEnter={() => setIndiceSeleccionado(idx)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-start gap-3 transition-colors cursor-pointer ${
                    estaResaltado ? 'bg-gold-50/80 text-neutral-900' : 'hover:bg-neutral-50 text-neutral-800'
                  }`}
                >
                  <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${estaResaltado ? 'text-gold-600' : 'text-neutral-400'}`} />
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-neutral-900">
                        {item.localidad || item.direccionFormateada.split(',')[0]}
                      </span>
                      {item.provincia && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gold-100/70 text-gold-800 border border-gold-200/80">
                          {item.provincia}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                      {item.direccionFormateada}
                    </p>

                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                      GPS: {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                    </p>
                  </div>

                  {estaResaltado && (
                    <span className="text-[10px] font-bold text-gold-700 bg-gold-100 px-2 py-0.5 rounded shrink-0">
                      Elegir
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmación visual si ya se seleccionó una ubicación */}
      {lugarConfirmado && (
        <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>Ubicación seleccionada y geolocalizada correctamente.</span>
        </p>
      )}
    </div>
  );
}
