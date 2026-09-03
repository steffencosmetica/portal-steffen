import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SiteHeader } from '@/components/SiteHeader';
import { DistribuidorBanner } from '@/components/DistribuidorBanner';
import { NivelClienteCard } from '@/components/NivelClienteCard';
import { obtenerSesionCliente } from '@/lib/services/session';
import { obtenerEstadoNivelCliente } from '@/lib/services/nivelCliente';
import { determinarPrecioVisible } from '@/lib/services/precios';
import { DetalleProductoClient, ComentarioDTO } from '@/components/catalogo/DetalleProductoClient';
import { ProductoDTO } from '@/components/catalogo/ProductoCard';
import { PRODUCTOS_REALES_STEFFEN } from '@/lib/constants/productos-reales-steffen';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const producto = await prisma.producto.findUnique({
      where: { id },
      select: { nombre: true, descripcion: true, categoria: true, imagen: true },
    });

    if (producto) {
      return {
        title: `${producto.nombre} | Steffen Cosmética Capilar Profesional`,
        description: producto.descripcion.slice(0, 160),
        openGraph: {
          title: `${producto.nombre} | Steffen Profesional`,
          description: producto.descripcion.slice(0, 160),
          images: [{ url: producto.imagen }],
        },
      };
    }
  } catch {
    // Fallback a catálogo oficial
  }

  const fallbackProd = PRODUCTOS_REALES_STEFFEN.find((p) => p.id === id);
  if (fallbackProd) {
    return {
      title: `${fallbackProd.nombre} | Steffen Cosmética Capilar Profesional`,
      description: fallbackProd.descripcion.slice(0, 160),
      openGraph: {
        title: `${fallbackProd.nombre} | Steffen Profesional`,
        description: fallbackProd.descripcion.slice(0, 160),
        images: [{ url: fallbackProd.imagen }],
      },
    };
  }

  return {
    title: 'Catálogo de Productos | Steffen Cosmética Capilar',
  };
}

