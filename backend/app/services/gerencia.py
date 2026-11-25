from sqlmodel import Session

from app.repositories.gerencia import (
    contar_incidencias_abiertas,
    contar_repuestos_bajo_umbral,
    contar_pedidos_pendientes,
    contar_reservas_activas,
    sumar_unidades_consumidas,
)


# Obtener los cinco indicadores del panel de Gerencia
def obtener_estadisticas_gerencia(session: Session) -> dict:
    return {
        "incidenciasAbiertas": contar_incidencias_abiertas(session),
        "repuestosBajoUmbral": contar_repuestos_bajo_umbral(session),
        "pedidosPendientes": contar_pedidos_pendientes(session),
        "reservasActivas": contar_reservas_activas(session),
        "unidadesConsumidas": sumar_unidades_consumidas(session),
    }