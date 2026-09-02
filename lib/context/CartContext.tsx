'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';

import { TipoItemCarrito } from '@/lib/types/carrito';
export type { TipoItemCarrito };

export interface CartItemMetadata {
  nombre?: string;
  imagen?: string;
  categoria?: string;
  presentacion?: string;
  precioUnitario?: number;
}

export interface CartItemStorage extends CartItemMetadata {
  id: string;
  tipo: TipoItemCarrito;
  cantidad: number;
  variante?: string | null;
}

interface CartContextType {
  items: CartItemStorage[];
  agregarItem: (
    id: string,
    cantidad: number,
    tipo?: TipoItemCarrito,
    variante?: string | null,
    metadata?: CartItemMetadata
  ) => void;
  actualizarCantidad: (id: string, nuevaCantidad: number, tipo?: TipoItemCarrito, variante?: string | null) => void;
  quitarItem: (id: string, tipo?: TipoItemCarrito, variante?: string | null) => void;
  vaciarCarrito: () => void;
  cantidadTotal: number;
  usuarioId: string | null;
  setUsuarioId: (id: string | null) => void;
  cargando: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'steffen_cart_v2';

// Evento custom para sincronizar cambios en localStorage dentro de la misma pestaña
const CART_STORAGE_EVENT = 'steffen_cart_storage_change';

function notificarCambioStore() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CART_STORAGE_EVENT));
  }
}

function esMismoItem(
  a: { id: string; tipo: TipoItemCarrito; variante?: string | null },
  id: string,
  tipo?: TipoItemCarrito,
  variante?: string | null
): boolean {
  if (a.id !== id) return false;
  if (tipo && a.tipo !== tipo) return false;
  const varA = (a.variante || '').trim().toLowerCase();
  const varB = (variante || '').trim().toLowerCase();
  return varA === varB;
}

