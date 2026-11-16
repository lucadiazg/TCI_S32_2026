
import pytest
from sqlmodel import Session, SQLModel, create_engine, select

import app.models
from app.models.mantenimiento import Incidencia, Maquina, Reparacion, UsoRepuesto
from app.models.stock import MovimientoStock, Repuesto
from app.services.usos import ConflictoUso, registrar_uso


@pytest.fixture
def session(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'pruebas.db'}")
    SQLModel.metadata.create_all(engine)

    with Session(engine) as db:
        yield db

    engine.dispose()


def preparar_datos(
    session,
    fisico=5,
    reservado=0,
    minimo=2,
    estado="en_reparacion",
):
    session.add(
        Maquina(codigo="MAQ-1", tag="M-1", nombre="Máquina de prueba")
    )

    session.add(
        Repuesto(
            codigo="REP-1",
            nombre="Válvula",
            stock_fisico=fisico,
            stock_reservado=reservado,
            umbral_minimo=minimo,
        )
    )
    session.commit()

    incidencia = Incidencia(
        codigo="INC-1",
        codigo_maquina="MAQ-1",
        descripcion="Falla de prueba",
        turno="tarde",
    )
    session.add(incidencia)
    session.commit()
    session.refresh(incidencia)

    reparacion = Reparacion(
        incidencia_id=incidencia.id,
        estado=estado,
    )
    session.add(reparacion)
    session.commit()
    session.refresh(reparacion)

    return reparacion.id


def test_rn01_descontar_y_registrar_movimiento(session):
    reparacion_id = preparar_datos(session)

    resultado = registrar_uso(session, reparacion_id, "REP-1", 2)

    assert resultado["stockFisico"] == 3
    assert resultado["stockDisponible"] == 3
    assert len(session.exec(select(UsoRepuesto)).all()) == 1
    assert len(session.exec(select(MovimientoStock)).all()) == 1


def test_rn01_no_permitir_stock_insuficiente(session):
    reparacion_id = preparar_datos(session, fisico=1)

    with pytest.raises(ConflictoUso):
        registrar_uso(session, reparacion_id, "REP-1", 2)

    assert session.get(Repuesto, "REP-1").stock_fisico == 1
    assert session.exec(select(UsoRepuesto)).all() == []


def test_rn02_alerta_al_alcanzar_umbral(session):
    reparacion_id = preparar_datos(session, fisico=3, minimo=2)

    resultado = registrar_uso(session, reparacion_id, "REP-1", 1)

    assert resultado["stockDisponible"] == 2
    assert resultado["alertaUmbral"] is True


def test_rn05_no_consumir_unidades_reservadas(session):
    reparacion_id = preparar_datos(session, fisico=5, reservado=4)

    with pytest.raises(ConflictoUso):
        registrar_uso(session, reparacion_id, "REP-1", 2)

    assert session.get(Repuesto, "REP-1").stock_fisico == 5
    assert session.exec(select(MovimientoStock)).all() == []


def test_reparacion_cerrada_no_permite_consumo(session):
    reparacion_id = preparar_datos(session, estado="cerrada")

    with pytest.raises(ConflictoUso):
        registrar_uso(session, reparacion_id, "REP-1", 1)
