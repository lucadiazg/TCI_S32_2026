export interface EstadisticasGerencia {
  incidenciasAbiertas: number
  repuestosBajoUmbral: number
  pedidosPendientes: number
  reservasActivas: number
  unidadesConsumidas: number
  incidenciasCerradas: number
  pedidosCompletos: number
  agrupacionIncidencias: 'dia' | 'semana' | 'mes'
  evolucionIncidencias: EvolucionIncidencias[]
  incidenciasPorTurno: IncidenciasPorTurno[]
}
export interface EvolucionIncidencias {
  fecha: string
  reportadas: number
  cerradas: number
}

export interface IncidenciasPorTurno {
  turno: string
  cantidad: number
}