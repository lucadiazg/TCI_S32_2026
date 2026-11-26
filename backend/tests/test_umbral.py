from sqlmodel import select

from app.models.mantenimiento import UsoRepuesto
from app.models.stock import MovimientoStock, Repuesto
from app.services.usos import registrar_uso
from app.controllers.compras import consultar_lista_compras

#RN02 Umbral. Cada repuesto tiene un umbral mínimo. Cuando stock disponible ≤ umbral mínimo, 
# se genera una alerta y el repuesto aparece en la lista de compras.
# Comprueba que se active el indicador de alerta al alcanzar el umbral mínimo.
def test_rn02_alerta_al_alcanzar_umbral(session, datos_prueba):
    reparacion_id = datos_prueba(session, fisico=3, minimo=2)

    resultado = registrar_uso(session, reparacion_id, "REP-1", 1)

    assert resultado["stockDisponible"] == 2
    assert resultado["alertaUmbral"] is True

# Comprueba que no se active la alerta cuando el stock supera el umbral mínimo.
def test_rn02_no_alertar_por_encima_del_umbral(session, datos_prueba):
    reparacion_id = datos_prueba(session, fisico=10, minimo=3)

    resultado = registrar_uso(session, reparacion_id, "REP-1", 2)

    assert resultado["stockFisico"] == 8
    assert resultado["stockDisponible"] == 8
    assert resultado["alertaUmbral"] is False

# Comprueba que se active la alerta cuando el stock queda por debajo del umbral.
def test_rn02_alerta_por_debajo_del_umbral(session, datos_prueba):
    reparacion_id = datos_prueba(session, fisico=5, minimo=3)

    resultado = registrar_uso(session, reparacion_id, "REP-1", 4)

    assert resultado["stockFisico"] == 1
    assert resultado["stockDisponible"] == 1
    assert resultado["alertaUmbral"] is True

# Comprueba que la alerta considere el stock disponible y las unidades reservadas
def test_rn02_alerta_por_stock_reservado(session, datos_prueba):
    reparacion_id = datos_prueba(
        session, fisico=10, reservado=6, minimo=3
    )

    resultado = registrar_uso(session, reparacion_id, "REP-1", 1)

    assert resultado["stockFisico"] == 9
    assert resultado["stockDisponible"] == 3
    assert resultado["alertaUmbral"] is True
    assert session.get(Repuesto, "REP-1").stock_reservado == 6

# Comprueba que un fallo en la notificación no revierta el consumo registrado.
def test_rn02_fallo_alerta_no_revierte_consumo(session,datos_prueba, monkeypatch):
    reparacion_id = datos_prueba(session, fisico=3, minimo=2)
    # Simula un error durante la generación de la notificación.
    def alerta_fallida(*args, **kwargs):
        raise RuntimeError("Error simulado de notificacion")

    monkeypatch.setattr( #permite sustituir temporalmente una función durante una prueba
        "app.services.usos.generar_alerta_umbral",
        alerta_fallida,
    )

    resultado = registrar_uso(session, reparacion_id, "REP-1", 1)

    assert resultado["stockFisico"] == 2
    assert resultado["stockDisponible"] == 2
    assert resultado["alertaUmbral"] is True

    assert session.get(Repuesto, "REP-1").stock_fisico == 2
    assert len(session.exec(select(UsoRepuesto)).all()) == 1
    assert len(session.exec(select(MovimientoStock)).all()) == 1

# Comprueba que el repuesto aparezca en la lista de compras al alcanzar el umbral
def test_rn02_incluir_repuesto_al_alcanzar_umbral(session, datos_prueba):
    reparacion_id = datos_prueba(session, fisico=5, minimo=3)

    # Consumir unidades hasta alcanzar el umbral minimo
    registrar_uso(session, reparacion_id, "REP-1", 2)

    # Consultar la lista de compras
    resultado = consultar_lista_compras(session=session)

    assert resultado["total"] == 1

    repuesto = resultado["repuestos"][0]

    assert repuesto["codigo"] == "REP-1"
    assert repuesto["stockFisico"] == 3
    assert repuesto["stockDisponible"] == 3
    assert repuesto["umbralMinimo"] == 3
    assert repuesto["bajoUmbral"] is True
    assert repuesto["solicitudesPendientes"] == []

# Comprueba que un repuesto con stock suficiente y sin solicitudes quede excluido.
def test_rn02_excluir_repuesto_por_encima_del_umbral(session, datos_prueba):
    reparacion_id = datos_prueba(session, fisico=10, minimo=3)

    registrar_uso(session, reparacion_id, "REP-1", 2)

    resultado = consultar_lista_compras(session=session)

    assert resultado["total"] == 0
    assert resultado["repuestos"] == []

# Comprueba que el repuesto aparezca en la lista de compras por debajo del umbral.
def test_rn02_incluir_repuesto_por_debajo_del_umbral(session, datos_prueba):
    reparacion_id = datos_prueba(session, fisico=5, minimo=3)

    registrar_uso(session, reparacion_id, "REP-1", 4)

    resultado = consultar_lista_compras(session=session)

    assert resultado["total"] == 1

    repuesto = resultado["repuestos"][0]

    assert repuesto["codigo"] == "REP-1"
    assert repuesto["stockFisico"] == 1
    assert repuesto["stockDisponible"] == 1
    assert repuesto["umbralMinimo"] == 3
    assert repuesto["bajoUmbral"] is True
    assert repuesto["solicitudesPendientes"] == []

# Comprueba que la lista de compras considere el stock reservado.
def test_rn02_incluir_repuesto_por_stock_reservado(session, datos_prueba):
    reparacion_id = datos_prueba(
        session, fisico=10, reservado=6, minimo=3
    )

    registrar_uso(session, reparacion_id, "REP-1", 1)

    resultado = consultar_lista_compras(session=session)

    assert resultado["total"] == 1

    repuesto = resultado["repuestos"][0]

    assert repuesto["codigo"] == "REP-1"
    assert repuesto["stockFisico"] == 9
    assert repuesto["stockReservado"] == 6
    assert repuesto["stockDisponible"] == 3
    assert repuesto["umbralMinimo"] == 3
    assert repuesto["bajoUmbral"] is True
    assert repuesto["solicitudesPendientes"] == []