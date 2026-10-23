import { useEffect, useState } from 'react'
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

    try {
      setConsultandoRepuesto(true)
      setError('')
      setRepuesto(null)
      setResultado(null)

      const datos = await obtenerRepuesto(codigo)
      setRepuesto(datos)
    } catch (errorDesconocido) {
      setError(mensajeDeError(errorDesconocido))
    } finally {
      setConsultandoRepuesto(false)
    }
  }

  async function enviarFormulario(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault()

    if (!reparacion) {
      setError('Seleccioná una reparación.')
      return
    }

    if (!repuesto) {
      setError('Primero tenés que identificar el repuesto.')
      return
    }

    const cantidadNumerica = Number(cantidad)

    if (
      !Number.isInteger(cantidadNumerica) ||
      cantidadNumerica <= 0
    ) {
      setError(
        'La cantidad debe ser un número entero mayor que cero.',
      )
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
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-5">

        <header className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-sky-700">
            PharmaPlant CORE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Registrar uso de repuesto
          </h1>

          <p className="mt-2 text-slate-600">
            Registrá el consumo de un repuesto asociado a una
            reparación en curso.
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
                setCodigoRepuesto(evento.target.value)
                setRepuesto(null)
                setResultado(null)
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
              className="mt-3 w-full rounded-lg bg-sky-700 px-4 py-3 font-semibold text-white hover:bg-sky-800 disabled:bg-slate-400"
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

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs font-semibold text-slate-500">
                      STOCK DISPONIBLE
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {repuesto.stockDisponible}
                    </p>
                  </div>

                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs font-semibold text-slate-500">
                      UMBRAL MÍNIMO
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {repuesto.umbralMinimo}
                    </p>
                  </div>

                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs font-semibold text-slate-500">
                      UBICACIÓN
                    </p>

                    <p className="mt-1 font-bold">
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

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-slate-800">
              CANTIDAD UTILIZADA
            </h2>

            <label
              htmlFor="cantidad"
              className="mb-2 block font-semibold"
            >
              Cantidad
            </label>

            <input
              id="cantidad"
              type="number"
              min="1"
              step="1"
              value={cantidad}
              onChange={(evento) =>
                setCantidad(evento.target.value)
              }
              disabled={!repuesto || guardando}
              placeholder="Ejemplo: 2"
              className="w-full rounded-lg border border-slate-300 bg-white p-3"
            />
          </section>

          <button
            type="submit"
            disabled={
              !reparacion ||
              !repuesto ||
              guardando
            }
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
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