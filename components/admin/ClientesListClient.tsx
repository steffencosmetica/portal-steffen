'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { EstadoCliente } from '@prisma/client';
import { actualizarClienteAction } from '@/app/actions/admin/clientes';
import { 
  Search, 
  X, 
  Users, 
  Store, 
  MapPin, 
  CheckCircle, 
  ChevronRight, 
  Filter, 
  Phone, 
  Mail, 
  Loader2,
  AlertCircle
} from 'lucide-react';

export interface ClienteListItemDTO {
  id: string;
  nombre: string;
  apellido: string;
  salon: string;
  whatsapp: string;
  email: string;
  provincia: string;
  localidad: string;
  tipoDeNegocio: string;
  estadoCliente: EstadoCliente;
  fechaRegistro: string;
  zona: {
    id: string;
    provincia: string;
    localidad: string;
    estado: string;
  } | null;
  cantidadPedidos: number;
}

interface ClientesListClientProps {
  clientesIniciales: ClienteListItemDTO[];
}

export function EstadoClienteBadge({ estado }: { estado: EstadoCliente }) {
  switch (estado) {
    case EstadoCliente.PENDIENTE_APROBACION:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gold-50 text-gold-800 border border-gold-300">
          Pendiente Aprobación
        </span>
      );
    case EstadoCliente.ACTIVO:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
          Activo
        </span>
      );
    case EstadoCliente.INACTIVO:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 border border-neutral-300">
          Inactivo
        </span>
      );
    case EstadoCliente.BLOQUEADO:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-300">
          Bloqueado
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
          {estado}
        </span>
      );
  }
}

