import pytest
from sqlmodel import select

from app.models.mantenimiento import UsoRepuesto
from app.models.stock import MovimientoStock, Repuesto
from app.services.usos import (
    ConflictoUso, 
    DatosInvalidos, 
    registrar_uso,
    )

#RN01 Descuento por uso. Usar un repuesto en una reparación descuenta del stock físico 
# la cantidad de la línea de uso (entera ≥ 1). El stock físico resultante debe 
# ser ≥ 0: si no alcanza, el uso se rechaza.
# Comprueba que se descuente el stock y se registre el consumo y su movimiento.
def test_rn01_descontar_y_registrar_movimiento(session, datos_prueba):
    reparacion_id = datos_prueba(session)

    resultado = registrar_uso(session, reparacion_id, "REP-1", 2)

    assert resultado["stockFisico"] == 3
    assert resultado["stockDisponible"] == 3
    assert len(session.exec(select(UsoRepuesto)).all()) == 1
    assert len(session.exec(select(MovimientoStock)).all()) == 1

# Comprueba que no se permita un consumo superior al stock disponible.
def test_rn01_no_permitir_stock_insuficiente(session, datos_prueba):
    reparacion_id = datos_prueba(session, fisico=1)

    with pytest.raises(ConflictoUso):
        registrar_uso(session, reparacion_id, "REP-1", 2)

    assert session.get(Repuesto, "REP-1").stock_fisico == 1
    assert session.exec(select(UsoRepuesto)).all() == []

# Comprueba que no se permita registrar un consumo de cero unidades.
def test_rn01_no_permitir_cantidad_cero(session, datos_prueba):
    reparacion_id = datos_prueba(session)

    with pytest.raises(DatosInvalidos):
        registrar_uso(session, reparacion_id, "REP-1", 0)

    assert session.get(Repuesto, "REP-1").stock_fisico == 5
    assert session.exec(select(UsoRepuesto)).all() == []
    assert session.exec(select(MovimientoStock)).all() == []

# Comprueba que no se permita registrar un consumo de cantidades negativas.
def test_rn01_no_permitir_cantidad_negativa(session, datos_prueba):
    reparacion_id = datos_prueba(session)

    with pytest.raises(DatosInvalidos):
        registrar_uso(session, reparacion_id, "REP-1", -2)

    assert session.get(Repuesto, "REP-1").stock_fisico == 5
    assert session.exec(select(UsoRepuesto)).all() == []
    assert session.exec(select(MovimientoStock)).all() == []

# Comprueba que se pueda consumir la totalidad del stock disponible.
def test_rn01_consumir_stock_disponible_exacto(session, datos_prueba):
    reparacion_id = datos_prueba(session, fisico=5)

    resultado = registrar_uso(session, reparacion_id, "REP-1", 5)

    assert resultado["stockFisico"] == 0
    assert resultado["stockDisponible"] == 0
    assert session.get(Repuesto, "REP-1").stock_fisico == 0
    assert len(session.exec(select(UsoRepuesto)).all()) == 1
    assert len(session.exec(select(MovimientoStock)).all()) == 1 

# Comprueba que los datos del consumo y del movimiento sean correctos.
def test_rn01_datos_del_uso_y_movimiento(session, datos_prueba):
    reparacion_id = datos_prueba(session)

    registrar_uso(session, reparacion_id, "REP-1", 2)

    uso = session.exec(select(UsoRepuesto)).one()
    movimiento = session.exec(select(MovimientoStock)).one()

    # Verificar los datos del consumo
    assert uso.reparacion_id == reparacion_id
    assert uso.codigo_repuesto == "REP-1"
    assert uso.cantidad == 2

    # Verificar los datos del movimiento de stock
    assert movimiento.codigo_repuesto == "REP-1"
    assert movimiento.tipo == "salida"
    assert movimiento.cantidad == 2
    assert movimiento.referencia == f"reparacion:{reparacion_id}"

# Comprueba que un consumo rechazado no modifique los registros anteriores.
def test_rn01_consumo_rechazado_sin_cambios_parciales(session, datos_prueba):
    reparacion_id = datos_prueba(session, fisico=5)

    # Registrar un consumo valido
    registrar_uso(session, reparacion_id, "REP-1", 2)

    # Intentar un consumo superior al stock disponible
    with pytest.raises(ConflictoUso):
        registrar_uso(session, reparacion_id, "REP-1", 4)

    # Verificar que se conserve el consumo anterior
    assert session.get(Repuesto, "REP-1").stock_fisico == 3

    uso = session.exec(select(UsoRepuesto)).one()
    movimiento = session.exec(select(MovimientoStock)).one()

    assert uso.cantidad == 2
    assert movimiento.cantidad == 2

# Comprueba que no se puedan registrar consumos en una reparación cerrada.
def test_reparacion_cerrada_no_permite_consumo(session, datos_prueba):
    reparacion_id = datos_prueba(session, estado="cerrada")

    with pytest.raises(ConflictoUso):
        registrar_uso(session, reparacion_id, "REP-1", 1)