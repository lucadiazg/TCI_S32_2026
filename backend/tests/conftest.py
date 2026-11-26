#importacones para la configuracion de las pruebas
import os
import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlmodel import Session, create_engine

import app.models
from app.models.mantenimiento import Incidencia, Maquina, Reparacion
from app.models.stock import Repuesto

# Configura la base de datos de pruebas y revierte los cambios al finalizar.
@pytest.fixture
def session():
    # Obtener la direccion de conexion
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("Falta configurar DATABASE_URL")
    # Verificar que se utilice PostgreSQL y la base de pruebas
    url = make_url(database_url)
    if url.get_backend_name() != "postgresql":
        raise RuntimeError("Los tests requieren PostgreSQL")
    if url.database != "pharmaplant_test":
        raise RuntimeError("Los tests requieren pharmaplant_test")
    engine = create_engine(database_url, pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            # Confirmar la base de datos conectada
            nombre_base = connection.execute(
                text("SELECT current_database()")
            ).scalar()
            if nombre_base != "pharmaplant_test":
                raise RuntimeError("Base de datos incorrecta")
            connection.rollback()
            # Iniciar una transaccion independiente para cada test
            transaccion = connection.begin()
            try:
                with Session(
                    bind=connection,
                    join_transaction_mode="create_savepoint",
                ) as db:
                    yield db
            finally:
                # Deshacer los cambios realizados durante el test
                transaccion.rollback()
    finally:
        engine.dispose()

# Crea los datos necesarios para ejecutar las pruebas de consumo.
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

# Permite reutilizar la función de preparación de datos en los tests.
@pytest.fixture
def datos_prueba():
    return preparar_datos