
from typing import Literal
from uuid import uuid4
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.database import get_session
from app.models.stock import Repuesto
from app.models.compras import PedidoCompra, PedidoItem, SolicitudCompra
from app.models.usuario import Usuario
from app.auth_dependencies import requiere_roles
from app.services.notificaciones_compras import (
    preparar_notificaciones_compra_urgente,
)


router = APIRouter(prefix="/compras", tags=["Compras"])
logger = logging.getLogger(__name__)


# ============================================================
# ESQUEMAS DE ENTRADA
# ============================================================

class SolicitudCompraRequest(BaseModel):
    codigoRepuesto: str = Field(min_length=1)
    cantidadSolicitada: int = Field(ge=1)
    motivo: str = Field(min_length=1)


class GenerarPedidoCompraRequest(BaseModel):
    solicitudesIds: list[int] = Field(min_length=1)
    urgencia: Literal["normal", "urgente"] = "normal"


# ============================================================
# RN-03: CONSULTAR LISTA DE COMPRAS
# ============================================================

@router.get(
    "/lista",
    dependencies=[Depends(requiere_roles("encargado"))],
)
def consultar_lista_compras(
    session: Session = Depends(get_session),
):
    repuestos = session.exec(select(Repuesto)).all()

    solicitudes = session.exec(
        select(SolicitudCompra).where(
            SolicitudCompra.estado == "pendiente",
            SolicitudCompra.pedido_id.is_(None),
        )
    ).all()

    lista_compras = []

    for repuesto in repuestos:
        disponible = repuesto.stock_disponible

        solicitudes_repuesto = [
            solicitud
            for solicitud in solicitudes
            if solicitud.codigo_repuesto == repuesto.codigo
        ]

        bajo_umbral = disponible <= repuesto.umbral_minimo

        if bajo_umbral or solicitudes_repuesto:
            lista_compras.append({
                "codigo": repuesto.codigo,
                "nombre": repuesto.nombre,
                "stockFisico": repuesto.stock_fisico,
                "stockReservado": repuesto.stock_reservado,
                "stockDisponible": disponible,
                "umbralMinimo": repuesto.umbral_minimo,
                "bajoUmbral": bajo_umbral,
                "solicitudesPendientes": [
                    {
                        "id": solicitud.id,
                        "cantidadSolicitada": solicitud.cantidad_solicitada,
                        "motivo": solicitud.motivo,
                        "usuarioSolicitanteId": (
                            solicitud.usuario_solicitante_id
                        ),
                    }
                    for solicitud in solicitudes_repuesto
                ],
            })

    return {
        "total": len(lista_compras),
        "repuestos": lista_compras,
    }


# ============================================================
# RN-03: REGISTRAR SOLICITUD DE COMPRA
# ============================================================

@router.post("/solicitudes", status_code=201)
def registrar_solicitud_compra(
    datos: SolicitudCompraRequest,
    usuario: Usuario = Depends(requiere_roles("mantenimiento")),
    session: Session = Depends(get_session),
):
    repuesto = session.get(Repuesto, datos.codigoRepuesto)

    if repuesto is None:
        raise HTTPException(
            status_code=404,
            detail="El repuesto indicado no existe",
        )

    motivo = datos.motivo.strip()

    if not motivo:
        raise HTTPException(
            status_code=400,
            detail="El motivo no puede estar vacío",
        )

    if repuesto.stock_disponible >= datos.cantidadSolicitada:
        raise HTTPException(
            status_code=400,
            detail="Existe stock suficiente para la cantidad solicitada",
        )

    solicitud = SolicitudCompra(
        codigo_repuesto=datos.codigoRepuesto,
        cantidad_solicitada=datos.cantidadSolicitada,
        motivo=motivo,
        estado="pendiente",
        usuario_solicitante_id=usuario.id,
    )

    session.add(solicitud)

    try:
        session.commit()
        session.refresh(solicitud)
    except Exception:
        session.rollback()
        logger.exception("Error al registrar solicitud de compra")
        raise HTTPException(
            status_code=500,
            detail="No se pudo registrar la solicitud de compra",
        )

    return {
        "id": solicitud.id,
        "codigoRepuesto": solicitud.codigo_repuesto,
        "cantidadSolicitada": solicitud.cantidad_solicitada,
        "motivo": solicitud.motivo,
        "estado": solicitud.estado,
        "usuarioSolicitanteId": solicitud.usuario_solicitante_id,
    }


