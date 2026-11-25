from sqlalchemy import func
from sqlmodel import Session, select

from app.models.mantenimiento import Incidencia, UsoRepuesto
from app.models.stock import Repuesto, Reserva
from app.models.compras import PedidoCompra


# Contar las incidencias que todavía no fueron resueltas
def contar_incidencias_abiertas(session: Session) -> int:
    consulta = (
        select(func.count())
        .select_from(Incidencia)
        .where(
            Incidencia.estado.in_(["reportada", "en_reparacion"])
        )
    )
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
def contar_pedidos_pendientes(session: Session) -> int:
    consulta = (
        select(func.count())
        .select_from(PedidoCompra)
        .where(PedidoCompra.estado == "pendiente")
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
def sumar_unidades_consumidas(session: Session) -> int:
    consulta = select(func.coalesce(func.sum(UsoRepuesto.cantidad), 0))
    return session.exec(consulta).one()