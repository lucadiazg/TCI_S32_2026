
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel, Field, field_validator
from app.models.mantenimiento import Incidencia, Maquina

from app.database import get_session


router = APIRouter(
    prefix="/api/incidencias",
    tags=["Incidencias"]
)


@router.get("/")
def listar_incidencias(
    session: Session = Depends(get_session)
):
    incidencias = session.exec(
        select(Incidencia)
    ).all()

    return incidencias


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



@router.post("/", status_code=201)
def crear_incidencia(
    datos: IncidenciaCrear,
    session: Session = Depends(get_session)
):
    # Primero verificamos que la máquina exista
    maquina = session.get(Maquina, datos.codigo_maquina)

    if maquina is None:
        raise HTTPException(
            status_code=404,
            detail="La máquina indicada no existe"
        )

    # Si existe, creamos la incidencia
    nueva_incidencia = Incidencia(
        codigo_maquina=datos.codigo_maquina,
        descripcion=datos.descripcion,
        turno=datos.turno
    )

    session.add(nueva_incidencia)
    session.commit()
    session.refresh(nueva_incidencia)

    return nueva_incidencia


@router.get("/{incidencia_id}")
def obtener_incidencia(
    incidencia_id: int,
    session: Session = Depends(get_session)
):
    incidencia = session.get(Incidencia, incidencia_id)

    if incidencia is None:
        raise HTTPException(
            status_code=404,
            detail="La incidencia no existe"
        )

    return incidencia

class IncidenciaActualizarEstado(BaseModel):
    estado: str


@router.patch("/{incidencia_id}/estado")
def actualizar_estado_incidencia(
    incidencia_id: int,
    datos: IncidenciaActualizarEstado,
    session: Session = Depends(get_session)
):
    incidencia = session.get(Incidencia, incidencia_id)

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
