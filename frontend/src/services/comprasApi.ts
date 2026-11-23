import { obtenerToken } from './authApi'
import type {
  GenerarPedidoRequest,
  ListaCompras,
  PedidoGenerado,
  SolicitudCompra,
  SolicitudCompraRequest,
} from '../types/compras'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001').replace(/\/$/, '')

const errores: Partial<Record<number, string>> = {
  400: 'Revisá los datos de la operación.',
  401: 'La sesión venció o no es válida. Volvé a iniciar sesión.',
  403: 'Tu usuario no tiene permiso para realizar esta operación.',
  404: 'No se encontró el registro solicitado.',
  409: 'La operación no se pudo completar con el estado actual.',
  422: 'Revisá los campos del formulario.',
}

// Las dos pantallas nuevas usan el mismo contrato de errores de FastAPI.
export async function consultarApiStock<T>(ruta: string, metodo: 'GET' | 'POST' = 'GET', cuerpo?: object): Promise<T> {
  const token = obtenerToken()
  if (!token) throw new Error(errores[401])

  const esEscritura = metodo === 'POST'
  let respuesta: Response
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    throw new Error(esEscritura
      ? 'Se perdió la conexión. Verificá el resultado antes de volver a enviar.'
      : 'No se pudo conectar con el servidor. Volvé a intentar.')
  }

  const datos = await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    const detalle = datos?.detail
    if (respuesta.status === 401 || respuesta.status === 403 || respuesta.status === 422) {
      throw new Error(errores[respuesta.status])
    }

    throw new Error(
      (typeof detalle === 'string' && detalle) ||
      (typeof datos?.mensaje === 'string' && datos.mensaje) ||
      errores[respuesta.status] ||
      `La solicitud falló con código ${respuesta.status}.`,
    )
  }

  if (!datos) {
    throw new Error(esEscritura
      ? 'El servidor confirmó la operación, pero no se pudo leer el comprobante. Verificá el resultado antes de volver a enviar.'
      : 'El servidor no devolvió una respuesta válida.')
  }

  return datos as T
}

export function obtenerListaCompras() {
  return consultarApiStock<ListaCompras>('/compras/lista')
}

export function solicitarCompra(datos: SolicitudCompraRequest) {
  return consultarApiStock<SolicitudCompra>('/compras/solicitudes', 'POST', datos)
}

export function generarPedido(datos: GenerarPedidoRequest) {
  return consultarApiStock<PedidoGenerado>('/compras/pedidos', 'POST', datos)
}
