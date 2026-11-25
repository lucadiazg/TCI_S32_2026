import { consultarApiStock } from './comprasApi'
import type { CrearReservaRequest, ReservaCreada, ReservaLiberada } from '../types/reservas'

export function crearReserva(datos: CrearReservaRequest) {
  return consultarApiStock<ReservaCreada>('/reservas', 'POST', datos)
}

export function liberarReserva(id: number) {
  return consultarApiStock<ReservaLiberada>(`/reservas/${id}/liberar`, 'POST')
}
