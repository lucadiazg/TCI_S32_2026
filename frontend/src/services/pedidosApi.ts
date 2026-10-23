import type {
  ErrorResponse,
  PedidoCompra,
  RecepcionRequest,
  RecepcionResponse,
} from '../types/pedidos'

const API_URL = (
  import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4010'
).replace(/\/$/, '')

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
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

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const errorData = data as ErrorResponse | null

    throw new HttpError(
      response.status,
      errorData?.mensaje ??
        `La solicitud falló con código ${response.status}`,
    )
  }

  return data as T
}

export function listarPedidos(): Promise<PedidoCompra[]> {
  return apiRequest<PedidoCompra[]>('/pedidos')
}

export function obtenerPedido(
  pedidoId: number,
): Promise<PedidoCompra> {
  return apiRequest<PedidoCompra>(`/pedidos/${pedidoId}`)
}

export function registrarRecepcion(
  pedidoId: number,
  recepcion: RecepcionRequest,
): Promise<RecepcionResponse> {
  const estadoForzado = import.meta.env.DEV
    ? import.meta.env.VITE_PRISM_STATUS
    : ''

  const query = estadoForzado
    ? `?__code=${estadoForzado}`
    : ''

  return apiRequest<RecepcionResponse>(
    `/pedidos/${pedidoId}/recepciones${query}`,
    {
      method: 'POST',
      body: JSON.stringify(recepcion),
    },
  )
}