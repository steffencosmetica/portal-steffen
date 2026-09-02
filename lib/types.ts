export type Rol = 'CLIENTE_PROFESIONAL' | 'ADMIN';
export type EstadoCliente = 'PENDIENTE_APROBACION' | 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
export type EstadoZona = 'SIN_DISTRIBUIDOR' | 'COBERTURA_PARCIAL' | 'CON_DISTRIBUIDOR';
export type TipoDescuento = 'PRIMER_PEDIDO' | 'REPOSICION';
export type EstadoPedido =
  | 'CARRITO'
  | 'PEDIDO_RECIBIDO'
  | 'CONTACTADO'
  | 'PAGO_PENDIENTE'
  | 'PAGADO'
  | 'PREPARANDO'
  | 'DESPACHADO'
  | 'COMPLETADO'
  | 'CANCELADO';

export interface ProductoCatalogItem {
  id: string;
  nombre: string;
  categoria: string;
  subcategoria?: string | null;
  descripcion: string;
  imagen: string;
  presentacion: string;
  precioPss: number;
  stock: number;
  variantes?: string | null;
  activo: boolean;
  destacado: boolean;
  recomendado: boolean;
}

export interface PackCatalogItem {
  id: string;
  nombre: string;
  descripcion: string;
  imagen: string;
  precioPssEquivalente: number;
  precioPromocional: number;
  descuento: number;
  activo: boolean;
  destacado: boolean;
}

export interface ReglaDescuentoConfig {
  id: string;
  tipo: TipoDescuento;
  montoDesde: number;
  montoHasta?: number | null;
  porcentaje: number;
  activa: boolean;
  orden: number;
}

export interface CartItem {
  id: string;
  tipo: 'producto' | 'pack';
  nombre: string;
  presentacion?: string;
  variante?: string | null;
  imagen: string;
  precioUnitarioPss: number;
  cantidad: number;
  subtotal: number;
}

export interface CalculoPedidoResult {
  subtotalPss: number;
  porcentajeDescuento: number;
  montoDescuento: number;
  totalFinal: number;
  tipoDescuentoAplicado: TipoDescuento | 'SIN_DESCUENTO';
  reglaAplicadaId?: string;
  textoAvisoEnvio: string;
}
