
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, String, text
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

    id: int | None = Field(
        default=None,
        primary_key=True
    )

    # Legajo único de cinco dígitos.
    # PostgreSQL lo genera automáticamente.
    legajo: str | None = Field(
        default=None,
        sa_column=Column(
            String(5),
            unique=True,
            nullable=False,
            index=True,
            server_default=text(
                "lpad(nextval('usuarios_legajo_seq')::text, 5, '0')"
            )
        )
    )

    nombre: str

    # Correo utilizado para notificaciones
    email: str = Field(
        index=True,
        unique=True
    )

    # Contraseña almacenada como hash
    password_hash: str

    # Rol del empleado
    rol: RolUsuario = Field(
        default=RolUsuario.OPERARIO
    )

    # Indica si el empleado puede acceder al sistema
    activo: bool = Field(
        default=True
    )

    # Fecha de creación del usuario
    fecha_creacion: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
