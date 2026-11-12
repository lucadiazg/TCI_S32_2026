
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint
from sqlmodel import Field, SQLModel


class Ubicacion(SQLModel, table=True):
    __tablename__ = "ubicaciones"

    codigo: str = Field(primary_key=True)
    descripcion: str | None = None


class Repuesto(SQLModel, table=True):
    __tablename__ = "repuestos"

    __table_args__ = (
        CheckConstraint("stock_fisico >= 0"),
        CheckConstraint("stock_reservado >= 0"),
        CheckConstraint("stock_reservado <= stock_fisico"),
        CheckConstraint("umbral_minimo >= 0"),
    )

    codigo: str = Field(primary_key=True)
    nombre: str
    descripcion: str | None = None
    lote: str | None = None

    stock_fisico: int = 0
    stock_reservado: int = 0
    umbral_minimo: int = 0

    ubicacion_codigo: str | None = Field(
        default=None,
        foreign_key="ubicaciones.codigo"
    )

    @property
    def stock_disponible(self) -> int:
        return self.stock_fisico - self.stock_reservado


class Reserva(SQLModel, table=True):
    __tablename__ = "reservas"

    id: int | None = Field(default=None, primary_key=True)
    codigo_repuesto: str = Field(foreign_key="repuestos.codigo")
    cantidad: int = Field(ge=1)
    motivo: str
    estado: str = "activa"
    autorizada_por: int | None = None


class MovimientoStock(SQLModel, table=True):
    __tablename__ = "movimientos_stock"

    id: int | None = Field(default=None, primary_key=True)
    codigo_repuesto: str = Field(foreign_key="repuestos.codigo")
    tipo: str
    cantidad: int = Field(ge=1)
    referencia: str | None = None
    fecha_hora: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
