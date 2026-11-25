import type { EvolucionIncidencias } from '../types/gerencia'

interface Props {
  datos: EvolucionIncidencias[]
  agrupacion: 'dia' | 'semana' | 'mes'
}

export default function GraficoEvolucionIncidencias({
  datos,
  agrupacion
}: Props) {

  // Dimensiones del gráfico
  const ancho = 800
  const alto = 300
  const margenIzquierdo = 50
  const margenDerecho = 30
  const margenSuperior = 25
  const margenInferior = 50

  // Dimensiones del área útil
  const anchoUtil = ancho - margenIzquierdo - margenDerecho
  const altoUtil = alto - margenSuperior - margenInferior

  // Determinar el valor máximo del eje vertical
  const maximo = Math.max(
    1,
    ...datos.map((dato) => Math.max(dato.reportadas, dato.cerradas))
  )

  // Determinar los valores del eje vertical
  const pasoVertical = Math.max(1, Math.ceil(maximo / 5))
  const maximoEjeY = Math.ceil(maximo / pasoVertical) * pasoVertical

  const valoresEjeY = Array.from(
    { length: maximoEjeY / pasoVertical + 1 },
    (_, indice) => indice * pasoVertical
  )

  // Calcular la posición horizontal de cada período
  function obtenerX(indice: number): number {
    if (datos.length <= 1) {
      return margenIzquierdo + anchoUtil / 2
    }

    return margenIzquierdo +
      (indice / (datos.length - 1)) * anchoUtil
  }

  // Calcular la posición vertical según la cantidad
  function obtenerY(cantidad: number): number {
    return margenSuperior + altoUtil -
      (cantidad / maximoEjeY) * altoUtil
  }

  // Construir la línea de incidencias reportadas
  const lineaReportadas = datos
    .map((dato, indice) =>
      `${obtenerX(indice)},${obtenerY(dato.reportadas)}`
    )
    .join(' ')

  // Construir la línea de incidencias cerradas
  const lineaCerradas = datos
    .map((dato, indice) =>
      `${obtenerX(indice)},${obtenerY(dato.cerradas)}`
    )
    .join(' ')

  // Limitar la cantidad de etiquetas del eje horizontal
  const pasoHorizontal = Math.max(
    1,
    Math.ceil(datos.length / 8)
  )

  // Formatear las fechas según la agrupación
  function formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-')

    if (agrupacion === 'mes') {
      return `${mes}/${anio}`
    }

    return `${dia}/${mes}`
  }

  // Identificar la agrupación temporal
  const textoAgrupacion = {
    dia: 'Agrupación diaria',
    semana: 'Agrupación semanal',
    mes: 'Agrupación mensual'
  }[agrupacion]

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

      <h2 className="text-lg font-bold">
        Evolución de incidencias
      </h2>

      <p className="mt-1 text-sm text-on-surface-variant">
        {textoAgrupacion}
      </p>

      {datos.length === 0 ? (
        <p className="mt-4 text-sm text-on-surface-variant">
          No hay registros de incidencias disponibles.
        </p>
      ) : (
        <>
          {/* Referencias del gráfico */}
          <div className="mt-4 flex flex-wrap justify-center gap-5 text-sm">

            <div className="flex items-center gap-2">
              <span className="h-1 w-6 rounded bg-primary" />
              <span>Reportadas</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-1 w-6 rounded bg-green-600" />
              <span>Cerradas</span>
            </div>

          </div>

          {/* Gráfico */}
          <svg
            viewBox={`0 0 ${ancho} ${alto}`}
            className="mt-4 w-full"
            role="img"
            aria-label="Gráfico de evolución de incidencias reportadas y cerradas"
          >

            {/* Líneas horizontales y valores del eje Y */}
            {valoresEjeY.map((valor) => (
              <g key={valor}>

                <line
                  x1={margenIzquierdo}
                  y1={obtenerY(valor)}
                  x2={ancho - margenDerecho}
                  y2={obtenerY(valor)}
                  stroke="#d3e4fe"
                  strokeDasharray="4 4"
                />

                <text
                  x={margenIzquierdo - 10}
                  y={obtenerY(valor) + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#3f4850"
                >
                  {valor}
                </text>

              </g>
            ))}

            {/* Eje vertical */}
            <line
              x1={margenIzquierdo}
              y1={margenSuperior}
              x2={margenIzquierdo}
              y2={margenSuperior + altoUtil}
              stroke="#707881"
            />

            {/* Eje horizontal */}
            <line
              x1={margenIzquierdo}
              y1={margenSuperior + altoUtil}
              x2={ancho - margenDerecho}
              y2={margenSuperior + altoUtil}
              stroke="#707881"
            />

            {/* Fechas del eje horizontal */}
            {datos.map((dato, indice) => (
              indice % pasoHorizontal === 0 && (
                <text
                  key={dato.fecha}
                  x={obtenerX(indice)}
                  y={margenSuperior + altoUtil + 22}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#3f4850"
                >
                  {formatearFecha(dato.fecha)}
                </text>
              )
            ))}

            {/* Línea de incidencias reportadas */}
            <polyline
              points={lineaReportadas}
              fill="none"
              stroke="#006194"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Línea de incidencias cerradas */}
            <polyline
              points={lineaCerradas}
              fill="none"
              stroke="#16a34a"
              strokeWidth="2"
              strokeDasharray="5 5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Puntos de incidencias reportadas */}
            {datos.map((dato, indice) => (
              <circle
                key={`reportadas-${dato.fecha}`}
                cx={obtenerX(indice)}
                cy={obtenerY(dato.reportadas)}
                r="3"
                fill="#006194"
              >
                <title>
                  {dato.fecha}: {dato.reportadas} reportadas
                </title>
              </circle>
            ))}

            {/* Puntos de incidencias cerradas */}
            {datos.map((dato, indice) => (
              <circle
                key={`cerradas-${dato.fecha}`}
                cx={obtenerX(indice)}
                cy={obtenerY(dato.cerradas)}
                r="3.5"
                fill="#16a34a"
              >
                <title>
                  {dato.fecha}: {dato.cerradas} cerradas
                </title>
              </circle>
            ))}

          </svg>
        </>
      )}

      <p className="mt-3 text-xs text-on-surface-variant">
        Las incidencias reportadas se contabilizan según su fecha
        de creación y las cerradas según su última fecha de cierre.
        Los registros sin fecha de cierre no se incluyen en la
        evolución de incidencias cerradas.
      </p>

    </section>
  )
}