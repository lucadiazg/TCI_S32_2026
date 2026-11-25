from fastapi import APIRouter, Depends
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


# Modelo de respuesta de las estadísticas
class EstadisticasGerenciaResponse(BaseModel):
    incidenciasAbiertas: int
    repuestosBajoUmbral: int
    pedidosPendientes: int
    reservasActivas: int
    unidadesConsumidas: int


# Consultar estadísticas exclusivamente desde el rol Gerencia
@router.get(
    "/estadisticas",
    response_model=EstadisticasGerenciaResponse
)
def consultar_estadisticas(
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(
        requiere_roles(RolUsuario.GERENCIA)
    )
):
    return obtener_estadisticas_gerencia(session)