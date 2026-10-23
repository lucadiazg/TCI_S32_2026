export type { Repuesto } from './pedidos'

export interface Reparacion {
  id: number
  incidenciaId: number
  codigoIncidencia: string
  codigoMaquina: string
  estado: string
}

export interface UsoRepuestoRequest {
  codigoRepuesto: string
  cantidad: number
}

export interface UsoRepuestoResponse {
  reparacionId: number
  codigoRepuesto: string
  cantidad: number
  stockFisico: number
  stockDisponible: number
  alertaUmbral: boolean
}

export interface ErrorResponse {
  mensaje: string
}