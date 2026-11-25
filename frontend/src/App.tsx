
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
import MenuPrincipal from './pages/MenuPrincipal'
import ReportarIncidencia from './pages/ReportarIncidencia'
import CargarStockRecibido from './pages/CargarStockRecibido'
import RegistrarUsoRepuesto from './pages/RegistrarUsoRepuesto'
import Compras from './pages/Compras'
import Reservas from './pages/Reservas'
import Gerencia from './pages/Gerencia'
import NavegacionPantallas from './components/NavegacionPantallas'

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
  rol: RolUsuario | readonly RolUsuario[]
  children: ReactNode
}) {
  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  const permitido = typeof rol === 'string' ? usuario.rol === rol : rol.includes(usuario.rol)

  if (!permitido) {
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
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="bg-primary text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl font-bold text-primary">
              P
            </div>

            <div>
              <p className="text-xl font-bold">
                PharmaPlant CORE
              </p>
              <p className="text-sm text-blue-100">
                {titulo}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
            <div className="text-left sm:text-right">
              <p className="font-semibold">
                {usuario.nombre}
              </p>
              <p className="text-sm text-blue-100">
                Legajo {usuario.legajo}
              </p>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="min-h-12 rounded-lg border border-white/60 px-4 font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-80px)] flex-col">
        <div className="flex-1">
          {children}
        </div>

        {titulo !== 'Menú principal' &&
          titulo !== 'Panel de Gerencia' && (
            <NavegacionPantallas rol={usuario.rol} />
          )}
          </div>
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
      {/* MENÚ PRINCIPAL */}
    <Route
      path="/menu"
      element={
        usuario ? (
          <Panel
            usuario={usuario}
            titulo="Menú principal"
            onLogout={manejarLogout}
          >
            <MenuPrincipal rol={usuario.rol} />
          </Panel>
        ) : (
          <Navigate to="/login" replace />
        )
      }
    />
      {/* Login */}
      <Route
        path="/login"
        element={
          usuario ? (
            <Navigate to="/menu" replace/>
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

      <Route
        path="/compras"
        element={
          <RutaProtegida usuario={usuario} rol={['mantenimiento', 'encargado']}>
            {usuario && (
              <Panel usuario={usuario} titulo="Compras" onLogout={manejarLogout}>
                <Compras esEncargado={usuario.rol === 'encargado'} />
              </Panel>
            )}
          </RutaProtegida>
        }
      />

      <Route
        path="/reservas"
        element={
          <RutaProtegida usuario={usuario} rol="encargado">
            {usuario && (
              <Panel usuario={usuario} titulo="Reservas" onLogout={manejarLogout}>
                <Reservas />
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
                <Gerencia />
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
            to={usuario ? '/menu' : '/login'}
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
