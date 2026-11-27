import { useEffect, useState } from 'react'
import type { Incidencia } from '../types/incidencias'
import {
  listarIncidencias,
  iniciarReparacion,
  actualizarEstadoIncidencia
} from '../services/incidenciasApi'

export default function GestionarIncidencias() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [procesando, setProcesando] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')

  // Consultar las incidencias al ingresar a la pantalla.
  useEffect(() => {
    listarIncidencias()
      .then(setIncidencias)
      .catch((error) => setError(error.message))
      .finally(() => setCargando(false))
  }, [])

  // Iniciar la reparación de una incidencia.
  async function comenzarReparacion(id: number) {
    setError('')
    setMensaje('')
    setProcesando(id)

    try {
      await iniciarReparacion(id)

      setMensaje('Reparación iniciada correctamente.')

      const datos = await listarIncidencias()
      setIncidencias(datos)

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo iniciar la reparación.'
      )
    } finally {
      setProcesando(null)
    }
  }

  // Finalizar la reparación de una incidencia.
  async function finalizarReparacion(id: number) {
    setError('')
    setMensaje('')
    setProcesando(id)

    try {
      await actualizarEstadoIncidencia(id, {
        estado: 'resuelta'
      })

      setMensaje('Reparación finalizada correctamente.')

      const datos = await listarIncidencias()
      setIncidencias(datos)

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo finalizar la reparación.'
      )
    } finally {
      setProcesando(null)
    }
  }

  // Normalizar el texto para buscar sin distinguir mayúsculas ni tildes.
  function normalizarTexto(texto: string) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  // Filtrar las incidencias según el texto ingresado.
  const incidenciasFiltradas = incidencias.filter((incidencia) => {
    const texto = normalizarTexto(busqueda)

    return [
      incidencia.codigo || `INC-${incidencia.id}`,
      incidencia.codigo_maquina,
      incidencia.descripcion,
      incidencia.turno,
      incidencia.estado.replaceAll('_', ' ')
    ].some((dato) => normalizarTexto(dato).includes(texto))
  })

  return (
    <main className="min-h-screen bg-surface px-3 py-6 text-on-surface sm:px-6 sm:py-8">

      <div className="mx-auto max-w-5xl space-y-5">

        <header className="rounded-xl border border-[#D5E2EF] border-l-4 border-l-primary bg-white p-5 shadow-sm sm:p-6">

          <p className="text-sm font-bold uppercase tracking-wide text-primary">
            Mantenimiento · Gestión de incidencias
          </p>

          <h1 className="mt-2 text-2xl font-bold text-on-surface sm:text-3xl">
            Gestionar incidencias
          </h1>

          <p className="mt-2 text-base text-on-surface-variant">
            Consultá las incidencias reportadas, iniciá y finalizá
            las reparaciones correspondientes.
          </p>

        </header>

        {/* Buscador de incidencias */}
        <section className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

          <label
            htmlFor="busqueda"
            className="mb-2 block font-semibold text-slate-800"
          >
            Buscar incidencias
          </label>

          <div className="flex flex-wrap gap-3">

            <input
              id="busqueda"
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar por código, máquina, descripción, turno o estado..."
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 p-3 focus-visible:outline-2 focus-visible:outline-primary"
            />

            <button
              type="button"
              onClick={() => setBusqueda('')}
              disabled={!busqueda}
              className="rounded-lg border border-primary bg-white px-5 py-3 font-semibold text-primary hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Limpiar
            </button>

          </div>

          <p className="mt-3 text-sm text-slate-500">
            Mostrando {incidenciasFiltradas.length} de{' '}
            {incidencias.length} incidencias
          </p>

        </section>

        {/* Mensaje de carga */}
        {cargando && (
          <p className="text-sm text-slate-500">
            Cargando incidencias...
          </p>
        )}

        {/* Mensaje de error */}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        {/* Mensaje de confirmación */}
        {mensaje && (
          <div
            role="status"
            className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800"
          >
            {mensaje}
          </div>
        )}

        {/* No hay incidencias registradas */}
        {!cargando && !error && incidencias.length === 0 && (
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <p>No hay incidencias registradas.</p>
          </section>
        )}

        {/* No hay resultados para la búsqueda */}
        {!cargando &&
          !error &&
          incidencias.length > 0 &&
          incidenciasFiltradas.length === 0 && (
            <section className="rounded-xl bg-white p-6 text-slate-600 shadow-sm">
              No se encontraron incidencias para esta búsqueda.
            </section>
          )}

        {/* Listado de incidencias */}
        <div className="grid gap-5 sm:grid-cols-2">

          {incidenciasFiltradas.map((incidencia) => (

            <section
              key={incidencia.id}
              className="flex flex-col rounded-xl border border-[#D5E2EF] bg-white p-5 shadow-sm sm:p-6"
            >

              <div className="flex flex-wrap items-center justify-between gap-3">

                <h2 className="text-xl font-bold text-primary">
                  {incidencia.codigo || `INC-${incidencia.id}`}
                </h2>

                {/* Estado de la incidencia */}
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    incidencia.estado === 'reportada'
                      ? 'bg-amber-100 text-amber-800'
                      : incidencia.estado === 'en_reparacion'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                  }`}
                >
                  {incidencia.estado === 'reportada'
                    ? 'Reportada'
                    : incidencia.estado === 'en_reparacion'
                      ? 'En reparación'
                      : 'Resuelta'}
                </span>

              </div>

              {/* Información de la incidencia */}
              <div className="mt-4 flex-1 space-y-3 text-slate-700">

                <p>
                  <strong>Máquina:</strong>{' '}
                  {incidencia.codigo_maquina}
                </p>

                <div className="rounded-lg bg-slate-50 p-4">

                  <p className="text-xs font-bold uppercase text-slate-500">
                    Descripción de la incidencia
                  </p>

                  <p className="mt-2">
                    {incidencia.descripcion}
                  </p>

                </div>

                <p>
                  <strong>Turno:</strong>{' '}
                  {incidencia.turno}
                </p>

                <p className="text-sm text-slate-600">
                  <strong>Fecha:</strong>{' '}
                  {new Date(incidencia.fecha_hora).toLocaleString('es-AR')}
                </p>

                {/* Mostrar la fecha de cierre si existe */}
                {incidencia.fecha_cierre && (
                  <p className="text-sm text-slate-600">
                    <strong>Fecha de cierre:</strong>{' '}
                    {new Date(incidencia.fecha_cierre).toLocaleString('es-AR')}
                  </p>
                )}

              </div>

              {/* Botón para iniciar la reparación */}
              {incidencia.estado === 'reportada' && (
                <button
                  type="button"
                  disabled={procesando !== null}
                  onClick={() => comenzarReparacion(incidencia.id)}
                  className="mt-5 min-h-12 w-full rounded-lg bg-primary px-5 py-3 font-bold text-white hover:bg-[#004B76] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {procesando === incidencia.id
                    ? 'Procesando...'
                    : 'Iniciar reparación'}
                </button>
              )}

              {/* Botón para finalizar la reparación */}
              {incidencia.estado === 'en_reparacion' && (
                <button
                  type="button"
                  disabled={procesando !== null}
                  onClick={() => finalizarReparacion(incidencia.id)}
                  className="mt-5 min-h-12 w-full rounded-lg bg-green-700 px-5 py-3 font-bold text-white hover:bg-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {procesando === incidencia.id
                    ? 'Procesando...'
                    : 'Finalizar reparación'}
                </button>
              )}

            </section>

          ))}

        </div>

      </div>

    </main>
  )
}