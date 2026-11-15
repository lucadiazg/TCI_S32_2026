
from fastapi import APIRouter, Depends, Path
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session

from app.auth_dependencies import requiere_roles
from app.database import get_session
from app.models.usuario import RolUsuario
from app.repositories.usos import buscar_reparacion, listar_reparaciones
from app.services.usos import (
    ConflictoUso,
    DatosInvalidos,
    NoEncontrado,
    registrar_uso,
)

router = APIRouter(tags=["Reparaciones"])


class ReparacionResponse(BaseModel):
    id: int
    incidenciaId: int
    codigoIncidencia: str
    codigoMaquina: str
    estado: str


class UsoRequest(BaseModel):
    codigoRepuesto: str
    cantidad: int


class UsoResponse(BaseModel):
    reparacionId: int
    codigoRepuesto: str
    cantidad: int
    stockFisico: int
    stockDisponible: int
    alertaUmbral: bool


def datos_reparacion(resultado):
    reparacion, incidencia = resultado

    return {
        "id": reparacion.id,
        "incidenciaId": incidencia.id,
        "codigoIncidencia": (
            incidencia.codigo or f"INC-{incidencia.id}"
        ),
        "codigoMaquina": incidencia.codigo_maquina,
        "estado": reparacion.estado,
    }


@router.get("/reparaciones", response_model=list[ReparacionResponse])
def obtener_reparaciones(session: Session = Depends(get_session)):
    return [
        datos_reparacion(item)
        for item in listar_reparaciones(session)
    ]


@router.get(
    "/reparaciones/{reparacionId}",
    response_model=ReparacionResponse,
)
def obtener_reparacion(
    reparacionId: int = Path(ge=1),
    session: Session = Depends(get_session),
):
    resultado = buscar_reparacion(session, reparacionId)

    if resultado is None:
        return JSONResponse(
            status_code=404,
            content={"mensaje": "Reparación no encontrada"},
        )

    return datos_reparacion(resultado)


@router.post(
    "/reparaciones/{reparacionId}/usos",
    status_code=201,
    response_model=UsoResponse,
    dependencies=[
        Depends(
            requiere_roles(
                RolUsuario.MANTENIMIENTO,
                RolUsuario.ENCARGADO,
            )
        )
    ],
)
def registrar_uso_repuesto(
    datos: UsoRequest,
    reparacionId: int = Path(ge=1),
    session: Session = Depends(get_session),
):
    try:
        return registrar_uso(
            session,
            reparacionId,
            datos.codigoRepuesto,
            datos.cantidad,
        )

    except NoEncontrado as error:
        return JSONResponse(
            status_code=404,
            content={"mensaje": str(error)},
        )

    except DatosInvalidos as error:
        return JSONResponse(
            status_code=400,
            content={"mensaje": str(error)},
        )

    except ConflictoUso as error:
        return JSONResponse(
            status_code=409,
            content={"mensaje": str(error)},
        )
