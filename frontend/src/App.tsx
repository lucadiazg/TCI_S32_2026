import './App.css'
import ReportarIncidencia from './pages/ReportarIncidencia'
import CargarStockRecibido from './pages/CargarStockRecibido'
import RegistrarUsoRepuesto from './pages/RegistrarUsoRepuesto'

function App() {
  const ruta = window.location.pathname

  return (
    <>
      <nav className="flex justify-center gap-4 bg-slate-800 p-4">
        <a
          href="/"
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white"
        >
          Incidencias
        </a>

        <a
          href="/repuestos"
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white"
        >
          Repuestos
        </a>

        <a
          href="/recepcion"
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white"
        >
          Cargar stock
        </a>
      </nav>

      {ruta === '/recepcion' ? (
        <CargarStockRecibido />
      ) : ruta === '/repuestos' ? (
        <RegistrarUsoRepuesto />
      ) : (
        <ReportarIncidencia />
      )}
    </>
  )
}

export default App