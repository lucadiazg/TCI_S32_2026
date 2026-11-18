
import type {
  Reparacion,
  Repuesto,
  UsoRepuestoRequest,
  UsoRepuestoResponse,
  ErrorResponse,
} from '../types/repuestos'

import { obtenerToken } from './authApi'

const API_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:8001'
).replace(/\/$/, '')

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)

  headers.set('Accept', 'application/json')

  if (options.body) {
    headers.set('Content-Type', 'application/json')
  }

  // Recuperar el JWT del usuario autenticado.
  const token = obtenerToken()

  if (!token) {
    throw new HttpError(
      401,
      'No hay una sesión activa. Cerrá sesión y volvé a ingresar.',
    )
  }

  // Enviar el JWT a FastAPI.
  headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401) {
      throw new HttpError(
        401,
        'La sesión venció o no es válida. Volvé a iniciar sesión.',
      )
    }

    if (response.status === 403) {
      throw new HttpError(
        403,
        'Tu usuario no tiene permiso para realizar esta operación.',
      )
    }

    const errorData = data as ErrorResponse | null

    throw new HttpError(
      response.status,
      errorData?.mensaje ??
        `La solicitud falló con código ${response.status}`,
    )
  }

  return data as T
}


// Listar reparaciones disponibles.
export function listarReparaciones(): Promise<Reparacion[]> {
  return apiRequest<Reparacion[]>('/reparaciones')
}


// Obtener una reparación específica.
export function obtenerReparacion(
  reparacionId: number,
): Promise<Reparacion> {
  return apiRequest<Reparacion>(
    `/reparaciones/${reparacionId}`,
  )
}


// Consultar un repuesto por código.
export function obtenerRepuesto(
  codigo: string,
): Promise<Repuesto> {
  return apiRequest<Repuesto>(
    `/repuestos/${encodeURIComponent(codigo)}`,
  )
}


// Registrar consumo de un repuesto.
export function registrarUsoRepuesto(
  reparacionId: number,
  uso: UsoRepuestoRequest,
): Promise<UsoRepuestoResponse> {
  return apiRequest<UsoRepuestoResponse>(
    `/reparaciones/${reparacionId}/usos`,
    {
      method: 'POST',
      body: JSON.stringify(uso),
    },
  )
}