export default async function DetalleProductoPage({ params }: PageProps) {
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
    console.error('Error al obtener sesión en DetalleProductoPage:', err);
  }

  const cliente = sesion?.cliente || null;
  const usuarioId = sesion?.usuario?.id || '';
  const salonNombre = cliente?.salon || '';
  const estadoCliente = sesion?.estadoCliente || null;
  const esPendienteAprobacion = !!sesion && cliente?.estadoCliente === 'PENDIENTE_APROBACION';

  // 2. Buscar el producto en la base de datos o en el catálogo oficial
  let productoDB = null;
  try {
    productoDB = (await prisma.producto.findUnique({
      where: { id },
      include: {
        comentarios: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })) as any;
  } catch (dbErr) {
    console.warn('DetalleProductoPage: error consultando base de datos, buscando en catálogo oficial:', dbErr);
  }

  const productoFallback = !productoDB ? PRODUCTOS_REALES_STEFFEN.find((p) => p.id === id) : null;

  if (!productoDB && !productoFallback) {
    notFound();
  }

  // 3. Calcular precio visible y precio profesional bloqueado
  const pss = productoDB ? Number(productoDB.precioPss) : Number(productoFallback?.precioPss || 0);
  const pEcommerce = productoDB ? Number(productoDB.precioEcommerce) : Number(productoFallback?.precioEcommerce || 0);

  const { precio, tipoPrecio } = determinarPrecioVisible(cliente, {
    precioPss: pss,
    precioEcommerce: pEcommerce,
  });

  const comentarios: ComentarioDTO[] = productoDB?.comentarios?.map((c: any) => ({
    id: c.id,
    puntuacion: c.puntuacion,
    texto: c.texto,
    createdAt: c.createdAt.toISOString(),
    usuario: {
      nombre: c.usuario?.nombre || 'Profesional Steffen',
      cliente: {
        salon: c.usuario?.cliente?.salon || 'Salón Verificado',
      },
    },
  })) || [];

  const productoDTO: ProductoDTO = productoDB
    ? {
        id: productoDB.id,
        nombre: productoDB.nombre.replace(/^\[TEST\]\s*/i, ''),
        categoria: productoDB.categoria,
        subcategoria: productoDB.subcategoria,
        descripcion: productoDB.descripcion,
        modoUso: productoDB.modoUso,
        rendimientoSalon: productoDB.rendimientoSalon,
        imagen: productoDB.imagen,
        presentacion: productoDB.presentacion,
        precioPss: pss,
        precioEcommerce: pEcommerce,
        precioVisible: precio,
        tipoPrecio,
        precioProfesionalBloqueado: esPendienteAprobacion ? pss : null,
        stock: productoDB.stock,
        variantes: productoDB.variantes,
        activo: productoDB.activo,
        ordenVisualizacion: productoDB.ordenVisualizacion,
        destacado: productoDB.destacado,
        recomendado: productoDB.recomendado,
      }
    : {
        ...productoFallback!,
        precioVisible: precio,
        tipoPrecio,
        precioProfesionalBloqueado: esPendienteAprobacion ? pss : null,
      };

  // 4. Buscar productos relacionados de la misma categoría o complementarios
  let productosRelacionadosDTO: ProductoDTO[] = [];
  try {
    if (productoDB) {
      const productosRelacionadosDB = await prisma.producto.findMany({
        where: {
          activo: true,
          id: { not: productoDB.id },
          categoria: productoDB.categoria,
        },
        take: 3,
        orderBy: [
          { destacado: 'desc' },
          { ordenVisualizacion: 'asc' },
        ],
      });

      if (productosRelacionadosDB.length > 0) {
        productosRelacionadosDTO = productosRelacionadosDB.map((p: any) => {
          const { precio: pPrecio, tipoPrecio: pTipo } = determinarPrecioVisible(cliente, {
            precioPss: Number(p.precioPss),
            precioEcommerce: Number(p.precioEcommerce),
          });

          return {
            id: p.id,
            nombre: p.nombre.replace(/^\[TEST\]\s*/i, ''),
            categoria: p.categoria,
            subcategoria: p.subcategoria,
            descripcion: p.descripcion,
            modoUso: p.modoUso,
            rendimientoSalon: p.rendimientoSalon,
            imagen: p.imagen,
            presentacion: p.presentacion,
            precioPss: Number(p.precioPss),
            precioEcommerce: Number(p.precioEcommerce),
            precioVisible: pPrecio,
            tipoPrecio: pTipo,
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
    }
  } catch (errRel) {
    console.warn('Error al buscar productos relacionados:', errRel);
  }

  // Fallback para productos relacionados
  if (productosRelacionadosDTO.length === 0) {
    productosRelacionadosDTO = PRODUCTOS_REALES_STEFFEN
      .filter((p) => p.id !== productoDTO.id)
      .slice(0, 3)
      .map((p) => {
        const { precio: pPrecio, tipoPrecio: pTipo } = determinarPrecioVisible(cliente, {
          precioPss: p.precioPss,
          precioEcommerce: p.precioEcommerce,
        });
        return {
          ...p,
          precioVisible: pPrecio,
          tipoPrecio: pTipo,
          precioProfesionalBloqueado: esPendienteAprobacion ? p.precioPss : null,
        };
      });
  }

  // 5. Mapear comentarios
  const comentariosDTO: ComentarioDTO[] = ((productoDB?.comentarios || []) as any[]).map((c: any) => ({
    id: c.id,
    nombreSalon: c.nombreSalon || c.usuario?.cliente?.salon || '',
    nombreAutor: c.nombreAutor || c.usuario?.nombre || 'Profesional',
    localidad: c.localidad || '',
    calificacion: c.calificacion || c.puntuacion || 5,
    comentario: c.comentario || c.texto || '',
    verificado: c.verificado ?? true,
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
  }));

  const distribuidorAsignado = cliente?.zona?.distribuidor || null;
  const zonaCliente = cliente?.zona || null;
  const tieneDistribuidor = Boolean(distribuidorAsignado || zonaCliente?.distribuidorId || zonaCliente?.estado === 'CON_DISTRIBUIDOR');
  const esSinDistribuidor = Boolean(sesion && cliente && !tieneDistribuidor);
  const descuentoEstimadoPorcentaje = estadoNivel?.porcentajeActual || null;
  const esAdmin = sesion?.rol === 'ADMIN';

  const ubicacionPartes = [];
  if (cliente?.localidad?.trim()) ubicacionPartes.push(cliente.localidad.trim());
  if (cliente?.provincia?.trim()) ubicacionPartes.push(cliente.provincia.trim());
  const clienteUbicacion = ubicacionPartes.length > 0 ? ubicacionPartes.join(', ') : (esAdmin ? 'Buenos Aires, Argentina' : '');
  const clienteAutorNombre = cliente?.nombre?.trim() 
    ? `${cliente.nombre.trim()} ${cliente.apellido?.trim() || ''}`.trim() 
    : (esAdmin ? 'Equipo Técnico Steffen' : '');

  return (
    <div id="detalle-producto-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
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

        {/* Componente Cliente Detallado */}
        <DetalleProductoClient
          producto={productoDTO}
          productosRelacionados={productosRelacionadosDTO}
          comentariosIniciales={comentariosDTO}
          usuarioLogueado={!!sesion}
          estadoCliente={estadoCliente}
          salonNombre={salonNombre}
          clienteAutorNombre={clienteAutorNombre}
          clienteUbicacion={clienteUbicacion}
          esAdmin={esAdmin}
          descuentoEstimadoPorcentaje={descuentoEstimadoPorcentaje}
        />
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-500 border-t border-neutral-200 mt-12">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Venta Directa y Distribución a Salones Profesionales
      </footer>
    </div>
  );
}