export function ClientesListClient({ clientesIniciales }: ClientesListClientProps) {
  const [clientes, setClientes] = useState<ClienteListItemDTO[]>(clientesIniciales);
  const [busqueda, setBusqueda] = useState<string>('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('TODOS');
  const [clienteAprobandoId, setClienteAprobandoId] = useState<string | null>(null);
  const [notificacion, setNotificacion] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const estadosDisponibles = [
    { label: 'Todos los salones', valor: 'TODOS' },
    { label: 'Pendientes', valor: EstadoCliente.PENDIENTE_APROBACION },
    { label: 'Activos', valor: EstadoCliente.ACTIVO },
    { label: 'Inactivos', valor: EstadoCliente.INACTIVO },
    { label: 'Bloqueados', valor: EstadoCliente.BLOQUEADO },
  ];

  // Aprobar cliente rápido desde la fila
  const handleAprobarRapido = (e: React.MouseEvent, clienteId: string, salonNombre: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPending) return;

    setClienteAprobandoId(clienteId);
    setNotificacion(null);

    startTransition(async () => {
      const res = await actualizarClienteAction(clienteId, {
        estadoCliente: EstadoCliente.ACTIVO,
      });

      setClienteAprobandoId(null);

      if (res.success) {
        setClientes((prev) =>
          prev.map((c) =>
            c.id === clienteId ? { ...c, estadoCliente: EstadoCliente.ACTIVO } : c
          )
        );
        setNotificacion({
          tipo: 'exito',
          texto: `Salón "${salonNombre}" aprobado y activado con éxito.`,
        });
        setTimeout(() => setNotificacion(null), 4000);
      } else {
        setNotificacion({
          tipo: 'error',
          texto: res.error || 'No se pudo aprobar el cliente.',
        });
      }
    });
  };

  // 1. Filtrar
  const resultadoFiltrado = clientes.filter((cliente) => {
    if (estadoFiltro !== 'TODOS' && cliente.estadoCliente !== estadoFiltro) {
      return false;
    }

    if (busqueda.trim() !== '') {
      const termino = busqueda.toLowerCase().trim();
      const matchSalon = cliente.salon.toLowerCase().includes(termino);
      const matchNombre = `${cliente.nombre} ${cliente.apellido}`.toLowerCase().includes(termino);
      const matchEmail = cliente.email.toLowerCase().includes(termino);
      const matchWhatsapp = cliente.whatsapp.toLowerCase().includes(termino);
      const matchLocalidad = cliente.localidad.toLowerCase().includes(termino);
      const matchProvincia = cliente.provincia.toLowerCase().includes(termino);

      return matchSalon || matchNombre || matchEmail || matchWhatsapp || matchLocalidad || matchProvincia;
    }

    return true;
  });

  // 2. Ordenar: PENDIENTE_APROBACION primero por defecto, luego fecha más reciente
  const clientesFiltrados = [...resultadoFiltrado].sort((a, b) => {
    if (a.estadoCliente === EstadoCliente.PENDIENTE_APROBACION && b.estadoCliente !== EstadoCliente.PENDIENTE_APROBACION) {
      return -1;
    }
    if (a.estadoCliente !== EstadoCliente.PENDIENTE_APROBACION && b.estadoCliente === EstadoCliente.PENDIENTE_APROBACION) {
      return 1;
    }
    return new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Notificación Toast */}
      {notificacion && (
        <div
          className={`flex items-center gap-2.5 p-3.5 rounded-xl text-xs md:text-sm font-medium animate-in fade-in ${
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

      {/* Controles de Búsqueda y Filtro */}
      <section className="bg-white border border-neutral-200 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por salón, nombre, email o WhatsApp..."
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

        {/* Pills de Estados */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-300">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mr-2 hidden md:inline-flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-gold-600" />
            Estado:
          </span>
          {estadosDisponibles.map((item) => {
            const isSelected = estadoFiltro === item.valor;
            return (
              <button
                key={item.valor}
                onClick={() => setEstadoFiltro(item.valor)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gold-500 text-white font-bold shadow-sm shadow-gold-500/20'
                    : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 border border-neutral-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Contador */}
      <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
        <p>
          Mostrando <strong className="text-neutral-900">{clientesFiltrados.length}</strong> de{' '}
          <strong className="text-neutral-700">{clientes.length}</strong> clientes registrados
        </p>
      </div>

      {/* Listado de Clientes */}
      {clientesFiltrados.length > 0 ? (
        <div className="space-y-3" id="tabla-clientes-admin">
          {clientesFiltrados.map((cliente) => {
            const esPendiente = cliente.estadoCliente === EstadoCliente.PENDIENTE_APROBACION;
            const estaAprobandoEste = clienteAprobandoId === cliente.id;

            return (
              <Link
                key={cliente.id}
                href={`/admin/clientes/${cliente.id}`}
                className={`group block bg-white hover:bg-neutral-50 border rounded-2xl p-4 md:p-5 transition-all shadow-sm hover:shadow-md ${
                  esPendiente
                    ? 'border-gold-400 bg-gold-50/20 hover:border-gold-500'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Info Principal */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-base font-bold text-neutral-900 group-hover:text-gold-700 transition-colors flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-gold-600 shrink-0" />
                        {cliente.salon}
                      </span>
                      <EstadoClienteBadge estado={cliente.estadoCliente} />
                      {cliente.zona ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {cliente.zona.provincia} - {cliente.zona.localidad}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-400 border border-neutral-200">
                          Sin zona asignada
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600">
                      <span className="text-neutral-800 font-medium">
                        {cliente.nombre} {cliente.apellido}
                      </span>
                      <span className="text-neutral-600 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {cliente.whatsapp}
                      </span>
                      <span className="text-neutral-500 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-neutral-400" />
                        {cliente.email}
                      </span>
                      <span className="text-neutral-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {cliente.localidad}, {cliente.provincia}
                      </span>
                    </div>
                  </div>

                  {/* Acciones y Estado */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-neutral-100">
                    {esPendiente && (
                      <button
                        type="button"
                        onClick={(e) => handleAprobarRapido(e, cliente.id, cliente.salon)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        {estaAprobandoEste ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Aprobando...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Aprobar Cuenta</span>
                          </>
                        )}
                      </button>
                    )}

                    <div className="text-right hidden sm:block">
                      <span className="block text-[10px] uppercase tracking-wider text-neutral-400">Pedidos</span>
                      <span className="text-xs font-bold text-neutral-800">{cliente.cantidadPedidos}</span>
                    </div>

                    <div className="p-2 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-400 group-hover:text-gold-700 group-hover:border-gold-300 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-bold text-neutral-900 mb-1">No se encontraron clientes</h4>
          <p className="text-sm text-neutral-500 max-w-md mx-auto mb-6">
            No hay salones que coincidan con los filtros de búsqueda o estado seleccionado.
          </p>
          <button
            onClick={() => {
              setBusqueda('');
              setEstadoFiltro('TODOS');
            }}
            className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors cursor-pointer border border-neutral-300"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
