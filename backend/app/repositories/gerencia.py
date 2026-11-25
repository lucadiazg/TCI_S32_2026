from sqlalchemy import func
from sqlmodel import Session, select
from datetime import datetime

from app.models.mantenimiento import Incidencia, UsoRepuesto
from app.models.stock import Repuesto, Reserva
from app.models.compras import PedidoCompra, Recepcion

# Contar las incidencias que todavía no fueron resueltas
def contar_incidencias_abiertas(
    session: Session,
    desde: datetime | None = None,
    hasta: datetime | None = None
) -> int:

    consulta = (
        select(func.count())
        .select_from(Incidencia)
        .where(
            Incidencia.estado.in_(["reportada", "en_reparacion"])
        )
    )
    consulta = filtrar_por_fecha(consulta, Incidencia.fecha_hora, desde, hasta)
    return session.exec(consulta).one()

# Contar las incidencias que fueron resueltas
def contar_incidencias_cerradas(
    session: Session,
    desde: datetime | None = None,
    hasta: datetime | None = None
) -> int:
    consulta = (
        select(func.count())
        .select_from(Incidencia)
        .where(Incidencia.estado == "resuelta")
    )
    consulta = filtrar_por_fecha(consulta, Incidencia.fecha_cierre, desde, hasta)
    return session.exec(consulta).one()

# Contar los repuestos cuyo stock disponible alcanza
# o se encuentra por debajo del umbral mínimo
def contar_repuestos_bajo_umbral(session: Session) -> int:
    consulta = (
        select(func.count())
        .select_from(Repuesto)
        .where(
            Repuesto.stock_fisico - Repuesto.stock_reservado
            <= Repuesto.umbral_minimo
        )
    )
    return session.exec(consulta).one()

# Contar los pedidos de compra pendientes
def contar_pedidos_pendientes(
    session: Session,
    desde: datetime | None = None,
    hasta: datetime | None = None
) -> int:
    consulta = (
        select(func.count())
        .select_from(PedidoCompra)
        .where(PedidoCompra.estado == "pendiente")
    )
    consulta = filtrar_por_fecha(consulta, PedidoCompra.fecha_creacion, desde, hasta)
    return session.exec(consulta).one()

# Aplicar el filtro temporal a las consultas estadísticas
def filtrar_por_fecha(
    consulta,
    campo_fecha,
    desde: datetime | None = None,
    hasta: datetime | None = None
):
    if desde is not None:
        consulta = consulta.where(campo_fecha >= desde)
    if hasta is not None:
        consulta = consulta.where(campo_fecha < hasta)
    return consulta

# Contar los pedidos de compra completados
def contar_pedidos_completos(
    session: Session,
    desde: datetime | None = None,
    hasta: datetime | None = None
) -> int:
    ultima_recepcion = (
        select(func.max(Recepcion.fecha_hora))
        .where(Recepcion.pedido_id == PedidoCompra.id)
        .correlate(PedidoCompra)
        .scalar_subquery()
    )
    consulta = (
        select(func.count())
        .select_from(PedidoCompra)
        .where(PedidoCompra.estado == "completado")
    )
    consulta = filtrar_por_fecha(
        consulta, ultima_recepcion, desde, hasta
    )
    return session.exec(consulta).one()

# Contar las reservas activas
def contar_reservas_activas(session: Session) -> int:
    consulta = (
        select(func.count())
        .select_from(Reserva)
        .where(Reserva.estado == "activa")
    )
    return session.exec(consulta).one()

# Sumar las unidades de repuestos utilizadas
def sumar_unidades_consumidas(
    session: Session,
    desde: datetime | None = None,
    hasta: datetime | None = None
) -> int:
    consulta = select(func.coalesce(func.sum(UsoRepuesto.cantidad), 0))
    consulta = filtrar_por_fecha(consulta, UsoRepuesto.fecha_hora, desde, hasta)
    return session.exec(consulta).one()

# Contar las incidencias reportadas por turno
def contar_incidencias_por_turno(
    session: Session,
    desde: datetime | None = None,
    hasta: datetime | None = None
) -> list[dict]:
    consulta = (
        select(Incidencia.turno, func.count())
        .group_by(Incidencia.turno)
    )
    consulta = filtrar_por_fecha(
        consulta, Incidencia.fecha_hora, desde, hasta
    )
    resultados = dict(session.exec(consulta).all())

    return [
        {"turno": turno, "cantidad": resultados.get(turno, 0)}
        for turno in ["mañana", "tarde", "noche"]
    ]
# Obtener las fechas de reporte de las incidencias
def obtener_fechas_incidencias_reportadas(
    session: Session,
    desde: datetime | None = None,
    hasta: datetime | None = None
) -> list[datetime]:
    consulta = select(Incidencia.fecha_hora)
    consulta = filtrar_por_fecha(
        consulta, Incidencia.fecha_hora, desde, hasta
    )
    return list(session.exec(consulta).all())
# Obtener las fechas de cierre de las incidencias
def obtener_fechas_incidencias_cerradas(
    session: Session,
    desde: datetime | None = None,
    hasta: datetime | None = None
) -> list[datetime]:
    consulta = (
        select(Incidencia.fecha_cierre)
        .where(
            Incidencia.estado == "resuelta",
            Incidencia.fecha_cierre.is_not(None)
        )
    )
    consulta = filtrar_por_fecha(
        consulta, Incidencia.fecha_cierre, desde, hasta
    )
    return list(session.exec(consulta).all())