
from sqlmodel import Session

from app.repositories.usos import (
    buscar_reparacion,
    bloquear_repuesto,
    guardar_uso,
)


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

        # Bloqueamos el repuesto antes de comprobar el stock.
        repuesto = bloquear_repuesto(session, codigo)

        if repuesto is None:
            raise NoEncontrado("El repuesto no existe")

        # RN-01 y RN-05: no consumir las unidades reservadas.
        if cantidad > repuesto.stock_disponible:
            raise ConflictoUso("Stock disponible insuficiente")

        repuesto.stock_fisico -= cantidad

        guardar_uso(session, reparacion_id, codigo, cantidad)

        # Descuento y movimientos se confirman juntos.
        session.commit()
        session.refresh(repuesto)

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
