
import { useState, type FormEvent } from 'react'
import { obtenerToken } from '../services/authApi'

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


function obtenerMensajeError(
  datos: ErrorApi,
  mensaje: string
): string {
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


  // Consultar máquina por código.
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
        const datos: ErrorApi =
          await respuesta.json().catch(() => ({}))

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


  // Seleccionar hasta tres fotografías.
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
  // Eliminar una fotografía seleccionada.
  function eliminarFoto(indice: number) {
    setFotos((anteriores) =>
      anteriores.filter((_, posicion) => posicion !== indice)
    )

    // Limpiar el selector para permitir volver a elegir archivos.
    const inputFotos = document.getElementById('fotos') as HTMLInputElement | null
    if (inputFotos) {
      inputFotos.value = ''
    }
  }

  // Registrar incidencia autenticada.
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
      // Recuperar el JWT guardado durante el login.
      const token = obtenerToken()

      if (!token) {
        throw new Error(
          'Tu sesión no está activa. Cerrá sesión y volvé a ingresar.'
        )
      }

      // Enviar la incidencia con autorización Bearer.
      const respuesta = await fetch(
        `${API_URL}/api/incidencias/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(nuevaIncidencia),
        }
      )

      if (!respuesta.ok) {
        if (respuesta.status === 401) {
          throw new Error(
            'Tu sesión venció o no es válida. Cerrá sesión y volvé a ingresar.'
          )
        }

        if (respuesta.status === 403) {
          throw new Error(
            'Tu usuario no tiene permiso para reportar incidencias.'
          )
        }

        const datos: ErrorApi =
          await respuesta.json().catch(() => ({}))

        throw new Error(
          obtenerMensajeError(
            datos,
            'No se pudo registrar la incidencia.'
          )
        )
      }

      // Obtener la incidencia creada por FastAPI.
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
    <main className="min-h-screen bg-surface px-3 py-6 text-on-surface sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-xl border border-[#D5E2EF] border-l-4 border-l-primary bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">
            Operaciones · Reporte de incidencias
          </p>
          <h1 className="mt-2 text-2xl font-bold text-on-surface sm:text-3xl">
            Reportar incidencia
          </h1>
          <p className="mt-2 text-base text-on-surface-variant">
            Identificá la máquina, describí la falla y registrá el reporte.
          </p>
        </header>

        <form onSubmit={reportarIncidencia} className="space-y-5">
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-[#D5E2EF] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-5 text-lg font-bold text-on-surface">
                IDENTIFICACIÓN DE MÁQUINA
              </h2>

              <label htmlFor="maquina" className="mb-2 block text-base font-semibold">
                Código de la máquina
              </label>
              <input
                id="maquina"
                type="text"
                value={codigoMaquina}
                onChange={(evento) => {
                  setCodigoMaquina(evento.target.value)
                  setMaquina(null)
                  setResultado(null)
                  setError('')
                }}
                placeholder="Ejemplo: MAQ-USO-DEMO"
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                disabled={enviando}
                className="min-h-12 w-full rounded-lg border border-outline bg-surface-container-low px-4 py-3 text-base text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                required
              />

              <button
                type="button"
                onClick={consultarMaquina}
                disabled={consultando || enviando}
                className="mt-3 min-h-12 w-full rounded-lg bg-primary px-5 py-3 text-base font-bold text-white hover:bg-[#004B76] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {consultando ? 'Consultando máquina...' : 'Validar máquina'}
              </button>

              {maquina && (
                <div className="mt-5 rounded-xl border border-[#B8D7EB] bg-surface-container-low p-4 sm:p-5">
                  <p className="text-sm font-bold text-primary">
                    ✓ MÁQUINA IDENTIFICADA
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-on-surface">
                    {maquina.nombre}
                  </h3>
                  <p className="mt-2 text-base text-on-surface-variant">
                    {[maquina.linea, maquina.area].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-4 rounded-lg border border-[#D5E2EF] bg-white p-4">
                    <p className="text-sm font-semibold text-on-surface-variant">
                      CÓDIGO DE ACTIVO
                    </p>
                    <p className="mt-1 break-all font-mono text-base font-bold text-on-surface">
                      {maquina.codigo}
                    </p>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      Tag: {maquina.tag}
                    </p>
                    {maquina.estado && (
                      <p className="mt-1 text-sm text-on-surface-variant">
                        Estado: {maquina.estado}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-[#D5E2EF] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-on-surface">
                  DESCRIPCIÓN DE LA FALLA
                </h2>
                <span className="text-sm font-medium text-on-surface-variant">
                  {descripcion.length} / 250
                </span>
              </div>
              <label htmlFor="descripcion" className="mb-2 block text-base font-semibold">
                ¿Qué problema detectaste?
              </label>
              <textarea
                id="descripcion"
                value={descripcion}
                onChange={(evento) => setDescripcion(evento.target.value)}
                minLength={5}
                maxLength={250}
                disabled={enviando}
                placeholder="Ejemplo: La máquina se detuvo durante el envasado..."
                className="min-h-36 w-full rounded-lg border border-outline bg-surface-container-low px-4 py-3 text-base text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                required
              />
              <p className="mt-2 text-sm text-on-surface-variant">
                Usá al menos 5 caracteres para describir la falla.
              </p>

              <label htmlFor="turno" className="mb-2 mt-5 block text-base font-semibold">
                Turno de trabajo
              </label>
              <select
                id="turno"
                value={turno}
                onChange={(evento) => setTurno(evento.target.value as Turno)}
                disabled={enviando}
                className="min-h-12 w-full rounded-lg border border-outline bg-white px-4 py-3 text-base text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                required
              >
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </section>
          </div>

          <section className="rounded-xl border border-[#D5E2EF] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-on-surface">
                REGISTRO FOTOGRÁFICO
              </h2>
              <span className="text-sm font-semibold text-on-surface-variant">
                Opcional · hasta 3
              </span>
            </div>
            <p className="mt-3 rounded-lg border border-[#D5E2EF] bg-surface-container-low p-3 text-sm text-on-surface-variant">
              Esta función está en desarrollo: las fotos seleccionadas no se envían ni se guardan con la incidencia.
            </p>

            <label htmlFor="fotos" className="mb-2 mt-4 block text-base font-semibold">
              Seleccionar fotografías (solo vista previa de nombres)
            </label>
            <input
              id="fotos"
              type="file"
              accept="image/*"
              multiple
              disabled={enviando}
              onChange={(evento) => {
                if (evento.target.files && evento.target.files.length > 3) {
                  setError('Podés seleccionar hasta 3 fotografías.')
                  setFotos([])
                  evento.target.value = ''
                  return
                }
                seleccionarFotos(evento.target.files)
              }}
              className="min-h-12 w-full rounded-lg border border-outline bg-white p-3 text-base text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />

            {fotos.map((foto, indice) => (
              <div
                key={`${foto.name}-${indice}`}
                className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <span className="min-w-0 break-all text-sm">
                  {foto.name}
                </span>

                <button
                  type="button"
                  onClick={() => eliminarFoto(indice)}
                  disabled={enviando}
                  className="shrink-0 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-[#B8D7EB] bg-surface-container-low p-5">
            <h2 className="font-bold text-primary">ANTES DE REGISTRAR</h2>
            <p className="mt-2 text-base text-on-surface-variant">
              Verificá el código de la máquina, la descripción y el turno. El sistema devolverá el identificador del reporte cuando se guarde.
            </p>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-[#A61B1B] bg-[#FFF0EE] p-4 text-base font-medium text-[#A61B1B]"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando || consultando || !maquina || maquina.codigo !== codigoMaquina.trim()}
            className="min-h-14 w-full rounded-lg bg-primary px-5 py-3 text-lg font-bold text-white shadow-sm hover:bg-[#004B76] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {enviando ? 'Guardando incidencia...' : 'Reportar incidencia'}
          </button>
        </form>

        {resultado && (
          <section
            role="status"
            className="rounded-xl border border-[#A8D7BC] bg-[#E7F6ED] p-5 shadow-sm sm:p-6"
          >
            <h2 className="text-xl font-bold text-[#14633D]">
              ✓ Incidencia registrada correctamente
            </h2>
            <p className="mt-2 text-base text-[#14633D]">
              El reporte fue registrado. Estos son los datos confirmados por el servidor.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <p><strong>ID:</strong> {resultado.id}</p>
              {resultado.codigo && <p><strong>Código:</strong> {resultado.codigo}</p>}
              <p><strong>Estado:</strong> {resultado.estado}</p>
              <p><strong>Máquina:</strong> {resultado.codigo_maquina}</p>
              <p><strong>Turno:</strong> {resultado.turno}</p>
              <p>
                <strong>Fecha y hora:</strong>{' '}
                {new Date(resultado.fecha_hora).toLocaleString('es-AR', {
                  dateStyle: 'short',
                  timeStyle: 'medium',
                })}
              </p>
              <p className="sm:col-span-2"><strong>Descripción:</strong> {resultado.descripcion}</p>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
