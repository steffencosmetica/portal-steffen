import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { logoutAction } from '@/app/actions/logout';
import { CartHeaderButton } from '@/components/catalogo/CartHeaderButton';
import { 
  Store, 
  Home, 
  ShoppingBag, 
  User, 
  LogOut, 
  LogIn, 
  UserPlus 
} from 'lucide-react';

export interface SiteHeaderProps {
  salonNombre?: string | null;
  usuarioId?: string;
  sesion?: boolean;
  esAdmin?: boolean;
  paginaActual?: 'inicio' | 'catalogo' | 'carrito' | 'perfil' | 'admin' | 'recursos' | 'otro';
  mostrarCarrito?: boolean;
  mostrarCatalogo?: boolean;
  mostrarInicio?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function SiteHeader({
  salonNombre,
  usuarioId = '',
  sesion = false,
  esAdmin = false,
  paginaActual = 'otro',
  mostrarCarrito = true,
  mostrarCatalogo = true,
  mostrarInicio = true,
  className = '',
  children,
}: SiteHeaderProps) {
  return (
    <header className={`max-w-7xl mx-auto w-full flex items-center justify-between gap-2 pb-6 border-b border-neutral-200 ${className}`}>
      {/* Lado izquierdo: Logo + Texto de acompañamiento + Badge de Salón */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
          <Image
            src="/loguito.png"
            alt="Steffen Cosmética Capilar"
            width={400}
            height={120}
            priority
            className="h-8 sm:h-9 w-auto object-contain"
          />
          <span className="hidden md:inline text-[10px] sm:text-[11px] font-bold tracking-wider text-neutral-500 uppercase border-l border-neutral-200 pl-2.5 sm:pl-3 py-0.5 whitespace-nowrap">
            Portal Profesional Steffen
          </span>
        </Link>

        {salonNombre && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-neutral-200 text-xs text-neutral-700 font-medium shadow-sm truncate max-w-[180px]">
            <Store className="w-3.5 h-3.5 text-gold-600 shrink-0" />
            <span className="truncate">{salonNombre}</span>
          </div>
        )}
      </div>

      {/* Lado derecho: Navegación y Acciones */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Botón Inicio */}
        {mostrarInicio && (
          <Link
            href="/"
            id="btn-nav-inicio"
            title="Inicio"
            className={`flex items-center justify-center gap-1.5 text-xs md:text-sm px-2.5 sm:px-3.5 py-2 rounded-xl transition-colors shadow-xs font-medium ${
              paginaActual === 'inicio'
                ? 'bg-neutral-100 text-neutral-900 border border-neutral-300 font-semibold'
                : 'text-neutral-700 hover:text-gold-700 bg-white border border-neutral-200 hover:border-gold-300'
            }`}
          >
            <Home className="w-4 h-4 text-gold-600" />
            <span className="hidden sm:inline">Inicio</span>
          </Link>
        )}

        {/* Botón Catálogo */}
        {mostrarCatalogo && (
          <Link
            href="/catalogo"
            id="btn-nav-catalogo"
            title="Catálogo"
            className={`flex items-center justify-center gap-1.5 text-xs md:text-sm px-2.5 sm:px-3.5 py-2 rounded-xl transition-colors shadow-xs font-medium ${
              paginaActual === 'catalogo'
                ? 'bg-neutral-100 text-neutral-900 border border-neutral-300 font-semibold'
                : 'text-neutral-700 hover:text-gold-700 bg-white border border-neutral-200 hover:border-gold-300'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-gold-600" />
            <span className="hidden sm:inline">Catálogo</span>
          </Link>
        )}

        {/* Botón de Carrito (si está habilitado) */}
        {mostrarCarrito && (
          <CartHeaderButton usuarioId={usuarioId} />
        )}

        {/* Acciones para usuario con sesión activa */}
        {sesion ? (
          <>
            {esAdmin && (
              <Link
                href="/admin"
                id="btn-nav-admin"
                title="Panel Admin"
                className={`flex items-center justify-center gap-1.5 text-xs md:text-sm px-2.5 sm:px-3.5 py-2 rounded-xl transition-colors shadow-xs font-semibold ${
                  paginaActual === 'admin'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-gold-50 text-gold-900 border border-gold-300 hover:bg-gold-100'
                }`}
              >
                <Store className="w-4 h-4 text-gold-600" />
                <span className="hidden sm:inline">Panel Admin</span>
              </Link>
            )}

            <Link
              href="/perfil"
              id="btn-nav-perfil"
              title="Mi Cuenta"
              className={`flex items-center justify-center gap-1.5 text-xs md:text-sm px-2.5 sm:px-3.5 py-2 rounded-xl transition-colors shadow-xs font-medium ${
                paginaActual === 'perfil'
                  ? 'bg-neutral-100 text-neutral-900 border border-neutral-300 font-semibold'
                  : 'text-neutral-700 hover:text-gold-700 bg-white border border-neutral-200 hover:border-gold-300'
              }`}
            >
              <User className="w-4 h-4 text-gold-600" />
              <span className="hidden sm:inline">Mi Cuenta</span>
            </Link>

            <form action={logoutAction} className="inline-flex">
              <button
                id="btn-logout"
                type="submit"
                title="Cerrar Sesión"
                className="flex items-center justify-center gap-1.5 text-xs md:text-sm text-neutral-600 hover:text-red-600 bg-white border border-neutral-200 hover:border-red-200 px-2.5 sm:px-3.5 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </>
        ) : (
          /* Acciones para visitantes sin sesión */
          <>
            <Link
              href="/login"
              id="btn-nav-login"
              title="Ingresar"
              className="flex items-center justify-center gap-1.5 text-xs md:text-sm text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-200 px-2.5 sm:px-3.5 py-2 rounded-xl transition-colors shadow-xs font-medium"
            >
              <LogIn className="w-4 h-4 text-neutral-500" />
              <span className="hidden sm:inline">Ingresar</span>
            </Link>

            <Link
              href="/registro"
              id="btn-nav-registro"
              title="Registrar Salón"
              className="flex items-center justify-center gap-1.5 text-xs md:text-sm text-white bg-gold-500 hover:bg-gold-600 px-2.5 sm:px-3.5 py-2 rounded-xl transition-colors shadow-xs font-bold shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Registrar Salón</span>
            </Link>
          </>
        )}

        {/* Elementos adicionales personalizados si una vista los requiere */}
        {children}
      </div>
    </header>
  );
}
