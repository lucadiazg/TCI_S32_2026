
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.database import engine
from app.jwt_utils import verificar_token
from app.models.usuario import Usuario
from collections.abc import Callable
from app.models.usuario import RolUsuario

seguridad = HTTPBearer()


def obtener_usuario_actual(
    credenciales: HTTPAuthorizationCredentials = Depends(seguridad),
) -> Usuario:
    usuario_id = verificar_token(credenciales.credentials)

    if usuario_id is None:
        raise HTTPException(
            status_code=401,
            detail="Token inválido o vencido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    with Session(engine) as session:
        usuario = session.get(Usuario, usuario_id)

        if usuario is None or not usuario.activo:
            raise HTTPException(
                status_code=401,
                detail="Usuario inexistente o inactivo",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return usuario

def requiere_roles(*roles_permitidos: RolUsuario) -> Callable:
    """Permite el acceso solamente a determinados roles."""

    def verificar_rol(
        usuario: Usuario = Depends(obtener_usuario_actual)
    ) -> Usuario:

        if usuario.rol not in roles_permitidos:
            raise HTTPException(
                status_code=403,
                detail="No tenés permisos para realizar esta acción"
            )

        return usuario

    return verificar_rol
