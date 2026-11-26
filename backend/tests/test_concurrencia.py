import os
import pytest

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from sqlalchemy import delete, text
from sqlalchemy.engine import make_url
from sqlmodel import Session, create_engine, select
from fastapi import HTTPException

from app.models.mantenimiento import Incidencia, Maquina, Reparacion, UsoRepuesto
from app.models.stock import Repuesto, MovimientoStock, Reserva
from app.models.usuario import Usuario, RolUsuario
from app.services.usos import ConflictoUso, registrar_uso
from app.controllers.reservas import CrearReservaRequest, crear_reserva


# Configura una conexión independiente para las pruebas de concurrencia.
@pytest.fixture
def motor_concurrencia():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError("Falta configurar DATABASE_URL")

    url = make_url(database_url)

    if url.get_backend_name() != "postgresql":
        raise RuntimeError("Los tests requieren PostgreSQL")

    if url.database != "pharmaplant_test":
        raise RuntimeError("Los tests requieren pharmaplant_test")

    engine = create_engine(database_url, pool_pre_ping=True)

    try:
        with engine.connect() as connection:
            nombre_base = connection.execute(
                text("SELECT current_database()")
            ).scalar()

            if nombre_base != "pharmaplant_test":
                raise RuntimeError("Base de datos incorrecta")

        yield engine

    finally:
        engine.dispose()


# Prepara los datos necesarios para probar operaciones simultáneas.
def preparar_datos_concurrencia(session):
    session.add(
        Maquina(
            codigo="MAQ-CONC-1",
            tag="M-CONC-1",
            nombre="Máquina de concurrencia",
        )
    )

    session.add(
        Repuesto(
            codigo="REP-CONC-1",
            nombre="Repuesto de concurrencia",
            stock_fisico=5,
            stock_reservado=0,
            umbral_minimo=2,
        )
    )

    session.commit()

    incidencia = Incidencia(
        codigo="INC-CONC-1",
        codigo_maquina="MAQ-CONC-1",
        descripcion="Prueba de concurrencia",
        turno="tarde",
    )

    session.add(incidencia)
    session.commit()
    session.refresh(incidencia)

    reparacion = Reparacion(
        incidencia_id=incidencia.id,
        estado="en_reparacion",
    )

    session.add(reparacion)
    session.commit()
    session.refresh(reparacion)

    return reparacion.id


# Elimina los registros generados durante las pruebas de concurrencia.
def limpiar_datos_concurrencia(session):
    session.execute(
        delete(MovimientoStock).where(
            MovimientoStock.codigo_repuesto == "REP-CONC-1"
        )
    )

    session.execute(
        delete(UsoRepuesto).where(
            UsoRepuesto.codigo_repuesto == "REP-CONC-1"
        )
    )

    session.execute(
        delete(Reserva).where(
            Reserva.codigo_repuesto == "REP-CONC-1"
        )
    )

    session.execute(
        delete(Reparacion).where(
            Reparacion.incidencia_id.in_(
                select(Incidencia.id).where(
                    Incidencia.codigo == "INC-CONC-1"
                )
            )
        )
    )

    session.execute(
        delete(Incidencia).where(
            Incidencia.codigo == "INC-CONC-1"
        )
    )

    session.execute(
        delete(Repuesto).where(
            Repuesto.codigo == "REP-CONC-1"
        )
    )

    session.execute(
        delete(Maquina).where(
            Maquina.codigo == "MAQ-CONC-1"
        )
    )

    session.commit()


# Comprueba que dos consumos simultáneos no generen stock negativo.
def test_consumos_simultaneos(motor_concurrencia):

    try:
        # Preparar los datos iniciales.
        with Session(motor_concurrencia) as session:
            reparacion_id = preparar_datos_concurrencia(session)

        barrera = Barrier(2, timeout=10)

        # Ejecuta un consumo utilizando una sesión independiente.
        def consumir():
            with Session(motor_concurrencia) as session:
                session.execute(
                    text("SET LOCAL statement_timeout = '15s'")
                )

                barrera.wait()

                try:
                    registrar_uso(
                        session, reparacion_id, "REP-CONC-1", 4
                    )
                    return "aceptado"

                except ConflictoUso as error:
                    assert str(error) == "Stock disponible insuficiente"
                    return "rechazado"

        # Ejecutar los dos consumos en paralelo.
        with ThreadPoolExecutor(max_workers=2) as executor:
            futuro1 = executor.submit(consumir)
            futuro2 = executor.submit(consumir)

            resultados = [futuro1.result(), futuro2.result()]

        # Verificar que solamente un consumo sea aceptado.
        assert resultados.count("aceptado") == 1
        assert resultados.count("rechazado") == 1

        # Verificar el estado final de la base de datos.
        with Session(motor_concurrencia) as session:
            repuesto = session.get(Repuesto, "REP-CONC-1")

            assert repuesto.stock_fisico == 1
            assert repuesto.stock_reservado == 0
            assert repuesto.stock_disponible == 1

            usos = session.exec(
                select(UsoRepuesto).where(
                    UsoRepuesto.codigo_repuesto == "REP-CONC-1"
                )
            ).all()

            movimientos = session.exec(
                select(MovimientoStock).where(
                    MovimientoStock.codigo_repuesto == "REP-CONC-1"
                )
            ).all()

            assert len(usos) == 1
            assert len(movimientos) == 1
            assert usos[0].cantidad == 4
            assert movimientos[0].cantidad == 4
            assert movimientos[0].tipo == "salida"

    finally:
        # Limpiar los datos aunque falle la prueba.
        with Session(motor_concurrencia) as session:
            limpiar_datos_concurrencia(session)


