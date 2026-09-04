import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SiteHeader } from '@/components/SiteHeader';
import { DistribuidorBanner } from '@/components/DistribuidorBanner';
import { NivelClienteCard } from '@/components/NivelClienteCard';
import { obtenerSesionCliente } from '@/lib/services/session';
import { obtenerEstadoNivelCliente } from '@/lib/services/nivelCliente';
import { calcularDisponibilidadPack, obtenerPrecioPackParaCliente } from '@/lib/services/packs';
import { DetallePackClient } from '@/components/catalogo/DetallePackClient';
import { PackDTO } from '@/components/catalogo/PackCard';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const pack = await prisma.pack.findUnique({
      where: { id },
      select: { nombre: true, descripcion: true, imagen: true },
    });

    if (!pack) {
      return {
        title: 'Pack no encontrado | Steffen Cosmética Capilar',
      };
    }

    return {
      title: `${pack.nombre} | Packs y Combos Profesionales Steffen`,
      description: pack.descripcion.slice(0, 160),
      openGraph: {
        title: `${pack.nombre} | Steffen Cosmética Capilar Profesional`,
        description: pack.descripcion.slice(0, 160),
        images: [{ url: pack.imagen }],
      },
    };
  } catch {
    return {
      title: 'Pack Promocional | Steffen Cosmética Capilar',
    };
  }
}

export default async function DetallePackPage({ params }: PageProps) {
  const { id } = await params;

  // 1. Obtener sesión del cliente profesional (si existe)
  let sesion = null;
  let estadoNivel = null;
  try {
    sesion = await obtenerSesionCliente();
    if (sesion?.cliente) {
      estadoNivel = await obtenerEstadoNivelCliente(sesion.cliente);
    }
  } catch (err) {
    console.error('Error al obtener sesión en DetallePackPage:', err);
  }

  const cliente = sesion?.cliente || null;
  const usuarioId = sesion?.usuario?.id || '';
  const salonNombre = cliente?.salon || '';
  const estadoCliente = sesion?.estadoCliente || null;

  // 2. Buscar el Pack en la base de datos con sus ítems y productos asociados
  const packDB = (await prisma.pack.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          producto: true,
        },
      },
    },
  })) as any;

  if (!packDB) {
    notFound();
  }

  // 3. Calcular disponibilidad y precios según el tipo de cuenta
  const disp = await calcularDisponibilidadPack(packDB.id);
  const precioCalc = obtenerPrecioPackParaCliente(packDB, cliente);

  const packDTO: PackDTO = {
    id: packDB.id,
    nombre: packDB.nombre,
    descripcion: packDB.descripcion,
    imagen: packDB.imagen,
    etiqueta: packDB.etiqueta || null,
    precioPromocional: precioCalc.precioFinal,
    precioPssEquivalente: precioCalc.precioOriginalTachado,
    descuento: precioCalc.porcentajeDescuento,
    destacado: packDB.destacado,
    disponible: disp.disponible,
    motivoNoDisponible: disp.motivo,
    items: ((packDB.items || []) as any[]).map((it: any) => ({
      productoId: it.productoId,
      nombre: it.producto?.nombre || '',
      presentacion: it.producto?.presentacion || '',
      cantidad: it.cantidad,
      codigo: it.producto?.codigo || null,
      imagen: it.producto?.imagen || null,
      precioUnitario: it.producto?.precioPss ? Number(it.producto.precioPss) : null,
      precioEcommerce: it.producto?.precioEcommerce ? Number(it.producto.precioEcommerce) : null,
    })),
  };

  const distribuidorAsignado = cliente?.zona?.distribuidor || null;
  const zonaCliente = cliente?.zona || null;
  const tieneDistribuidor = Boolean(
    distribuidorAsignado || zonaCliente?.distribuidorId || zonaCliente?.estado === 'CON_DISTRIBUIDOR'
  );
  const esSinDistribuidor = Boolean(sesion && cliente && !tieneDistribuidor);

  return (
    <div id="detalle-pack-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      {/* Banner de Distribuidor Oficial (si tiene uno asignado) */}
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

      {/* Barra superior */}
      <SiteHeader
        salonNombre={salonNombre}
        usuarioId={usuarioId}
        sesion={!!sesion}
        esAdmin={sesion?.rol === 'ADMIN'}
        paginaActual="catalogo"
        mostrarCatalogo={true}
        sinDistribuidorAsignado={esSinDistribuidor}
      />

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto w-full py-6 md:py-8 space-y-6">
        {/* Banner/Tarjeta de Nivel / Beneficios si está logueado */}
        {estadoNivel && (
          <NivelClienteCard
            estadoNivel={estadoNivel}
            estadoCliente={cliente?.estadoCliente}
            mostrarBotonCatalogo={false}
          />
        )}

        {/* Componente Cliente Detallado del Pack */}
        <DetallePackClient
          pack={packDTO}
          usuarioLogueado={!!sesion}
          estadoCliente={estadoCliente}
          salonNombre={salonNombre}
          tieneDistribuidor={tieneDistribuidor}
          distribuidorNombre={distribuidorAsignado?.nombre || null}
        />
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-500 border-t border-neutral-200 mt-12">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Venta Directa y Distribución a Salones Profesionales
      </footer>
    </div>
  );
}
