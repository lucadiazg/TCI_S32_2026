import type { IncidenciasPorTurno } from '../types/gerencia'

interface Props {
  datos: IncidenciasPorTurno[]
}

export default function GraficoIncidenciasPorTurno({
  datos
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

  // Determinar la escala vertical
  const maximo = Math.max(
    1,
    ...datos.map((dato) => dato.cantidad)
  )

  const pasoVertical = Math.max(1, Math.ceil(maximo / 5))
  const maximoEjeY = Math.ceil(maximo / pasoVertical) * pasoVertical

  const valoresEjeY = Array.from(
    { length: maximoEjeY / pasoVertical + 1 },
    (_, indice) => indice * pasoVertical
  )

  // Distribuir las barras horizontalmente
  const espacioPorBarra = anchoUtil / Math.max(1, datos.length)
  const anchoBarra = Math.min(80, espacioPorBarra * 0.5)

  // Calcular la posición horizontal
  function obtenerX(indice: number): number {
    return margenIzquierdo +
      espacioPorBarra * (indice + 0.5)
  }

  // Calcular la posición vertical
  function obtenerY(cantidad: number): number {
    return margenSuperior + altoUtil -
      (cantidad / maximoEjeY) * altoUtil
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

      <h2 className="text-lg font-bold">
        Incidencias reportadas por turno
      </h2>

      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        className="mt-4 w-full"
        role="img"
        aria-label="Gráfico de incidencias reportadas por turno"
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

        {/* Barras correspondientes a cada turno */}
        {datos.map((dato, indice) => (
          <g key={dato.turno}>

            <rect
              x={obtenerX(indice) - anchoBarra / 2}
              y={obtenerY(dato.cantidad)}
              width={anchoBarra}
              height={
                margenSuperior + altoUtil -
                obtenerY(dato.cantidad)
              }
              fill="#006194"
              rx="2"
            >
              <title>
                {dato.turno}: {dato.cantidad} incidencias
              </title>
            </rect>

            {/* Cantidad sobre cada barra */}
            <text
              x={obtenerX(indice)}
              y={obtenerY(dato.cantidad) - 8}
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="#006194"
            >
              {dato.cantidad}
            </text>

            {/* Nombre del turno */}
            <text
              x={obtenerX(indice)}
              y={margenSuperior + altoUtil + 22}
              textAnchor="middle"
              fontSize="12"
              fill="#3f4850"
            >
              {dato.turno.charAt(0).toUpperCase() +
                dato.turno.slice(1)}
            </text>

          </g>
        ))}

      </svg>

      <p className="mt-3 text-xs text-on-surface-variant">
        Cantidad de incidencias reportadas por turno durante
        el período consultado, independientemente de su estado actual.
      </p>

    </section>
  )
}