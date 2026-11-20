
from sqlmodel import Session, select

from app.models.usuario import Usuario, RolUsuario
from app.models.stock import Reserva


def preparar_notificaciones_liberacion(
    session: Session,
    reserva: Reserva,
    encargado: Usuario,
) -> list[dict]:
    """
    Prepara notificaciones simuladas sobre la liberación
    de una reserva y su impacto en el mantenimiento.
    No envía correos reales.
    """

    destinatarios = session.exec(
        select(Usuario).where(
            Usuario.activo == True,
            Usuario.rol.in_([
                RolUsuario.MANTENIMIENTO,
                RolUsuario.ENCARGADO,
                RolUsuario.GERENCIA,
            ])
        )
    ).all()

    notificaciones = []

    for usuario in destinatarios:
        notificaciones.append({
            "destinatario": usuario.email,
            "nombre": usuario.nombre,
            "asunto": "Reserva de repuesto liberada",
            "mensaje": (
                f"El encargado {encargado.nombre} "
                f"liberó la reserva {reserva.id}. "
                f"Repuesto: {reserva.codigo_repuesto}. "
                f"Cantidad liberada: {reserva.cantidad}. "
                f"Mantenimiento previsto: {reserva.motivo}. "
                "Las unidades reservadas vuelven a estar "
                "disponibles. "
                "Se debe revisar la disponibilidad para "
                "el mantenimiento planificado."
            ),
            "estado": "simulada",
        })

    return notificaciones
