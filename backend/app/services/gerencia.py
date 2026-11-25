from datetime import date, datetime, timedelta, timezone
from sqlmodel import Session

from app.repositories.gerencia import (
    contar_incidencias_abiertas,
    contar_repuestos_bajo_umbral,
    contar_pedidos_pendientes,
    contar_reservas_activas,
    sumar_unidades_consumidas,
    contar_incidencias_cerradas,
    contar_pedidos_completos,
    contar_incidencias_por_turno,
    obtener_fechas_incidencias_reportadas,
    obtener_fechas_incidencias_cerradas,
)

ZONA_HORARIA_ARGENTINA = timezone(timedelta(hours=-3))

# Convertir el rango de fechas seleccionado a límites UTC
def obtener_limites_temporales(
    desde: date | None,
    hasta: date | None
) -> tuple[datetime | None, datetime | None]:

    if desde is None and hasta is None:
        return None, None

    if desde is None or hasta is None:
        raise ValueError("Debe indicar ambas fechas")

    if desde > hasta:
        raise ValueError("La fecha desde no puede ser posterior a la fecha hasta")

    inicio = datetime.combine(
        desde, datetime.min.time(), tzinfo=ZONA_HORARIA_ARGENTINA
    )

    fin = datetime.combine(
        hasta + timedelta(days=1),
        datetime.min.time(),
        tzinfo=ZONA_HORARIA_ARGENTINA
    )

    return inicio.astimezone(timezone.utc), fin.astimezone(timezone.utc)

# Determinar la agrupación temporal según el período seleccionado
def determinar_agrupacion(
    desde: date | None,
    hasta: date | None
) -> str:

    if desde is None or hasta is None:
        return "mes"

    cantidad_dias = (hasta - desde).days + 1

    if cantidad_dias <= 31:
        return "dia"

    if cantidad_dias <= 91:
        return "semana"

    return "mes"

# Obtener la fecha inicial del período de agrupación
def obtener_inicio_periodo(
    fecha: date,
    agrupacion: str
) -> date:

    if agrupacion == "dia":
        return fecha

    if agrupacion == "semana":
        return fecha - timedelta(days=fecha.weekday())

    return fecha.replace(day=1)

# Obtener el inicio del siguiente período
def obtener_siguiente_periodo(
    fecha: date,
    agrupacion: str
) -> date:

    if agrupacion == "dia":
        return fecha + timedelta(days=1)

    if agrupacion == "semana":
        return fecha + timedelta(days=7)

    if fecha.month == 12:
        return fecha.replace(year=fecha.year + 1, month=1, day=1)

    return fecha.replace(month=fecha.month + 1, day=1)

# Convertir una fecha UTC a la fecha local de Argentina
def obtener_fecha_local(fecha: datetime) -> date:

    if fecha.tzinfo is None:
        fecha = fecha.replace(tzinfo=timezone.utc)

    return fecha.astimezone(ZONA_HORARIA_ARGENTINA).date()

# Construir la evolución temporal de las incidencias
def construir_evolucion_incidencias(
    fechas_reportadas: list[datetime],
    fechas_cerradas: list[datetime],
    agrupacion: str,
    desde: date | None = None,
    hasta: date | None = None
) -> list[dict]:

    reportadas = {}
    cerradas = {}

    for fecha in fechas_reportadas:
        periodo = obtener_inicio_periodo(
            obtener_fecha_local(fecha), agrupacion
        )
        reportadas[periodo] = reportadas.get(periodo, 0) + 1

    for fecha in fechas_cerradas:
        periodo = obtener_inicio_periodo(
            obtener_fecha_local(fecha), agrupacion
        )
        cerradas[periodo] = cerradas.get(periodo, 0) + 1

    periodos = list(reportadas) + list(cerradas)

    if desde is not None and hasta is not None:
        inicio = obtener_inicio_periodo(desde, agrupacion)
        fin = obtener_inicio_periodo(hasta, agrupacion)
    elif periodos:
        inicio = min(periodos)
        fin = max(periodos)
    else:
        return []

    evolucion = []
    periodo = inicio

    while periodo <= fin:
        evolucion.append({
            "fecha": periodo.isoformat(),
            "reportadas": reportadas.get(periodo, 0),
            "cerradas": cerradas.get(periodo, 0)
        })

        if periodo == fin:
            break

        periodo = obtener_siguiente_periodo(periodo, agrupacion)

    return evolucion

# Obtener los indicadores del panel de Gerencia
def obtener_estadisticas_gerencia(
        session: Session,
        desde: date | None = None,
        hasta: date | None = None
    ) -> dict:
    inicio, fin = obtener_limites_temporales(desde, hasta)
    agrupacion = determinar_agrupacion(desde, hasta)
    fechas_reportadas = obtener_fechas_incidencias_reportadas(
        session, inicio, fin
    )
    fechas_cerradas = obtener_fechas_incidencias_cerradas(
        session, inicio, fin
    )
    return {
        "incidenciasAbiertas": contar_incidencias_abiertas(session, inicio, fin),
        "repuestosBajoUmbral": contar_repuestos_bajo_umbral(session),
        "pedidosPendientes": contar_pedidos_pendientes(session, inicio, fin),
        "reservasActivas": contar_reservas_activas(session),
        "unidadesConsumidas": sumar_unidades_consumidas(session, inicio, fin),
        "incidenciasCerradas": contar_incidencias_cerradas(session, inicio, fin),
        "pedidosCompletos": contar_pedidos_completos(session, inicio, fin),
        "agrupacionIncidencias": agrupacion,
        "evolucionIncidencias": construir_evolucion_incidencias(
            fechas_reportadas, fechas_cerradas, agrupacion, desde, hasta
        ),
        "incidenciasPorTurno": contar_incidencias_por_turno(session, inicio, fin),
    }