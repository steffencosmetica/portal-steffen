'use client';

import React from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/context/CartContext';
import { ShoppingBag } from 'lucide-react';

interface CartHeaderButtonProps {
  usuarioId?: string;
}

export function CartHeaderButton({ usuarioId }: CartHeaderButtonProps) {
  const { cantidadTotal, setUsuarioId } = useCart();

  React.useEffect(() => {
    if (usuarioId) {
      setUsuarioId(usuarioId);
    }
  }, [usuarioId, setUsuarioId]);

  return (
    <Link
      href="/carrito"
      id="btn-nav-carrito"
      title="Mi Pedido"
      className="relative flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl bg-gold-50 hover:bg-gold-100 border border-gold-300 text-gold-800 text-xs md:text-sm font-semibold transition-all cursor-pointer shadow-xs shrink-0"
    >
      <ShoppingBag className="w-4 h-4 text-gold-700" />
      <span className="hidden sm:inline">Mi Pedido</span>
      {cantidadTotal > 0 ? (
        <span
          id="cart-badge-count"
          className="ml-0.5 px-1.5 py-0.2 text-[10px] sm:text-[11px] font-extrabold bg-gold-500 text-white rounded-full animate-in zoom-in-50 duration-200 shadow-xs"
        >
          {cantidadTotal}
        </span>
      ) : (
        <span className="text-[11px] text-gold-600 font-normal hidden sm:inline">(0)</span>
      )}
    </Link>
  );
}
