import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  HttpError,
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
  const [pedido, setPedido] = useState<PedidoCompra | null>(null)
  const [pedidoId, setPedidoId] = useState('')
  const [codigoRepuesto, setCodigoRepuesto] = useState('')
  const [cantidadRecibida, setCantidadRecibida] = useState('')
  const [ubicacion, setUbicacion] = useState('')

  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorPedido, setErrorPedido] = useState('')
  const [errorRepuesto, setErrorRepuesto] = useState('')
  const [errorCantidad, setErrorCantidad] = useState('')
  const [errorUbicacion, setErrorUbicacion] = useState('')
  const [errorGeneral, setErrorGeneral] = useState('')
  const [exito, setExito] = useState('')

  async function cambiarPedido(nuevoPedidoId: string) {
    setPedidoId(nuevoPedidoId)
    setPedido(null)
    setCodigoRepuesto('')
    setErrorPedido('')
    setErrorRepuesto('')
    setErrorCantidad('')
    setErrorUbicacion('')
    setErrorGeneral('')
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
      setErrorPedido(mensajeDeError(errorDesconocido))
    } finally {
      setCargando(false)
    }
  }

  async function enviarFormulario(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault()
    setErrorPedido('')
    setErrorRepuesto('')
    setErrorCantidad('')
    setErrorUbicacion('')
    setErrorGeneral('')
    setExito('')

    const cantidad = Number(cantidadRecibida)

    if (!pedido) {
      setErrorPedido('Seleccioná una orden de compra valida.')
      return
    }

    if (!codigoRepuesto) {
      setErrorRepuesto('Seleccioná un repuesto.')
      return
    }

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      setErrorCantidad(
        'La cantidad recibida debe ser un número entero mayor que cero.',
      )
      return
    }

    if (!ubicacion.trim()) {
      setErrorUbicacion('Ingresá el código de ubicación.')
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

const pedidoActualizado = await obtenerPedido(pedido.id)
setPedido(pedidoActualizado)

setExito(
  `Recepción registrada correctamente. Se recibieron ${cantidad} unidades.`,
)

      setCantidadRecibida('')
      setUbicacion('')
    } catch (errorDesconocido) {  if (errorDesconocido instanceof HttpError) {
        const mensaje = mensajeDeError(errorDesconocido)

        if (
          errorDesconocido.status === 400 &&
          errorDesconocido.message.includes('no pertenece')
        ) {
          setErrorRepuesto(mensaje)
        } else if (
          errorDesconocido.status === 400 &&
          errorDesconocido.message.includes('supera')
        ) {
          setErrorCantidad(mensaje)
        } else {
          setErrorGeneral(mensaje)
        }
      } else {
        setErrorGeneral(mensajeDeError(errorDesconocido))
      }
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
    <main className="min-h-screen bg-surface px-3 py-6 text-on-surface sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-xl border border-[#D5E2EF] border-l-4 border-l-primary bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">
            Encargado · Recepción de repuestos
          </p>

          <h1 className="mt-2 text-2xl font-bold text-on-surface sm:text-3xl">
            Cargar stock recibido
          </h1>

          <p className="mt-2 text-base text-on-surface-variant">
            Identificá la orden, seleccioná el repuesto y registrá las unidades recibidas.
          </p>
        </header>

        <div className="space-y-5">
          {errorGeneral && (
            <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 font-medium text-red-800">
              {errorGeneral}
            </div>
          )}

          {exito && (
            <div role="status" className="rounded-lg border border-green-300 bg-green-50 p-4 font-medium text-green-900">
              {exito}
            </div>
          )}

          <form
            className="space-y-5"
            onSubmit={enviarFormulario}
          >
            <section className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-5 text-lg font-bold text-on-surface">
                ORDEN DE COMPRA
              </h2>
              <label
                className="mb-2 block text-base font-semibold"
                htmlFor="pedido"
              >
                ID de orden de compra
              </label>

              <input
                id="pedido"
                type="number"
                min="1"
                step="1"
                className="min-h-12 w-full rounded-lg border border-outline bg-surface-container-low px-4 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                value={pedidoId}
                onChange={(evento) => {
                  setPedidoId(evento.target.value)
                  setPedido(null)
                  setCodigoRepuesto('')
                  setErrorPedido('')
                  setErrorRepuesto('')
                  setErrorCantidad('')
                  setErrorUbicacion('')
                  setErrorGeneral('')
                  setExito('')
                }}
                placeholder="Ingresá el ID de la orden. Ejemplo: 2"
              />

              <button
                type="button"
                onClick={() => cambiarPedido(pedidoId)}
                disabled={cargando || !pedidoId || !Number.isSafeInteger(Number(pedidoId)) || Number(pedidoId) <= 0}
                className="mt-3 min-h-12 w-full rounded-lg bg-primary px-5 py-3 text-base font-bold text-white hover:bg-[#004B76] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
              >
                {cargando ? 'Buscando...' : 'Buscar orden'}
              </button>

              {errorPedido && (
                <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
                  {errorPedido}
                </p>
              )}

              {pedido && (
                <div className="mt-5 rounded-xl border border-[#B8D7EB] bg-surface-container-low p-4 sm:p-5">
                  <p className="text-sm font-bold uppercase text-primary">ORDEN IDENTIFICADA</p>
                  <p className="mt-2 break-words text-xl font-bold text-on-surface">{pedido.codigo}</p>
                  <p className="mt-2 text-base text-on-surface-variant">
                    <strong>Estado:</strong> {pedido.estado}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-5 text-lg font-bold text-on-surface">
                IDENTIFICACIÓN DEL REPUESTO
              </h2>
              <label
                className="mb-2 block text-base font-semibold"
                htmlFor="repuesto"
              >
                Repuesto
              </label>

              <select
                id="repuesto"
                className="min-h-12 w-full rounded-lg border border-outline bg-white px-4 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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

              {errorRepuesto && (
                <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
                  {errorRepuesto}
                </p>
              )}

              {repuestoSeleccionado && (
                <div className="mt-5 rounded-xl bg-surface-container-low p-4 sm:p-5">
                  <p className="text-sm font-bold text-primary">REPUESTO SELECCIONADO</p>
                  <p className="mt-2 break-words text-xl font-bold">{repuestoSeleccionado.nombre}</p>
                  <p className="mt-1 break-all font-mono text-base text-on-surface-variant">
                    {repuestoSeleccionado.codigoRepuesto}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-[#D5E2EF] bg-white p-4">
                      <p className="text-sm font-semibold text-on-surface-variant">Solicitadas</p>
                      <p className="mt-2 text-2xl font-bold tabular-nums">
                        {repuestoSeleccionado.cantidadSolicitada}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#D5E2EF] bg-white p-4">
                      <p className="text-sm font-semibold text-on-surface-variant">Ya recibidas</p>
                      <p className="mt-2 text-2xl font-bold tabular-nums">
                        {repuestoSeleccionado.cantidadRecibida}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#B8D7EB] bg-white p-4">
                      <p className="text-sm font-bold text-[#004B76]">PENDIENTES</p>
                      <p className="mt-2 text-3xl font-extrabold tabular-nums">{cantidadPendiente}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-5 text-lg font-bold text-on-surface">
                CANTIDAD Y UBICACIÓN
              </h2>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    className="mb-2 block text-base font-semibold"
                    htmlFor="cantidad"
                  >
                    Cantidad recibida
                  </label>

                  <input
                    id="cantidad"
                    type="number"
                    min="1"
                    step="1"
                    className="min-h-12 w-full rounded-lg border border-outline bg-surface-container-low px-4 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    value={cantidadRecibida}
                    onChange={(evento) =>
                      setCantidadRecibida(evento.target.value)
                    }
                    placeholder="Ejemplo: 5"
                  />
                  {errorCantidad && (
                    <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
                      {errorCantidad}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className="mb-2 block text-base font-semibold"
                    htmlFor="ubicacion"
                  >
                    Código de ubicación
                  </label>

                  <input
                    id="ubicacion"
                    type="text"
                    className="min-h-12 w-full rounded-lg border border-outline bg-surface-container-low px-4 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    value={ubicacion}
                    onChange={(evento) =>
                      setUbicacion(evento.target.value)
                    }
                    placeholder="Ejemplo: A-01-03"
                  />

              {errorUbicacion && (
                <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
                  {errorUbicacion}
                </p>
              )}
              </div>
            </div>

              {repuestoSeleccionado && (
                <p className="mt-4 rounded-lg bg-surface-container-low p-3 text-base text-on-surface-variant">
                  <strong>Pendiente de recibir:</strong> {cantidadPendiente} unidades.
                  Verificá la cantidad y ubicación antes de confirmar.
                </p>
              )}
            </section>

            <button
              type="submit"
              disabled={guardando || cargando}
              className="min-h-14 w-full rounded-lg bg-primary px-5 py-3 text-lg font-bold text-white shadow-sm hover:bg-[#004B76] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {guardando
                ? 'Registrando...'
                : 'Confirmar recepción'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}