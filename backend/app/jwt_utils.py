
from datetime import datetime, timedelta, timezone
import os

import jwt
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

if not SECRET_KEY:
    raise RuntimeError("Falta configurar JWT_SECRET_KEY")


def crear_token(usuario_id: int) -> str:
    """Genera un token para identificar a un usuario."""

    vencimiento = datetime.now(timezone.utc) + timedelta(
        minutes=EXPIRE_MINUTES
    )

    datos = {
        "sub": str(usuario_id),
        "exp": vencimiento
    }

    return jwt.encode(datos, SECRET_KEY, algorithm=ALGORITHM)


def verificar_token(token: str) -> int | None:
    """Verifica un token y devuelve el ID del usuario."""

    try:
        datos = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return int(datos["sub"])

    except (jwt.InvalidTokenError, ValueError, KeyError, TypeError):
        return None
