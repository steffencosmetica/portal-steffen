import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { CatalogoClient } from '@/components/catalogo/CatalogoClient';
import { ProductoDTO } from '@/components/catalogo/ProductoCard';
import { PackDTO } from '@/components/catalogo/PackCard';
import { SiteHeader } from '@/components/SiteHeader';
import { DistribuidorBanner } from '@/components/DistribuidorBanner';
import { obtenerSesionCliente } from '@/lib/services/session';
import { obtenerEstadoNivelCliente } from '@/lib/services/nivelCliente';
import { determinarPrecioVisible } from '@/lib/services/precios';
import { calcularDisponibilidadPack, obtenerPrecioPackParaCliente } from '@/lib/services/packs';
import { NivelClienteCard } from '@/components/NivelClienteCard';
import { AlertaCuentaAprobadaModal } from '@/components/AlertaCuentaAprobadaModal';
import { PRODUCTOS_REALES_STEFFEN } from '@/lib/constants/productos-reales-steffen';
import { ShieldAlert, Truck, ShoppingBag } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CatalogoPage() {
  // 1. Obtener sesión del cliente (si existe) sin bloquear acceso público
  let sesion = null;
  let estadoNivel = null;
  try {
    sesion = await obtenerSesionCliente();
    if (sesion?.cliente) {
      estadoNivel = await obtenerEstadoNivelCliente(sesion.cliente);
    }
  } catch (err) {
    console.error('Error al obtener sesión en CatalogoPage:', err);
  }

  const cliente = sesion?.cliente || null;
  const usuarioId = sesion?.usuario?.id || '';
  const salonNombre = cliente?.salon || '';
  const estadoCliente = sesion?.estadoCliente || null;
  const esActivo = estadoCliente === 'ACTIVO';
  const esPendienteAprobacion = !!sesion && cliente?.estadoCliente === 'PENDIENTE_APROBACION';

  // 2. Fetch server-side de productos activos ordenados por ordenVisualizacion con manejo de errores seguro
  let productos: ProductoDTO[] = [];
  let packs: PackDTO[] = [];

  try {
    const productosDB = await prisma.producto.findMany({
      where: {
        activo: true,
      },
      orderBy: {
        ordenVisualizacion: 'asc',
      },
    });

    if (productosDB.length > 0) {
      productos = (productosDB as any[]).map((p) => {
        const { precio, tipoPrecio } = determinarPrecioVisible(cliente, {
          precioPss: Number(p.precioPss),
          precioEcommerce: Number(p.precioEcommerce),
        });

        return {
          id: p.id,
          nombre: p.nombre,
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
    } else {
      // Si la base de datos está vacía, usar el catálogo de productos reales de Steffen
      productos = PRODUCTOS_REALES_STEFFEN.map((p) => {
        const { precio, tipoPrecio } = determinarPrecioVisible(cliente, {
          precioPss: p.precioPss,
          precioEcommerce: p.precioEcommerce,
        });
        return {
          ...p,
          precioVisible: precio,
          tipoPrecio,
          precioProfesionalBloqueado: esPendienteAprobacion ? p.precioPss : null,
        };
      });
    }

    // 4. Fetch de Packs activos
    const packsDB = (await prisma.pack.findMany({
      where: {
        activo: true,
      },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
      },
      orderBy: [
        { destacado: 'desc' },
        { createdAt: 'desc' },
      ],
    })) as any[];

    packs = await Promise.all(
      packsDB.map(async (p: any) => {
        const disp = await calcularDisponibilidadPack(p.id);
        const precioCalc = obtenerPrecioPackParaCliente(p, cliente);

        return {
          id: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion,
          imagen: p.imagen,
          etiqueta:
            p.etiqueta === 'Vender más en mi salón'
              ? 'Reventa'
              : p.etiqueta === 'Rutinas segun necesidad'
              ? 'Rutinas de tratamiento'
              : p.etiqueta || null,
          precioPromocional: precioCalc.precioFinal,
          precioPssEquivalente: precioCalc.precioOriginalTachado,
          descuento: precioCalc.porcentajeDescuento,
          destacado: p.destacado,
          disponible: disp.disponible,
          motivoNoDisponible: disp.motivo,
          items: ((p.items || []) as any[]).map((it: any) => ({
            productoId: it.productoId,
            nombre: it.producto?.nombre || '',
            presentacion: it.producto?.presentacion || '',
            cantidad: it.cantidad,
            codigo: it.producto?.codigo || null,
            imagen: it.producto?.imagen || null,
            precioUnitario: it.producto?.precioPss ? Number(it.producto.precioPss) : null,
            precioEcommerce: it.producto?.precioEcommerce ? Number(it.producto.precioEcommerce) : null,
            precioReventa: it.producto?.precioReventa ? Number(it.producto.precioReventa) : null,
          })),
        };
      })
    );
  } catch (dbError) {
    console.error('Error al conectar con la base de datos en CatalogoPage:', dbError);
    // En caso de error de conexión a la base de datos, fallback con catálogo oficial de Steffen
    productos = PRODUCTOS_REALES_STEFFEN.map((p) => {
      const { precio, tipoPrecio } = determinarPrecioVisible(cliente, {
        precioPss: p.precioPss,
        precioEcommerce: p.precioEcommerce,
      });
      return {
        ...p,
        precioVisible: precio,
        tipoPrecio,
        precioProfesionalBloqueado: esPendienteAprobacion ? p.precioPss : null,
      };
    });
  }

  const distribuidorAsignado = cliente?.zona?.distribuidor || null;
  const zonaCliente = cliente?.zona || null;
  const tieneDistribuidor = Boolean(distribuidorAsignado || zonaCliente?.distribuidorId || zonaCliente?.estado === 'CON_DISTRIBUIDOR');
  const esSinDistribuidor = Boolean(sesion && cliente && !tieneDistribuidor);

  return (
    <div id="catalogo-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
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

      {/* Barra superior */}
      <SiteHeader
        salonNombre={salonNombre}
        usuarioId={usuarioId}
        sesion={!!sesion}
        esAdmin={sesion?.rol === 'ADMIN'}
        paginaActual="catalogo"
        mostrarCatalogo={false}
        sinDistribuidorAsignado={esSinDistribuidor}
      />

      {/* Contenido Principal: Catálogo */}
      <main className="max-w-7xl mx-auto w-full py-8 space-y-6">
        {/* Modal de Alerta de Cuenta Aprobada / Habilitación de Precio Profesional */}
        <AlertaCuentaAprobadaModal 
          initialOpen={cliente?.estadoCliente === 'ACTIVO' && cliente?.alertaAprobacionVista === false}
          salonNombre={cliente?.salon}
          nombreCliente={cliente?.nombre}
          tieneDistribuidor={tieneDistribuidor}
        />

        {/* Banner/Tarjeta de Beneficios / Reposición */}
        <NivelClienteCard
          estadoNivel={estadoNivel}
          estadoCliente={cliente?.estadoCliente}
          mostrarBotonCatalogo={false}
        />

        {/* Banner de Envío Gratis exclusivo para clientes en sesión sin distribuidor asignado */}
        {esSinDistribuidor && (
          <div
            id="banner-catalogo-envio-gratis"
            className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-emerald-950">
                    Envío gratis superando los $250.000
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                    Venta Directa Fábrica
                  </span>
                </div>
                <p className="text-xs text-emerald-800 font-normal leading-relaxed">
                  Como salón profesional sin distribuidor asignado en tu zona, tus pedidos superiores a $250.000 cuentan con despacho 100% bonificado directo a tu salón.
                </p>
              </div>
            </div>
            <Link
              href="/carrito"
              id="btn-catalogo-ir-carrito-envio-gratis"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-100/60 border border-emerald-300 px-3.5 py-2 rounded-xl transition-all shadow-xs shrink-0 self-start sm:self-auto"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
              <span>Ver Carrito</span>
            </Link>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
              Catálogo de Cosmética Capilar
            </h1>
            {estadoCliente && estadoCliente !== 'ACTIVO' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                Cuenta {estadoCliente === 'PENDIENTE_APROBACION' ? 'Pendiente de Aprobación' : 'Inactiva'}
              </span>
            )}
          </div>
          <p className="text-neutral-500 text-sm">
            {esActivo
              ? 'Precios salón profesional directos de fábrica en pesos argentinos para tu salón. Seleccioná las cantidades para armar tu pedido.'
              : 'Precios públicos sugeridos de referencia. Registrate o iniciá sesión como salón profesional para acceder a precios mayoristas directos de fábrica.'}
          </p>
        </div>

        <Suspense fallback={<div className="py-12 text-center text-sm text-neutral-400">Cargando catálogo...</div>}>
          <CatalogoClient
            productosIniciales={productos}
            packsIniciales={packs}
            salonNombre={salonNombre}
            usuarioId={usuarioId}
            usuarioLogueado={!!sesion}
            estadoCliente={estadoCliente}
            esSinDistribuidor={esSinDistribuidor}
          />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full py-4 text-center text-xs text-neutral-500 border-t border-neutral-200">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Portal Profesional
      </footer>
    </div>
  );
}
