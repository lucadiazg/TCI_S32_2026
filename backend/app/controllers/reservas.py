
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.auth_dependencies import requiere_roles
from app.database import get_session
from app.models.stock import Repuesto, Reserva, MovimientoStock
from app.models.usuario import RolUsuario, Usuario
from app.services.notificaciones_reservas import (
    preparar_notificaciones_liberacion,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/reservas",
    tags=["Reservas"],
)


class CrearReservaRequest(BaseModel):
    codigoRepuesto: str = Field(min_length=1)
    cantidad: int = Field(ge=1)
    motivo: str = Field(min_length=1)


# ============================================================
# RN-05: CREAR RESERVA
# ============================================================

@router.post("", status_code=201)
def crear_reserva(
    datos: CrearReservaRequest,
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(
        requiere_roles(
            RolUsuario.MANTENIMIENTO,
            RolUsuario.ENCARGADO,
        )
    ),
):
    motivo = datos.motivo.strip()

    if not motivo:
        raise HTTPException(
            status_code=400,
            detail="El motivo no puede estar vacío",
        )

    try:
        # Bloquear el repuesto para evitar reservas simultáneas.
        repuesto = session.exec(
            select(Repuesto)
            .where(Repuesto.codigo == datos.codigoRepuesto)
            .with_for_update()
        ).first()

        if repuesto is None:
            raise HTTPException(
                status_code=404,
                detail="El repuesto no existe",
            )

        # No permitir reservas superiores al stock disponible.
        if datos.cantidad > repuesto.stock_disponible:
            raise HTTPException(
                status_code=409,
                detail="Stock disponible insuficiente para reservar",
            )

        reserva = Reserva(
            codigo_repuesto=repuesto.codigo,
            cantidad=datos.cantidad,
            motivo=motivo,
            estado="activa",
        )

        # Reservar unidades sin descontar el stock físico.
        repuesto.stock_reservado += datos.cantidad

        session.add(reserva)
        session.add(repuesto)

        # Obtener el ID antes de registrar el movimiento.
        session.flush()

        session.add(
            MovimientoStock(
                codigo_repuesto=repuesto.codigo,
                tipo="reserva",
                cantidad=datos.cantidad,
                referencia=f"reserva:{reserva.id}",
            )
        )

        # Confirmar todos los cambios en una transacción.
        session.commit()

        session.refresh(reserva)
        session.refresh(repuesto)

        return {
            "id": reserva.id,
            "codigoRepuesto": reserva.codigo_repuesto,
            "cantidad": reserva.cantidad,
            "motivo": reserva.motivo,
            "estado": reserva.estado,
            "stockFisico": repuesto.stock_fisico,
            "stockReservado": repuesto.stock_reservado,
            "stockDisponible": repuesto.stock_disponible,
        }

    except HTTPException:
        session.rollback()
        raise

    except Exception:
        session.rollback()
        logger.exception("Error al crear reserva")
        raise HTTPException(
            status_code=500,
            detail="No se pudo crear la reserva",
        )


# ============================================================
# RN-05: LIBERAR RESERVA CON AUTORIZACIÓN DEL ENCARGADO
# ============================================================

@router.post("/{reserva_id}/liberar")
def liberar_reserva(
    reserva_id: int,
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(
        requiere_roles(RolUsuario.ENCARGADO)
    ),
):
    try:
        # Bloquear la reserva para evitar liberaciones simultáneas.
        reserva = session.exec(
            select(Reserva)
            .where(Reserva.id == reserva_id)
            .with_for_update()
        ).first()

        if reserva is None:
            raise HTTPException(
                status_code=404,
                detail="La reserva no existe",
            )

        if reserva.estado != "activa":
            raise HTTPException(
                status_code=409,
                detail="La reserva ya no está activa",
            )

        # Bloquear el repuesto antes de modificar su stock.
        repuesto = session.exec(
            select(Repuesto)
            .where(Repuesto.codigo == reserva.codigo_repuesto)
            .with_for_update()
        ).first()

        if repuesto is None:
            raise HTTPException(
                status_code=404,
                detail="El repuesto no existe",
            )

        if repuesto.stock_reservado < reserva.cantidad:
            raise HTTPException(
                status_code=409,
                detail="Inconsistencia en el stock reservado",
            )

        # Liberar unidades reservadas.
        # El stock físico permanece sin cambios.
        repuesto.stock_reservado -= reserva.cantidad

        # Registrar la autorización.
        reserva.estado = "liberada"
        reserva.autorizada_por = usuario.id

        session.add(reserva)
        session.add(repuesto)

        # Registrar movimiento para trazabilidad.
        session.add(
            MovimientoStock(
                codigo_repuesto=repuesto.codigo,
                tipo="liberacion_reserva",
                cantidad=reserva.cantidad,
                referencia=f"reserva:{reserva.id}",
            )
        )

        # Confirmar liberación y movimiento juntos.
        session.commit()

        session.refresh(reserva)
        session.refresh(repuesto)

        # RN-05: notificar la liberación y su posible impacto.
        # Si falla la notificación, no se revierte la liberación.
        try:
            notificaciones = preparar_notificaciones_liberacion(
                session,
                reserva,
                usuario,
            )

            for notificacion in notificaciones:
                logger.warning(
                    "NOTIFICACION RESERVA | "
                    "Destinatario=%s | Asunto=%s | Mensaje=%s",
                    notificacion["destinatario"],
                    notificacion["asunto"],
                    notificacion["mensaje"],
                )

        except Exception:
            logger.exception(
                "No se pudieron preparar las notificaciones "
                "de la reserva %s",
                reserva.id,
            )
            session.rollback()
            notificaciones = []

        return {
            "reservaId": reserva.id,
            "estado": reserva.estado,
            "autorizadaPor": usuario.id,
            "codigoRepuesto": repuesto.codigo,
            "cantidadLiberada": reserva.cantidad,
            "stockFisico": repuesto.stock_fisico,
            "stockReservado": repuesto.stock_reservado,
            "stockDisponible": repuesto.stock_disponible,
            "notificaciones": notificaciones,
        }

    except HTTPException:
        session.rollback()
        raise

    except Exception:
        session.rollback()
        logger.exception("Error al liberar reserva")
        raise HTTPException(
            status_code=500,
            detail="No se pudo liberar la reserva",
        )
