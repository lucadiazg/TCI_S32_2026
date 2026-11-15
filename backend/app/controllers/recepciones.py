from fastapi import APIRouter, Depends, Path
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.database import get_session
from app.services.recepciones import registrar_recepcion_service

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