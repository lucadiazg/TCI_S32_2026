import { obtenerToken } from './authApi'
import type { EstadisticasGerencia } from '../types/gerencia'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001').replace(/\/$/, '')

const campos = [
  'incidenciasAbiertas',
  'repuestosBajoUmbral',
  'pedidosPendientes',
  'reservasActivas',
  'unidadesConsumidas',
  'incidenciasCerradas',
  'pedidosCompletos',
] as const satisfies readonly (keyof EstadisticasGerencia)[]

// Validar cantidades enteras no negativas
function esCantidad(valor: unknown): valor is number {
  return typeof valor === 'number' &&
    Number.isSafeInteger(valor) &&
    valor >= 0
}

// Validar los datos del gráfico de evolución
function esEvolucion(valor: unknown): boolean {
  if (typeof valor !== 'object' || valor === null) return false

  const dato = valor as Record<string, unknown>

  return typeof dato.fecha === 'string' &&
    esCantidad(dato.reportadas) &&
    esCantidad(dato.cerradas)
}

// Validar los datos del gráfico por turno
function esTurno(valor: unknown): boolean {
  if (typeof valor !== 'object' || valor === null) return false

  const dato = valor as Record<string, unknown>

  return typeof dato.turno === 'string' &&
    ['mañana', 'tarde', 'noche'].includes(dato.turno) &&
    esCantidad(dato.cantidad)
}

function sonEstadisticas(datos: unknown): datos is EstadisticasGerencia {
  if (typeof datos !== 'object' || datos === null) return false

  const estadisticas = datos as Record<string, unknown>

  return campos.every((campo) => esCantidad(estadisticas[campo])) &&
    ['dia', 'semana', 'mes'].includes(String(estadisticas.agrupacionIncidencias)) &&
    Array.isArray(estadisticas.evolucionIncidencias) &&
    estadisticas.evolucionIncidencias.every(esEvolucion) &&
    Array.isArray(estadisticas.incidenciasPorTurno) &&
    estadisticas.incidenciasPorTurno.every(esTurno)
}

// null representa el 404 del endpoint todavía no disponible.
export async function obtenerEstadisticasGerencia(
  signal?: AbortSignal,
  desde?: string,
  hasta?: string
): Promise<EstadisticasGerencia | null> {
  const token = obtenerToken()
  const mensajeSesion = 'Tu sesión venció o no es válida. Volvé a iniciar sesión.'

  if (!token) throw new Error(mensajeSesion)

  // Construir los parámetros del filtro temporal
  const parametros = new URLSearchParams()

  if (desde) parametros.set('desde', desde)
  if (hasta) parametros.set('hasta', hasta)

  const consulta = parametros.toString()
  const url = `${API_URL}/gerencia/estadisticas${consulta ? `?${consulta}` : ''}`

  let respuesta: Response
  try {
    respuesta = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('No se pudo conectar con el servidor. Volvé a intentar.')
  }

  if (respuesta.status === 404) return null
  if (respuesta.status === 401) throw new Error(mensajeSesion)
  if (respuesta.status === 403) throw new Error('Tu usuario no tiene permiso para consultar las estadísticas.')
  if (!respuesta.ok) throw new Error(`No se pudieron consultar las estadísticas (HTTP ${respuesta.status}).`)

  const datos: unknown = await respuesta.json().catch(() => null)
  if (!sonEstadisticas(datos)) throw new Error('El servidor no devolvió los indicadores en el formato esperado.')
  return datos
}
