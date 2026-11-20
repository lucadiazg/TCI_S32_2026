
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session

from app.database import get_session
from app.repositories.usos import buscar_repuesto
from io import BytesIO
from urllib.parse import quote

import qrcode
from fastapi import HTTPException, Query
from fastapi.responses import StreamingResponse

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

@router.get("/repuestos/{codigo}/qr")
def generar_qr_repuesto(
    codigo: str,
    base_url: str = Query(
        ...,
        description="URL del frontend de PharmaPlant CORE",
    ),
    session: Session = Depends(get_session),
):
    # Verificar que el repuesto exista.
    resultado = buscar_repuesto(session, codigo)

    if resultado is None:
        raise HTTPException(
            status_code=404,
            detail="Repuesto no encontrado",
        )

    # Construir el enlace a la ficha del repuesto.
    url_repuesto = (
        f"{base_url.rstrip('/')}/repuestos/"
        f"{quote(codigo, safe='')}"
    )

    # Generar el código QR.
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )

    qr.add_data(url_repuesto)
    qr.make(fit=True)

    imagen = qr.make_image(
        fill_color="black",
        back_color="white",
    )

    buffer = BytesIO()
    imagen.save(buffer, format="PNG")
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="image/png",
        headers={
            "Content-Disposition": (
                f'inline; filename="qr-repuesto-{codigo}.png"'
            )
        },
    )
