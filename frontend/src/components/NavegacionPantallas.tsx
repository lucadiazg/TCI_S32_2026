
import { useLocation, useNavigate } from 'react-router-dom'
import type { RolUsuario } from '../services/authApi'

type Props = {
  rol: RolUsuario
}

const opciones = [
  {
    titulo: 'Reportar incidencias',
    ruta: '/operario',
    roles: ['operario'],
  },
  {
    titulo: 'Registrar uso de repuesto',
    ruta: '/mantenimiento',
    roles: ['mantenimiento'],
  },
  {
    titulo: 'Carga de stock',
    ruta: '/encargado',
    roles: ['encargado'],
  },
]

export default function NavegacionPantallas({ rol }: Props) {
  const navigate = useNavigate()
  const location = useLocation()

  const otrasPantallas = opciones.filter(
    (opcion) => opcion.ruta !== location.pathname
  )

  return (
    <nav className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => navigate('/menu')}
          className="min-h-14 rounded-lg bg-primary px-3 py-3 font-semibold text-white hover:opacity-90"
        >
          Menú principal
        </button>

        {otrasPantallas.map((opcion) => {
          const permitido = opcion.roles.includes(rol)

          return (
            <button
              key={opcion.ruta}
              type="button"
              disabled={!permitido}
              onClick={() => navigate(opcion.ruta)}
              className={`min-h-14 rounded-lg border px-3 py-3 font-medium ${
                permitido
                  ? 'border-primary bg-primary text-white hover:opacity-90'
                  : 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500'
              }`}
            >
              {opcion.titulo}

              {!permitido && (
                <span className="block text-xs">
                  Acceso restringido
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
