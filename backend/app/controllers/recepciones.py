from fastapi import APIRouter, Depends, Path, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.database import get_session
from app.services.recepciones import registrar_recepcion_service

from app.models.compras import PedidoCompra, PedidoItem
from app.models.stock import Repuesto

#rutas de la recepcion, agrupa los endpoints
router = APIRouter(tags=["Recepciones"])


#ubicación donde se guarda el repuesto
class UbicacionRequest(BaseModel):#basemodel define y valida los datos recibidos
    codigo: str
    descripcion: str | None = None #descripcion opcional


#Datos que recibe el backend
class RecepcionRequest(BaseModel):
    codigoRepuesto: str
    cantidadRecibida: int = Field(ge=1)
    ubicacion: UbicacionRequest

#Datos del repuesto que devuelve la API
class RepuestoResponse(BaseModel):
    codigo: str
    nombre: str
    lote: str | None = None
    stockFisico: int
    stockReservado: int
    stockDisponible: int
    umbralMinimo: int

#Respuesta al registrar una recepción
class RecepcionResponse(BaseModel):
    pedidoId: int
    cantidadRecibida: int
    repuesto: RepuestoResponse

#direccion  a la que el front envia una recepcion
@router.post(
    "/pedidos/{pedidoId}/recepciones",
    status_code=201,
    response_model=RecepcionResponse
) #201 indica que el registro se creo correctamente
def registrar_recepcion( #recepcionrequet recibe datos y los valida automaticamente
    datos: RecepcionRequest,
    pedidoId: int = Path(ge=1),
    session: Session = Depends(get_session)
):
    return registrar_recepcion_service(
        session=session,
        pedido_id=pedidoId,
        codigo_repuesto=datos.codigoRepuesto,
        cantidad_recibida=datos.cantidadRecibida,
        ubicacion_codigo=datos.ubicacion.codigo,
        ubicacion_descripcion=datos.ubicacion.descripcion
    )

#Consulta un pedido de compra por id
@router.get("/pedidos/{pedidoId}")
def obtener_pedido(
    pedidoId: int = Path(ge=1),
    session: Session = Depends(get_session)
):
    #buscar el pedido en PostgreSQL
    pedido = session.get(PedidoCompra, pedidoId)

    if pedido is None:
        raise HTTPException(
            status_code=404,
            detail="El pedido de compra no existe"
        )

    #Busca repuestos asociados al pedido
    items = session.exec(
        select(PedidoItem).where(
            PedidoItem.pedido_id == pedidoId
        )
    ).all()

    detalle_items = []

    for item in items:
        repuesto = session.get(
            Repuesto,
            item.codigo_repuesto
        )

        detalle_items.append({
            "codigoRepuesto": item.codigo_repuesto,
            "nombre": repuesto.nombre if repuesto else "",
            "cantidadSolicitada": item.cantidad_solicitada,
            "cantidadRecibida": item.cantidad_recibida
        })

    return {
        "id": pedido.id,
        "codigo": pedido.codigo,
        "estado": pedido.estado,
        "items": detalle_items
    }
