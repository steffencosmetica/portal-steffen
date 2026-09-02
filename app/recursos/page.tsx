import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { obtenerSesionCliente } from '@/lib/services/session';
import { logoutAction } from '@/app/actions/logout';
import { SiteHeader } from '@/components/SiteHeader';
import { 
  Store, 
  User, 
  ShoppingBag, 
  LogOut, 
  ArrowLeft,
  BookOpen, 
  Briefcase, 
  ImageIcon, 
  Clock, 
  Sparkles,
  Download,
  FileText,
  HelpCircle
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RecursosPage() {
  // Requiere sesión activa de cliente
  const sesion = await obtenerSesionCliente();
  if (!sesion || !sesion.cliente) {
    redirect('/login?redirect=/recursos');
  }

  const cliente = sesion.cliente;
  const salonNombre = cliente.salon || '';

  const recursos = [
    {
      id: 'guia-productos',
      titulo: 'Guía profesional de productos',
      descripcion: 'Manuales técnicos de aplicación, protocolos paso a paso y fichas completas de cada línea para vos y tu equipo.',
      icono: BookOpen,
      badge: 'Próximamente',
      categoria: 'Material Técnico',
    },
    {
      id: 'herramientas-venta',
      titulo: 'Herramientas de venta',
      descripcion: 'Argumentarios comerciales, listas sugeridas de precios de reventa y consejos para asesorar a tus clientas en el salón.',
      icono: Briefcase,
      badge: 'Próximamente',
      categoria: 'Comercial & Reventa',
    },
    {
      id: 'imagenes-publicacion',
      titulo: 'Imágenes para publicación de productos',
      descripcion: 'Fotografías en alta resolución, placas editables para historias y contenido listo para promocionar en tus redes sociales.',
      icono: ImageIcon,
      badge: 'Próximamente',
      categoria: 'Marketing & Redes',
    },
  ];

  return (
    <div id="recursos-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      {/* Header */}
      <SiteHeader
        salonNombre={salonNombre}
        usuarioId={sesion?.usuario?.id}
        sesion={true}
        paginaActual="recursos"
        mostrarInicio={true}
        mostrarCatalogo={true}
        mostrarCarrito={true}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a la Home</span>
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                Material Exclusivo para Profesionales
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gold-100 text-gold-800 border border-gold-300">
                <Sparkles className="w-3 h-3 text-gold-700" />
                Área de Recursos
              </span>
            </div>
            <p className="text-sm md:text-base text-neutral-600 max-w-2xl">
              Descargá guías técnicas oficiales, herramientas de ventas y contenido multimedia preparado especialmente para tu salón.
            </p>
          </div>
        </div>

        {/* Tarjetas de recursos */}
        {/* TODO: cargar archivos reales descargables desde /admin en el futuro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recursos.map((item) => {
            const IconComp = item.icono;
            return (
              <div
                key={item.id}
                id={`card-${item.id}`}
                className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm hover:border-gold-300 hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gold-50 border border-gold-200/60 flex items-center justify-center text-gold-700 shadow-xs">
                      <IconComp className="w-6 h-6" />
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" />
                      {item.badge}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      {item.categoria}
                    </span>
                    <h2 className="text-lg font-bold text-neutral-900 leading-snug">
                      {item.titulo}
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                      {item.descripcion}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100">
                  <button
                    disabled
                    className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 text-neutral-400 font-semibold text-xs flex items-center justify-center gap-2 cursor-not-allowed border border-neutral-200"
                  >
                    <Download className="w-4 h-4" />
                    <span>Disponible próximamente</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Card informativa de asistencia técnica */}
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-950 text-white rounded-2xl p-6 md:p-8 border border-neutral-800 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-lg font-bold text-white">
              ¿Buscás asesoramiento técnico personalizado?
            </h3>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-xl font-light">
              Nuestro equipo técnico y comercial está disponible vía WhatsApp para responder dudas sobre protocolos de aplicación, rendimientos y diagnóstico capilar.
            </p>
          </div>
          <Link
            href="/catalogo"
            className="shrink-0 px-5 py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-neutral-950 font-bold text-xs sm:text-sm shadow-md transition-all"
          >
            Explorar Catálogo
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-500 border-t border-neutral-200 mt-12">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Portal Profesional
      </footer>
    </div>
  );
}
