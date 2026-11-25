import { obtenerToken } from './authApi'
import type { EstadisticasGerencia } from '../types/gerencia'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001').replace(/\/$/, '')

const campos = [
  'incidenciasAbiertas',
  'repuestosBajoUmbral',
  'pedidosPendientes',
  'reservasActivas',
  'unidadesConsumidas',
] as const satisfies readonly (keyof EstadisticasGerencia)[]

function sonEstadisticas(datos: unknown): datos is EstadisticasGerencia {
  if (typeof datos !== 'object' || datos === null) return false

  return campos.every((campo) => {
    const valor = (datos as Record<string, unknown>)[campo]
    return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 0
  })
}

// null representa el 404 del endpoint todavía no disponible.
export async function obtenerEstadisticasGerencia(signal?: AbortSignal): Promise<EstadisticasGerencia | null> {
  const token = obtenerToken()
  const mensajeSesion = 'Tu sesión venció o no es válida. Volvé a iniciar sesión.'

  if (!token) throw new Error(mensajeSesion)

  let respuesta: Response
  try {
    respuesta = await fetch(`${API_URL}/gerencia/estadisticas`, {
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
  if (!sonEstadisticas(datos)) throw new Error('El servidor no devolvió los cinco indicadores en el formato esperado.')
  return datos
}
