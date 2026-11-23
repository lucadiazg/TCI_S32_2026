
const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8001'

export type RolUsuario =
  | 'operario'
  | 'mantenimiento'
  | 'encargado'
  | 'gerencia'

export interface Usuario {
  id: number
  legajo: string
  nombre: string
  email: string
  rol: RolUsuario
  activo: boolean
}

interface LoginResponse {
  access_token: string
  token_type: string
}

const TOKEN_KEY = 'pharmaplant_token'

// Iniciar sesión con legajo y contraseña
export async function iniciarSesion(
  legajo: string,
  password: string,
  captchaToken: string
): Promise<string> {
  const respuesta = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ legajo, password, captcha_token: captchaToken, }),
  })

  if (!respuesta.ok) {
    if (respuesta.status === 401) {
      throw new Error('Legajo o contraseña incorrectos')
    }

    throw new Error('No se pudo iniciar sesión')
  }

  const datos: LoginResponse = await respuesta.json()

  sessionStorage.setItem(TOKEN_KEY, datos.access_token)

  return datos.access_token
}

// Obtener el token de la sesión
export function obtenerToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

// Consultar el perfil del usuario autenticado
export async function obtenerPerfil(): Promise<Usuario> {
  const token = obtenerToken()

  if (!token) {
    throw new Error('No hay una sesión activa')
  }

  const respuesta = await fetch(`${API_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!respuesta.ok) {
    cerrarSesion()
    throw new Error('La sesión venció o no es válida')
  }

  return respuesta.json()
}

// Cerrar sesión
export function cerrarSesion(): void {
  sessionStorage.removeItem(TOKEN_KEY)
}

// Determinar la pantalla inicial según el rol
export function obtenerRutaPorRol(rol: RolUsuario): string {
  switch (rol) {
    case 'operario':
      return '/operario'

    case 'mantenimiento':
      return '/mantenimiento'

    case 'encargado':
      return '/encargado'

    case 'gerencia':
      return '/gerencia'
  }
}
