'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TipoDescuento } from '@prisma/client';
import {
  actualizarReglaDescuentoAction,
  crearReglaDescuentoAction,
  alternarEstadoReglaAction,
} from '@/app/actions/admin/reglas-descuento';
import {
  Percent,
  Plus,
  Edit3,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  AlertCircle,
  Loader2,
  Calendar,
  Save,
  X,
  Layers,
} from 'lucide-react';

export interface ReglaDescuentoDTO {
  id: string;
  tipo: TipoDescuento;
  porcentaje: number;
  diasDesde: number | null;
  diasHasta: number | null;
  montoDesde?: number | null;
  montoHasta?: number | null;
  activa: boolean;
  orden: number;
  createdAt: string;
  updatedAt: string;
}

interface ReglasDescuentoClientProps {
  reglasIniciales: ReglaDescuentoDTO[];
}

export function ReglasDescuentoClient({ reglasIniciales }: ReglasDescuentoClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Estados de edición / creación
  const [reglaEditando, setReglaEditando] = useState<ReglaDescuentoDTO | null>(null);
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);

  // Form states
  const [formData, setFormData] = useState<{
    tipo: TipoDescuento;
    porcentaje: number;
    diasDesde: number | string;
    diasHasta: number | string;
    activa: boolean;
    orden: number;
  }>({
    tipo: TipoDescuento.REPOSICION,
    porcentaje: 25,
    diasDesde: 0,
    diasHasta: 40,
    activa: true,
    orden: 1,
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const reglasActivas = reglasIniciales.filter((r) => r.activa);
  const reglaPrimerPedido = reglasIniciales.find((r) => r.tipo === TipoDescuento.PRIMER_PEDIDO && r.activa);
  const reglasReposicionActivas = reglasIniciales.filter(
    (r) => r.tipo === TipoDescuento.REPOSICION && r.activa
  );

  const abrirEdicion = (regla: ReglaDescuentoDTO) => {
    setReglaEditando(regla);
    setFormData({
      tipo: regla.tipo,
      porcentaje: regla.porcentaje,
      diasDesde: regla.diasDesde ?? 0,
      diasHasta: regla.diasHasta !== null ? regla.diasHasta : '',
      activa: regla.activa,
      orden: regla.orden,
    });
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const abrirCreacion = () => {
    setReglaEditando(null);
    setFormData({
      tipo: TipoDescuento.REPOSICION,
      porcentaje: 25,
      diasDesde: 0,
      diasHasta: 40,
      activa: true,
      orden: reglasIniciales.length + 1,
    });
    setErrorMsg(null);
    setSuccessMsg(null);
    setModalCrearAbierto(true);
  };

  const cerrarModal = () => {
    setReglaEditando(null);
    setModalCrearAbierto(false);
    setErrorMsg(null);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const porcentajeNum = Number(formData.porcentaje);
    if (isNaN(porcentajeNum) || porcentajeNum < 0 || porcentajeNum > 100) {
      setErrorMsg('El porcentaje debe ser un valor válido entre 0% y 100%.');
      return;
    }

    const diasDesdeNum = formData.diasDesde !== '' ? Number(formData.diasDesde) : null;
    const diasHastaNum = formData.diasHasta !== '' ? Number(formData.diasHasta) : null;

    if (formData.tipo === TipoDescuento.REPOSICION) {
      if (diasDesdeNum === null || isNaN(diasDesdeNum) || diasDesdeNum < 0) {
        setErrorMsg('El campo "Días Desde" debe ser 0 o superior para reglas de reposición.');
        return;
      }
      if (diasHastaNum !== null && !isNaN(diasHastaNum) && diasHastaNum < diasDesdeNum) {
        setErrorMsg('El campo "Días Hasta" debe ser mayor o igual a "Días Desde".');
        return;
      }
    }

    startTransition(async () => {
      if (reglaEditando) {
        const res = await actualizarReglaDescuentoAction(reglaEditando.id, {
          porcentaje: porcentajeNum,
          diasDesde: formData.tipo === TipoDescuento.REPOSICION ? diasDesdeNum : null,
          diasHasta: formData.tipo === TipoDescuento.REPOSICION ? diasHastaNum : null,
          activa: formData.activa,
          orden: Number(formData.orden) || 0,
        });

        if (res.success) {
          setSuccessMsg('Regla de descuento actualizada correctamente.');
          cerrarModal();
          router.refresh();
        } else {
          setErrorMsg(res.error || 'Error al actualizar la regla.');
        }
      } else {
        const res = await crearReglaDescuentoAction({
          tipo: formData.tipo,
          porcentaje: porcentajeNum,
          diasDesde: formData.tipo === TipoDescuento.REPOSICION ? diasDesdeNum : null,
          diasHasta: formData.tipo === TipoDescuento.REPOSICION ? diasHastaNum : null,
          activa: formData.activa,
          orden: Number(formData.orden) || 0,
        });

        if (res.success) {
          setSuccessMsg('Regla de descuento creada con éxito.');
          cerrarModal();
          router.refresh();
        } else {
          setErrorMsg(res.error || 'Error al crear la regla.');
        }
      }
    });
  };

  const handleAlternarEstado = async (regla: ReglaDescuentoDTO) => {
    startTransition(async () => {
      const res = await alternarEstadoReglaAction(regla.id, !regla.activa);
      if (res.success) {
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Error al cambiar estado.');
      }
    });
  };

  return (
    <div id="admin-reglas-descuento-root" className="space-y-8">
      {/* Resumen Superior */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              Primer Pedido
            </span>
            <span className="text-2xl font-black text-neutral-900 mt-1 block">
              {reglaPrimerPedido ? `${reglaPrimerPedido.porcentaje}% OFF` : 'Inactivo'}
            </span>
            <span className="text-xs text-neutral-500 mt-0.5 block">
              Aplica a la bienvenida del salón
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gold-50 border border-gold-300 text-gold-700 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              Tramos de Reposición
            </span>
            <span className="text-2xl font-black text-neutral-900 mt-1 block">
              {reglasReposicionActivas.length} Activos
            </span>
            <span className="text-xs text-neutral-500 mt-0.5 block">
              Calculados por días desde última compra
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-300 text-amber-700 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              Reglas Totales
            </span>
            <span className="text-2xl font-black text-neutral-900 mt-1 block">
              {reglasActivas.length} de {reglasIniciales.length}
            </span>
            <span className="text-xs text-neutral-500 mt-0.5 block">
              Configuración dinámica en base de datos
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-300 text-neutral-700 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Notificaciones */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-700 hover:text-red-950 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header de la Tabla y Botón de Crear */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">
            Reglas de Descuento Configuradas
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Las reglas se aplican en el servidor automáticamente al calcular los subtotales del carrito y pedidos.
          </p>
        </div>

        <button
          id="btn-nueva-regla-descuento"
          onClick={abrirCreacion}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-gold-400" />
          <span>Nueva Regla</span>
        </button>
      </div>

      {/* Tabla de Reglas */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-600 font-semibold">
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Descuento</th>
                <th className="py-3.5 px-4">Condición de Aplicación</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {reglasIniciales.map((regla) => {
                const esPrimerPedido = regla.tipo === TipoDescuento.PRIMER_PEDIDO;

                return (
                  <tr
                    key={regla.id}
                    className={`hover:bg-neutral-50/50 transition-colors ${
                      !regla.activa ? 'bg-neutral-50/40 opacity-70' : ''
                    }`}
                  >
                    <td className="py-4 px-4 font-bold text-neutral-900">
                      <div className="flex items-center gap-2">
                        {esPrimerPedido ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gold-100 text-gold-900 border border-gold-300">
                            <Sparkles className="w-3 h-3 text-gold-700" />
                            Primer Pedido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-700" />
                            Reposición
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-extrabold text-base text-neutral-950">
                        {regla.porcentaje}% OFF
                      </span>
                    </td>

                    <td className="py-4 px-4 text-neutral-700">
                      {esPrimerPedido ? (
                        <div className="space-y-0.5">
                          <span className="font-semibold text-neutral-900">
                            Primer pedido de salón
                          </span>
                          <p className="text-xs text-neutral-500">
                            Sin pedidos previos efectivos confirmados.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {regla.diasDesde !== null ? (
                            <div className="flex items-center gap-1.5 font-semibold text-neutral-900">
                              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                              <span>
                                De {regla.diasDesde} a{' '}
                                {regla.diasHasta !== null ? `${regla.diasHasta} días` : 'más días'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-neutral-400 text-xs italic">
                              Regla legacy por monto (desactivada)
                            </span>
                          )}
                          <p className="text-xs text-neutral-500">
                            Desde la última compra completada del salón.
                          </p>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleAlternarEstado(regla)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          regla.activa
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-300 hover:bg-neutral-200'
                        }`}
                      >
                        {regla.activa ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Activa</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Inactiva</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => abrirEdicion(regla)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-neutral-200 hover:border-gold-400 text-neutral-700 hover:text-gold-800 transition-all shadow-xs cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Crear / Editar Regla */}
      {(modalCrearAbierto || reglaEditando) && (
        <div
          id="modal-regla-descuento"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs"
        >
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h3 className="text-lg font-black text-neutral-900">
                  {reglaEditando ? 'Editar Regla de Descuento' : 'Nueva Regla de Descuento'}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Configurá el porcentaje y el rango de días para reposición.
                </p>
              </div>
              <button
                onClick={cerrarModal}
                disabled={isPending}
                className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Tipo de Descuento
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tipo: e.target.value as TipoDescuento,
                    })
                  }
                  disabled={reglaEditando !== null || isPending}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-900 focus:outline-none focus:border-gold-500"
                >
                  <option value={TipoDescuento.REPOSICION}>REPOSICIÓN (Por días desde última compra)</option>
                  <option value={TipoDescuento.PRIMER_PEDIDO}>PRIMER PEDIDO (Bienvenida al salón)</option>
                </select>
              </div>

              {/* Porcentaje */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Porcentaje de Descuento (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    required
                    value={formData.porcentaje}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        porcentaje: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Ej: 15"
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-900 focus:outline-none focus:border-gold-500 pr-8"
                  />
                  <span className="absolute right-3.5 top-2.5 text-neutral-400 font-bold text-sm">
                    %
                  </span>
                </div>
              </div>

              {/* Días Desde y Hasta (solo para REPOSICION) */}
              {formData.tipo === TipoDescuento.REPOSICION && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                      Días Desde
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.diasDesde}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          diasDesde: e.target.value === '' ? '' : parseInt(e.target.value),
                        })
                      }
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-bold text-neutral-900 focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-amber-800 mt-1 block">
                      Ej: 0 (para 0 a 60) o 61
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                      Días Hasta (opcional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.diasHasta}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          diasHasta: e.target.value === '' ? '' : parseInt(e.target.value),
                        })
                      }
                      placeholder="Ej: 60, 90 (o vacío)"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-bold text-neutral-900 focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-amber-800 mt-1 block">
                      Dejar vacío si no tiene tope
                    </span>
                  </div>
                </div>
              )}

              {/* Orden y Activo */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-sm font-bold text-neutral-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.activa}
                    onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                    className="w-4 h-4 rounded text-gold-600 focus:ring-gold-500 border-neutral-300"
                  />
                  <span>Regla Activa</span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-neutral-500">Orden:</label>
                  <input
                    type="number"
                    value={formData.orden}
                    onChange={(e) =>
                      setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })
                    }
                    className="w-16 px-2 py-1 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold text-center"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-gold-400" />
                      <span>{reglaEditando ? 'Guardar Cambios' : 'Crear Regla'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
