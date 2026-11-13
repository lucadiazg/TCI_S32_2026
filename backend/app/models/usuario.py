
from datetime import datetime, timezone
from enum import Enum

from sqlmodel import SQLModel, Field


# Roles que pueden tener los usuarios
class RolUsuario(str, Enum):
    OPERARIO = "operario"
    MANTENIMIENTO = "mantenimiento"
    ENCARGADO = "encargado"
    GERENCIA = "gerencia"


# Tabla de usuarios
class Usuario(SQLModel, table=True):
    __tablename__ = "usuarios"

    id: int | None = Field(default=None, primary_key=True)

    nombre: str
    email: str = Field(index=True, unique=True)

    password_hash: str

    rol: RolUsuario = Field(default=RolUsuario.OPERARIO)

    activo: bool = Field(default=True)

    fecha_creacion: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
