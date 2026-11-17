
import { useState } from 'react'
import type { FormEvent } from 'react'

type Maquina = {
  codigo: string
  tag: string
  nombre: string
  linea?: string | null
  area?: string | null
  estado?: string | null
}

type Turno = 'mañana' | 'tarde' | 'noche'

type NuevaIncidencia = {
  codigo_maquina: string
  descripcion: string
  turno: Turno
}

type Incidencia = {
  id: number
  codigo: string | null
  codigo_maquina: string
  descripcion: string
  estado: string
  turno: Turno
  fotos: string[]
  fecha_hora: string
}

type ErrorApi = {
  detail?: string | Array<{ msg?: string }>
  mensaje?: string
}

const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8001'

function obtenerMensajeError(datos: ErrorApi, mensaje: string): string {
  if (typeof datos.detail === 'string') {
    return datos.detail
  }

  if (Array.isArray(datos.detail)) {
    return datos.detail
      .map((error) => error.msg ?? 'Error de validación')
      .join('. ')
  }

  return datos.mensaje ?? mensaje
}

export default function ReportarIncidencia() {
  const [codigoMaquina, setCodigoMaquina] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [turno, setTurno] = useState<Turno>('mañana')
  const [maquina, setMaquina] = useState<Maquina | null>(null)
  const [fotos, setFotos] = useState<File[]>([])

  const [consultando, setConsultando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<Incidencia | null>(null)

  async function consultarMaquina() {
    const codigo = codigoMaquina.trim()

    if (!codigo) {
      setError('Ingresá el código de la máquina.')
      return
    }

    setConsultando(true)
    setError('')
    setMaquina(null)
    setResultado(null)

    try {
      const respuesta = await fetch(
        `${API_URL}/api/maquinas/${encodeURIComponent(codigo)}`
      )

      if (!respuesta.ok) {
        const datos: ErrorApi = await respuesta.json().catch(() => ({}))

        throw new Error(
          obtenerMensajeError(
            datos,
            'No se pudo identificar la máquina.'
          )
        )
      }

      const datos: Maquina = await respuesta.json()
      setMaquina(datos)
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se pudo conectar con FastAPI.'
      )
    } finally {
      setConsultando(false)
    }
  }

  function seleccionarFotos(archivos: FileList | null) {
    if (!archivos) return

    const seleccionadas = Array.from(archivos)

    if (seleccionadas.length > 3) {
      setError('Podés seleccionar hasta 3 fotografías.')
      setFotos([])
      return
    }

    setFotos(seleccionadas)
    setError('')
  }

  async function reportarIncidencia(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault()

    if (enviando) return

    if (!maquina || maquina.codigo !== codigoMaquina.trim()) {
      setError('Primero tenés que identificar la máquina.')
      return
    }

    if (descripcion.trim().length < 5) {
      setError('La descripción debe tener al menos 5 caracteres.')
      return
    }

    const nuevaIncidencia: NuevaIncidencia = {
      codigo_maquina: maquina.codigo,
      descripcion: descripcion.trim(),
      turno,
    }

    setEnviando(true)
    setError('')
    setResultado(null)

    try {
      const respuesta = await fetch(`${API_URL}/api/incidencias/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nuevaIncidencia),
      })

      if (!respuesta.ok) {
        const datos: ErrorApi = await respuesta.json().catch(() => ({}))

        throw new Error(
          obtenerMensajeError(
            datos,
            'No se pudo registrar la incidencia.'
          )
        )
      }

      const datos: Incidencia = await respuesta.json()

      setResultado(datos)
      setDescripcion('')
      setFotos([])
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se pudo conectar con el servidor.'
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-5">

        {/* Encabezado */}
        <header className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-sky-700">
            PharmaPlant CORE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Reportar incidencia
          </h1>

          <p className="mt-2 text-slate-600">
            Registro rápido de avería en línea de producción activa.
          </p>
        </header>

        <form onSubmit={reportarIncidencia} className="space-y-5">

          {/* Identificación de máquina */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-slate-800">
              IDENTIFICACIÓN DE MÁQUINA
            </h2>

            <label
              htmlFor="maquina"
              className="mb-2 block font-semibold"
            >
              Código QR o código de máquina
            </label>

            <input
              id="maquina"
              type="text"
              value={codigoMaquina}
              onChange={(evento) => {
                setCodigoMaquina(evento.target.value)
                setMaquina(null)
                setResultado(null)
              }}
              placeholder="Ejemplo: MAQ-001"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3"
              required
            />

            <button
              type="button"
              onClick={consultarMaquina}
              disabled={consultando || enviando}
              className="mt-3 w-full rounded-lg bg-sky-700 px-4 py-3 font-semibold text-white hover:bg-sky-800 disabled:bg-slate-400"
            >
              {consultando
                ? 'Consultando máquina...'
                : 'Validar máquina'}
            </button>

            {maquina && (
              <div className="mt-5 rounded-xl bg-blue-50 p-5">
                <p className="text-sm font-bold text-sky-700">
                  ✓ MÁQUINA IDENTIFICADA
                </p>

                <h3 className="mt-2 text-xl font-bold text-slate-900">
                  {maquina.nombre}
                </h3>

                <p className="mt-2 text-slate-600">
                  {[maquina.linea, maquina.area]
                    .filter(Boolean)
                    .join(' · ')}
                </p>

                <div className="mt-4 rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold text-slate-500">
                    CÓDIGO DE ACTIVO
                  </p>

                  <p className="font-mono font-bold">
                    {maquina.codigo}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Tag: {maquina.tag}
                  </p>

                  {maquina.estado && (
                    <p className="mt-1 text-sm text-slate-500">
                      Estado: {maquina.estado}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Descripción */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">
                DESCRIPCIÓN DE LA FALLA
              </h2>

              <span className="text-sm text-slate-500">
                {descripcion.length} / 250
              </span>
            </div>

            <label
              htmlFor="descripcion"
              className="mb-2 block font-medium"
            >
              Describí el problema detectado
            </label>

            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(evento) =>
                setDescripcion(evento.target.value)
              }
              minLength={5}
              maxLength={250}
              placeholder="Ej.: La máquina no enciende..."
              className="min-h-36 w-full rounded-lg border border-slate-300 bg-blue-50 p-3"
              required
            />
          </section>

          {/* Turno */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold">
              TURNO DE TRABAJO
            </h2>

            <label
              htmlFor="turno"
              className="mb-2 block font-medium"
            >
              Seleccioná el turno en el que se detectó la falla
            </label>

            <select
              id="turno"
              value={turno}
              onChange={(evento) =>
                setTurno(evento.target.value as Turno)
              }
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3"
              required
            >
              <option value="mañana">Mañana</option>
              <option value="tarde">Tarde</option>
              <option value="noche">Noche</option>
            </select>
          </section>

          {/* Fotografías */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex justify-between gap-3">
              <h2 className="text-lg font-bold">
                REGISTRO FOTOGRÁFICO
              </h2>

              <span className="text-sm font-semibold text-sky-700">
                {fotos.length}/3 Máx.
              </span>
            </div>

            <label
              htmlFor="fotos"
              className="mb-2 block font-medium"
            >
              Fotografías de la falla (opcional)
            </label>

            <input
              id="fotos"
              type="file"
              accept="image/*"
              multiple
              onChange={(evento) => {
                if (
                  evento.target.files &&
                  evento.target.files.length > 3
                ) {
                  setError('Podés seleccionar hasta 3 fotografías.')
                  setFotos([])
                  evento.target.value = ''
                  return
                }

                seleccionarFotos(evento.target.files)
              }}
              className="w-full rounded-lg border border-slate-300 p-3"
            />

            {fotos.length > 0 && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                {fotos.map((foto, indice) => (
                  <p
                    key={`${foto.name}-${indice}`}
                    className="text-sm"
                  >
                    {foto.name}
                  </p>
                ))}
              </div>
            )}

            <p className="mt-3 text-xs text-slate-500">
              La carga de fotografías al servidor todavía no está
              implementada. Los archivos seleccionados no se envían
              ni se guardan con la incidencia.
            </p>
          </section>

          {/* Información */}
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <h2 className="font-bold text-sky-800">
              INFORMACIÓN DEL REPORTE
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              La incidencia se guardará en PostgreSQL.
              El identificador, estado y fecha serán devueltos
              por FastAPI.
            </p>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando || consultando}
            className="w-full rounded-lg bg-sky-700 px-5 py-4 text-lg font-bold text-white shadow-md hover:bg-sky-800 disabled:bg-slate-400"
          >
            {enviando
              ? 'Guardando incidencia...'
              : '✓ Reportar incidencia'}
          </button>
        </form>

        {/* Resultado real */}
        {resultado && (
          <section
            role="status"
            className="rounded-xl border border-green-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold text-green-700">
              ✓ Incidencia registrada correctamente
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              La incidencia fue guardada en PostgreSQL
              mediante FastAPI.
            </p>

            <div className="mt-4 space-y-2">
              <p>
                <strong>ID:</strong> {resultado.id}
              </p>

              {resultado.codigo && (
                <p>
                  <strong>Código:</strong> {resultado.codigo}
                </p>
              )}

              <p>
                <strong>Estado:</strong> {resultado.estado}
              </p>

              <p>
                <strong>Máquina:</strong> {resultado.codigo_maquina}
              </p>

              <p>
                <strong>Turno:</strong> {resultado.turno}
              </p>

              <p>
                <strong>Descripción:</strong> {resultado.descripcion}
              </p>

              <p>
                <strong>Fecha y hora:</strong>{' '}
                {new Date(resultado.fecha_hora).toLocaleString(
                  'es-AR',
                  {
                    dateStyle: 'short',
                    timeStyle: 'medium',
                  }
                )}
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
