'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Sparkles, AlertCircle, X } from 'lucide-react';
import { normalizarProvinciaArgentina } from '@/lib/constants/provincias';

export interface PlaceSelectedData {
  direccionFormateada: string;
  provincia: string;
  localidad: string;
  lat: number | null;
  lng: number | null;
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
      console.warn('Google Places API: no se pudo cargar el script de Google Maps.');
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return googleMapsScriptLoadingPromise;
}

export function GooglePlacesAutocomplete({
  onPlaceSelected,
  defaultValue = '',
  placeholder = 'Ingresá calle y número, salón o localidad (ej. Av. Santa Fe 1234, CABA)...',
  className = '',
  id = 'google-places-autocomplete-input',
  name = 'direccion',
  disabled = false,
  required = false,
  value,
  onChangeText,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const listenerRef = useRef<any>(null);

  // Mantener referencias actualizadas de los callbacks para evitar recreaciones
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  onPlaceSelectedRef.current = onPlaceSelected;

  const onChangeTextRef = useRef(onChangeText);
  onChangeTextRef.current = onChangeText;

  const [queryText, setQueryText] = useState<string>(value || defaultValue || '');
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const [hasAuthError, setHasAuthError] = useState<boolean>(false);

  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();

  // Escuchar errores de autenticación de Google Maps
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      console.warn('Google Maps: Error de autorización en la API Key.');
      setHasAuthError(true);
      if (typeof originalAuthFailure === 'function') {
        originalAuthFailure();
      }
    };
  }, []);

  // 1. Cargar script de Google Places
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

  // 2. Inicializar el widget Autocomplete nativo oficial de Google Maps Places
  useEffect(() => {
    const windowWithGoogle = typeof window !== 'undefined' ? (window as any) : null;
    if (!inputRef.current || !windowWithGoogle?.google?.maps?.places?.Autocomplete || hasAuthError) {
      return;
    }

    try {
      // Limpiar instancia previa si existiera
      if (listenerRef.current && windowWithGoogle.google.maps.event) {
        windowWithGoogle.google.maps.event.removeListener(listenerRef.current);
      }

      // Inicializar Autocomplete original sin restricciones de tipo para incluir calles con número, comercios y ciudades
      const autocomplete = new windowWithGoogle.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'ar' },
        fields: ['address_components', 'geometry', 'formatted_address', 'name'],
      });

      autocompleteRef.current = autocomplete;

      // Escuchar el evento oficial nativo 'place_changed' de Google Maps
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

        // Si no se detectó localidad específica, inferir desde componentes de calle o dirección
        const localidadFinal = localidad || (streetName ? `${streetName} ${streetNumber}`.trim() : formattedAddress.split(',')[0]);

        setQueryText(formattedAddress);
        if (onChangeTextRef.current) {
          onChangeTextRef.current(formattedAddress);
        }

        if (onPlaceSelectedRef.current) {
          onPlaceSelectedRef.current({
            direccionFormateada: formattedAddress,
            provincia: provinciaNormalizada,
            localidad: localidadFinal,
            lat,
            lng,
          });
        }
      });

      listenerRef.current = listener;
    } catch (err) {
      console.warn('No se pudo inicializar Google Places Autocomplete:', err);
    }

    return () => {
      if (listenerRef.current && windowWithGoogle?.google?.maps?.event) {
        windowWithGoogle.google.maps.event.removeListener(listenerRef.current);
      }
    };
  }, [scriptLoaded, hasAuthError]);

  // Manejar el valor si es controlado desde afuera
  useEffect(() => {
    if (value !== undefined) {
      setQueryText(value);
      if (inputRef.current && inputRef.current.value !== value) {
        inputRef.current.value = value;
      }
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevoTexto = e.target.value;
    setQueryText(nuevoTexto);

    if (onChangeTextRef.current) {
      onChangeTextRef.current(nuevoTexto);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Evitar envío accidental del formulario al presionar Enter en el input de Google Places
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleLimpiarInput = () => {
    setQueryText('');
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

  return (
    <div className="relative w-full">
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
          onKeyDown={handleKeyDown}
          onChange={handleInputChange}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-16 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors ${className}`}
        />

        {/* Acciones e indicadores dentro del input */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {queryText && (
            <button
              type="button"
              onClick={handleLimpiarInput}
              className="p-1 text-neutral-400 hover:text-neutral-600 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Borrar dirección"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {scriptLoaded && !hasAuthError && (
            <span className="p-1" title="Autocompletado oficial de Google Maps activo">
              <Sparkles className="w-3.5 h-3.5 text-gold-500" />
            </span>
          )}
        </div>
      </div>

      {hasAuthError && (
        <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>Ingresá la dirección manualmente.</span>
        </p>
      )}
    </div>
  );
}
