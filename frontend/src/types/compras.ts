export interface SolicitudCompraRequest {
  codigoRepuesto: string
  cantidadSolicitada: number
  motivo: string
}

export interface SolicitudPendiente {
  id: number
  cantidadSolicitada: number
  motivo: string
  usuarioSolicitanteId: number
}

export interface SolicitudCompra extends SolicitudCompraRequest {
  id: number
  estado: string
  usuarioSolicitanteId: number
}

export interface RepuestoListaCompras {
  codigo: string
  nombre: string
  stockFisico: number
  stockReservado: number
  stockDisponible: number
  umbralMinimo: number
  bajoUmbral: boolean
  solicitudesPendientes: SolicitudPendiente[]
}

export interface ListaCompras {
  total: number
  repuestos: RepuestoListaCompras[]
}

export type UrgenciaCompra = 'normal' | 'urgente'

export interface GenerarPedidoRequest {
  solicitudesIds: number[]
  urgencia: UrgenciaCompra
}

export interface PedidoGenerado {
  id: number
  codigo: string
  estado: string
  urgencia: UrgenciaCompra
  solicitudesIds: number[]
  items: Pick<SolicitudCompraRequest, 'codigoRepuesto' | 'cantidadSolicitada'>[]
  estadoNotificacion: 'no_requerida' | 'simulada' | 'error'
  notificaciones: {
    destinatario: string
    nombre: string
    asunto: string
    mensaje: string
    estado: 'simulada'
  }[]
}
