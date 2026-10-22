export interface PedidoItem {
  codigoRepuesto: string
  nombre: string
  cantidadSolicitada: number
  cantidadRecibida: number
}

export interface PedidoCompra {
  id: number
  codigo: string
  estado: string
  items: PedidoItem[]
}

export interface Ubicacion {
  codigo: string
  descripcion?: string
}

export interface RecepcionRequest {
  codigoRepuesto: string
  cantidadRecibida: number
  ubicacion: Ubicacion
}

export interface Repuesto {
  codigo: string
  nombre: string
  lote?: string
  stockFisico: number
  stockReservado: number
  stockDisponible: number
  umbralMinimo: number
  ubicacion?: Ubicacion
}

export interface RecepcionResponse {
  pedidoId: number
  cantidadRecibida: number
  repuesto: Repuesto
}

export interface ErrorResponse {
  mensaje: string
}