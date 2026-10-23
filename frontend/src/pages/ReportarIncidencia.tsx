import { useState } from 'react'
import type { FormEvent } from 'react'

// Tipos basados en el contrato OpenAPI de M2
type Maquina = {
  codigo: string
  tag: string
  nombre: string
  linea?: string
  area?: string
}

type NuevaIncidencia = {
  codigoMaquina: string
  descripcion: string
  fotos?: string[]
}

type Incidencia = {
  id: number
  codigo: string
  codigoMaquina: string
  descripcion: string
  estado: string
  turno: 'mañana' | 'tarde' | 'noche'
  fechaHora: string
}

type ErrorApi = {
  mensaje?: string
}

const API_URL = 'http://127.0.0.1:4010'

export default function ReportarIncidencia() {
  const [codigoMaquina, setCodigoMaquina] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [maquina, setMaquina] = useState<Maquina | null>(null)
  const [fotos, setFotos] = useState<File[]>([])

  const [consultando, setConsultando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<Incidencia | null>(null)

  // GET /maquinas/{codigo}
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
        `${API_URL}/maquinas/${encodeURIComponent(codigo)}`
      )

      if (!respuesta.ok) {
        const datos: ErrorApi = await respuesta.json().catch(() => ({}))
        throw new Error(
          datos.mensaje || 'No se pudo identificar la máquina.'
        )
      }

      const datos: Maquina = await respuesta.json()
      setMaquina(datos)
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se pudo conectar con Prism.'
      )
    } finally {
      setConsultando(false)
    }
  }

  function seleccionarFotos(archivos: FileList | null) {
    if (!archivos) return

    const seleccionadas = Array.from(archivos)

    if (seleccionadas.length > 3) {
      setError('Podés adjuntar hasta 3 fotografías.')
      setFotos([])
      return
    }

    setFotos(seleccionadas)
    setError('')
  }

  // POST /incidencias
  async function reportarIncidencia(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault()

    if (enviando) return

    if (!maquina || maquina.codigo !== codigoMaquina.trim()) {
      setError('Primero tenés que identificar la máquina.')
      return
    }

    if (!descripcion.trim()) {
      setError('Ingresá una descripción de la falla.')
      return
    }

    const nuevaIncidencia: NuevaIncidencia = {
      codigoMaquina: maquina.codigo,
      descripcion: descripcion.trim(),
      fotos: fotos.map((foto) => foto.name),
    }

    setEnviando(true)
    setError('')
    setResultado(null)

    try {
      const respuesta = await fetch(`${API_URL}/incidencias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nuevaIncidencia),
      })

      if (!respuesta.ok) {
        const datos: ErrorApi = await respuesta.json().catch(() => ({}))
        throw new Error(
          datos.mensaje || 'No se pudo registrar la incidencia.'
        )
      }

      const datos: Incidencia = await respuesta.json()
      setResultado(datos)
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
              Código QR o tag de máquina
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
              placeholder="Ejemplo: QR-BOSH-8831"
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
                </div>
              </div>
            )}
          </section>

          {/* Descripción de la falla */}
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
              maxLength={250}
              placeholder="Ej.: La máquina no enciende..."
              className="min-h-36 w-full rounded-lg border border-slate-300 bg-blue-50 p-3"
              required
            />
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
                  setError('Podés adjuntar hasta 3 fotografías.')
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
                  <p key={`${foto.name}-${indice}`} className="text-sm">
                    📷 {foto.name}
                  </p>
                ))}
              </div>
            )}

            <p className="mt-3 text-xs text-slate-500">
              Durante M3 se envían los nombres de los archivos
              como referencias, según el contrato OpenAPI.
              Las imágenes todavía no se suben al servidor.
            </p>
          </section>

          {/* Información del registro */}
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <h2 className="font-bold text-sky-800">
              INFORMACIÓN DEL REPORTE
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              El turno, la fecha y la hora serán informados
              por la respuesta del servidor.
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
              ? 'Enviando incidencia...'
              : '✓ Reportar incidencia'}
          </button>
        </form>

        {/* Resultado simulado de Prism */}
        {resultado && (
          <section
            role="status"
            className="rounded-xl border border-green-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold text-green-700">
              ✓ Solicitud aceptada por Prism
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Resultado simulado: todavía no se guarda
              en una base de datos real.
            </p>

            <div className="mt-4 space-y-2">
              <p>
                <strong>Incidencia:</strong> {resultado.codigo}
              </p>

              <p>
                <strong>Estado:</strong> {resultado.estado}
              </p>

              <p>
                <strong>Máquina:</strong> {resultado.codigoMaquina}
              </p>

              <p>
                <strong>Turno:</strong> {resultado.turno}
              </p>

              <p>
                <strong>Fecha y hora:</strong> {resultado.fechaHora}
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}