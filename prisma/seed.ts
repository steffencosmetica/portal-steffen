// Script de datos iniciales / Seed para desarrollo
// Contiene las Reglas de Descuento por defecto y productos ficticios con prefijo [TEST].

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de datos para Portal Profesional Steffen...');

  // 1. Reglas de Descuento iniciales (configuración en base de datos, editable desde /admin)
  // Requerimientos:
  // - Primer pedido: 20% OFF (sin importar zona)
  // - Reposición 0–40 días desde última compra completada: 25% OFF
  // - Reposición 41–55 días desde última compra completada: 15% OFF
  // - > 55 días: Sin beneficio (0%)
  console.log('Creando reglas de descuento...');
  
  await prisma.reglaDeDescuento.createMany({
    data: [
      {
        tipo: 'PRIMER_PEDIDO',
        porcentaje: 20.0,
        activa: true,
        orden: 1,
      },
      {
        tipo: 'REPOSICION',
        diasDesde: 0,
        diasHasta: 40,
        porcentaje: 25.0,
        activa: true,
        orden: 2,
      },
      {
        tipo: 'REPOSICION',
        diasDesde: 41,
        diasHasta: 55,
        porcentaje: 15.0,
        activa: true,
        orden: 3,
      },
    ],
    skipDuplicates: true,
  });

  // 2. Zonas de prueba
  console.log('Creando zonas de prueba...');
  await prisma.zona.createMany({
    data: [
      {
        provincia: 'Buenos Aires',
        localidad: 'Junín',
        estado: 'SIN_DISTRIBUIDOR',
      },
      {
        provincia: 'Córdoba',
        localidad: 'Río Cuarto',
        estado: 'COBERTURA_PARCIAL',
      },
      {
        provincia: 'Santa Fe',
        localidad: 'Rosario',
        estado: 'CON_DISTRIBUIDOR',
      },
    ],
    skipDuplicates: true,
  });

  // 3. Productos de catálogo de prueba [TEST]
  console.log('Creando productos de prueba [TEST]...');
  await prisma.producto.createMany({
    data: [
      {
        nombre: '[TEST] Sérum Reparador de Puntas Selladas',
        categoria: 'Sérums y Cristales',
        subcategoria: 'Finalizadores',
        descripcion: 'Tratamiento sellador intensivo con siliconas nobles para puntas abiertas y cabellos dañados.',
        imagen: 'https://picsum.photos/seed/steffen-serum/600/600',
        presentacion: '60 ml',
        precioPss: 12500,
        stock: 50,
        activo: true,
        destacado: true,
        recomendado: true,
        ordenVisualizacion: 1,
      },
      {
        nombre: '[TEST] Shampoo Ácido pH 4.5 Post-Técnico',
        categoria: 'Shampoo',
        subcategoria: 'Técnicos',
        descripcion: 'Fórmula niveladora de cutículas para aplicar luego de procesos de coloración o decoloración.',
        imagen: 'https://picsum.photos/seed/steffen-shampoo/600/600',
        presentacion: '1000 ml',
        precioPss: 18900,
        stock: 40,
        activo: true,
        destacado: true,
        recomendado: false,
        ordenVisualizacion: 2,
      },
      {
        nombre: '[TEST] Máscara Nutritiva Caviar y Keratina',
        categoria: 'Tratamientos',
        subcategoria: 'Máscaras',
        descripcion: 'Baño de crema hiper-nutritivo con extracto de caviar y aminoácidos para cabellos secos o porosos.',
        imagen: 'https://picsum.photos/seed/steffen-mask/600/600',
        presentacion: 'Pote 500 g',
        precioPss: 22400,
        stock: 35,
        activo: true,
        destacado: true,
        recomendado: true,
        ordenVisualizacion: 3,
      },
      {
        nombre: '[TEST] Acondicionador Desenredante Bifásico',
        categoria: 'Bi-phase',
        subcategoria: 'Desenredantes',
        descripcion: 'Spray bifásico liviano con filtro solar UV y siliconas volátiles para protección térmica diaria.',
        imagen: 'https://picsum.photos/seed/steffen-biphase/600/600',
        presentacion: '250 ml',
        precioPss: 14200,
        stock: 60,
        activo: true,
        destacado: false,
        recomendado: true,
        ordenVisualizacion: 4,
      },
      {
        nombre: '[TEST] Cera Modeladora Efecto Mate',
        categoria: 'Ceras',
        subcategoria: 'Styling',
        descripcion: 'Fijación media flexible sin brillo para acabados texturados y cortes modernos.',
        imagen: 'https://picsum.photos/seed/steffen-wax/600/600',
        presentacion: 'Pote 100 g',
        precioPss: 11800,
        stock: 25,
        activo: true,
        destacado: false,
        recomendado: false,
        ordenVisualizacion: 5,
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed finalizado con éxito.');
}

main()
  .catch((e) => {
    console.error('Error durante la ejecución del seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
