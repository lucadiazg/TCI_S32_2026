
import { useEffect, useState, type ReactNode } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'

import './App.css'

import Login from './pages/Login'
import ReportarIncidencia from './pages/ReportarIncidencia'
import CargarStockRecibido from './pages/CargarStockRecibido'
import RegistrarUsoRepuesto from './pages/RegistrarUsoRepuesto'

import {
  cerrarSesion,
  obtenerPerfil,
  obtenerRutaPorRol,
  obtenerToken,
  type RolUsuario,
  type Usuario,
} from './services/authApi'


// Verifica que el usuario tenga permiso para acceder a la ruta.
function RutaProtegida({
  usuario,
  rol,
  children,
}: {
  usuario: Usuario | null
  rol: RolUsuario
  children: ReactNode
}) {
  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (usuario.rol !== rol) {
    return (
      <Navigate
        to={obtenerRutaPorRol(usuario.rol)}
        replace
      />
    )
  }

  return <>{children}</>
}


// Encabezado compartido por las cuatro pantallas.
function Panel({
  usuario,
  titulo,
  onLogout,
  children,
}: {
  usuario: Usuario
  titulo: string
  onLogout: () => void
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-800 p-5 text-white">
        <div>
          <h1 className="text-xl font-bold">
            PharmaPlant CORE
          </h1>

          <p className="text-sm text-slate-300">
            {titulo}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <p className="font-semibold">
              {usuario.nombre}
            </p>

            <p className="text-slate-300">
              Legajo {usuario.legajo}
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg bg-red-600 px-4 py-2 font-medium hover:bg-red-700"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}


// Administra la autenticación y las rutas.
function AppRoutes() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  const navigate = useNavigate()

  // Recuperar sesión cuando se abre o recarga la aplicación.
  useEffect(() => {
    let activo = true

    async function verificarSesion() {
      if (!obtenerToken()) {
        if (activo) {
          setCargando(false)
        }
        return
      }

      try {
        const perfil = await obtenerPerfil()

        if (activo) {
          setUsuario(perfil)
        }
      } catch {
        cerrarSesion()

        if (activo) {
          setUsuario(null)
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    verificarSesion()

    return () => {
      activo = false
    }
  }, [])

  // Recibe el usuario autenticado desde Login.tsx.
  function manejarLogin(usuarioAutenticado: Usuario) {
    setUsuario(usuarioAutenticado)
  }

  // Elimina la sesión y redirige al login.
  function manejarLogout() {
    cerrarSesion()
    setUsuario(null)
    navigate('/login', { replace: true })
  }

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">
        Verificando sesión...
      </div>
    )
  }

  return (
    <Routes>
      {/* Login */}
      <Route
        path="/login"
        element={
          usuario ? (
            <Navigate
              to={obtenerRutaPorRol(usuario.rol)}
              replace
            />
          ) : (
            <Login onLogin={manejarLogin} />
          )
        }
      />

      {/* OPERARIO */}
      <Route
        path="/operario"
        element={
          <RutaProtegida
            usuario={usuario}
            rol="operario"
          >
            {usuario && (
              <Panel
                usuario={usuario}
                titulo="Panel de Operario"
                onLogout={manejarLogout}
              >
                <ReportarIncidencia />
              </Panel>
            )}
          </RutaProtegida>
        }
      />

      {/* MANTENIMIENTO */}
      <Route
        path="/mantenimiento"
        element={
          <RutaProtegida
            usuario={usuario}
            rol="mantenimiento"
          >
            {usuario && (
              <Panel
                usuario={usuario}
                titulo="Panel de Mantenimiento"
                onLogout={manejarLogout}
              >
                <RegistrarUsoRepuesto />
              </Panel>
            )}
          </RutaProtegida>
        }
      />

      {/* ENCARGADO */}
      <Route
        path="/encargado"
        element={
          <RutaProtegida
            usuario={usuario}
            rol="encargado"
          >
            {usuario && (
              <Panel
                usuario={usuario}
                titulo="Panel de Encargado"
                onLogout={manejarLogout}
              >
                <CargarStockRecibido />
              </Panel>
            )}
          </RutaProtegida>
        }
      />

      {/* GERENCIA */}
      <Route
        path="/gerencia"
        element={
          <RutaProtegida
            usuario={usuario}
            rol="gerencia"
          >
            {usuario && (
              <Panel
                usuario={usuario}
                titulo="Panel de Gerencia"
                onLogout={manejarLogout}
              >
                <section className="mx-auto max-w-5xl p-8">
                  <h2 className="text-2xl font-bold text-slate-800">
                    Dashboard de Gerencia
                  </h2>

                  <p className="mt-3 text-slate-600">
                    Panel de indicadores y consultas.
                    Próximamente conectaremos los datos reales.
                  </p>
                </section>
              </Panel>
            )}
          </RutaProtegida>
        }
      />

      {/* Redirección predeterminada */}
      <Route
        path="*"
        element={
          <Navigate
            to={
              usuario
                ? obtenerRutaPorRol(usuario.rol)
                : '/login'
            }
            replace
          />
        }
      />
    </Routes>
  )
}


function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
