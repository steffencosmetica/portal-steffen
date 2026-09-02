import Link from 'next/link';
import Image from 'next/image';
import { logoutAction } from '@/app/actions/logout';
import { Shield, LogOut, LayoutDashboard, ShoppingCart, Users, Package, Sparkles } from 'lucide-react';

interface AdminHeaderProps {
  titulo?: string;
  emailAdmin?: string;
}

export function AdminHeader({ titulo }: AdminHeaderProps) {
  return (
    <header className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="relative h-8 w-28">
          <Image 
            src="/loguito.png" 
            alt="Steffen Cosmética Capilar" 
            fill 
            className="object-contain object-left" 
            priority 
          />
        </Link>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold-50 border border-gold-300 text-xs font-bold text-gold-800 shadow-sm">
          <Shield className="w-3 h-3 text-gold-700" />
          <span>Panel Admin</span>
        </div>
        {titulo && (
          <>
            <span className="text-neutral-400 hidden sm:inline">•</span>
            <span className="text-sm font-medium text-neutral-600 hidden sm:inline">{titulo}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 self-start sm:self-end md:self-auto flex-wrap w-full md:w-auto">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 text-xs text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-200 hover:border-neutral-300 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-sm font-medium"
        >
          <LayoutDashboard className="w-3.5 h-3.5 text-gold-600" />
          <span>Inicio</span>
        </Link>

        <Link
          href="/admin/pedidos"
          className="flex items-center gap-1.5 text-xs text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-200 hover:border-neutral-300 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-sm font-medium"
        >
          <ShoppingCart className="w-3.5 h-3.5 text-gold-600" />
          <span>Pedidos</span>
        </Link>

        <Link
          href="/admin/clientes"
          className="flex items-center gap-1.5 text-xs text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-200 hover:border-neutral-300 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-sm font-medium"
        >
          <Users className="w-3.5 h-3.5 text-gold-600" />
          <span>Clientes</span>
        </Link>

        <Link
          href="/admin/productos"
          className="flex items-center gap-1.5 text-xs text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-200 hover:border-neutral-300 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-sm font-medium"
        >
          <Package className="w-3.5 h-3.5 text-gold-600" />
          <span>Productos</span>
        </Link>

        <Link
          href="/admin/packs"
          className="flex items-center gap-1.5 text-xs text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-200 hover:border-neutral-300 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-sm font-medium"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Packs</span>
        </Link>

        <form action={logoutAction}>
          <button
            id="btn-admin-logout"
            type="submit"
            className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-red-600 bg-white border border-neutral-200 hover:border-red-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </form>
      </div>
    </header>
  );
}
