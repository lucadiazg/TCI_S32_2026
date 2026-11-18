
from fastapi import APIRouter, Depends, HTTPException
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
