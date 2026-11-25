from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from app.auth_dependencies import requiere_roles
from app.database import get_session
from app.models.usuario import RolUsuario, Usuario
from app.services.gerencia import obtener_estadisticas_gerencia


router = APIRouter(
    prefix="/gerencia",
    tags=["Gerencia"]
)

# Modelo de respuesta de la evolución temporal
class EvolucionIncidenciasResponse(BaseModel):
    fecha: date
    reportadas: int
    cerradas: int

# Modelo de respuesta de la evolución temporal
class EvolucionIncidenciasResponse(BaseModel):
    fecha: date
    reportadas: int
    cerradas: int

# Modelo de respuesta de incidencias por turno
class IncidenciasPorTurnoResponse(BaseModel):
    turno: str
    cantidad: int

# Modelo de respuesta de las estadísticas
class EstadisticasGerenciaResponse(BaseModel):
    incidenciasAbiertas: int
    repuestosBajoUmbral: int
    pedidosPendientes: int
    reservasActivas: int
    unidadesConsumidas: int
    incidenciasCerradas: int
    pedidosCompletos: int
    agrupacionIncidencias: str
    evolucionIncidencias: list[EvolucionIncidenciasResponse]
    incidenciasPorTurno: list[IncidenciasPorTurnoResponse]


# Consultar estadísticas exclusivamente desde el rol Gerencia
@router.get(
    "/estadisticas",
    response_model=EstadisticasGerenciaResponse
)
def consultar_estadisticas(
    desde: date | None = None,
    hasta: date | None = None,
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(
        requiere_roles(RolUsuario.GERENCIA)
    )
):
    try:
        return obtener_estadisticas_gerencia(session, desde, hasta)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))