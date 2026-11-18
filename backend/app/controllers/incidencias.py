
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlmodel import Session, select

from app.auth_dependencies import (
    obtener_usuario_actual,
    requiere_roles,
)
from app.database import get_session
from app.models.mantenimiento import Incidencia, Maquina
from app.models.usuario import RolUsuario, Usuario


router = APIRouter(
    prefix="/api/incidencias",
    tags=["Incidencias"]
)


# --------------------------------------------------
# MODELOS DE ENTRADA
# --------------------------------------------------

class IncidenciaCrear(BaseModel):
    codigo_maquina: str = Field(min_length=1)
    descripcion: str = Field(min_length=5)
    turno: str

    @field_validator("codigo_maquina", "descripcion")
    @classmethod
    def validar_texto(cls, valor: str) -> str:
        valor = valor.strip()

        if not valor:
            raise ValueError("El campo no puede estar vacío")

        return valor

    @field_validator("turno")
    @classmethod
    def validar_turno(cls, valor: str) -> str:
        valor = valor.strip().lower()

        if valor not in ["mañana", "tarde", "noche"]:
            raise ValueError(
                "El turno debe ser mañana, tarde o noche"
            )

        return valor


class IncidenciaActualizarEstado(BaseModel):
    estado: str


# --------------------------------------------------
# CONSULTAR INCIDENCIAS
# --------------------------------------------------

@router.get("/")
def listar_incidencias(
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    consulta = select(Incidencia)

    # Los operarios solamente ven sus incidencias.
    # Los demás roles pueden consultar todas.
    if usuario.rol == RolUsuario.OPERARIO:
        consulta = consulta.where(
            Incidencia.usuario_reportante_id == usuario.id
        )

    return session.exec(consulta).all()


# --------------------------------------------------
# REPORTAR INCIDENCIA - OPERARIO
# --------------------------------------------------

@router.post("/", status_code=201)
def crear_incidencia(
    datos: IncidenciaCrear,
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(
        requiere_roles(RolUsuario.OPERARIO)
    )
):
    # Verificar que la máquina exista
    maquina = session.get(
        Maquina,
        datos.codigo_maquina
    )

    if maquina is None:
        raise HTTPException(
            status_code=404,
            detail="La máquina indicada no existe"
        )

    # Registrar automáticamente al usuario autenticado
    nueva_incidencia = Incidencia(
        codigo_maquina=datos.codigo_maquina,
        descripcion=datos.descripcion,
        turno=datos.turno,
        usuario_reportante_id=usuario.id
    )

    session.add(nueva_incidencia)
    session.commit()
    session.refresh(nueva_incidencia)

    return nueva_incidencia


# --------------------------------------------------
# CONSULTAR UNA INCIDENCIA
# --------------------------------------------------

@router.get("/{incidencia_id}")
def obtener_incidencia(
    incidencia_id: int,
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    incidencia = session.get(
        Incidencia,
        incidencia_id
    )

    if incidencia is None:
        raise HTTPException(
            status_code=404,
            detail="La incidencia no existe"
        )

    # Un operario no puede consultar incidencias ajenas
    if (
        usuario.rol == RolUsuario.OPERARIO
        and incidencia.usuario_reportante_id != usuario.id
    ):
        raise HTTPException(
            status_code=403,
            detail="No tenés permiso para consultar esta incidencia"
        )

    return incidencia


# --------------------------------------------------
# ACTUALIZAR ESTADO - MANTENIMIENTO
# --------------------------------------------------

@router.patch("/{incidencia_id}/estado")
def actualizar_estado_incidencia(
    incidencia_id: int,
    datos: IncidenciaActualizarEstado,
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(
        requiere_roles(RolUsuario.MANTENIMIENTO)
    )
):
    incidencia = session.get(
        Incidencia,
        incidencia_id
    )

    if incidencia is None:
        raise HTTPException(
            status_code=404,
            detail="La incidencia no existe"
        )

    estados_validos = [
        "reportada",
        "en_reparacion",
        "resuelta"
    ]

    if datos.estado not in estados_validos:
        raise HTTPException(
            status_code=400,
            detail="Estado de incidencia no válido"
        )

    incidencia.estado = datos.estado

    session.add(incidencia)
    session.commit()
    session.refresh(incidencia)

    return incidencia
