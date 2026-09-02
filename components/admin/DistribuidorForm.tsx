'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { guardarDistribuidorAction } from '@/app/actions/admin/distribuidores';
import { PROVINCIAS_ARGENTINA } from '@/lib/constants/provincias';
import { 
  Truck, 
  ArrowLeft, 
  Save, 
  Loader2, 
  AlertCircle, 
  Building2, 
  MapPin, 
  Phone, 
  FileText, 
  Layers, 
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

export interface DistribuidorInicialDTO {
  id: string;
  nombre: string;
  empresa: string | null;
  provincia: string;
  localidades: string;
  whatsapp: string;
  estado: string; // ACTIVO | INACTIVO
  observaciones: string | null;
  zonas?: {
    id: string;
    provincia: string;
    localidad: string;
    estado: string;
  }[];
}

interface DistribuidorFormProps {
  distribuidorInicial?: DistribuidorInicialDTO | null;
}

export function DistribuidorForm({ distribuidorInicial }: DistribuidorFormProps) {
  const router = useRouter();
  const esEdicion = !!distribuidorInicial?.id;

  const [nombre, setNombre] = useState<string>(distribuidorInicial?.nombre || '');
  const [empresa, setEmpresa] = useState<string>(distribuidorInicial?.empresa || '');
  const [provincia, setProvincia] = useState<string>(distribuidorInicial?.provincia || 'Buenos Aires');
  const [localidades, setLocalidades] = useState<string>(distribuidorInicial?.localidades || '');
  const [whatsapp, setWhatsapp] = useState<string>(distribuidorInicial?.whatsapp || '');
  const [estado, setEstado] = useState<string>(distribuidorInicial?.estado || 'ACTIVO');
  const [observaciones, setObservaciones] = useState<string>(distribuidorInicial?.observaciones || '');

  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeError(null);
    setMensajeExito(null);

    // Validaciones en cliente
    if (!nombre.trim()) {
      setMensajeError('El nombre del distribuidor es obligatorio.');
      return;
    }
    if (!whatsapp.trim()) {
      setMensajeError('El teléfono / WhatsApp es obligatorio.');
      return;
    }
    if (!provincia.trim()) {
      setMensajeError('La provincia es obligatoria.');
      return;
    }
    if (!localidades.trim()) {
      setMensajeError('La descripción de localidades o zonas asignadas es obligatoria.');
      return;
    }

    startTransition(async () => {
      const res = await guardarDistribuidorAction(distribuidorInicial?.id || null, {
        nombre: nombre.trim(),
        empresa: empresa.trim() || null,
        provincia: provincia.trim(),
        localidades: localidades.trim(),
        whatsapp: whatsapp.trim(),
        estado,
        observaciones: observaciones.trim() || null,
      });

      if (res.success) {
        setMensajeExito(esEdicion ? 'Distribuidor actualizado correctamente.' : 'Distribuidor creado con éxito.');
        setTimeout(() => {
          router.push('/admin/distribuidores');
          router.refresh();
        }, 800);
      } else {
        setMensajeError(res.error || 'Ocurrió un error al guardar el distribuidor.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Encabezado / Barra superior del formulario */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/distribuidores"
            className="p-2 rounded-xl border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            title="Volver a la lista de distribuidores"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">
              {esEdicion ? `Editar Distribuidor: ${distribuidorInicial.nombre}` : 'Nuevo Distribuidor Oficial'}
            </h1>
            <p className="text-xs text-neutral-500">
              {esEdicion
                ? 'Actualizá los datos de contacto, estado y cobertura geográfica del distribuidor.'
                : 'Completá los datos para dar de alta un nuevo distribuidor oficial en el portal.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/distribuidores"
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
                <span>{esEdicion ? 'Guardar Cambios' : 'Crear Distribuidor'}</span>
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
        {/* Columna Principal: Datos Generales y Cobertura */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tarjeta 1: Información de Contacto */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Truck className="w-4 h-4 text-gold-600" />
              <span>Datos del Distribuidor</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Nombre y Apellido *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Marcelo Gómez"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Empresa / Razón Social (Opcional)
                </label>
                <input
                  type="text"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  placeholder="Ej: Distribuidora Belleza Sur"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  WhatsApp Oficial *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Ej: +54 9 11 4433-2211"
                    className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors font-mono"
                  />
                </div>
                <span className="text-[11px] text-neutral-400 block">Número con código de área para contacto comercial</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Estado Operativo *
                </label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors cursor-pointer"
                >
                  <option value="ACTIVO">ACTIVO (Opera y recibe derivaciones)</option>
                  <option value="INACTIVO">INACTIVO (Pausado o dado de baja)</option>
                </select>
                <span className="text-[11px] text-neutral-400 block">Solo distribuidores activos aparecen en el selector de Zonas</span>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Cobertura Geográfica y Localidades */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-100 pb-3">
              <MapPin className="w-4 h-4 text-gold-600" />
              <span>Cobertura Geográfica</span>
            </h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Provincia Principal *
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
                <label className="block text-xs font-semibold text-neutral-700">
                  Localidades o Departamentos Asignados *
                </label>
                <textarea
                  required
                  rows={3}
                  value={localidades}
                  onChange={(e) => setLocalidades(e.target.value)}
                  placeholder="Ej: Junín, Pergamino, Rojas, Chacabuco, San Nicolás"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                />
                <span className="text-[11px] text-neutral-400 block">
                  Ingresá las ciudades o partidos que cubre de forma descriptiva separadas por comas.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Lateral: Observaciones y Zonas Vinculadas */}
        <div className="space-y-6">
          {/* Observaciones Internas */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-100 pb-3">
              <FileText className="w-4 h-4 text-gold-600" />
              <span>Notas Internas</span>
            </h2>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">
                Observaciones (Privado para Steffen)
              </label>
              <textarea
                rows={4}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Frecuencia de reparto quincenal los días martes. Acuerdos de exclusividad en tinturas."
                className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
              />
            </div>
          </div>

          {/* Zonas Geográficas Vinculadas (en modo edición) */}
          {esEdicion && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gold-600" />
                  <span>Zonas Vinculadas</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700">
                  {distribuidorInicial.zonas?.length || 0}
                </span>
              </div>

              {distribuidorInicial.zonas && distribuidorInicial.zonas.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {distribuidorInicial.zonas.map((z) => (
                    <div
                      key={z.id}
                      className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-neutral-900 block">{z.localidad}</span>
                        <span className="text-[11px] text-neutral-500">{z.provincia}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                        {z.estado.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 italic">
                  Este distribuidor aún no tiene zonas geográficas vinculadas en el módulo de Zonas.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
