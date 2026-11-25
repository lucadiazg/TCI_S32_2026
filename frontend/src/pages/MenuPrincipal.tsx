
import { useNavigate } from 'react-router-dom'
import type { RolUsuario } from '../services/authApi'

type Props = {
  rol: RolUsuario
}

const opciones = [
  {
    titulo: 'Incidencias',
    descripcion: 'Reportar incidencias',
    ruta: '/operario',
    roles: ['operario'],
  },
  {
    titulo: 'Repuestos',
    descripcion: 'Consultar y gestionar repuestos',
    ruta: '/mantenimiento',
    roles: ['mantenimiento'],
  },
  {
    titulo: 'Carga de stock',
    descripcion: 'Registrar stock recibido',
    ruta: '/encargado',
    roles: ['encargado'],
  },
]

const opcionesNuevas = [
  {
    titulo: 'Compras',
    descripcion: 'Solicitar compras o gestionar pedidos y alertas según tu rol',
    ruta: '/compras',
    roles: ['mantenimiento', 'encargado'],
  },
  {
    titulo: 'Reservas',
    descripcion: 'Reservar unidades de un repuesto',
    ruta: '/reservas',
    roles: ['encargado'],
  },
  {
    titulo: 'Estadísticas',
    descripcion: 'Consultar indicadores de mantenimiento e inventario',
    ruta: '/gerencia',
    roles: ['gerencia'],
  },
]

export default function MenuPrincipal({ rol }: Props) {
  const navigate = useNavigate()

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold text-slate-800">
        Menú principal
      </h1>

      <p className="mb-8 text-slate-600">
        Seleccioná una opción para continuar.
      </p>

      <div className="flex flex-col gap-4">
        {[...opciones, ...opcionesNuevas].map((opcion) => {
          const permitido = opcion.roles.includes(rol)

          return (
            <button
              key={opcion.ruta}
              type="button"
              disabled={!permitido}
              onClick={() => navigate(opcion.ruta)}
              className={`flex min-h-28 w-full items-center gap-5 rounded-xl border p-6 text-left shadow-sm transition ${
                permitido
                  ? 'border-slate-200 bg-white hover:border-blue-500 hover:shadow-md'
                  : 'cursor-not-allowed border-slate-200 bg-slate-200 opacity-60'
              }`}
            >
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-800">
                  {opcion.titulo}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {permitido
                    ? opcion.descripcion
                    : 'Acceso restringido para tu rol'}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </main>
  )
}
