
import logging

from sqlmodel import Session, select

from app.models.stock import Repuesto
from app.models.usuario import Usuario, RolUsuario


logger = logging.getLogger(__name__)


def generar_alerta_umbral(
    session: Session,
    repuesto: Repuesto,
) -> list[dict]:
    """
    RN-02: Detectar stock bajo umbral.
    RN-09: Simular la notificacion a los encargados.
    """

    stock_disponible = repuesto.stock_disponible

    if stock_disponible > repuesto.umbral_minimo:
        return []

    destinatarios = session.exec(
        select(Usuario).where(
            Usuario.activo == True,
            Usuario.rol == RolUsuario.ENCARGADO,
        )
    ).all()

    alertas = []

    for usuario in destinatarios:
        alerta = {
            "tipo": "umbral_minimo",
            "codigoRepuesto": repuesto.codigo,
            "nombreRepuesto": repuesto.nombre,
            "stockDisponible": stock_disponible,
            "umbralMinimo": repuesto.umbral_minimo,
            "destinatario": usuario.email,
            "mensaje": (
                f"El repuesto {repuesto.codigo} "
                f"({repuesto.nombre}) alcanzo su umbral minimo. "
                f"Stock disponible: {stock_disponible}. "
                f"Umbral: {repuesto.umbral_minimo}."
            ),
            "estado": "simulada",
        }

        alertas.append(alerta)

        logger.warning(
            "ALERTA STOCK | Repuesto=%s | Disponible=%s | "
            "Umbral=%s | Destinatario=%s",
            repuesto.codigo,
            stock_disponible,
            repuesto.umbral_minimo,
            usuario.email,
        )

    return alertas
