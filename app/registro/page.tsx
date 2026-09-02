'use client';

import React, { useActionState, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registroProfesionalAction, RegistroFormState } from '@/app/actions/auth';
import { GooglePlacesAutocomplete, PlaceSelectedData } from '@/components/GooglePlacesAutocomplete';
import { SiteHeader } from '@/components/SiteHeader';
import { 
  Building2, 
  ArrowRight, 
  ArrowLeft,
  AlertCircle, 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  Store, 
  ShieldCheck,
  Instagram,
  FileText,
  CheckCircle2,
  Check,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';

const TIPOS_DE_NEGOCIO = [
  'Peluquería / Salón de Belleza',
  'Salón Integral (Peluquería + Estética)',
  'Barbería / Barbershop',
  'Estilista Independiente / A Domicilio',
  'Academia de Peluquería / Capacitación',
  'Distribución Local',
];

export default function RegistroPage() {
  const router = useRouter();
  const [pasoActual, setPasoActual] = useState<1 | 2 | 3>(1);
  const [errorPaso, setErrorPaso] = useState<string | null>(null);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [state, formAction, isPending] = useActionState<RegistroFormState, FormData>(
    registroProfesionalAction,
    {}
  );

  // Estados de ubicación y geolocalización (Paso 2)
  const [provincia, setProvincia] = useState<string>('');
  const [localidad, setLocalidad] = useState<string>('');
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);
  const [direccionFormateada, setDireccionFormateada] = useState<string>('');

  // Resumen informativo para Paso 3
  const [resumenTitular, setResumenTitular] = useState({
    nombreCompleto: '',
    email: '',
    whatsapp: '',
    salon: '',
    tipoDeNegocio: '',
    direccionTexto: '',
  });

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
    setErrorPaso(null);
  }, []);

  useEffect(() => {
    if (state.success && state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [state, router]);

  // Si hay error en el servidor, redirigir al paso relevante si corresponde
  useEffect(() => {
    if (state.error) {
      const err = state.error.toLowerCase();
      if (
        err.includes('email') ||
        err.includes('contraseña') ||
        err.includes('nombre') ||
        err.includes('apellido') ||
        err.includes('whatsapp')
      ) {
        setPasoActual(1);
      } else if (
        err.includes('salón') ||
        err.includes('salon') ||
        err.includes('dirección') ||
        err.includes('direccion') ||
        err.includes('provincia') ||
        err.includes('localidad') ||
        err.includes('negocio')
      ) {
        setPasoActual(2);
      }
    }
  }, [state.error]);

  // Validar Paso 1 antes de avanzar
  const validarYAvanzarPaso1 = () => {
    setErrorPaso(null);
    const form = document.getElementById('form-registro') as HTMLFormElement | null;
    if (!form) return;

    const emailEl = form.elements.namedItem('email') as HTMLInputElement | null;
    const passwordEl = form.elements.namedItem('password') as HTMLInputElement | null;
    const nombreEl = form.elements.namedItem('nombre') as HTMLInputElement | null;
    const apellidoEl = form.elements.namedItem('apellido') as HTMLInputElement | null;
    const whatsappEl = form.elements.namedItem('whatsapp') as HTMLInputElement | null;

    const email = emailEl?.value.trim() || '';
    const password = passwordEl?.value || '';
    const nombre = nombreEl?.value.trim() || '';
    const apellido = apellidoEl?.value.trim() || '';
    const whatsapp = whatsappEl?.value.trim() || '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorPaso('Por favor ingresá un email profesional válido.');
      emailEl?.focus();
      return;
    }
    if (!password || password.length < 6) {
      setErrorPaso('La contraseña debe tener al menos 6 caracteres.');
      passwordEl?.focus();
      return;
    }
    if (!nombre) {
      setErrorPaso('Por favor completá el nombre del titular.');
      nombreEl?.focus();
      return;
    }
    if (!apellido) {
      setErrorPaso('Por favor completá el apellido del titular.');
      apellidoEl?.focus();
      return;
    }
    if (!whatsapp) {
      setErrorPaso('Por favor ingresá un WhatsApp de contacto.');
      whatsappEl?.focus();
      return;
    }

    setPasoActual(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Validar Paso 2 antes de avanzar al Paso 3
  const validarYAvanzarPaso2 = () => {
    setErrorPaso(null);
    const form = document.getElementById('form-registro') as HTMLFormElement | null;
    if (!form) return;

    const salonEl = form.elements.namedItem('salon') as HTMLInputElement | null;
    const tipoEl = form.elements.namedItem('tipoDeNegocio') as HTMLSelectElement | null;
    const direccionEl = form.elements.namedItem('direccion') as HTMLInputElement | null;

    const salon = salonEl?.value.trim() || '';
    const tipoDeNegocio = tipoEl?.value.trim() || '';
    const direccion = direccionEl?.value.trim() || '';

    if (!salon) {
      setErrorPaso('Por favor ingresá el nombre de tu salón o peluquería.');
      salonEl?.focus();
      return;
    }
    if (!tipoDeNegocio) {
      setErrorPaso('Por favor seleccioná el tipo de negocio.');
      tipoEl?.focus();
      return;
    }
    if (!direccion) {
      setErrorPaso('Por favor ingresá la calle y número de tu salón.');
      direccionEl?.focus();
      return;
    }
    if (!provincia || !localidad) {
      setErrorPaso(
        'Por favor seleccioná una de las opciones sugeridas por Google Maps al escribir tu dirección para autocompletar la provincia y localidad.'
      );
      direccionEl?.focus();
      return;
    }

    // Capturar datos para resumen en Paso 3
    const nombreEl = form.elements.namedItem('nombre') as HTMLInputElement | null;
    const apellidoEl = form.elements.namedItem('apellido') as HTMLInputElement | null;
    const emailEl = form.elements.namedItem('email') as HTMLInputElement | null;
    const whatsappEl = form.elements.namedItem('whatsapp') as HTMLInputElement | null;

    setResumenTitular({
      nombreCompleto: `${nombreEl?.value.trim() || ''} ${apellidoEl?.value.trim() || ''}`.trim(),
      email: emailEl?.value.trim() || '',
      whatsapp: whatsappEl?.value.trim() || '',
      salon,
      tipoDeNegocio,
      direccionTexto: direccionFormateada || `${direccion}, ${localidad}, ${provincia}`,
    });

    setPasoActual(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Prevenir envío involuntario al presionar Enter en inputs de pasos 1 y 2
  const handleKeyDownForm = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      if (pasoActual === 1) {
        e.preventDefault();
        validarYAvanzarPaso1();
      } else if (pasoActual === 2) {
        e.preventDefault();
        validarYAvanzarPaso2();
      }
    }
  };

  return (
    <div id="registro-container" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      {/* Header Compartido */}
      <SiteHeader
        sesion={false}
        mostrarCarrito={false}
        mostrarCatalogo={false}
        mostrarInicio={true}
      />

      {/* Contenedor principal */}
      <main className="max-w-3xl mx-auto w-full py-6 md:py-10">
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-10 shadow-sm">
          {/* Título y subtítulo */}
          <div className="mb-6 md:mb-8 text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider bg-gold-50 text-gold-700 border border-gold-300 rounded-full mb-3">
              <Building2 className="w-3.5 h-3.5" /> Alta de Salón Profesional
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
              Registro para Profesionales y Salones
            </h1>
            <p className="text-neutral-600 text-sm mt-2 leading-relaxed">
              Completá los 3 pasos para acceder a compra directa de fábrica, listas profesionales y beneficios exclusivos.
            </p>
          </div>

          {/* Stepper Visual en 3 Pasos */}
          <div className="mb-8">
            <div className="relative">
              {/* Barra de progreso de fondo */}
              <div className="absolute top-4 sm:top-5 left-8 right-8 h-1 bg-neutral-100 rounded-full -z-0" />
              {/* Barra de progreso activa */}
              <div
                className="absolute top-4 sm:top-5 left-8 h-1 bg-gold-500 rounded-full transition-all duration-300 -z-0"
                style={{
                  width:
                    pasoActual === 1
                      ? '0%'
                      : pasoActual === 2
                      ? '50%'
                      : 'calc(100% - 4rem)',
                }}
              />

              <div className="grid grid-cols-3 relative z-10">
                {/* Paso 1 */}
                <button
                  type="button"
                  onClick={() => {
                    setErrorPaso(null);
                    setPasoActual(1);
                  }}
                  className="flex flex-col items-center text-center group cursor-pointer"
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all border-2 ${
                      pasoActual > 1
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : pasoActual === 1
                        ? 'bg-gold-500 border-gold-500 text-white shadow-md shadow-gold-500/30 ring-4 ring-gold-100'
                        : 'bg-white border-neutral-300 text-neutral-400'
                    }`}
                  >
                    {pasoActual > 1 ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs font-bold mt-2 transition-colors ${
                      pasoActual === 1
                        ? 'text-gold-700'
                        : pasoActual > 1
                        ? 'text-neutral-800'
                        : 'text-neutral-400'
                    }`}
                  >
                    1. Acceso y Titular
                  </span>
                  <span className="hidden sm:block text-[10px] text-neutral-500 mt-0.5">
                    Cuenta y contacto
                  </span>
                </button>

                {/* Paso 2 */}
                <button
                  type="button"
                  onClick={() => {
                    if (pasoActual === 1) {
                      validarYAvanzarPaso1();
                    } else {
                      setErrorPaso(null);
                      setPasoActual(2);
                    }
                  }}
                  className="flex flex-col items-center text-center group cursor-pointer"
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all border-2 ${
                      pasoActual > 2
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : pasoActual === 2
                        ? 'bg-gold-500 border-gold-500 text-white shadow-md shadow-gold-500/30 ring-4 ring-gold-100'
                        : 'bg-white border-neutral-300 text-neutral-400'
                    }`}
                  >
                    {pasoActual > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs font-bold mt-2 transition-colors ${
                      pasoActual === 2
                        ? 'text-gold-700'
                        : pasoActual > 2
                        ? 'text-neutral-800'
                        : 'text-neutral-400'
                    }`}
                  >
                    2. Datos del Salón
                  </span>
                  <span className="hidden sm:block text-[10px] text-neutral-500 mt-0.5">
                    Ubicación y negocio
                  </span>
                </button>

                {/* Paso 3 */}
                <button
                  type="button"
                  onClick={() => {
                    if (pasoActual === 1) {
                      validarYAvanzarPaso1();
                    } else if (pasoActual === 2) {
                      validarYAvanzarPaso2();
                    }
                  }}
                  className="flex flex-col items-center text-center group cursor-pointer"
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all border-2 ${
                      pasoActual === 3
                        ? 'bg-gold-500 border-gold-500 text-white shadow-md shadow-gold-500/30 ring-4 ring-gold-100'
                        : 'bg-white border-neutral-300 text-neutral-400'
                    }`}
                  >
                    3
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs font-bold mt-2 transition-colors ${
                      pasoActual === 3 ? 'text-gold-700' : 'text-neutral-400'
                    }`}
                  >
                    3. Conexión Steffen
                  </span>
                  <span className="hidden sm:block text-[10px] text-neutral-500 mt-0.5">
                    Relación y alta
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Mensaje de Error del Servidor */}
          {state.error && (
            <div id="error-message" className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-bold text-red-800">Error al procesar el registro</p>
                <p className="mt-0.5">{state.error}</p>
              </div>
            </div>
          )}

          {/* Mensaje de Error de Validación de Paso */}
          {errorPaso && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3 text-amber-900 text-sm animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Información requerida</p>
                <p className="mt-0.5 text-xs text-amber-800">{errorPaso}</p>
              </div>
            </div>
          )}

          {/* Formulario que contiene los 3 pasos (todos los inputs permanecen en el DOM) */}
          <form
            action={formAction}
            onKeyDown={handleKeyDownForm}
            className="space-y-6"
            id="form-registro"
          >
            {/* ========================================================================= */}
            {/* PASO 1: Datos de acceso e info del titular (nombre, whatsapp) */}
            {/* ========================================================================= */}
            <div className={pasoActual === 1 ? 'space-y-6 block animate-in fade-in duration-200' : 'hidden'}>
              <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-2xl p-4 sm:p-5">
                <h2 className="text-xs font-bold text-gold-700 uppercase tracking-wider flex items-center gap-2 mb-1">
                  <Lock className="w-3.5 h-3.5" /> Paso 1: Datos de Acceso y Titular
                </h2>
                <p className="text-xs text-neutral-500">
                  Definí el correo y contraseña para acceder a la plataforma, y los datos del profesional responsable.
                </p>
              </div>

              {/* Sub-bloque: Acceso */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-gold-600" /> Credenciales de Cuenta
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="email">
                      Email Profesional *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="salon@ejemplo.com"
                        className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="password">
                      Contraseña * (mínimo 6 caracteres)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        id="password"
                        name="password"
                        type={mostrarPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="••••••••"
                        className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                      />
                      <button
                        type="button"
                        id="btn-toggle-password-registro"
                        onClick={() => setMostrarPassword(!mostrarPassword)}
                        aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                        className="absolute right-3 top-2.5 p-1 text-neutral-400 hover:text-neutral-600 transition-colors rounded-lg focus:outline-none cursor-pointer"
                      >
                        {mostrarPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-bloque: Info del Titular */}
              <div className="space-y-4 pt-4 border-t border-neutral-200">
                <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gold-600" /> Información del Titular
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="nombre">
                      Nombre *
                    </label>
                    <input
                      id="nombre"
                      name="nombre"
                      type="text"
                      required
                      placeholder="Ej. Laura"
                      className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="apellido">
                      Apellido *
                    </label>
                    <input
                      id="apellido"
                      name="apellido"
                      type="text"
                      required
                      placeholder="Ej. Rossi"
                      className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="whatsapp">
                    WhatsApp de Contacto * (con código de área, sin 0 ni 15)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      id="whatsapp"
                      name="whatsapp"
                      type="tel"
                      required
                      placeholder="Ej. 11 4455 6677 o 351 234 5678"
                      className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Botón de Siguiente Paso 1 */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-200">
                <div className="text-xs text-neutral-500">
                  ¿Ya tenés una cuenta registrada?{' '}
                  <Link href="/login" className="text-gold-600 font-bold hover:underline">
                    Iniciar Sesión
                  </Link>
                </div>
                <button
                  type="button"
                  id="btn-paso1-siguiente"
                  onClick={validarYAvanzarPaso1}
                  className="w-full sm:w-auto py-3 px-6 rounded-xl bg-gold-500 hover:bg-gold-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-gold-500/20 cursor-pointer"
                >
                  <span>Continuar a Datos del Salón</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* PASO 2: Datos del salon (Nombre salon, tipo de negocio, ubicacion, instagram, cuit) */}
            {/* ========================================================================= */}
            <div className={pasoActual === 2 ? 'space-y-6 block animate-in fade-in duration-200' : 'hidden'}>
              <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-2xl p-4 sm:p-5">
                <h2 className="text-xs font-bold text-gold-700 uppercase tracking-wider flex items-center gap-2 mb-1">
                  <Store className="w-3.5 h-3.5" /> Paso 2: Datos del Salón o Peluquería
                </h2>
                <p className="text-xs text-neutral-500">
                  Ingresá el nombre, tipo de negocio y la ubicación para asignarte la lista de precios correspondiente.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="salon">
                    Nombre del Salón / Peluquería *
                  </label>
                  <input
                    id="salon"
                    name="salon"
                    type="text"
                    required
                    placeholder="Ej. Estudio Rossi Coiffure"
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="tipoDeNegocio">
                    Tipo de Negocio *
                  </label>
                  <select
                    id="tipoDeNegocio"
                    name="tipoDeNegocio"
                    required
                    defaultValue=""
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                  >
                    <option value="" disabled>Seleccioná una opción...</option>
                    {TIPOS_DE_NEGOCIO.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Inputs ocultos para coordenadas de geolocalización */}
              <input type="hidden" name="latitud" value={latitud !== null ? String(latitud) : ''} />
              <input type="hidden" name="longitud" value={longitud !== null ? String(longitud) : ''} />

              {/* Autocompletado oficial de Google Places (Obligatorio) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-700" htmlFor="direccion">
                    Dirección del Salón (Calle y Número) *
                  </label>
                  <span className="text-[11px] text-gold-700 font-medium">
                    Obligatorio • Buscá tu calle y altura para autocompletar
                  </span>
                </div>
                <GooglePlacesAutocomplete
                  id="direccion"
                  name="direccion"
                  required
                  onPlaceSelected={handlePlaceSelected}
                  placeholder="Ingresá calle y número de tu salón (ej. Av. Santa Fe 1234, CABA o San Martín 450, Rosario)..."
                />
                {latitud !== null && longitud !== null && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Ubicación verificada: <strong className="font-semibold">{latitud.toFixed(4)}, {longitud.toFixed(4)}</strong>
                      {direccionFormateada ? ` (${direccionFormateada})` : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-neutral-700" htmlFor="provincia">
                      Provincia *
                    </label>
                    <span className="text-[10px] text-neutral-500 font-medium flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-neutral-400" /> Autocompletado protegido
                    </span>
                  </div>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      id="provincia"
                      name="provincia"
                      type="text"
                      required
                      readOnly
                      value={provincia}
                      placeholder="Seleccioná la dirección arriba..."
                      className="w-full bg-neutral-100 border border-neutral-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-neutral-800 font-semibold cursor-not-allowed select-none focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-neutral-700" htmlFor="localidad">
                      Localidad / Ciudad *
                    </label>
                    <span className="text-[10px] text-neutral-500 font-medium flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-neutral-400" /> Autocompletado protegido
                    </span>
                  </div>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      id="localidad"
                      name="localidad"
                      type="text"
                      required
                      readOnly
                      value={localidad}
                      placeholder="Seleccioná la dirección arriba..."
                      className="w-full bg-neutral-100 border border-neutral-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-neutral-800 font-semibold cursor-not-allowed select-none focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="instagram">
                    Instagram del Salón (opcional)
                  </label>
                  <div className="relative">
                    <Instagram className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      id="instagram"
                      name="instagram"
                      type="text"
                      placeholder="@estudiorossi"
                      className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="cuit">
                    CUIT (opcional, para factura)
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      id="cuit"
                      name="cuit"
                      type="text"
                      placeholder="20-xxxxxxxx-x"
                      className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de Navegación Paso 2 */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setErrorPaso(null);
                    setPasoActual(1);
                  }}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver al Paso 1</span>
                </button>

                <button
                  type="button"
                  id="btn-paso2-siguiente"
                  onClick={validarYAvanzarPaso2}
                  className="w-full sm:w-auto py-3 px-6 rounded-xl bg-gold-500 hover:bg-gold-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-gold-500/20 cursor-pointer"
                >
                  <span>Continuar a Relación con Steffen</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* PASO 3: La relacion con steffen */}
            {/* ========================================================================= */}
            <div className={pasoActual === 3 ? 'space-y-6 block animate-in fade-in duration-200' : 'hidden'}>
              <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-2xl p-4 sm:p-5">
                <h2 className="text-xs font-bold text-gold-700 uppercase tracking-wider flex items-center gap-2 mb-1">
                  <Sparkles className="w-3.5 h-3.5" /> Paso 3: Relación con Steffen Cosmética Capilar
                </h2>
                <p className="text-xs text-neutral-500">
                  Último paso. Indicanos tu experiencia previa con la marca para completar tu registro profesional.
                </p>
              </div>

              {/* Resumen sutil de confirmación antes del envío */}
              {resumenTitular.salon && (
                <div className="bg-gold-50/60 border border-gold-200/80 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-gold-800 font-bold border-b border-gold-200/60 pb-2">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-gold-600" /> Datos a registrar
                    </span>
                    <button
                      type="button"
                      onClick={() => setPasoActual(1)}
                      className="text-gold-700 hover:underline cursor-pointer text-[11px] font-semibold"
                    >
                      Modificar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-700 pt-1">
                    <div>
                      <strong className="text-neutral-900">Salón:</strong> {resumenTitular.salon} ({resumenTitular.tipoDeNegocio})
                    </div>
                    <div>
                      <strong className="text-neutral-900">Titular:</strong> {resumenTitular.nombreCompleto}
                    </div>
                    <div>
                      <strong className="text-neutral-900">WhatsApp:</strong> {resumenTitular.whatsapp}
                    </div>
                    <div>
                      <strong className="text-neutral-900">Ubicación:</strong> {resumenTitular.direccionTexto}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-2.5">
                  ¿Ya compraste productos Steffen anteriormente?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3.5 rounded-xl border border-neutral-200 bg-white hover:border-gold-300 transition-colors cursor-pointer">
                    <input
                      type="radio"
                      name="yaComproSteffen"
                      value="false"
                      defaultChecked
                      className="text-gold-500 focus:ring-gold-500 bg-white border-neutral-300"
                    />
                    <div>
                      <span className="block text-xs font-bold text-neutral-800">No, es mi primera vez</span>
                      <span className="block text-[11px] text-neutral-500">Quiero probar la marca en mi salón</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-xl border border-neutral-200 bg-white hover:border-gold-300 transition-colors cursor-pointer">
                    <input
                      type="radio"
                      name="yaComproSteffen"
                      value="true"
                      className="text-gold-500 focus:ring-gold-500 bg-white border-neutral-300"
                    />
                    <div>
                      <span className="block text-xs font-bold text-neutral-800">Sí, ya conozco y uso la marca</span>
                      <span className="block text-[11px] text-neutral-500">Ya soy cliente o he utilizado Steffen</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="comoConocioSteffen">
                  ¿Cómo nos conociste? (opcional)
                </label>
                <input
                  id="comoConocioSteffen"
                  name="comoConocioSteffen"
                  type="text"
                  placeholder="Recomendación de colega, Instagram, evento profesional, etc."
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                />
              </div>

              {/* Botones de Finalización Paso 3 */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setErrorPaso(null);
                    setPasoActual(2);
                  }}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver al Paso 2</span>
                </button>

                <button
                  id="btn-registrar"
                  type="submit"
                  disabled={isPending}
                  className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-gold-500 hover:bg-gold-400 text-white font-bold text-sm md:text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-gold-500/20 cursor-pointer"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Registrando salón profesional...
                    </span>
                  ) : (
                    <>
                      <span>Completar Registro Profesional</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-neutral-500 mt-2 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Tus datos están protegidos y son de uso exclusivo comercial de Steffen.
              </p>
            </div>
          </form>
        </div>
      </main>

      {/* Footer simple */}
      <footer className="max-w-4xl mx-auto w-full py-4 text-center text-xs text-neutral-500 border-t border-neutral-200">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Fabricación Argentina • Venta Exclusiva a Profesionales
      </footer>
    </div>
  );
}

