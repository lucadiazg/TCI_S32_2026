
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.auth_dependencies import obtener_usuario_actual
from app.database import engine
from app.jwt_utils import crear_token
from app.models.usuario import Usuario
from app.security import verify_password


router = APIRouter(
    prefix="/api/auth",
    tags=["Autenticación"]
)


# Datos requeridos para iniciar sesión
class LoginRequest(BaseModel):
    legajo: str = Field(
        min_length=5,
        max_length=5,
        pattern=r"^[0-9]{5}$"
    )
    password: str


@router.post("/login")
def login(datos: LoginRequest):
    with Session(engine) as session:

        # Buscar al empleado por su legajo
        usuario = session.exec(
            select(Usuario).where(
                Usuario.legajo == datos.legajo
            )
        ).first()

        # Verificar usuario, estado y contraseña
        if (
            usuario is None
            or not usuario.activo
            or not verify_password(
                datos.password,
                usuario.password_hash
            )
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Legajo o contraseña incorrectos"
            )

        # Generar JWT asociado al ID del usuario
        token = crear_token(usuario.id)

        return {
            "access_token": token,
            "token_type": "bearer"
        }


@router.get("/me")
def obtener_mi_perfil(
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    return {
        "id": usuario.id,
        "legajo": usuario.legajo,
        "nombre": usuario.nombre,
        "email": usuario.email,
        "rol": usuario.rol,
        "activo": usuario.activo
    }