# Comprueba que un consumo y una reserva simultáneos respeten el stock disponible.
def test_consumo_y_reserva_simultaneos(motor_concurrencia):

    try:
        # Preparar los datos iniciales.
        with Session(motor_concurrencia) as session:
            reparacion_id = preparar_datos_concurrencia(session)

        barrera = Barrier(2, timeout=10)

        # Ejecuta el consumo en una sesión independiente.
        def consumir():
            with Session(motor_concurrencia) as session:
                session.execute(
                    text("SET LOCAL statement_timeout = '15s'")
                )

                barrera.wait()

                try:
                    registrar_uso(
                        session, reparacion_id, "REP-CONC-1", 4
                    )
                    return "aceptado"

                except ConflictoUso as error:
                    assert str(error) == "Stock disponible insuficiente"
                    return "rechazado"

        # Ejecuta la reserva en una sesión independiente.
        def reservar():
            with Session(motor_concurrencia) as session:
                session.execute(
                    text("SET LOCAL statement_timeout = '15s'")
                )

                usuario = Usuario(
                    nombre="Usuario de concurrencia",
                    email="concurrencia@prueba.com",
                    password_hash="prueba",
                    rol=RolUsuario.MANTENIMIENTO,
                )

                datos = CrearReservaRequest(
                    codigoRepuesto="REP-CONC-1",
                    cantidad=4,
                    motivo="Mantenimiento preventivo",
                )

                barrera.wait()

                try:
                    crear_reserva(
                        datos=datos,
                        session=session,
                        usuario=usuario,
                    )
                    return "aceptado"

                except HTTPException as error:
                    assert error.status_code == 409
                    assert error.detail == "Stock disponible insuficiente para reservar"
                    return "rechazado"

        # Ejecutar el consumo y la reserva en paralelo.
        with ThreadPoolExecutor(max_workers=2) as executor:
            futuro_consumo = executor.submit(consumir)
            futuro_reserva = executor.submit(reservar)

            resultado_consumo = futuro_consumo.result()
            resultado_reserva = futuro_reserva.result()

        resultados = [resultado_consumo, resultado_reserva]

        # Verificar que solamente una operación sea aceptada.
        assert resultados.count("aceptado") == 1
        assert resultados.count("rechazado") == 1

        # Verificar el estado final de la base de datos.
        with Session(motor_concurrencia) as session:
            repuesto = session.get(Repuesto, "REP-CONC-1")

            usos = session.exec(
                select(UsoRepuesto).where(
                    UsoRepuesto.codigo_repuesto == "REP-CONC-1"
                )
            ).all()

            reservas = session.exec(
                select(Reserva).where(
                    Reserva.codigo_repuesto == "REP-CONC-1"
                )
            ).all()

            movimientos = session.exec(
                select(MovimientoStock).where(
                    MovimientoStock.codigo_repuesto == "REP-CONC-1"
                )
            ).all()

            assert repuesto.stock_disponible == 1
            assert len(movimientos) == 1
            assert movimientos[0].cantidad == 4

            # Verificar el resultado si se acepta el consumo.
            if resultado_consumo == "aceptado":
                assert repuesto.stock_fisico == 1
                assert repuesto.stock_reservado == 0

                assert len(usos) == 1
                assert usos[0].cantidad == 4
                assert len(reservas) == 0
                assert movimientos[0].tipo == "salida"

            # Verificar el resultado si se acepta la reserva.
            else:
                assert repuesto.stock_fisico == 5
                assert repuesto.stock_reservado == 4

                assert len(usos) == 0
                assert len(reservas) == 1
                assert reservas[0].cantidad == 4
                assert reservas[0].estado == "activa"
                assert movimientos[0].tipo == "reserva"

    finally:
        # Limpiar los datos aunque falle la prueba.
        with Session(motor_concurrencia) as session:
            limpiar_datos_concurrencia(session)