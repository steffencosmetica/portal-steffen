import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { inicializarReglasSiEstanVacias } from '@/lib/services/descuentos';
import { obtenerSesionCliente } from '@/lib/services/session';
import { obtenerEstadoNivelCliente } from '@/lib/services/nivelCliente';
import { determinarPrecioVisible } from '@/lib/services/precios';
import { logoutAction } from '@/app/actions/logout';
import { DistribuidorBanner } from '@/components/DistribuidorBanner';
import { NivelClienteCard } from '@/components/NivelClienteCard';
import { AlertaRegistroModal } from '@/components/AlertaRegistroModal';
import { AlertaCuentaPendienteModal } from '@/components/AlertaCuentaPendienteModal';
import { AlertaCuentaAprobadaModal } from '@/components/AlertaCuentaAprobadaModal';
import { SiteHeader } from '@/components/SiteHeader';
import { ProductoDTO } from '@/components/catalogo/ProductoCard';
import { ProductosDestacadosCarousel } from '@/components/catalogo/ProductosDestacadosCarousel';
import { 
  Store, 
  User, 
  UserPlus, 
  LogIn, 
  LogOut, 
  ArrowRight,
  Package, 
  Tag, 
  Layers, 
  ShoppingBag, 
  Building2, 
  Scissors, 
  Rocket, 
  Truck,
  Repeat,
  Sparkles,
  ShieldCheck,
  Award,
  Crown,
  Medal,
  Clock,
  BookOpen,
  Briefcase,
  ImageIcon,
  CheckCircle2
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const esCuentaPendiente = resolvedSearchParams.cuenta === 'pendiente';
  const esCuentaAprobada = resolvedSearchParams.cuenta === 'aprobada';
  const mostrarAlertaPendiente = esCuentaPendiente;

  let sesion = null;
  let cliente = null;
  let salonNombre = '';
  let estadoNivel = null;

  try {
    sesion = await obtenerSesionCliente();
    cliente = sesion?.cliente || null;
    salonNombre = cliente?.salon || '';
    if (cliente) {
      estadoNivel = await obtenerEstadoNivelCliente(cliente);
    }
  } catch (err) {
    console.error('Error al obtener sesión en HomePage:', err);
  }

  const tieneDistribuidor = Boolean(cliente?.zona?.distribuidorId || cliente?.zona?.distribuidor || cliente?.zona?.estado === 'CON_DISTRIBUIDOR');

  const beneficios = [
    {
      titulo: 'Precio profesional directo',
      descripcion: 'Precios diferenciales oficiales de fábrica.',
      icono: Tag,
    },
    {
      titulo: 'Packs exclusivos',
      descripcion: 'Combos promocionales armados para el servicio completo en el salón.',
      icono: Layers,
    },
    {
      titulo: 'Compra mínima accesible',
      descripcion: 'Condiciones pensadas para adaptarse a la rotación real de tu salón.',
      icono: ShoppingBag,
    },
    {
      titulo: 'Acceso a lanzamientos',
      descripcion: 'Sé el primero en incorporar novedades y formulaciones recién elaboradas.',
      icono: Rocket,
    },
    {
      titulo: 'Envíos a todo el país',
      descripcion: 'Hacemos envíos a cada localidad y provincia de la Argentina.',
      icono: Truck,
    },
    {
      titulo: 'Beneficios por Reposición',
      descripcion: 'Cuanto más rápido volvés a comprar, mejores condiciones vas a conseguir.',
      icono: Repeat,
    },
  ];

  const materialProfesional = [
    {
      titulo: 'Guía profesional de productos',
      descripcion: 'Manuales técnicos, fichas completas y protocolos oficiales de aplicación paso a paso.',
      icono: BookOpen,
    },
    {
      titulo: 'Herramientas de venta',
      descripcion: 'Argumentarios comerciales, listas sugeridas de reventa y tips para asesorar a tus clientas.',
      icono: Briefcase,
    },
    {
      titulo: 'Imágenes para publicación de productos',
      descripcion: 'Fotografías en alta calidad, placas para historias y contenido listo para tus redes sociales.',
      icono: ImageIcon,
    },
  ];

  // 3. Reglas de descuento dinámicas para Salones Profesionales
  let tramosDescuento: Array<{
    titulo: string;
    porcentaje: string;
    tag: string;
    descripcion: string;
    icono: React.ElementType;
    color: string;
    badgeColor: string;
  }> = [];

  if (sesion) {
    try {
      const esElegibleReposicion = !cliente?.zona || cliente.zona.estado === 'SIN_DISTRIBUIDOR';

      let reglas = await prisma.reglaDeDescuento.findMany({
        where: { activa: true },
        orderBy: { orden: 'asc' },
      });

      if (reglas.length === 0) {
        await inicializarReglasSiEstanVacias();
        reglas = await prisma.reglaDeDescuento.findMany({
          where: { activa: true },
          orderBy: { orden: 'asc' },
        });
      }

      tramosDescuento = reglas.flatMap((regla) => {
        const porcentajeNum = Number(regla.porcentaje);

        if (regla.tipo === 'PRIMER_PEDIDO') {
          return [
            {
              titulo: 'Primer Pedido',
              porcentaje: `${porcentajeNum}% OFF`,
              tag: 'Bienvenida Salón',
              descripcion: 'Descuento directo en tu primera compra profesional para incorporar la marca a tu salón.',
              icono: Sparkles,
              color: 'border-gold-300 bg-gold-50/60 text-gold-950',
              badgeColor: 'bg-gold-200 text-gold-900 border-gold-400 font-bold',
            },
          ];
        }

        if (regla.tipo === 'REPOSICION') {
          if (!esElegibleReposicion) {
            return [];
          }

          const diasDesde = regla.diasDesde ?? 0;
          const diasHasta = regla.diasHasta ?? (diasDesde <= 40 ? 40 : 55);

          if (diasHasta <= 40) {
            return [
              {
                titulo: `Reposición ${diasDesde} a ${diasHasta} días`,
                porcentaje: `${porcentajeNum}% OFF`,
                tag: `Rotación Frecuente (${diasDesde} a ${diasHasta} días)`,
                descripcion: `Mantené tu ${porcentajeNum}% OFF reponiendo stock dentro de los primeros ${diasHasta} días de tu última compra completada.`,
                icono: Award,
                color: 'border-amber-300 bg-amber-50/50 text-amber-950',
                badgeColor: 'bg-amber-200 text-amber-900 border-amber-300 font-bold',
              },
            ];
          } else {
            return [
              {
                titulo: `Reposición ${diasDesde} a ${diasHasta} días`,
                porcentaje: `${porcentajeNum}% OFF`,
                tag: `Tramo ${diasDesde} a ${diasHasta} días`,
                descripcion: `Accedé al ${porcentajeNum}% OFF en compras realizadas entre los ${diasDesde} y ${diasHasta} días posteriores a tu compra. Al cumplir ${diasHasta} días, el beneficio expira.`,
                icono: Clock,
                color: 'border-neutral-200 bg-white text-neutral-900',
                badgeColor: 'bg-neutral-100 text-neutral-800 border-neutral-300 font-semibold',
              },
            ];
          }
        }

        return [];
      });
    } catch (rulesError) {
      console.error('Error al cargar reglas de descuento:', rulesError);
    }
  }

  const esPendienteAprobacion = Boolean(sesion && cliente?.estadoCliente === 'PENDIENTE_APROBACION');

  // 4. Obtención de los Productos Destacados seleccionados por el administrador (con casilla destacado: true)
  let productosDestacados: ProductoDTO[] = [];
  try {
    const productosDB = await prisma.producto.findMany({
      where: {
        activo: true,
        destacado: true,
      },
      orderBy: [
        { ordenVisualizacion: 'asc' },
        { id: 'asc' },
      ],
    });

    if (productosDB.length > 0) {
      productosDestacados = productosDB.map((p) => {
        const { precio, tipoPrecio } = determinarPrecioVisible(cliente, {
          precioPss: Number(p.precioPss),
          precioEcommerce: Number(p.precioEcommerce),
        });

        return {
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre.replace(/^\[TEST\]\s*/i, ''),
          categoria: p.categoria,
          subcategoria: p.subcategoria,
          descripcion: p.descripcion,
          imagen: p.imagen,
          presentacion: p.presentacion,
          precioPss: Number(p.precioPss),
          precioEcommerce: Number(p.precioEcommerce),
          precioVisible: precio,
          tipoPrecio,
          precioProfesionalBloqueado: esPendienteAprobacion ? Number(p.precioPss) : null,
          stock: p.stock,
          variantes: p.variantes,
          activo: p.activo,
          ordenVisualizacion: p.ordenVisualizacion,
          destacado: p.destacado,
          recomendado: p.recomendado,
        };
      });
    }
  } catch (errorProductos) {
    console.error('Error al cargar productos destacados en HomePage:', errorProductos);
  }

  const distribuidorAsignado = cliente?.zona?.distribuidor || null;
  const zonaCliente = cliente?.zona || null;
  const esSinDistribuidor = Boolean(sesion && cliente && !tieneDistribuidor);

  return (
    <div id="home-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      {/* Banner de Distribuidor Oficial (si tiene uno asignado a su zona) */}
      {distribuidorAsignado && zonaCliente && (
        <DistribuidorBanner
          zona={{
            localidad: zonaCliente.localidad,
            provincia: zonaCliente.provincia,
          }}
          distribuidor={{
            nombre: distribuidorAsignado.nombre,
            empresa: distribuidorAsignado.empresa,
            whatsapp: distribuidorAsignado.whatsapp,
          }}
        />
      )}

      {/* Header Compartido */}
      <SiteHeader
        sesion={!!sesion}
        esAdmin={sesion?.rol === 'ADMIN'}
        usuarioId={sesion?.usuario?.id}
        salonNombre={cliente?.salon}
        paginaActual="inicio"
        mostrarInicio={false}
        sinDistribuidorAsignado={esSinDistribuidor}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full py-10 md:py-16 space-y-16 md:space-y-24">
        {/* Modal de Alerta de Cuenta en Revisión / Pendiente */}
        <AlertaCuentaPendienteModal initialOpen={mostrarAlertaPendiente} />

        {/* Modal de Alerta de Cuenta Aprobada / Habilitación de Precio Profesional */}
        <AlertaCuentaAprobadaModal 
          initialOpen={esCuentaAprobada || (cliente?.estadoCliente === 'ACTIVO' && cliente?.alertaAprobacionVista === false)} 
          salonNombre={cliente?.salon}
          nombreCliente={cliente?.nombre}
          tieneDistribuidor={tieneDistribuidor}
        />

        {/* Modal de Bienvenida/Registro para visitantes sin sesión */}
        {!sesion && <AlertaRegistroModal />}

        {/* Banner/Tarjeta de Beneficios / Reposición */}
        <NivelClienteCard
          estadoNivel={estadoNivel}
          estadoCliente={cliente?.estadoCliente}
        />

        {/* 2. Sección Hero & Presentación Salón */}
        {!sesion ? (
          <section id="hero-section" className="relative overflow-hidden bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white rounded-3xl p-6 sm:p-10 md:p-12 lg:p-14 border border-neutral-800/90 shadow-2xl space-y-10 md:space-y-12">
            {/* Iluminación de acento sutil */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/3 left-0 -ml-20 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 -mb-20 w-72 h-72 bg-gold-400/5 rounded-full blur-3xl pointer-events-none" />

            {/* Parte Superior: Presentación Principal "¿Tenés un salón de belleza?" */}
            <div className="relative max-w-3xl space-y-6">
              {/* Badge de Prestigio */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-sm shadow-sm">
                <Sparkles className="w-4 h-4 text-gold-400 shrink-0" />
                <span>Plataforma exclusiva para peluquerías y salones profesionales</span>
              </div>

              {/* Titular Llamativo */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                  ¿Tenés un salón de belleza?
                </h1>

                <p className="text-base sm:text-lg md:text-xl text-neutral-200 leading-relaxed font-light">
                  <strong className="text-white font-bold">Registrate y accedé a un <span className="text-gold-400 underline decoration-gold-500/40 underline-offset-4">20% OFF en tu primera compra</span></strong>, además de precios exclusivos para el profesional directo de fábrica, y muchos beneficios más para impulsar el crecimiento de tu salón.
                </p>
              </div>

              {/* Badges de Beneficios Clave Inmediatos */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gold-500/15 border border-gold-500/40 text-gold-300 text-xs sm:text-sm font-bold shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />
                  <span>20% OFF en tu Primera Compra</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-neutral-300 text-xs sm:text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Precios Directos de Fábrica</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-neutral-300 text-xs sm:text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Envíos a todo el país</span>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-4">
                <Link
                  id="btn-hero-registro"
                  href="/registro"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gold-500 hover:bg-gold-400 text-neutral-950 font-black text-sm sm:text-base shadow-xl shadow-gold-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] group"
                >
                  <span>Registrar mi Salón</span>
                  <span className="text-xs bg-neutral-950/15 px-2 py-0.5 rounded-md font-bold text-neutral-950">20% OFF</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  id="btn-hero-catalogo"
                  href="/catalogo"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-white border border-neutral-700 hover:border-neutral-600 font-bold text-sm sm:text-base transition-all"
                >
                  <ShoppingBag className="w-4 h-4 text-gold-400" />
                  <span>Explorar Catálogo</span>
                </Link>
              </div>
            </div>

            {/* Parte Inferior Integrada: Beneficios Exclusivos en la Misma Sección */}
            <div id="beneficios-section" className="relative pt-8 md:pt-10 border-t border-neutral-800/80 space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gold-400 uppercase tracking-widest block">
                    Plataforma exclusiva para peluquerías y salones profesionales
                  </span>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    Beneficios diseñados para tu salón
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-md font-light">
                  Diseñada para abastecer tu salón de manera rápida, transparente y con beneficios reales directos de fábrica.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4.5">
                {beneficios.map((b, idx) => {
                  const IconComp = b.icono;
                  return (
                    <div
                      key={idx}
                      className="group bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/90 hover:border-gold-500/40 rounded-2xl p-5 sm:p-5.5 transition-all duration-300 flex items-start gap-4 shadow-sm"
                    >
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-neutral-950 text-gold-400 border border-neutral-800 flex items-center justify-center shrink-0 group-hover:bg-gold-500 group-hover:text-neutral-950 group-hover:border-gold-400 transition-all duration-300">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight group-hover:text-gold-300 transition-colors">
                          {b.titulo}
                        </h3>
                        <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-light">
                          {b.descripcion}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : (
          <section id="hero-section" className="relative overflow-hidden bg-neutral-950 text-white rounded-3xl p-8 md:p-12 border border-neutral-800 shadow-xl">
            {/* Subtle gold accent background */}
            <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-80 h-80 bg-gold-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900 border border-gold-500/30 text-gold-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                <span>Portal Profesional Steffen</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-[1.2]">
                {salonNombre ? `¡Hola de nuevo, ${salonNombre}!` : '¡Hola de nuevo!'}
              </h1>

              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-2xl font-light">
                Explorá las novedades del catálogo profesional directo de fábrica.
              </p>

              <div className="pt-2">
                <Link
                  href="/catalogo"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-neutral-950 font-bold text-sm sm:text-base shadow-lg shadow-gold-500/20 transition-all hover:scale-[1.01]"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Ir al Catálogo</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Sección de Packs Exclusivos */}
        <section id="seccion-packs-exclusivos" className="space-y-6 md:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-neutral-200/80">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-50 border border-gold-300 text-gold-800 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                <span>Packs Exclusivos • Venta Directa de Fábrica</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900 tracking-tight">
                Packs Exclusivos para tu Salón
              </h2>
              <p className="text-neutral-600 text-sm md:text-base leading-relaxed max-w-2xl font-normal">
                Elegí la modalidad ideal para tu salón con combinaciones preparadas para potenciar tu trabajo diario, tu reventa y tus resultados técnicos.
              </p>
            </div>
            <Link
              id="btn-ver-todos-los-packs"
              href="/catalogo?vista=packs"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-gold-700 hover:text-gold-900 transition-colors shrink-0 group self-start sm:self-auto py-1"
            >
              <span>Ver todos los combos</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {/* Tarjeta 1: “Quiero trabajar Steffen” */}
            <Link
              id="tarjeta-pack-trabajar"
              href="/catalogo?vista=packs&etiqueta=trabajar"
              className="group relative bg-white border border-neutral-200/90 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm hover:border-gold-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/60 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-indigo-100/60 transition-colors" />
              
              <div className="space-y-5 relative">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-gold-400 border border-neutral-800 flex items-center justify-center shrink-0 shadow-sm group-hover:bg-gold-500 group-hover:text-neutral-950 group-hover:border-gold-400 transition-all duration-300">
                    <Scissors className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Uso Técnico en Salón
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight leading-snug group-hover:text-gold-700 transition-colors">
                    “Quiero trabajar Steffen”
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    Combos diseñados para pileta de lavado, tratamientos técnicos de alisado, decoloración y nutrición en salón. Alto rendimiento con costo por servicio optimizado.
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                    Rendimiento profesional
                  </span>
                  <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                    Pileta &amp; Tocador
                  </span>
                </div>
              </div>

              <div className="pt-6 relative">
                <div
                  id="btn-acceder-pack-trabajar"
                  className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl bg-neutral-950 text-white group-hover:bg-gold-500 group-hover:text-neutral-950 font-bold text-xs sm:text-sm transition-all shadow-sm"
                >
                  <span>Ver Packs para Trabajar</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Tarjeta 2: “Quiero vender en mi salón” */}
            <Link
              id="tarjeta-pack-vender"
              href="/catalogo?vista=packs&etiqueta=reventa"
              className="group relative bg-white border border-neutral-200/90 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm hover:border-gold-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/60 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-emerald-100/60 transition-colors" />

              <div className="space-y-5 relative">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-gold-400 border border-neutral-800 flex items-center justify-center shrink-0 shadow-sm group-hover:bg-gold-500 group-hover:text-neutral-950 group-hover:border-gold-400 transition-all duration-300">
                    <Store className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Reventa y Mostrador
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight leading-snug group-hover:text-gold-700 transition-colors">
                    “Quiero vender en mi salón”
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    Combos con los productos de mayor rotación y reventa en mostrador para potenciar tu ticket promedio y asegurar que tus clientas mantengan el tratamiento en casa.
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                    Mayor margen
                  </span>
                  <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                    Continuidad en casa
                  </span>
                </div>
              </div>

              <div className="pt-6 relative">
                <div
                  id="btn-acceder-pack-vender"
                  className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl bg-neutral-950 text-white group-hover:bg-gold-500 group-hover:text-neutral-950 font-bold text-xs sm:text-sm transition-all shadow-sm"
                >
                  <span>Ver Packs de Reventa</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Tarjeta 3: “Packs por rutina del cabello” */}
            <Link
              id="tarjeta-pack-rutinas"
              href="/catalogo?vista=packs&etiqueta=rutinas"
              className="group relative bg-white border border-neutral-200/90 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm hover:border-gold-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/60 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-amber-100/60 transition-colors" />

              <div className="space-y-5 relative">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-gold-400 border border-neutral-800 flex items-center justify-center shrink-0 shadow-sm group-hover:bg-gold-500 group-hover:text-neutral-950 group-hover:border-gold-400 transition-all duration-300">
                    <Layers className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    Diagnóstico Capilar
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight leading-snug group-hover:text-gold-700 transition-colors">
                    “Packs por rutina del cabello”
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    Protocolos completos organizados según diagnóstico capilar: nutrición profunda, reparación extrema, post-química, antifrizz y brillo cristal.
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                    Protocolos paso a paso
                  </span>
                  <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                    Soluciones a medida
                  </span>
                </div>
              </div>

              <div className="pt-6 relative">
                <div
                  id="btn-acceder-pack-rutinas"
                  className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl bg-neutral-950 text-white group-hover:bg-gold-500 group-hover:text-neutral-950 font-bold text-xs sm:text-sm transition-all shadow-sm"
                >
                  <span>Ver Packs por Rutina</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Sección de Productos Destacados */}
        <div>
          <ProductosDestacadosCarousel
            productos={productosDestacados}
            usuarioLogueado={!!sesion}
            estadoCliente={cliente?.estadoCliente || null}
          />
        </div>

        {/* 4. Sección "Material Exclusivo para Profesionales" / Accesos Profesionales */}
        <div className="pt-2 sm:pt-4 border-t border-neutral-200/70">
          {!sesion ? (
            <section id="material-profesional-section" className="space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                  Material Exclusivo para Profesionales
                </h2>
                <p className="text-neutral-500 text-sm md:text-base">
                  Recursos técnicos, comerciales y gráficos para capacitar a tu equipo y potenciar la reventa en tu salón.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {materialProfesional.map((m, idx) => {
                  const IconComp = m.icono;
                  return (
                    <div
                      key={idx}
                      className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm hover:border-gold-300 hover:shadow-md transition-all space-y-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gold-50 border border-gold-200/60 flex items-center justify-center text-gold-700">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-neutral-900 leading-snug">
                        {m.titulo}
                      </h3>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        {m.descripcion}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center pt-2">
                <Link
                  href="/registro"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.01]"
                >
                  <span>Ver más</span>
                  <ArrowRight className="w-4 h-4 text-gold-400" />
                </Link>
              </div>
            </section>
          ) : (
            <section id="accesos-profesionales-section">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Tarjeta 1: Material Exclusivo para Profesionales */}
                <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm hover:border-gold-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-gold-50 border border-gold-200/60 flex items-center justify-center text-gold-700">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-neutral-900 leading-snug">
                      Material Exclusivo para Profesionales
                    </h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Guías, herramientas de venta e imágenes para tu salón.
                    </p>
                  </div>
                  <Link
                    href="/recursos"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.01] w-full"
                  >
                    <span>Ver más</span>
                    <ArrowRight className="w-4 h-4 text-gold-400" />
                  </Link>
                </div>

                {/* Tarjeta 2: Catálogo de Productos */}
                <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm hover:border-gold-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-gold-50 border border-gold-200/60 flex items-center justify-center text-gold-700">
                      <Package className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-neutral-900 leading-snug">
                      Catálogo de Productos
                    </h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Explorá la línea completa directo de fábrica.
                    </p>
                  </div>
                  <Link
                    href="/catalogo"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.01] w-full"
                  >
                    <span>Ver Productos</span>
                    <ArrowRight className="w-4 h-4 text-gold-400" />
                  </Link>
                </div>

                {/* Tarjeta 3: Packs y Combos */}
                <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm hover:border-gold-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-gold-50 border border-gold-200/60 flex items-center justify-center text-gold-700">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-neutral-900 leading-snug">
                      Packs y Combos
                    </h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Combos promocionales armados para tu salón.
                    </p>
                  </div>
                  <Link
                    href="/catalogo?vista=packs"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.01] w-full"
                  >
                    <span>Ver Packs</span>
                    <ArrowRight className="w-4 h-4 text-gold-400" />
                  </Link>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* 5. Sección de Descuentos para Salones (solo visible para usuarios con sesión) */}
        {sesion && tramosDescuento.length > 0 && (
          <section id="niveles-section" className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
                    Beneficios y Descuentos Oficiales
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gold-100 text-gold-800 border border-gold-300">
                    <Sparkles className="w-3 h-3 text-gold-700" />
                    Salones Profesionales
                  </span>
                </div>
                <p className="text-neutral-500 text-xs sm:text-sm">
                  Descuentos directos por primera compra y escalas automáticas por reposición periódica.
                </p>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${tramosDescuento.length > 1 ? 'md:grid-cols-3' : 'md:grid-cols-1 max-w-lg mx-auto'} gap-6`}>
              {tramosDescuento.map((n, idx) => {
                const IconComp = n.icono;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border p-6 space-y-4 ${n.color} transition-all`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-neutral-200 flex items-center justify-center text-neutral-800">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold ${n.badgeColor}`}>
                        {n.tag}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-base font-bold text-neutral-950">
                          {n.titulo}
                        </h3>
                        <span className="text-sm font-extrabold text-neutral-900 bg-white/80 px-2 py-0.5 rounded border border-neutral-200">
                          {n.porcentaje}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-700 mt-2 leading-relaxed">
                        {n.descripcion}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 5. Espacio reservado para banners futuros */}
        {/* TODO: banners promocionales configurables desde /admin en el futuro */}
        <section id="banner-promocional-placeholder" className="relative overflow-hidden rounded-2xl border border-dashed border-neutral-300 bg-neutral-100/50 p-6 text-center">
          <div className="max-w-md mx-auto space-y-2 py-4">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-neutral-200 text-neutral-400 shadow-xs mb-1">
              <Sparkles className="w-4 h-4 text-gold-500" />
            </div>
            <p className="text-xs font-semibold text-neutral-700">
              Espacio para promociones y lanzamientos de temporada
            </p>
            <p className="text-[11px] text-neutral-500">
              Enterate de novedades y promociones especiales directamente desde nuestro catálogo oficial.
            </p>
          </div>
        </section>
      </main>

      {/* 6. Footer */}
      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-500 border-t border-neutral-200 mt-12">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Portal Profesional
      </footer>
    </div>
  );
}
