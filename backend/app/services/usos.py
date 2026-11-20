
import logging

from sqlmodel import Session

from app.services.alertas_stock import generar_alerta_umbral
from app.repositories.usos import (
    buscar_reparacion,
    bloquear_repuesto,
    guardar_uso,
)

logger = logging.getLogger(__name__)


class NoEncontrado(Exception):
    pass


class ConflictoUso(Exception):
    pass


class DatosInvalidos(Exception):
    pass


def registrar_uso(
    session: Session,
    reparacion_id: int,
    codigo: str,
    cantidad: int,
):
    try:
        if cantidad < 1:
            raise DatosInvalidos("La cantidad debe ser mayor que cero")

        datos_reparacion = buscar_reparacion(session, reparacion_id)

        if datos_reparacion is None:
            raise NoEncontrado("La reparación no existe")

        reparacion, _incidencia = datos_reparacion

        if reparacion.estado != "en_reparacion":
            raise ConflictoUso(
                "La reparación no admite registrar consumos"
            )

        # Bloquear el repuesto para evitar consumos simultáneos.
        repuesto = bloquear_repuesto(session, codigo)

        if repuesto is None:
            raise NoEncontrado("El repuesto no existe")

        # RN-01 y RN-05: proteger las unidades reservadas.
        if cantidad > repuesto.stock_disponible:
            raise ConflictoUso("Stock disponible insuficiente")

        # RN-01: descontar el stock físico.
        repuesto.stock_fisico -= cantidad

        # Registrar uso y movimiento de stock.
        guardar_uso(session, reparacion_id, codigo, cantidad)

        # Confirmar el descuento y los registros juntos.
        session.commit()
        session.refresh(repuesto)

        # RN-02: generar alerta de umbral mínimo.
        # Un fallo en la notificación no revierte el consumo.
        try:
            generar_alerta_umbral(session, repuesto)
        except Exception:
            logger.exception(
                "No se pudo generar la alerta de umbral para %s",
                repuesto.codigo,
            )
            session.rollback()

        return {
            "reparacionId": reparacion_id,
            "codigoRepuesto": repuesto.codigo,
            "cantidad": cantidad,
            "stockFisico": repuesto.stock_fisico,
            "stockDisponible": repuesto.stock_disponible,
            "alertaUmbral": (
                repuesto.stock_disponible <= repuesto.umbral_minimo
            ),
        }

    except Exception:
        session.rollback()
        raise
