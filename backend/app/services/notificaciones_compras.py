
from sqlmodel import Session, select

from app.models.usuario import Usuario, RolUsuario
from app.models.compras import PedidoCompra


def preparar_notificaciones_compra_urgente(
    session: Session,
    pedido: PedidoCompra
) -> list[dict]:
    """
    Prepara notificaciones simuladas para los usuarios
    activos de Encargado y Gerencia.

    No envía correos reales.
    """

    if pedido.urgencia != "urgente":
        return []

    destinatarios = session.exec(
        select(Usuario).where(
            Usuario.activo == True,
            Usuario.rol.in_([
                RolUsuario.ENCARGADO,
                RolUsuario.GERENCIA
            ])
        )
    ).all()

    notificaciones = []

    for usuario in destinatarios:
        notificaciones.append({
            "destinatario": usuario.email,
            "nombre": usuario.nombre,
            "asunto": "Pedido de compra urgente",
            "mensaje": (
                f"Se generó el pedido urgente {pedido.codigo}. "
                "Requiere atención prioritaria."
            ),
            "estado": "simulada"
        })

    return notificaciones
