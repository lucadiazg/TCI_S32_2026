import type {
  Incidencia,
  IncidenciaActualizarEstado,
} from '../types/incidencias'

import { obtenerToken } from './authApi'
import type { Reparacion } from '../types/repuestos'

const API_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:8001'
).replace(/\/$/, '')

// Realizar peticiones autenticadas al backend.
async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = obtenerToken()

  if (!token) {
    throw new Error('No hay una sesión activa.')
  }

  const headers = new Headers(options.headers)

  headers.set('Accept', 'application/json')
  headers.set('Authorization', `Bearer ${token}`)

  if (options.body) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      typeof data?.detail === 'string'
        ? data.detail
        : `La solicitud falló con código ${response.status}`,
    )
  }

  return data as T
}

// Listar las incidencias registradas.
export function listarIncidencias(): Promise<Incidencia[]> {
  return apiRequest<Incidencia[]>('/api/incidencias/')
}

// Consultar una incidencia específica.
export function obtenerIncidencia(
  incidenciaId: number,
): Promise<Incidencia> {
  return apiRequest<Incidencia>(
    `/api/incidencias/${incidenciaId}`,
  )
}

// Actualizar el estado de una incidencia.
export function actualizarEstadoIncidencia(
  incidenciaId: number,
  datos: IncidenciaActualizarEstado,
): Promise<Incidencia> {
  return apiRequest<Incidencia>(
    `/api/incidencias/${incidenciaId}/estado`,
    {
      method: 'PATCH',
      body: JSON.stringify(datos),
    },
  )
}
// Iniciar una reparación asociada a una incidencia.
export function iniciarReparacion(
  incidenciaId: number,
): Promise<Reparacion> {
  return apiRequest<Reparacion>(
    '/reparaciones',
    {
      method: 'POST',
      body: JSON.stringify({ incidenciaId }),
    },
  )
}