# ============================================================
# RN-03 / RN-04: GENERAR PEDIDO DE COMPRA
# ============================================================

@router.post("/pedidos", status_code=201)
def generar_pedido_compra(
    datos: GenerarPedidoCompraRequest,
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(requiere_roles("encargado")),
):
    # 1. Validar identificadores repetidos.
    if len(datos.solicitudesIds) != len(set(datos.solicitudesIds)):
        raise HTTPException(
            status_code=400,
            detail="No se pueden repetir solicitudes en un mismo pedido",
        )

    # 2. Validar que los identificadores sean positivos.
    if any(
        id_solicitud <= 0
        for id_solicitud in datos.solicitudesIds
    ):
        raise HTTPException(
            status_code=400,
            detail="Los identificadores deben ser positivos",
        )

    try:
        # 3. Bloquear las solicitudes seleccionadas.
        # Evita que dos encargados procesen las mismas solicitudes.
        solicitudes = session.exec(
            select(SolicitudCompra)
            .where(
                SolicitudCompra.id.in_(datos.solicitudesIds)
            )
            .order_by(SolicitudCompra.id)
            .with_for_update()
        ).all()

        # 4. Verificar que todas existan.
        if len(solicitudes) != len(datos.solicitudesIds):
            raise HTTPException(
                status_code=404,
                detail="Una o más solicitudes no existen",
            )

        # 5. Verificar que sigan pendientes.
        for solicitud in solicitudes:
            if (
                solicitud.estado != "pendiente"
                or solicitud.pedido_id is not None
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"La solicitud {solicitud.id} "
                        "ya fue procesada"
                    ),
                )

        # 6. Agrupar las cantidades por repuesto.
        cantidades = {}

        for solicitud in solicitudes:
            codigo = solicitud.codigo_repuesto

            cantidades[codigo] = (
                cantidades.get(codigo, 0)
                + solicitud.cantidad_solicitada
            )

        # 7. Crear el pedido de compra.
        pedido = PedidoCompra(
            codigo=f"PC-{uuid4().hex.upper()}",
            estado="pendiente",
            urgencia=datos.urgencia,
        )

        session.add(pedido)

        # Obtener el ID antes de crear los ítems.
        session.flush()

        # 8. Crear los ítems del pedido.
        for codigo, cantidad in cantidades.items():
            item = PedidoItem(
                pedido_id=pedido.id,
                codigo_repuesto=codigo,
                cantidad_solicitada=cantidad,
                cantidad_recibida=0,
            )

            session.add(item)

        # 9. Vincular las solicitudes al pedido.
        for solicitud in solicitudes:
            solicitud.estado = "procesada"
            solicitud.pedido_id = pedido.id

            session.add(solicitud)

        # 10. Confirmar todos los cambios juntos.
        session.commit()

    except HTTPException:
        session.rollback()
        raise

    except Exception:
        session.rollback()
        logger.exception("Error al generar pedido de compra")
        raise HTTPException(
            status_code=500,
            detail="No se pudo generar el pedido de compra",
        )

    # ========================================================
    # RN-04: NOTIFICACIONES DE COMPRAS URGENTES
    # ========================================================

    # Este proceso se ejecuta después del commit.
    # Si falla, el pedido ya generado no se pierde.

    notificaciones = []
    estado_notificacion = "no_requerida"

    if datos.urgencia == "urgente":
        try:
            notificaciones = preparar_notificaciones_compra_urgente(
                session,
                pedido,
            )

            estado_notificacion = "simulada"

        except Exception:
            session.rollback()
            logger.exception(
                "Error al preparar notificaciones del pedido %s",
                pedido.codigo,
            )
            estado_notificacion = "error"

    # 11. Devolver el pedido generado.
    return {
        "id": pedido.id,
        "codigo": pedido.codigo,
        "estado": pedido.estado,
        "urgencia": pedido.urgencia,
        "solicitudesIds": datos.solicitudesIds,
        "items": [
            {
                "codigoRepuesto": codigo,
                "cantidadSolicitada": cantidad,
            }
            for codigo, cantidad in cantidades.items()
        ],
        "notificaciones": notificaciones,
        "estadoNotificacion": estado_notificacion,
    }
