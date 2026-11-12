
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class PedidoCompra(SQLModel, table=True):
    __tablename__ = "pedidos_compra"

    id: int | None = Field(default=None, primary_key=True)
    codigo: str = Field(unique=True)
    estado: str = "pendiente"
    urgencia: str = "normal"


class PedidoItem(SQLModel, table=True):
    __tablename__ = "pedido_items"

    id: int | None = Field(default=None, primary_key=True)

    pedido_id: int = Field(foreign_key="pedidos_compra.id")
    codigo_repuesto: str = Field(foreign_key="repuestos.codigo")

    cantidad_solicitada: int = Field(ge=1)
    cantidad_recibida: int = Field(default=0, ge=0)


class Recepcion(SQLModel, table=True):
    __tablename__ = "recepciones"

    id: int | None = Field(default=None, primary_key=True)

    pedido_id: int = Field(foreign_key="pedidos_compra.id")
    codigo_repuesto: str = Field(foreign_key="repuestos.codigo")
    ubicacion_codigo: str = Field(foreign_key="ubicaciones.codigo")

    cantidad_recibida: int = Field(ge=1)

    fecha_hora: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
