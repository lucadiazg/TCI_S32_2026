// Estados permitidos de una incidencia.
export type EstadoIncidencia =
  | 'reportada'
  | 'en_reparacion'
  | 'resuelta'

// Datos de una incidencia recibida del backend.
export interface Incidencia {
  id: number
  codigo: string | null
  codigo_maquina: string
  usuario_reportante_id: number | null
  descripcion: string
  estado: EstadoIncidencia
  turno: string
  fotos: string[]
  fecha_hora: string
  fecha_cierre: string | null
}

// Datos enviados para actualizar el estado.
export interface IncidenciaActualizarEstado {
  estado: EstadoIncidencia
}