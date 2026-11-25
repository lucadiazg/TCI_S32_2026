import { useEffect, useState } from 'react'
import { obtenerEstadisticasGerencia } from '../services/gerenciaApi'
import type { EstadisticasGerencia } from '../types/gerencia'
import GraficoEvolucionIncidencias from '../components/GraficoEvolucionIncidencias'
import GraficoIncidenciasPorTurno from '../components/GraficoIncidenciasPorTurno'

type CampoIndicador = keyof Pick<
  EstadisticasGerencia,
  | 'incidenciasAbiertas'
  | 'repuestosBajoUmbral'
  | 'pedidosPendientes'
  | 'reservasActivas'
  | 'unidadesConsumidas'
  | 'incidenciasCerradas'
  | 'pedidosCompletos'
>

const indicadores: { campo: CampoIndicador; etiqueta: string }[] = [
  { campo: 'incidenciasAbiertas', etiqueta: 'Incidencias abiertas' },
  { campo: 'incidenciasCerradas', etiqueta: 'Incidencias cerradas' },
  { campo: 'repuestosBajoUmbral', etiqueta: 'Repuestos bajo umbral' },
  { campo: 'reservasActivas', etiqueta: 'Reservas activas' },
  { campo: 'pedidosPendientes', etiqueta: 'Pedidos pendientes' },
  { campo: 'pedidosCompletos', etiqueta: 'Pedidos completados' },
  { campo: 'unidadesConsumidas', etiqueta: 'Unidades consumidas' },
]

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'noDisponible' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'listo'; datos: EstadisticasGerencia }

const tarjeta = 'rounded-xl bg-white p-5 shadow-sm sm:p-6'
const formatoNumero = new Intl.NumberFormat('es-AR')

export default function Gerencia() {
  const [consulta, setConsulta] = useState(0)
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })
  // Fechas seleccionadas por el usuario
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  // Fechas aplicadas a la consulta
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  // Mensaje de validación del filtro
  const [errorFiltro, setErrorFiltro] = useState('')

  useEffect(() => {
    const controlador = new AbortController()
    const { signal } = controlador

    obtenerEstadisticasGerencia(signal, filtroDesde, filtroHasta)
      .then((datos) => {
        if (signal.aborted) return
        setEstado(datos === null ? { tipo: 'noDisponible' } : { tipo: 'listo', datos })
      })
      .catch((error: unknown) => {
        if (signal.aborted) return
        const mensaje = error instanceof Error ? error.message : 'No se pudieron consultar las estadísticas.'
        setEstado({ tipo: 'error', mensaje })
      })

    return () => controlador.abort()
  }, [consulta, filtroDesde, filtroHasta])

  function volverAConsultar() {
    setEstado({ tipo: 'cargando' })
    setConsulta((actual) => actual + 1)
  }
  function aplicarFiltro() {
    if (!desde || !hasta) {
      setErrorFiltro('Debe indicar ambas fechas.')
      return
    }

    if (desde > hasta) {
      setErrorFiltro('La fecha desde no puede ser posterior a la fecha hasta.')
      return
    }

    setErrorFiltro('')
    setFiltroDesde(desde)
    setFiltroHasta(hasta)
    volverAConsultar()
  }
  function verTotal() {
    setDesde('')
    setHasta('')
    setFiltroDesde('')
    setFiltroHasta('')
    setErrorFiltro('')
    volverAConsultar()
  }
  return (
    <main className="bg-surface px-3 py-6 text-on-surface sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className={tarjeta}>
          <h1 className="text-2xl font-bold sm:text-3xl">Estadísticas de la planta</h1>
          <p className="mt-2 text-on-surface-variant">Indicadores generales de mantenimiento e inventario.</p>
        </header>
        <section className={tarjeta}>
          <h2 className="text-lg font-bold">Período de consulta</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="font-semibold">Desde</span>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="rounded-lg border border-outline p-3"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-semibold">Hasta</span>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="rounded-lg border border-outline p-3"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={aplicarFiltro}
              className="rounded-lg bg-primary px-5 py-3 font-bold text-white"
            >
              Aplicar filtro
            </button>

            <button
              type="button"
              onClick={verTotal}
              className="rounded-lg border border-primary px-5 py-3 font-bold text-primary"
            >
              Ver total
            </button>
          </div>

          {errorFiltro && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {errorFiltro}
            </p>
          )}
          <p className="mt-4 text-sm text-on-surface-variant">
          {filtroDesde && filtroHasta
            ? `Período aplicado: ${filtroDesde.split('-').reverse().join('/')} al ${filtroHasta.split('-').reverse().join('/')}`
            : 'Mostrando el total histórico.'}
          </p>

          <p className="mt-2 text-sm text-on-surface-variant">
            Los repuestos bajo umbral y las reservas activas
            representan el estado actual del inventario,
            independientemente del período seleccionado.
          </p>
        </section>

        <div role="status">
          {estado.tipo === 'cargando' && (
            <p className={tarjeta}>Consultando indicadores…</p>
          )}
          {estado.tipo === 'noDisponible' && (
            <p className="rounded-xl bg-surface-container-low p-5">
              Los indicadores todavía no están disponibles.
            </p>
          )}
          {estado.tipo === 'listo' && <p className="sr-only">Indicadores cargados.</p>}
        </div>

        {estado.tipo === 'error' && (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 font-medium text-red-800">
            {estado.mensaje}
          </p>
        )}

        {(estado.tipo === 'error' || estado.tipo === 'noDisponible') && (
          <button
            type="button"
            onClick={volverAConsultar}
            className="min-h-12 w-full rounded-lg bg-primary px-5 py-3 font-bold text-white hover:bg-[#004B76] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
          >
            Volver a consultar
          </button>
        )}

        {estado.tipo === 'listo' && (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Indicadores de la planta">
            {indicadores.map(({ campo, etiqueta }) => (
              <div key={campo} className={tarjeta}>
                <dt className="text-base font-semibold text-on-surface-variant">{etiqueta}</dt>
                <dd className="mt-2 break-words text-3xl font-extrabold tabular-nums text-primary">
                  {formatoNumero.format(estado.datos[campo])}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {/* Gráfico de evolución de incidencias */}
        {estado.tipo === 'listo' && (
          <GraficoEvolucionIncidencias
            datos={estado.datos.evolucionIncidencias}
            agrupacion={estado.datos.agrupacionIncidencias}
          />
        )}
        {/* Gráfico de incidencias por turno */}
        {estado.tipo === 'listo' && (
          <GraficoIncidenciasPorTurno
            datos={estado.datos.incidenciasPorTurno}
          />
        )}
      </div>
    </main>
  )
}