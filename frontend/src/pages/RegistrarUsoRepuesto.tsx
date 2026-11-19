import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import {
  HttpError,
  listarReparaciones,
  obtenerReparacion,
  obtenerRepuesto,
  registrarUsoRepuesto,
} from '../services/repuestosApi'

import type {
  Reparacion,
  Repuesto,
  UsoRepuestoResponse,
} from '../types/repuestos'

function mensajeDeError(error: unknown) {
  if (error instanceof HttpError) {
    if (error.status === 400) {
      return 'Los datos ingresados no son válidos.'
    }

    if (error.status === 404) {
      return 'No se encontró la reparación o el repuesto solicitado.'
    }

    if (error.status === 409) {
      return 'No hay stock disponible suficiente o la reparación no admite consumos.'
    }

    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Ocurrió un error inesperado.'
}

export default function RegistrarUsoRepuesto() {
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([])
  const [reparacionId, setReparacionId] = useState('')
  const [reparacion, setReparacion] = useState<Reparacion | null>(null)

  const [codigoRepuesto, setCodigoRepuesto] = useState('')
  const [repuesto, setRepuesto] = useState<Repuesto | null>(null)

  const [cantidad, setCantidad] = useState('')

  const [cargando, setCargando] = useState(false)
  const [consultandoRepuesto, setConsultandoRepuesto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [error, setError] = useState('')
  const [resultado, setResultado] =
    useState<UsoRepuestoResponse | null>(null)

  const consultaRepuestoId = useRef(0)
  const repuestoValidado =
    repuesto !== null &&
    !consultandoRepuesto &&
    repuesto.codigo === codigoRepuesto.trim()

  const cantidadNumerica = Number(cantidad)

  const cantidadValida =
    cantidad.trim() !== '' &&
    Number.isInteger(cantidadNumerica) &&
    cantidadNumerica > 0

  const superaStock =
    repuesto !== null &&
    cantidadValida &&
    cantidadNumerica > repuesto.stockDisponible

  useEffect(() => {
    async function cargarReparaciones() {
      try {
        setCargando(true)
        setError('')

        const datos = await listarReparaciones()
        setReparaciones(datos)
      } catch (errorDesconocido) {
        setError(mensajeDeError(errorDesconocido))
      } finally {
        setCargando(false)
      }
    }

    cargarReparaciones()
  }, [])

  async function cambiarReparacion(valor: string) {
    consultaRepuestoId.current += 1
    setConsultandoRepuesto(false)
    setReparacionId(valor)
    setReparacion(null)
    setRepuesto(null)
    setCodigoRepuesto('')
    setCantidad('')
    setResultado(null)
    setError('')

    if (!valor) return

    try {
      setCargando(true)

      const datos = await obtenerReparacion(Number(valor))
      setReparacion(datos)
    } catch (errorDesconocido) {
      setError(mensajeDeError(errorDesconocido))
    } finally {
      setCargando(false)
    }
  }

  async function consultarRepuesto() {
    const codigo = codigoRepuesto.trim()

    if (!codigo) {
      setError('Ingresá el código del repuesto.')
      return
    }

    const consultaActual = ++consultaRepuestoId.current

    try {
      setConsultandoRepuesto(true)
      setError('')
      setRepuesto(null)
      setResultado(null)

      const datos = await obtenerRepuesto(codigo)

      if (consultaActual !== consultaRepuestoId.current) return

      setRepuesto(datos)
    } catch (errorDesconocido) {
      if (consultaActual === consultaRepuestoId.current) {
        setError(mensajeDeError(errorDesconocido))
      }
    } finally {
      if (consultaActual === consultaRepuestoId.current) {
        setConsultandoRepuesto(false)
      }
    }
  }

  async function enviarFormulario(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault()
    if (guardando) return

    if (!reparacion) {
      setError('Seleccioná una reparación.')
      return
    }

    if (!repuesto || !repuestoValidado) {
      setError('Primero tenés que validar el repuesto actual.')
      return
    }

    if (!cantidadValida) {
      setError('La cantidad debe ser un número entero mayor que cero.')
      return
    }

    if (superaStock) {
      setError('La cantidad supera el stock disponible del repuesto.')
      return
    }

    try {
      setGuardando(true)
      setError('')
      setResultado(null)

      const datos = await registrarUsoRepuesto(
        reparacion.id,
        {
          codigoRepuesto: repuesto.codigo,
          cantidad: cantidadNumerica,
        },
      )

      setResultado(datos)
      setCantidad('')

      setRepuesto((actual) =>
        actual
          ? {
            ...actual,
            stockFisico: datos.stockFisico,
            stockDisponible: datos.stockDisponible,
          }
          : actual,
      )
    } catch (errorDesconocido) {
      setError(mensajeDeError(errorDesconocido))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="min-h-screen bg-surface px-3 py-6 text-on-surface sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5">

        <header className="rounded-xl border border-[#D5E2EF] border-l-4 border-l-primary bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">
            Mantenimiento · Consumo de repuestos
          </p>

          <h1 className="mt-2 text-2xl font-bold text-on-surface sm:text-3xl">
            Registrar uso de repuesto
          </h1>

          <p className="mt-2 text-base text-on-surface-variant">
            Seleccioná una reparación, identificá el repuesto
            y registrá la cantidad utilizada.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={enviarFormulario}
          className="space-y-5"
        >
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-slate-800">
              REPARACIÓN EN CURSO
            </h2>

            <label
              htmlFor="reparacion"
              className="mb-2 block font-semibold"
            >
              Seleccionar reparación
            </label>

            <select
              id="reparacion"
              value={reparacionId}
              onChange={(evento) =>
                cambiarReparacion(evento.target.value)
              }
              disabled={cargando || guardando}
              className="w-full rounded-lg border border-slate-300 bg-white p-3"
            >
              <option value="">
                Seleccionar una reparación
              </option>

              {reparaciones.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  Reparación #{item.id} - {item.codigoIncidencia}
                </option>
              ))}
            </select>

            {cargando && (
              <p className="mt-3 text-sm text-slate-500">
                Consultando reparación...
              </p>
            )}

            {reparacion && (
              <div className="mt-5 rounded-xl bg-blue-50 p-5">
                <p className="text-sm font-bold text-sky-700">
                  REPARACIÓN SELECCIONADA
                </p>

                <h3 className="mt-2 text-xl font-bold">
                  Reparación #{reparacion.id}
                </h3>

                <p className="mt-2 text-slate-700">
                  <strong>Incidencia asociada:</strong>{' '}
                  {reparacion.codigoIncidencia}
                </p>

                <p className="mt-1 text-slate-700">
                  <strong>Máquina:</strong>{' '}
                  {reparacion.codigoMaquina}
                </p>

                <p className="mt-1 text-slate-700">
                  <strong>Estado:</strong>{' '}
                  {reparacion.estado}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-slate-800">
              IDENTIFICACIÓN DEL REPUESTO
            </h2>

            <label
              htmlFor="repuesto"
              className="mb-2 block font-semibold"
            >
              Código QR, código de barras o código manual
            </label>

            <input
              id="repuesto"
              type="text"
              value={codigoRepuesto}
              onChange={(evento) => {
                consultaRepuestoId.current += 1
                setConsultandoRepuesto(false)
                setCodigoRepuesto(evento.target.value)
                setRepuesto(null)
                setResultado(null)
                setError('')
              }}
              disabled={!reparacion || guardando}
              placeholder="Ejemplo: REP-VALV-304"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3"
            />

            <button
              type="button"
              onClick={consultarRepuesto}
              disabled={
                !reparacion ||
                consultandoRepuesto ||
                guardando
              }
              className="mt-3 min-h-12 w-full rounded-lg bg-primary px-5 py-3 text-base font-bold text-white hover:bg-[#004B76] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {consultandoRepuesto
                ? 'Consultando repuesto...'
                : 'Validar repuesto'}
            </button>

            {repuesto && (
              <div className="mt-5 rounded-xl bg-blue-50 p-5">
                <p className="text-sm font-bold text-sky-700">
                  ✓ REPUESTO IDENTIFICADO
                </p>

                <h3 className="mt-2 text-xl font-bold">
                  {repuesto.nombre}
                </h3>

                <p className="mt-1 font-mono text-sm text-slate-600">
                  {repuesto.codigo}
                </p>


                <div className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
                  <div className="rounded-xl border border-[#B8D7EB] bg-white p-4">
                    <p className="text-sm font-bold text-[#004B76]">
                      STOCK DISPONIBLE
                    </p>

                    <p className="mt-2 text-3xl font-extrabold tabular-nums text-on-surface">
                      {repuesto.stockDisponible}
                      <span className="ml-2 text-sm font-medium text-on-surface-variant">
                        unidades
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#D5E2EF] bg-white p-4">
                    <p className="text-sm font-bold text-on-surface-variant">
                      UMBRAL MÍNIMO
                    </p>

                    <p className="mt-2 text-2xl font-bold tabular-nums text-on-surface">
                      {repuesto.umbralMinimo}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#D5E2EF] bg-white p-4">
                    <p className="text-sm font-bold text-on-surface-variant">
                      UBICACIÓN
                    </p>

                    <p className="mt-2 break-words text-lg font-bold text-on-surface">
                      {repuesto.ubicacion?.codigo ?? 'Sin ubicación'}
                    </p>
                  </div>
                </div>


                {repuesto.ubicacion?.descripcion && (
                  <p className="mt-3 text-sm text-slate-600">
                    {repuesto.ubicacion.descripcion}
                  </p>
                )}
              </div>
            )}
          </section>


          <section className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-5 text-lg font-bold text-on-surface">
              CANTIDAD UTILIZADA
            </h2>

            <label
              htmlFor="cantidad"
              className="mb-3 block text-base font-semibold"
            >
              Cantidad de unidades
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Restar una unidad"
                onClick={() => {
                  setCantidad(String(Math.max(1, cantidadNumerica - 1)))
                  setError('')
                }}
                disabled={
                  !repuestoValidado ||
                  !cantidadValida ||
                  cantidadNumerica <= 1 ||
                  guardando
                }
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-primary bg-white text-2xl font-bold text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                −
              </button>

              <input
                id="cantidad"
                type="number"
                min="1"
                max={repuesto?.stockDisponible}
                step="1"
                inputMode="numeric"
                value={cantidad}
                onChange={(evento) => {
                  setCantidad(evento.target.value)
                  setError('')
                }}
                disabled={!repuestoValidado || guardando}
                aria-invalid={
                  cantidad.trim() !== '' &&
                  (!cantidadValida || superaStock)
                }
                aria-describedby="cantidad-ayuda"
                placeholder="0"
                className="h-14 min-w-0 flex-1 rounded-lg border border-outline bg-surface-container-low px-2 text-center text-3xl font-bold tabular-nums text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
              />

              <button
                type="button"
                aria-label="Sumar una unidad"
                onClick={() => {
                  setCantidad(String((cantidadValida ? cantidadNumerica : 0) + 1))
                  setError('')
                }}
                disabled={
                  !repuestoValidado ||
                  guardando ||
                  (cantidad.trim() !== '' && !cantidadValida) ||
                  (repuesto !== null &&
                    cantidadNumerica >= repuesto.stockDisponible)
                }
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-primary bg-white text-2xl font-bold text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>
            </div>

            {repuestoValidado && repuesto?.stockDisponible === 0 ? (
              <p
                id="cantidad-ayuda"
                role="status"
                className="mt-3 font-semibold text-[#A61B1B]"
              >
                No hay unidades disponibles para registrar otro consumo.
              </p>
            ) : superaStock ? (
              <p
                id="cantidad-ayuda"
                role="alert"
                className="mt-3 font-semibold text-[#A61B1B]"
              >
                La cantidad ingresada supera el stock disponible.
              </p>
            ) : cantidad.trim() !== '' && !cantidadValida ? (
              <p
                id="cantidad-ayuda"
                className="mt-3 font-semibold text-[#A61B1B]"
              >
                Ingresá un número entero mayor que cero.
              </p>
            ) : (
              <p id="cantidad-ayuda" className="mt-3 text-sm text-on-surface-variant">
                Podés usar los botones o escribir la cantidad manualmente.
              </p>
            )}
          </section>

          {reparacion &&
            repuesto &&
            repuestoValidado &&
            cantidadValida &&
            !superaStock && (
              <div className="rounded-xl border border-[#B8D7EB] bg-surface-container-low p-5">
                <h3 className="font-bold text-primary">
                  RESUMEN DEL CONSUMO
                </h3>

                <p className="mt-3">
                  <strong>Reparación:</strong> #{reparacion.id}
                </p>

                <p className="mt-1">
                  <strong>Repuesto:</strong> {repuesto.codigo}
                </p>

                <p className="mt-1">
                  <strong>Cantidad:</strong> {cantidadNumerica} unidades
                </p>

                <p className="mt-1">
                  <strong>Disponible estimado después del consumo:</strong>{' '}
                  {repuesto.stockDisponible - cantidadNumerica}
                </p>

                <p className="mt-3 text-sm text-on-surface-variant">
                  El stock será verificado nuevamente al registrar.
                </p>
              </div>
            )}

          <button
            type="submit"
            disabled={
              !reparacion ||
              !repuestoValidado ||
              !cantidadValida ||
              superaStock ||
              guardando
            }
            className="min-h-14 w-full rounded-lg bg-primary px-5 py-3 text-lg font-bold text-white shadow-sm hover:bg-[#004B76] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {guardando
              ? 'Registrando uso...'
              : 'Registrar uso'}
          </button>
        </form>

        {resultado && (
          <section className="rounded-xl border border-green-300 bg-green-50 p-6">
            <h2 className="text-xl font-bold text-green-800">
              Uso registrado correctamente
            </h2>

            <div className="mt-4 space-y-2 text-green-900">
              <p>
                <strong>Repuesto:</strong>{' '}
                {resultado.codigoRepuesto}
              </p>

              <p>
                <strong>Cantidad utilizada:</strong>{' '}
                {resultado.cantidad}
              </p>

              <p>
                <strong>Stock físico:</strong>{' '}
                {resultado.stockFisico}
              </p>

              <p>
                <strong>Stock disponible:</strong>{' '}
                {resultado.stockDisponible}
              </p>
            </div>

            {resultado.alertaUmbral && (
              <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
                <strong>Advertencia:</strong> el stock disponible
                alcanzó o quedó por debajo del umbral mínimo.
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}