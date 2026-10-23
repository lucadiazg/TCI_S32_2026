import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  HttpError,
  listarPedidos,
  obtenerPedido,
  registrarRecepcion,
} from '../services/pedidosApi'
import type { PedidoCompra } from '../types/pedidos'

function mensajeDeError(error: unknown): string {
  if (error instanceof HttpError) {
    switch (error.status) {
      case 400:
        return `Datos inválidos: ${error.message}`
      case 404:
        return `No encontrado: ${error.message}`
      case 409:
        return `No se pudo registrar la recepción: ${error.message}`
      default:
        return error.message
    }
  }

  return 'No se pudo conectar con el servidor.'
}

export default function CargarStockRecibido() {
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([])
  const [pedido, setPedido] = useState<PedidoCompra | null>(null)
  const [pedidoId, setPedidoId] = useState('')
  const [codigoRepuesto, setCodigoRepuesto] = useState('')
  const [cantidadRecibida, setCantidadRecibida] = useState('')
  const [ubicacion, setUbicacion] = useState('')

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  useEffect(() => {
    async function cargarPedidos() {
      try {
        setCargando(true)
        setError('')

        const lista = await listarPedidos()
        setPedidos(lista)

        if (lista.length > 0) {
          const primerPedido = lista[0]
          const detalle = await obtenerPedido(primerPedido.id)

          setPedidoId(String(primerPedido.id))
          setPedido(detalle)
          setCodigoRepuesto(
            detalle.items[0]?.codigoRepuesto ?? '',
          )
        }
      } catch (errorDesconocido) {
        setError(mensajeDeError(errorDesconocido))
      } finally {
        setCargando(false)
      }
    }

    cargarPedidos()
  }, [])

  async function cambiarPedido(nuevoPedidoId: string) {
    setPedidoId(nuevoPedidoId)
    setPedido(null)
    setCodigoRepuesto('')
    setError('')
    setExito('')

    if (!nuevoPedidoId) {
      return
    }

    try {
      setCargando(true)

      const detalle = await obtenerPedido(
        Number(nuevoPedidoId),
      )

      setPedido(detalle)
      setCodigoRepuesto(
        detalle.items[0]?.codigoRepuesto ?? '',
      )
    } catch (errorDesconocido) {
      setError(mensajeDeError(errorDesconocido))
    } finally {
      setCargando(false)
    }
  }

  async function enviarFormulario(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault()
    setError('')
    setExito('')

    const cantidad = Number(cantidadRecibida)

    if (!pedido) {
      setError('Seleccioná una orden de compra.')
      return
    }

    if (!codigoRepuesto) {
      setError('Seleccioná un repuesto.')
      return
    }

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      setError(
        'La cantidad recibida debe ser un número entero mayor que cero.',
      )
      return
    }

    if (!ubicacion.trim()) {
      setError('Ingresá el código de ubicación.')
      return
    }

    try {
      setGuardando(true)

await registrarRecepcion(
  pedido.id,
  {
    codigoRepuesto,
    cantidadRecibida: cantidad,
    ubicacion: {
      codigo: ubicacion.trim(),
    },
  },
)

setExito(
  `Recepción registrada correctamente. Se recibieron ${cantidad} unidades.`,
)

      setCantidadRecibida('')
      setUbicacion('')
    } catch (errorDesconocido) {
      setError(mensajeDeError(errorDesconocido))
    } finally {
      setGuardando(false)
    }
  }

  const repuestoSeleccionado = pedido?.items.find(
    (item) => item.codigoRepuesto === codigoRepuesto,
  )

  const cantidadPendiente = repuestoSeleccionado
    ? repuestoSeleccionado.cantidadSolicitada -
      repuestoSeleccionado.cantidadRecibida
    : 0

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <section className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className="text-sm font-semibold text-blue-600">
            PharmaStock
          </p>

          <h1 className="text-3xl font-bold">
            Cargar stock recibido
          </h1>

          <p className="mt-2 text-slate-600">
            Registrá los repuestos recibidos de una orden de
            compra.
          </p>
        </header>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-5 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {exito && (
            <div className="mb-5 rounded-lg border border-green-300 bg-green-50 p-4 text-green-700">
              {exito}
            </div>
          )}

          <form
            className="space-y-5"
            onSubmit={enviarFormulario}
          >
            <div>
              <label
                className="mb-2 block font-medium"
                htmlFor="pedido"
              >
                Orden de compra
              </label>

              <select
                id="pedido"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                value={pedidoId}
                onChange={(evento) =>
                  cambiarPedido(evento.target.value)
                }
                disabled={cargando}
              >
                <option value="">
                  Seleccionar una orden
                </option>

                {pedidos.map((pedidoDisponible) => (
                  <option
                    key={pedidoDisponible.id}
                    value={pedidoDisponible.id}
                  >
                    {pedidoDisponible.codigo}
                  </option>
                ))}
              </select>
            </div>

            {pedido && (
              <div className="rounded-lg bg-slate-50 p-4">
                <p>
                  <strong>Orden:</strong> {pedido.codigo}
                </p>

                <p>
                  <strong>Estado:</strong> {pedido.estado}
                </p>
              </div>
            )}

            <div>
              <label
                className="mb-2 block font-medium"
                htmlFor="repuesto"
              >
                Repuesto
              </label>

              <select
                id="repuesto"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                value={codigoRepuesto}
                onChange={(evento) =>
                  setCodigoRepuesto(evento.target.value)
                }
                disabled={!pedido || cargando}
              >
                <option value="">
                  Seleccionar un repuesto
                </option>

                {pedido?.items.map((item) => (
                  <option
                    key={item.codigoRepuesto}
                    value={item.codigoRepuesto}
                  >
                    {item.codigoRepuesto} - {item.nombre}
                  </option>
                ))}
              </select>
            </div>

            {repuestoSeleccionado && (
              <div className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-3">
                <p>
                  <span className="block text-sm text-slate-500">
                    Solicitadas
                  </span>
                  <strong>
                    {repuestoSeleccionado.cantidadSolicitada}
                  </strong>
                </p>

                <p>
                  <span className="block text-sm text-slate-500">
                    Ya recibidas
                  </span>
                  <strong>
                    {repuestoSeleccionado.cantidadRecibida}
                  </strong>
                </p>

                <p>
                  <span className="block text-sm text-slate-500">
                    Pendientes
                  </span>
                  <strong>{cantidadPendiente}</strong>
                </p>
              </div>
            )}

            <div>
              <label
                className="mb-2 block font-medium"
                htmlFor="cantidad"
              >
                Cantidad recibida
              </label>

              <input
                id="cantidad"
                type="number"
                min="1"
                step="1"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={cantidadRecibida}
                onChange={(evento) =>
                  setCantidadRecibida(evento.target.value)
                }
                placeholder="Ejemplo: 5"
              />
            </div>

            <div>
              <label
                className="mb-2 block font-medium"
                htmlFor="ubicacion"
              >
                Código de ubicación
              </label>

              <input
                id="ubicacion"
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={ubicacion}
                onChange={(evento) =>
                  setUbicacion(evento.target.value)
                }
                placeholder="Ejemplo: A-01-03"
              />
            </div>

            <button
              type="submit"
              disabled={guardando || cargando}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {guardando
                ? 'Registrando...'
                : 'Confirmar recepción'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}