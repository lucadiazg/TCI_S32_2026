
from datetime import datetime, timezone

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


class Maquina(SQLModel, table=True):
    __tablename__ = "maquinas"

    codigo: str = Field(primary_key=True)
    tag: str
    nombre: str
    linea: str | None = None
    area: str | None = None
    estado: str | None = None


class Incidencia(SQLModel, table=True):
    __tablename__ = "incidencias"

    id: int | None = Field(default=None, primary_key=True)
    codigo: str | None = Field(default=None, unique=True)

    codigo_maquina: str = Field(foreign_key="maquinas.codigo")
    descripcion: str
    estado: str = "reportada"
    turno: str

    fotos: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False)
    )

    fecha_hora: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class Reparacion(SQLModel, table=True):
    __tablename__ = "reparaciones"

    id: int | None = Field(default=None, primary_key=True)
    incidencia_id: int = Field(foreign_key="incidencias.id")
    estado: str = "en_reparacion"


class UsoRepuesto(SQLModel, table=True):
    __tablename__ = "usos_repuesto"

    id: int | None = Field(default=None, primary_key=True)

    reparacion_id: int = Field(foreign_key="reparaciones.id")
    codigo_repuesto: str = Field(foreign_key="repuestos.codigo")
    cantidad: int = Field(ge=1)

    fecha_hora: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
