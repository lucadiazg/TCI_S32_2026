
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from fastapi import Depends
from app.auth_dependencies import obtener_usuario_actual



from app.database import engine
from app.models.usuario import Usuario
from app.security import verify_password
from app.jwt_utils import crear_token


router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(datos: LoginRequest):
    with Session(engine) as session:
        usuario = session.exec(
            select(Usuario).where(Usuario.email == datos.email)
        ).first()

        if (
            usuario is None
            or not usuario.activo
            or not verify_password(datos.password, usuario.password_hash)
        ):
            raise HTTPException(
                status_code=401,
                detail="Correo o contraseña incorrectos"
            )

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
        "nombre": usuario.nombre,
        "email": usuario.email,
        "rol": usuario.rol,
        "activo": usuario.activo
    }
