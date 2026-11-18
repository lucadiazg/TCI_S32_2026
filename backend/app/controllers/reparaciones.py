
from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.auth_dependencies import (
    obtener_usuario_actual,
    requiere_roles,
)
from app.database import get_session
from app.models.mantenimiento import Incidencia, Reparacion
from app.models.usuario import RolUsuario, Usuario
from app.repositories.usos import (
    buscar_reparacion,
    listar_reparaciones,
)
from app.services.usos import (
    ConflictoUso,
    DatosInvalidos,
    NoEncontrado,
    registrar_uso,
)

router = APIRouter(tags=["Reparaciones"])


# --------------------------------------------------
# MODELOS
# --------------------------------------------------

class ReparacionResponse(BaseModel):
    id: int
    incidenciaId: int
    codigoIncidencia: str
    codigoMaquina: str
    estado: str


class IniciarReparacionRequest(BaseModel):
    incidenciaId: int = Field(gt=0)


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


# --------------------------------------------------
# TRANSFORMAR RESPUESTA
# --------------------------------------------------

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


# --------------------------------------------------
# LISTAR REPARACIONES
# --------------------------------------------------

@router.get(
    "/reparaciones",
    response_model=list[ReparacionResponse],
)
def obtener_reparaciones(
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    return [
        datos_reparacion(item)
        for item in listar_reparaciones(session)
    ]


# --------------------------------------------------
# CONSULTAR REPARACIÓN
# --------------------------------------------------

@router.get(
    "/reparaciones/{reparacionId}",
    response_model=ReparacionResponse,
)
def obtener_reparacion(
    reparacionId: int = Path(ge=1),
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    resultado = buscar_reparacion(session, reparacionId)

    if resultado is None:
        raise HTTPException(
            status_code=404,
            detail="Reparación no encontrada",
        )

    return datos_reparacion(resultado)


# --------------------------------------------------
# INICIAR REPARACIÓN - MANTENIMIENTO
# --------------------------------------------------

@router.post(
    "/reparaciones",
    status_code=201,
    response_model=ReparacionResponse,
)
def iniciar_reparacion(
    datos: IniciarReparacionRequest,
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(
        requiere_roles(RolUsuario.MANTENIMIENTO)
    ),
):
    # Bloquear la incidencia durante la operación.
    incidencia = session.exec(
        select(Incidencia)
        .where(Incidencia.id == datos.incidenciaId)
        .with_for_update()
    ).first()

    if incidencia is None:
        raise HTTPException(
            status_code=404,
            detail="La incidencia no existe",
        )

    # No permitir iniciar reparaciones sobre incidencias
    # que ya están en reparación o fueron resueltas.
    if incidencia.estado != "reportada":
        raise HTTPException(
            status_code=409,
            detail=(
                "Solo se pueden iniciar reparaciones "
                "sobre incidencias reportadas"
            ),
        )

    # Evitar reparaciones duplicadas.
    reparacion_existente = session.exec(
        select(Reparacion).where(
            Reparacion.incidencia_id == incidencia.id
        )
    ).first()

    if reparacion_existente is not None:
        raise HTTPException(
            status_code=409,
            detail="La incidencia ya tiene una reparación asociada",
        )

    # Crear la reparación.
    nueva_reparacion = Reparacion(
        incidencia_id=incidencia.id,
        estado="en_reparacion",
    )

    # Actualizar la incidencia en la misma transacción.
    incidencia.estado = "en_reparacion"

    session.add(nueva_reparacion)
    session.add(incidencia)

    try:
        session.commit()
        session.refresh(nueva_reparacion)
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=409,
            detail="No se pudo iniciar la reparación",
        )

    return datos_reparacion(
        (nueva_reparacion, incidencia)
    )


# --------------------------------------------------
# REGISTRAR USO DE REPUESTO
# --------------------------------------------------

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
