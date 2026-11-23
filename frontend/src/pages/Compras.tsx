import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { generarPedido, obtenerListaCompras, solicitarCompra } from '../services/comprasApi'
import { obtenerRepuesto } from '../services/repuestosApi'
import type { ListaCompras, PedidoGenerado, SolicitudCompra, UrgenciaCompra } from '../types/compras'
import type { Repuesto } from '../types/repuestos'

const tarjeta = 'rounded-xl bg-white p-5 shadow-sm sm:p-6'
const campo = 'min-h-12 w-full rounded-lg border border-outline bg-surface-container-low px-4 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
const boton = 'min-h-12 rounded-lg bg-primary px-5 py-3 font-bold text-white hover:bg-[#004B76] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-slate-400'
const avisoError = 'rounded-lg border border-red-300 bg-red-50 p-4 font-medium text-red-800'
const avisoExito = 'rounded-xl border border-green-300 bg-green-50 p-5 text-green-900'

function mensaje(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.'
}

function SolicitarCompra() {
  const [codigo, setCodigo] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [repuesto, setRepuesto] = useState<Repuesto | null>(null)
  const [solicitud, setSolicitud] = useState<SolicitudCompra | null>(null)
  const [consultando, setConsultando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const envioEnCurso = useRef(false)

  async function identificarRepuesto() {
    if (consultando || envioEnCurso.current || !codigo.trim()) return
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

  async function enviarSolicitud(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (envioEnCurso.current || consultando) return

    const cantidadSolicitada = Number(cantidad)
    if (!repuesto || !Number.isSafeInteger(cantidadSolicitada) || cantidadSolicitada < 1 || !motivo.trim()) {
      setError('Identificá el repuesto, ingresá una cantidad entera mayor que cero y completá el motivo.')
      return
    }

    envioEnCurso.current = true
    setGuardando(true)
    setError('')
    try {
      const resultado = await solicitarCompra({
        codigoRepuesto: repuesto.codigo,
        cantidadSolicitada,
        motivo: motivo.trim(),
      })
      setSolicitud(resultado)
      setCantidad('')
      setMotivo('')
    } catch (errorDesconocido) {
      setError(mensaje(errorDesconocido))
    } finally {
      envioEnCurso.current = false
      setGuardando(false)
    }
  }

  return (
    <>
      {error && <p role="alert" className={avisoError}>{error}</p>}
      <form onSubmit={enviarSolicitud} className="space-y-5">
        <section className={tarjeta}>
          <h2 className="mb-4 text-lg font-bold">Identificación del repuesto</h2>
          <label htmlFor="compra-codigo" className="mb-2 block font-semibold">Código de repuesto</label>
          <input
            id="compra-codigo"
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
            disabled={consultando || guardando}
            required
          />
          <button type="button" onClick={identificarRepuesto} disabled={!codigo.trim() || consultando || guardando} className={`${boton} mt-3 w-full sm:w-auto`}>
            {consultando ? 'Consultando repuesto…' : 'Validar repuesto'}
          </button>
          <div role="status">
            {repuesto && (
              <div className="mt-4 rounded-lg bg-surface-container-low p-4">
                <p className="break-words text-lg font-bold">{repuesto.nombre}</p>
                <p className="break-all font-mono text-on-surface-variant">{repuesto.codigo}</p>
                <p className="mt-2"><strong>Stock disponible:</strong> {repuesto.stockDisponible} unidades</p>
              </div>
            )}
          </div>
        </section>

        <section className={`${tarjeta} space-y-4`}>
          <h2 className="text-lg font-bold">Datos de la solicitud</h2>
          <div>
            <label htmlFor="compra-cantidad" className="mb-2 block font-semibold">Cantidad solicitada</label>
            <input id="compra-cantidad" className={campo} type="number" min="1" step="1" inputMode="numeric" value={cantidad} onChange={(evento) => setCantidad(evento.target.value)} disabled={guardando} required />
          </div>
          <div>
            <label htmlFor="compra-motivo" className="mb-2 block font-semibold">Motivo</label>
            <textarea id="compra-motivo" className={campo} rows={3} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} disabled={guardando} required />
          </div>
          <p className="text-sm text-on-surface-variant">El sistema verificará si el stock disponible alcanza para la cantidad solicitada.</p>
        </section>

        <button type="submit" disabled={!repuesto || consultando || guardando} className={`${boton} min-h-14 w-full text-lg`}>
          {guardando ? 'Registrando solicitud…' : 'Registrar solicitud de compra'}
        </button>
      </form>

      <div role="status">
        {solicitud && (
          <section className={avisoExito}>
            <h2 className="text-xl font-bold">Solicitud #{solicitud.id} registrada</h2>
            <p className="mt-2 break-words"><strong>Repuesto:</strong> {solicitud.codigoRepuesto} · {solicitud.cantidadSolicitada} unidades</p>
            <p><strong>Estado:</strong> {solicitud.estado}</p>
            <p>No se generó un pedido de compra.</p>
          </section>
        )}
      </div>
    </>
  )
}

function GestionarCompras() {
  const [lista, setLista] = useState<ListaCompras | null>(null)
  const [soloBajoUmbral, setSoloBajoUmbral] = useState(false)
  const [seleccionadas, setSeleccionadas] = useState<number[]>([])
  const [urgencia, setUrgencia] = useState<UrgenciaCompra>('normal')
  const [pedido, setPedido] = useState<PedidoGenerado | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [errorLista, setErrorLista] = useState('')
  const [errorPedido, setErrorPedido] = useState('')
  const envioEnCurso = useRef(false)

  useEffect(() => {
    let activa = true
    obtenerListaCompras()
      .then((datos) => { if (activa) setLista(datos) })
      .catch((error: unknown) => { if (activa) setErrorLista(mensaje(error)) })
      .finally(() => { if (activa) setCargando(false) })
    return () => { activa = false }
  }, [])

  async function actualizarLista() {
    setCargando(true)
    setErrorLista('')
    try {
      const datos = await obtenerListaCompras()
      setLista(datos)
      const disponibles = new Set(datos.repuestos.flatMap((item) => item.solicitudesPendientes.map((solicitud) => solicitud.id)))
      setSeleccionadas((actuales) => actuales.filter((id) => disponibles.has(id)))
    } catch (errorDesconocido) {
      setErrorLista(mensaje(errorDesconocido))
    } finally {
      setCargando(false)
    }
  }

  async function enviarPedido(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (envioEnCurso.current || cargando || errorLista || !seleccionadas.length) return

    envioEnCurso.current = true
    setGuardando(true)
    setErrorPedido('')
    try {
      const generado = await generarPedido({ solicitudesIds: seleccionadas, urgencia })
      setPedido(generado)
      setSeleccionadas([])
      setUrgencia('normal')
      await actualizarLista()
    } catch (errorDesconocido) {
      setErrorPedido(mensaje(errorDesconocido))
    } finally {
      envioEnCurso.current = false
      setGuardando(false)
    }
  }

  const visibles = lista?.repuestos.filter((item) => !soloBajoUmbral || item.bajoUmbral) ?? []
  const bloqueado = cargando || guardando || Boolean(errorLista)

  return (
    <>
      <div role="status">
        {pedido && (
          <section className={avisoExito}>
            <h2 className="text-xl font-bold">Pedido generado</h2>
            <div className="mt-3">
              <label htmlFor="pedido-generado-id" className="mb-2 block font-semibold">ID numérico para Carga de stock</label>
              <input id="pedido-generado-id" value={pedido.id} readOnly className={`${campo} select-all font-mono sm:w-40`} />
            </div>
            <p className="mt-3 break-all"><strong>Código:</strong> {pedido.codigo}</p>
            <p><strong>Urgencia:</strong> {pedido.urgencia} · <strong>Estado:</strong> {pedido.estado}</p>
            {pedido.estadoNotificacion === 'simulada' && <p className="mt-2">Aviso de urgencia simulado.</p>}
            {pedido.estadoNotificacion === 'error' && <p className="mt-2">El pedido quedó registrado, pero no se pudo preparar el aviso de urgencia.</p>}
          </section>
        )}
      </div>
      {errorLista && (
        <div className={`${avisoError} space-y-3`}>
          <p role="alert">{pedido ? 'No se pudo actualizar la lista. El pedido ya está registrado.' : 'No se pudo cargar la lista.'} {errorLista}</p>
          <button type="button" className={boton} onClick={actualizarLista} disabled={cargando || guardando}>Reintentar consulta</button>
        </div>
      )}
      {errorPedido && <p role="alert" className={avisoError}>{errorPedido}</p>}

      <form onSubmit={enviarPedido} className="space-y-5">
        <section className={tarjeta}>
          <h2 className="text-lg font-bold">Solicitudes y alertas de stock</h2>
          <label className="mt-2 flex min-h-12 items-center gap-3">
            <input
              type="checkbox"
              className="size-5 shrink-0 accent-primary"
              checked={soloBajoUmbral}
              onChange={(evento) => {
                const filtrar = evento.target.checked
                setSoloBajoUmbral(filtrar)
                if (filtrar) {
                  const idsVisibles = new Set(lista?.repuestos.filter((item) => item.bajoUmbral).flatMap((item) => item.solicitudesPendientes.map((solicitud) => solicitud.id)))
                  setSeleccionadas((actuales) => actuales.filter((id) => idsVisibles.has(id)))
                }
              }}
              disabled={bloqueado}
            />
            Mostrar solo repuestos en umbral o por debajo
          </label>
          <p role="status" className="text-sm text-on-surface-variant">
            {cargando ? 'Consultando lista…' : lista && !errorLista
              ? (visibles.length ? `${visibles.length} de ${lista.total} repuestos` : 'No hay repuestos para mostrar.')
              : ''}
          </p>
          {errorPedido && !errorLista && (
            <button type="button" className={`${boton} mt-3`} onClick={actualizarLista} disabled={bloqueado}>
              Actualizar lista
            </button>
          )}
        </section>

        {!errorLista && visibles.map((item) => (
          <section key={item.codigo} className={tarjeta}>
            <h3 className="break-words text-lg font-bold">{item.nombre}</h3>
            <p className="break-all font-mono text-on-surface-variant">{item.codigo}</p>
            {item.bajoUmbral && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 font-semibold text-amber-900">Stock en umbral o por debajo</p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-surface-container-low p-4 sm:grid-cols-4">
              {[
                ['Físico', item.stockFisico],
                ['Reservado', item.stockReservado],
                ['Disponible', item.stockDisponible],
                ['Umbral mínimo', item.umbralMinimo],
              ].map(([etiqueta, valor]) => (
                <div key={etiqueta}>
                  <dt className="text-sm text-on-surface-variant">{etiqueta}</dt>
                  <dd className="text-xl font-bold tabular-nums">{valor}</dd>
                </div>
              ))}
            </dl>
            <fieldset className="mt-4" disabled={bloqueado}>
              <legend className="font-semibold">Solicitudes pendientes</legend>
              {item.solicitudesPendientes.length === 0 && <p className="mt-2 text-on-surface-variant">Sin solicitudes pendientes.</p>}
              {item.solicitudesPendientes.map((solicitud) => (
                <label key={solicitud.id} className="flex min-h-12 items-start gap-3 border-b border-slate-200 py-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-5 shrink-0 accent-primary"
                    checked={seleccionadas.includes(solicitud.id)}
                    onChange={(evento) => {
                      const marcado = evento.target.checked
                      setSeleccionadas((actuales) => marcado
                        ? [...actuales, solicitud.id]
                        : actuales.filter((id) => id !== solicitud.id))
                    }}
                  />
                  <span className="min-w-0 break-words">
                    <strong>Solicitud #{solicitud.id} · {solicitud.cantidadSolicitada} unidades</strong>
                    <span className="block text-on-surface-variant">{solicitud.motivo}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </section>
        ))}

        {visibles.some((item) => item.solicitudesPendientes.length > 0) && !errorLista && (
          <section className={`${tarjeta} space-y-4`}>
            <h2 className="text-lg font-bold">Generar pedido</h2>
            <div>
              <label htmlFor="pedido-urgencia" className="mb-2 block font-semibold">Urgencia</label>
              <select id="pedido-urgencia" className={campo} value={urgencia} onChange={(evento) => setUrgencia(evento.target.value === 'urgente' ? 'urgente' : 'normal')} disabled={bloqueado}>
                <option value="normal">Normal</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <p className="text-sm text-on-surface-variant">Solicitudes seleccionadas: {seleccionadas.length}</p>
            <button type="submit" className={`${boton} min-h-14 w-full text-lg`} disabled={bloqueado || !seleccionadas.length}>
              {guardando ? 'Generando pedido…' : 'Generar pedido de compra'}
            </button>
          </section>
        )}
      </form>
    </>
  )
}

export default function Compras({ esEncargado }: { esEncargado: boolean }) {
  return (
    <main className="bg-surface px-3 py-6 text-on-surface sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className={tarjeta}>
          <h1 className="text-2xl font-bold sm:text-3xl">{esEncargado ? 'Compras y alertas de stock' : 'Solicitar compra'}</h1>
          <p className="mt-2 text-on-surface-variant">
            {esEncargado
              ? 'Revisá el stock y seleccioná las solicitudes pendientes para generar un pedido.'
              : 'Identificá el repuesto e indicá qué cantidad necesitás y por qué.'}
          </p>
        </header>
        {esEncargado ? <GestionarCompras /> : <SolicitarCompra />}
      </div>
    </main>
  )
}
