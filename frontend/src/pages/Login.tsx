import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import HCaptcha from '@hcaptcha/react-hcaptcha'

import {
  cerrarSesion,
  iniciarSesion,
  obtenerPerfil,
  obtenerRutaPorRol,
  type Usuario,
} from '../services/authApi'

interface LoginProps {
  onLogin: (usuario: Usuario) => void
}

export default function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate()

  const [legajo, setLegajo] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  async function manejarLogin(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    setError('')
    if (!captchaToken) {
      setError('Por favor, completá la verificación de seguridad.')
      return
    }
    setCargando(true)

    try {
      await iniciarSesion(legajo, password, captchaToken)

      const usuario = await obtenerPerfil()

      onLogin(usuario)

      navigate(obtenerRutaPorRol(usuario.rol), {
        replace: true,
      })
    } catch (err) {
      cerrarSesion()

      if (err instanceof TypeError) {
        setError(
          'No se pudo conectar con el servidor. Verificá que el backend esté funcionando.'
        )
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Ocurrió un error al iniciar sesión'
        )
      }
    } finally {
      setCargando(false)
    }
  }


  return (
    <main className="relative flex min-h-screen items-center justify-center bg-surface px-4 py-8 text-on-surface sm:px-6">

      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#D5E2EF] bg-white shadow-xl">

        {/* Identidad de PharmaPlant */}
        <header className="bg-primary px-6 py-7 text-white sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-2xl font-extrabold text-primary">
              P
            </div>

            <div>
              <p className="text-2xl font-bold">
                PharmaPlant CORE
              </p>

              <p className="mt-1 text-sm text-blue-100">
                Gestión de stock y mantenimiento
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-white/25 pt-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">
              Acceso de personal
            </p>
            <p className="mt-1 text-base">
              Ingresá con tu legajo institucional.
            </p>
          </div>
        </header>

        {/* Formulario */}
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Iniciar sesión
          </h1>

          <p className="mt-2 text-base text-on-surface-variant">
            Accedé a las operaciones habilitadas para tu rol.
          </p>

          <form onSubmit={manejarLogin} className="mt-7 space-y-5">
            <div>
              <label
                htmlFor="legajo"
                className="mb-2 block text-base font-semibold"
              >
                Legajo
              </label>

              <input
                id="legajo"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                maxLength={5}
                pattern="[0-9]{5}"
                placeholder="Ejemplo: 00001"
                value={legajo}
                onChange={(e) => setLegajo(e.target.value)}
                required
                className="min-h-14 w-full rounded-lg border border-outline bg-surface-container-low px-4 text-lg text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />

              <p className="mt-2 text-sm text-on-surface-variant">
                Ingresá los cinco dígitos de tu legajo.
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-base font-semibold"
              >
                Contraseña
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ingresá tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="min-h-14 w-full rounded-lg border border-outline bg-surface-container-low px-4 pr-14 text-lg text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />

                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  aria-label={
                    mostrarPassword
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                  aria-pressed={mostrarPassword}
                  className="absolute inset-y-0 right-0 flex w-14 items-center justify-center rounded-r-lg text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {mostrarPassword ? (
                    <EyeOff size={24} />
                  ) : (
                    <Eye size={24} />
                  )}
                </button>
              </div>
            </div>
            <div className="flex justify-center">
              <HCaptcha
                sitekey={import.meta.env.VITE_HCAPTCHA_SITEKEY}
                onVerify={(token) => {
                  setCaptchaToken(token)
                  setError('')
                }}
                onExpire={() => setCaptchaToken(null)}
                onError={() => {
                  setCaptchaToken(null)
                  setError('No se pudo cargar el captcha. Intentá nuevamente.')
                }}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-300 bg-red-50 p-4 font-medium text-red-800"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="min-h-14 w-full rounded-lg bg-primary px-5 py-3 text-lg font-bold text-white shadow-sm transition-colors hover:bg-[#004B76] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-8 border-t border-[#D5E2EF] pt-5 text-center">
            <p className="text-sm text-on-surface-variant">
              PharmaPlant CORE · Acceso para personal autorizado
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}