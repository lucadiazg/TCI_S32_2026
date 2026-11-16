
from sqlmodel import Session, select

from app.models.mantenimiento import Incidencia, Reparacion, UsoRepuesto
from app.models.stock import MovimientoStock, Repuesto, Ubicacion


def listar_reparaciones(session: Session):
    consulta = (
        select(Reparacion, Incidencia)
        .join(Incidencia, Reparacion.incidencia_id == Incidencia.id)
        .where(Reparacion.estado == "en_reparacion")
        .order_by(Reparacion.id)
    )
    return session.exec(consulta).all()


def buscar_reparacion(session: Session, reparacion_id: int):
    consulta = (
        select(Reparacion, Incidencia)
        .join(Incidencia, Reparacion.incidencia_id == Incidencia.id)
        .where(Reparacion.id == reparacion_id)
    )
    return session.exec(consulta).first()


def buscar_repuesto(session: Session, codigo: str):
    repuesto = session.get(Repuesto, codigo)
    if repuesto is None:
        return None

    ubicacion = None
    if repuesto.ubicacion_codigo:
        ubicacion = session.get(Ubicacion, repuesto.ubicacion_codigo)

    return repuesto, ubicacion


def bloquear_repuesto(session: Session, codigo: str):
    consulta = (
        select(Repuesto)
        .where(Repuesto.codigo == codigo)
        .with_for_update()
    )
    return session.exec(consulta).first()


def guardar_uso(session: Session, reparacion_id: int, codigo: str, cantidad: int):
    session.add(UsoRepuesto(
        reparacion_id=reparacion_id,
        codigo_repuesto=codigo,
        cantidad=cantidad,
    ))

    session.add(MovimientoStock(
        codigo_repuesto=codigo,
        tipo="salida",
        cantidad=cantidad,
        referencia=f"reparacion:{reparacion_id}",
    ))
