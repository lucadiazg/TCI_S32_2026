
import { useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface EscanerQRProps {
  onDetectar: (codigo: string) => void
  onCerrar: () => void
}

function extraerCodigoMaquina(contenido: string): string | null {
  const valor = contenido.trim()

  if (!valor) return null

  // Acepta códigos directos: MAQ-001
  if (/^MAQ-[A-Za-z0-9_-]+$/i.test(valor)) {
    return valor
  }

  // Acepta las URL generadas por PharmaPlant CORE.
  try {
    const url = new URL(valor)
    const partes = url.pathname.split('/').filter(Boolean)

    if (
      partes.length === 2 &&
      partes[0] === 'maquinas' &&
      /^MAQ-[A-Za-z0-9_-]+$/i.test(partes[1])
    ) {
      return partes[1]
    }
  } catch {
    return null
  }

  return null
}

export default function EscanerQR({
  onDetectar,
  onCerrar,
}: EscanerQRProps) {
  const id = useId().replace(/:/g, '')
  const lectorRef = useRef<Html5Qrcode | null>(null)
  const detectadoRef = useRef(false)

  const [error, setError] = useState('')
  const [iniciando, setIniciando] = useState(true)

  useEffect(() => {
    let desmontado = false
    const lector = new Html5Qrcode(id)
    lectorRef.current = lector

    async function iniciar() {
      try {
        await lector.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (texto) => {
            if (detectadoRef.current) return

            const codigo = extraerCodigoMaquina(texto)

            if (!codigo) {
              setError('El QR no corresponde a una máquina válida.')
              return
            }

            detectadoRef.current = true
            onDetectar(codigo)
          },
          () => {}
        )

        if (desmontado) {
          await lector.stop()
        } else {
          setIniciando(false)
        }
      } catch {
        if (!desmontado) {
          setError(
            'No se pudo abrir la cámara. Verificá los permisos del navegador.'
          )
          setIniciando(false)
        }
      }
    }

    void iniciar()

    return () => {
      desmontado = true

      if (lector.isScanning) {
        void lector.stop().catch(() => {})
      }
    }
  }, [id, onDetectar])

  return (
    <section className="rounded-xl border border-[#D5E2EF] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">
        Escanear QR de máquina
      </h2>

      <p className="mt-2 text-sm text-on-surface-variant">
        Apuntá la cámara al código QR pegado en la máquina.
      </p>

      <div
        id={id}
        className="mx-auto mt-4 max-w-md overflow-hidden rounded-lg"
      />

      {iniciando && (
        <p className="mt-3 text-center">
          Iniciando cámara...
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onCerrar}
        className="mt-4 min-h-12 w-full rounded-lg border border-primary px-4 font-bold text-primary"
      >
        Cancelar escaneo
      </button>
    </section>
  )
}
