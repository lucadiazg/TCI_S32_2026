
from io import BytesIO
from urllib.parse import quote

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from app.database import get_session
from app.models.mantenimiento import Maquina

router = APIRouter(prefix="/api/maquinas", tags=["Máquinas"])


@router.get("/{codigo}", response_model=Maquina)
def obtener_maquina(
    codigo: str,
    session: Session = Depends(get_session),
):
    maquina = session.get(Maquina, codigo)

    if maquina is None:
        raise HTTPException(
            status_code=404,
            detail="La máquina indicada no existe",
        )

    return maquina


@router.get("/{codigo}/qr")
def generar_qr_maquina(
    codigo: str,
    base_url: str = Query(
        ...,
        description="URL del frontend de PharmaPlant CORE",
    ),
    session: Session = Depends(get_session),
):
    maquina = session.get(Maquina, codigo)

    if maquina is None:
        raise HTTPException(
            status_code=404,
            detail="La máquina indicada no existe",
        )

    # El QR contiene la dirección de la ficha de la máquina.
    url_maquina = (
        f"{base_url.rstrip('/')}/maquinas/"
        f"{quote(maquina.codigo, safe='')}"
    )

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )

    qr.add_data(url_maquina)
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
                f'inline; filename="qr-maquina-{codigo}.png"'
            )
        },
    )
