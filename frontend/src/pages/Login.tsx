
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'

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

  async function manejarLogin(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    setError('')
    setCargando(true)

    try {
      await iniciarSesion(legajo, password)

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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">

        <div className="mb-8 text-center">
          <div className="mb-3 text-4xl font-bold text-blue-700">
            PharmaPlant
          </div>

          <h1 className="text-2xl font-semibold text-slate-800">
            Iniciar sesión
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sistema de stock y mantenimiento de planta
          </p>
        </div>

        <form onSubmit={manejarLogin} className="space-y-5">

          <div>
            <label
              htmlFor="legajo"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Legajo
            </label>

            <input
              id="legajo"
              type="text"
              inputMode="numeric"
              maxLength={5}
              pattern="[0-9]{5}"
              placeholder="Ejemplo: 00001"
              value={legajo}
              onChange={(e) => setLegajo(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Contraseña
            </label>

            <div className="relative">
              <input
                id="password"
                type={mostrarPassword ? 'text' : 'password'}
                placeholder="Ingresá tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 outline-none focus:border-blue-600"
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
                className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-blue-700"
              >
                {mostrarPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-blue-700 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>

        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          PharmaPlant CORE · Acceso para personal autorizado
        </p>
      </div>
    </main>
  )
}
