import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { obtenerRepuesto } from '../services/repuestosApi'
import { crearReserva, liberarReserva } from '../services/reservasApi'
import type { Repuesto } from '../types/repuestos'
import type { ReservaCreada, ReservaLiberada } from '../types/reservas'

const tarjeta = 'rounded-xl bg-white p-5 shadow-sm sm:p-6'
const campo = 'min-h-12 w-full rounded-lg border border-outline bg-surface-container-low px-4 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
const boton = 'min-h-12 rounded-lg bg-primary px-5 py-3 font-bold text-white hover:bg-[#004B76] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-slate-400'
const botonSecundario = 'min-h-12 rounded-lg border border-primary px-5 py-3 font-bold text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50'
const avisoError = 'rounded-lg border border-red-300 bg-red-50 p-4 font-medium text-red-800'

function mensaje(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.'
}

export default function Reservas() {
  const [codigo, setCodigo] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [repuesto, setRepuesto] = useState<Repuesto | null>(null)
  const [reserva, setReserva] = useState<ReservaCreada | null>(null)
  const [liberacion, setLiberacion] = useState<ReservaLiberada | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [consultando, setConsultando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [liberando, setLiberando] = useState(false)
  const [error, setError] = useState('')
  const [errorLiberacion, setErrorLiberacion] = useState('')
  const operacionEnCurso = useRef(false)
  const confirmacion = useRef<HTMLDivElement>(null)
  const volverAFocoLiberacion = useRef(false)
  const accionLiberar = useRef<HTMLButtonElement>(null)
  const resultadoReserva = useRef<HTMLDivElement>(null)

  const formularioBloqueado = guardando || liberando || confirmando

  useEffect(() => {
    if (confirmando) {
      confirmacion.current?.focus()
    } else if (volverAFocoLiberacion.current) {
      volverAFocoLiberacion.current = false
      if (liberacion) resultadoReserva.current?.focus()
      else accionLiberar.current?.focus()
    }
  }, [confirmando, liberacion])

  async function identificarRepuesto() {
    if (consultando || formularioBloqueado || !codigo.trim()) return
    setConsultando(true)
    setRepuesto(null)
    setError('')
    try {
      setRepuesto(await obtenerRepuesto(codigo.trim()))
    } catch (errorDesconocido) {
      setError(mensaje(errorDesconocido))
    } finally {
      setConsultando(false)
    }
  }

  function actualizarStock(codigoRepuesto: string, stock: Pick<ReservaCreada, 'stockFisico' | 'stockReservado' | 'stockDisponible'>) {
    setRepuesto((actual) => actual?.codigo === codigoRepuesto
      ? {
          ...actual,
          stockFisico: stock.stockFisico,
          stockReservado: stock.stockReservado,
          stockDisponible: stock.stockDisponible,
        }
      : actual)
  }

  async function enviarReserva(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (operacionEnCurso.current || confirmando || consultando) return

    const unidades = Number(cantidad)
    if (!repuesto || !Number.isSafeInteger(unidades) || unidades < 1 || !motivo.trim()) {
      setError('Identificá el repuesto, ingresá una cantidad entera mayor que cero y completá el motivo.')
      return
    }

    operacionEnCurso.current = true
    setGuardando(true)
    setError('')
    try {
      const creada = await crearReserva({ codigoRepuesto: repuesto.codigo, cantidad: unidades, motivo: motivo.trim() })
      setReserva(creada)
      setLiberacion(null)
      setErrorLiberacion('')
      setCantidad('')
      setMotivo('')
      actualizarStock(creada.codigoRepuesto, creada)
    } catch (errorDesconocido) {
      setError(mensaje(errorDesconocido))
    } finally {
      operacionEnCurso.current = false
      setGuardando(false)
    }
  }

  async function confirmarLiberacion() {
    if (!confirmando || !reserva || reserva.estado !== 'activa' || liberacion || consultando || operacionEnCurso.current) return

    operacionEnCurso.current = true
    setLiberando(true)
    setErrorLiberacion('')
    try {
      const liberada = await liberarReserva(reserva.id)
      setLiberacion(liberada)
      actualizarStock(liberada.codigoRepuesto, liberada)
    } catch (errorDesconocido) {
      setErrorLiberacion(mensaje(errorDesconocido))
    } finally {
      setConfirmando(false)
      operacionEnCurso.current = false
      setLiberando(false)
    }
  }

  const stockResultado = liberacion ?? reserva

  return (
    <main className="bg-surface px-3 py-6 text-on-surface sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className={tarjeta}>
          <h1 className="text-2xl font-bold sm:text-3xl">Reservar repuesto</h1>
          <p className="mt-2 text-on-surface-variant">Identificá el repuesto e indicá cuántas unidades querés reservar y para qué.</p>
        </header>

        {error && <p role="alert" className={avisoError}>{error}</p>}
        <form onSubmit={enviarReserva} className="space-y-5">
          <section className={tarjeta}>
            <h2 className="mb-4 text-lg font-bold">Identificación del repuesto</h2>
            <label htmlFor="reserva-codigo" className="mb-2 block font-semibold">Código de repuesto</label>
            <input
              id="reserva-codigo"
              className={campo}
              value={codigo}
              onChange={(evento) => {
                setCodigo(evento.target.value)
                setRepuesto(null)
                setError('')
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder="Ejemplo: REP-VALV-304"
              disabled={consultando || formularioBloqueado}
              required
            />
            <button type="button" onClick={identificarRepuesto} disabled={!codigo.trim() || consultando || formularioBloqueado} className={`${boton} mt-3 w-full sm:w-auto`}>
              {consultando ? 'Consultando repuesto…' : 'Validar repuesto'}
            </button>
            <div role="status" ref={resultadoReserva} tabIndex={-1}>
              {repuesto && (
                <div className="mt-4 rounded-lg bg-surface-container-low p-4">
                  <p className="break-words text-lg font-bold">{repuesto.nombre}</p>
                  <p className="break-all font-mono text-on-surface-variant">{repuesto.codigo}</p>
                  <p className="mt-2"><strong>Stock disponible:</strong> {repuesto.stockDisponible} unidades</p>
                  <p><strong>Stock reservado:</strong> {repuesto.stockReservado} unidades</p>
                </div>
              )}
            </div>
          </section>

          <section className={`${tarjeta} space-y-4`}>
            <h2 className="text-lg font-bold">Datos de la reserva</h2>
            <div>
              <label htmlFor="reserva-cantidad" className="mb-2 block font-semibold">Cantidad a reservar</label>
              <input id="reserva-cantidad" className={campo} type="number" min="1" step="1" inputMode="numeric" value={cantidad} onChange={(evento) => setCantidad(evento.target.value)} disabled={formularioBloqueado} required />
            </div>
            <div>
              <label htmlFor="reserva-motivo" className="mb-2 block font-semibold">Motivo</label>
              <textarea id="reserva-motivo" className={campo} rows={3} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} disabled={formularioBloqueado} required />
            </div>
          </section>

          <button type="submit" disabled={!repuesto || consultando || formularioBloqueado} className={`${boton} min-h-14 w-full text-lg`}>
            {guardando ? 'Registrando reserva…' : 'Registrar reserva'}
          </button>
        </form>

        {reserva && stockResultado && (
          <section className="space-y-4 rounded-xl border border-green-300 bg-green-50 p-5 text-green-900">
            <div role="status">
              <h2 className="text-xl font-bold">
                {liberacion ? `Reserva #${liberacion.reservaId} liberada` : `Reserva #${reserva.id} registrada`}
              </h2>
              <p className="mt-2 break-words"><strong>Repuesto:</strong> {reserva.codigoRepuesto}</p>
              <p><strong>{liberacion ? 'Cantidad liberada:' : 'Cantidad reservada:'}</strong> {liberacion?.cantidadLiberada ?? reserva.cantidad} unidades</p>
              <p className="break-words"><strong>Motivo:</strong> {reserva.motivo}</p>
              <p><strong>Estado:</strong> {stockResultado.estado}</p>
              <dl className="mt-3 grid gap-3 rounded-lg bg-white/70 p-4 sm:grid-cols-3">
                {[
                  ['Stock físico', stockResultado.stockFisico],
                  ['Stock reservado', stockResultado.stockReservado],
                  ['Stock disponible', stockResultado.stockDisponible],
                ].map(([etiqueta, valor]) => (
                  <div key={etiqueta}>
                    <dt className="text-sm">{etiqueta}</dt>
                    <dd className="text-xl font-bold tabular-nums">{valor}</dd>
                  </div>
                ))}
              </dl>
              {liberacion && liberacion.notificaciones.length > 0 && <p className="mt-3">Aviso de liberación simulado.</p>}
            </div>

            {errorLiberacion && <p role="alert" className={avisoError}>{errorLiberacion}</p>}
            {!liberacion && reserva.estado === 'activa' && (
              confirmando ? (
                <div ref={confirmacion} role="group" tabIndex={-1} aria-labelledby="confirmar-reserva-aviso" className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2">
                  <p id="confirmar-reserva-aviso">Vas a liberar {reserva.cantidad} unidades de {reserva.codigoRepuesto} de la reserva #{reserva.id}. Volverán al stock disponible.</p>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" className={boton} onClick={confirmarLiberacion} disabled={liberando}>
                      {liberando ? 'Liberando…' : 'Confirmar liberación'}
                    </button>
                    <button type="button" className={botonSecundario} onClick={() => setConfirmando(false)} disabled={liberando}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  ref={accionLiberar}
                  className={botonSecundario}
                  disabled={guardando || consultando}
                  onClick={() => {
                    setErrorLiberacion('')
                    volverAFocoLiberacion.current = true
                    setConfirmando(true)
                  }}
                >
                  Liberar esta reserva
                </button>
              )
            )}
          </section>
        )}
      </div>
    </main>
  )
}