function leerItemsDeStorage(key: string = STORAGE_KEY): CartItemStorage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (i) =>
          i &&
          typeof i.id === 'string' &&
          (i.tipo === 'PRODUCTO' || i.tipo === 'PACK') &&
          typeof i.cantidad === 'number' &&
          i.cantidad > 0
      )
      .map((i) => ({
        id: i.id,
        tipo: i.tipo as TipoItemCarrito,
        cantidad: Math.floor(i.cantidad),
        variante: i.variante ? String(i.variante).trim() : null,
        nombre: typeof i.nombre === 'string' ? i.nombre : undefined,
        imagen: typeof i.imagen === 'string' ? i.imagen : undefined,
        categoria: typeof i.categoria === 'string' ? i.categoria : undefined,
        presentacion: typeof i.presentacion === 'string' ? i.presentacion : undefined,
        precioUnitario: typeof i.precioUnitario === 'number' ? i.precioUnitario : undefined,
      }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState<boolean>(false);

  // Migración transparente de claves antiguas y activación client-side inmediata
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      try {
        const actual = localStorage.getItem(STORAGE_KEY);
        if (!actual || actual === '[]') {
          // Intentar migrar desde steffen_cart_v2_anonimo o steffen_cart_v1
          const anonimo = localStorage.getItem('steffen_cart_v2_anonimo');
          if (anonimo && anonimo !== '[]') {
            localStorage.setItem(STORAGE_KEY, anonimo);
            notificarCambioStore();
          }
        }
      } catch (e) {
        console.error('Error al sincronizar almacenamiento del carrito:', e);
      }
    }
  }, []);

  // Suscriptor a cambios de storage para useSyncExternalStore
  const subscribe = useCallback((callback: () => void) => {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(CART_STORAGE_EVENT, callback);
    window.addEventListener('storage', callback);
    return () => {
      window.removeEventListener(CART_STORAGE_EVENT, callback);
      window.removeEventListener('storage', callback);
    };
  }, []);

  // Snapshot string para useSyncExternalStore (inmutable y ultra-rápido)
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return '[]';
    return localStorage.getItem(STORAGE_KEY) || '[]';
  }, []);

  const getServerSnapshot = useCallback(() => '[]', []);

  const rawStorageString = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const items = useMemo<CartItemStorage[]>(() => {
    try {
      const parsed = JSON.parse(rawStorageString);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (i) =>
            i &&
            typeof i.id === 'string' &&
            (i.tipo === 'PRODUCTO' || i.tipo === 'PACK') &&
            typeof i.cantidad === 'number' &&
            i.cantidad > 0
        )
        .map((i) => ({
          id: i.id,
          tipo: i.tipo as TipoItemCarrito,
          cantidad: Math.floor(i.cantidad),
          variante: i.variante ? String(i.variante).trim() : null,
          nombre: typeof i.nombre === 'string' ? i.nombre : undefined,
          imagen: typeof i.imagen === 'string' ? i.imagen : undefined,
          categoria: typeof i.categoria === 'string' ? i.categoria : undefined,
          presentacion: typeof i.presentacion === 'string' ? i.presentacion : undefined,
          precioUnitario: typeof i.precioUnitario === 'number' ? i.precioUnitario : undefined,
        }));
    } catch {
      return [];
    }
  }, [rawStorageString]);

  const guardarEnStorage = useCallback((nuevosItems: CartItemStorage[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevosItems));
        notificarCambioStore();
      } catch (e) {
        console.error('Error al guardar carrito en localStorage:', e);
      }
    }
  }, []);

  const agregarItem = useCallback(
    (
      id: string,
      cantidad: number,
      tipo: TipoItemCarrito = 'PRODUCTO',
      variante?: string | null,
      metadata?: CartItemMetadata
    ) => {
      if (cantidad <= 0 || !id) return;
      const actual = leerItemsDeStorage(STORAGE_KEY);
      const varLimpia = variante ? variante.trim() : null;
      const index = actual.findIndex((i) => esMismoItem(i, id, tipo, varLimpia));
      let updated: CartItemStorage[];
      if (index >= 0) {
        updated = [...actual];
        updated[index] = {
          ...updated[index],
          cantidad: updated[index].cantidad + cantidad,
          ...(metadata?.nombre ? { nombre: metadata.nombre } : {}),
          ...(metadata?.imagen ? { imagen: metadata.imagen } : {}),
          ...(metadata?.categoria ? { categoria: metadata.categoria } : {}),
          ...(metadata?.presentacion ? { presentacion: metadata.presentacion } : {}),
          ...(typeof metadata?.precioUnitario === 'number' ? { precioUnitario: metadata.precioUnitario } : {}),
        };
      } else {
        updated = [
          ...actual,
          {
            id,
            tipo,
            cantidad,
            variante: varLimpia,
            nombre: metadata?.nombre,
            imagen: metadata?.imagen,
            categoria: metadata?.categoria,
            presentacion: metadata?.presentacion,
            precioUnitario: metadata?.precioUnitario,
          },
        ];
      }
      guardarEnStorage(updated);
    },
    [guardarEnStorage]
  );

  const actualizarCantidad = useCallback(
    (id: string, nuevaCantidad: number, tipo?: TipoItemCarrito, variante?: string | null) => {
      const actual = leerItemsDeStorage(STORAGE_KEY);
      const varLimpia = variante ? variante.trim() : null;
      let updated: CartItemStorage[];
      if (nuevaCantidad <= 0) {
        updated = actual.filter((i) => !esMismoItem(i, id, tipo, varLimpia));
      } else {
        updated = actual.map((i) =>
          esMismoItem(i, id, tipo, varLimpia) ? { ...i, cantidad: nuevaCantidad } : i
        );
      }
      guardarEnStorage(updated);
    },
    [guardarEnStorage]
  );

  const quitarItem = useCallback(
    (id: string, tipo?: TipoItemCarrito, variante?: string | null) => {
      const actual = leerItemsDeStorage(STORAGE_KEY);
      const varLimpia = variante ? variante.trim() : null;
      const updated = actual.filter((i) => !esMismoItem(i, id, tipo, varLimpia));
      guardarEnStorage(updated);
    },
    [guardarEnStorage]
  );

  const vaciarCarrito = useCallback(() => {
    guardarEnStorage([]);
  }, [guardarEnStorage]);

  const cantidadTotal = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.cantidad, 0);
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      agregarItem,
      actualizarCantidad,
      quitarItem,
      vaciarCarrito,
      cantidadTotal,
      usuarioId,
      setUsuarioId,
      cargando: !isClient,
    }),
    [items, agregarItem, actualizarCantidad, quitarItem, vaciarCarrito, cantidadTotal, usuarioId, isClient]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser utilizado dentro de un CartProvider');
  }
  return context;
}
