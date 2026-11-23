export interface CrearReservaRequest {
  codigoRepuesto: string
  cantidad: number
  motivo: string
}

interface StockReserva {
  stockFisico: number
  stockReservado: number
  stockDisponible: number
}

export interface ReservaCreada extends CrearReservaRequest, StockReserva {
  id: number
  estado: string
}

export interface ReservaLiberada extends StockReserva {
  reservaId: number
  estado: string
  autorizadaPor: number
  codigoRepuesto: string
  cantidadLiberada: number
  notificaciones: {
    destinatario: string
    nombre: string
    asunto: string
    mensaje: string
    estado: 'simulada'
  }[]
}
