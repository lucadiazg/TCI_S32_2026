import os
import httpx
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
    captcha_token: str = Field(min_length=1)

def verificar_captcha(token: str) -> bool:
    secret = os.getenv("HCAPTCHA_SECRET")

    if not secret:
        raise HTTPException(
            status_code=500,
            detail="hCaptcha no está configurado en el servidor"
        )

    try:
        respuesta = httpx.post(
            "https://api.hcaptcha.com/siteverify",
            data={
                "secret": secret,
                "response": token
            },
            timeout=10.0
        )
        respuesta.raise_for_status()

    except httpx.HTTPError:
        raise HTTPException(
            status_code=503,
            detail="No se pudo verificar hCaptcha"
        )

    return respuesta.json().get("success", False)

@router.post("/login")
def login(datos: LoginRequest):
    if not verificar_captcha(datos.captcha_token):
        raise HTTPException(
            status_code=400,
            detail="Verificación de hCaptcha inválida"
        )
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
