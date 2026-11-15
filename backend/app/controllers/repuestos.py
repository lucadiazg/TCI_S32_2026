
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session

from app.database import get_session
from app.repositories.usos import buscar_repuesto

router = APIRouter(tags=["Repuestos"])


class UbicacionResponse(BaseModel):
    codigo: str
    descripcion: str | None = None


class RepuestoResponse(BaseModel):
    codigo: str
    nombre: str
    lote: str | None = None
    stockFisico: int
    stockReservado: int
    stockDisponible: int
    umbralMinimo: int
    ubicacion: UbicacionResponse | None = None


@router.get("/repuestos/{codigo}", response_model=RepuestoResponse)
def obtener_repuesto(
    codigo: str,
    session: Session = Depends(get_session),
):
    resultado = buscar_repuesto(session, codigo)

    if resultado is None:
        return JSONResponse(
            status_code=404,
            content={"mensaje": "Repuesto no encontrado"},
        )

    repuesto, ubicacion = resultado

    return {
        "codigo": repuesto.codigo,
        "nombre": repuesto.nombre,
        "lote": repuesto.lote,
        "stockFisico": repuesto.stock_fisico,
        "stockReservado": repuesto.stock_reservado,
        "stockDisponible": repuesto.stock_disponible,
        "umbralMinimo": repuesto.umbral_minimo,
        "ubicacion": (
            {
                "codigo": ubicacion.codigo,
                "descripcion": ubicacion.descripcion,
            }
            if ubicacion else None
        ),
    }
