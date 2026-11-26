import pytest
from fastapi import HTTPException
from sqlmodel import select

from app.models.mantenimiento import UsoRepuesto
from app.models.stock import MovimientoStock, Repuesto, Reserva
from app.models.usuario import Usuario, RolUsuario
from app.services.usos import ConflictoUso, registrar_uso
from app.controllers.reservas import (
    CrearReservaRequest,
    crear_reserva,
    liberar_reserva,
)

#RN05 Reserva. Un repuesto reservado no se usa en otra incidencia. La liberación exige 
# autorización de un usuario con rol Encargado y aviso inmediato del cambio y su impacto 
# sobre lo planificado.
# Comprueba que no se puedan consumir unidades reservadas mediante un consumo normal.
def test_rn05_no_consumir_unidades_reservadas(session, datos_prueba):
    reparacion_id = datos_prueba(session, fisico=5, reservado=4)

    with pytest.raises(ConflictoUso):
        registrar_uso(session, reparacion_id, "REP-1", 2)

    assert session.get(Repuesto, "REP-1").stock_fisico == 5
    assert session.exec(select(MovimientoStock)).all() == []

# Comprueba que se puedan consumir las unidades disponibles sin afectar las reservadas.
def test_rn05_consumir_sin_afectar_reservas(session, datos_prueba):
    reparacion_id = datos_prueba(
        session, fisico=5, reservado=4
    )

    resultado = registrar_uso(session, reparacion_id, "REP-1", 1)

    assert resultado["stockFisico"] == 4
    assert resultado["stockDisponible"] == 0
    assert session.get(Repuesto, "REP-1").stock_reservado == 4
    assert len(session.exec(select(UsoRepuesto)).all()) == 1
    assert len(session.exec(select(MovimientoStock)).all()) == 1

# Comprueba que no se pueda utilizar un repuesto si todas sus unidades están reservadas.
def test_rn05_stock_totalmente_reservado(session, datos_prueba):
    reparacion_id = datos_prueba(
        session, fisico=5, reservado=5
    )

    with pytest.raises(ConflictoUso):
        registrar_uso(session, reparacion_id, "REP-1", 1)

    repuesto = session.get(Repuesto, "REP-1")

    assert repuesto.stock_fisico == 5
    assert repuesto.stock_reservado == 5
    assert repuesto.stock_disponible == 0
    assert session.exec(select(UsoRepuesto)).all() == []
    assert session.exec(select(MovimientoStock)).all() == []

# Comprueba que se pueda reservar un repuesto sin disminuir el stock físico.
def test_rn05_crear_reserva_valida(session, datos_prueba):
    datos_prueba(session, fisico=10)

    datos = CrearReservaRequest(
        codigoRepuesto="REP-1",
        cantidad=3,
        motivo="Mantenimiento preventivo",
    )

    resultado = crear_reserva(datos, session=session)

    assert resultado["estado"] == "activa"
    assert resultado["cantidad"] == 3
    assert resultado["stockFisico"] == 10
    assert resultado["stockReservado"] == 3
    assert resultado["stockDisponible"] == 7

    reserva = session.exec(select(Reserva)).one()

    assert reserva.codigo_repuesto == "REP-1"
    assert reserva.cantidad == 3
    assert reserva.estado == "activa"
    assert reserva.motivo == "Mantenimiento preventivo"

# Comprueba que al crear una reserva se registre su movimiento de stock.
def test_rn05_movimiento_creacion_reserva(session, datos_prueba):
    datos_prueba(session, fisico=10)

    datos = CrearReservaRequest(
        codigoRepuesto="REP-1",
        cantidad=3,
        motivo="Mantenimiento preventivo",
    )

    resultado = crear_reserva(datos, session=session)

    movimiento = session.exec(select(MovimientoStock)).one()

    assert movimiento.codigo_repuesto == "REP-1"
    assert movimiento.tipo == "reserva"
    assert movimiento.cantidad == 3
    assert movimiento.referencia == f"reserva:{resultado['id']}"

# Comprueba que se puedan reservar todas las unidades disponibles de un repuesto.
def test_rn05_reservar_stock_disponible_exacto(session, datos_prueba):
    datos_prueba(session, fisico=10)

    datos = CrearReservaRequest(
        codigoRepuesto="REP-1",
        cantidad=10,
        motivo="Mantenimiento preventivo",
    )

    resultado = crear_reserva(datos, session=session)

    assert resultado["stockFisico"] == 10
    assert resultado["stockReservado"] == 10
    assert resultado["stockDisponible"] == 0
    assert resultado["estado"] == "activa"

    reserva = session.exec(select(Reserva)).one()

    assert reserva.cantidad == 10
    assert reserva.estado == "activa"

# Comprueba que no se puedan reservar más unidades que las disponibles.
def test_rn05_reserva_stock_insuficiente(session, datos_prueba):
    datos_prueba(session, fisico=10, reservado=6)

    datos = CrearReservaRequest(
        codigoRepuesto="REP-1",
        cantidad=5,
        motivo="Mantenimiento preventivo",
    )

    with pytest.raises(HTTPException) as error:
        crear_reserva(datos, session=session)

    assert error.value.status_code == 409

    repuesto = session.get(Repuesto, "REP-1")

    assert repuesto.stock_fisico == 10
    assert repuesto.stock_reservado == 6
    assert repuesto.stock_disponible == 4
    assert session.exec(select(Reserva)).all() == []
    assert session.exec(select(MovimientoStock)).all() == []

# Comprueba que no se pueda crear una reserva de un repuesto inexistente.
def test_rn05_reservar_repuesto_inexistente(session, datos_prueba):
    datos_prueba(session)

    datos = CrearReservaRequest(
        codigoRepuesto="REP-999",
        cantidad=2,
        motivo="Mantenimiento preventivo",
    )

    with pytest.raises(HTTPException) as error:
        crear_reserva(datos, session=session)

    assert error.value.status_code == 404
    assert session.exec(select(Reserva)).all() == []
    assert session.exec(select(MovimientoStock)).all() == []

# Comprueba que sea obligatorio indicar el motivo de una reserva.
def test_rn05_reserva_sin_motivo(session, datos_prueba):
    datos_prueba(session, fisico=10)

    datos = CrearReservaRequest(
        codigoRepuesto="REP-1",
        cantidad=3,
        motivo="   ",
    )

    with pytest.raises(HTTPException) as error:
        crear_reserva(datos, session=session)

    assert error.value.status_code == 400

    repuesto = session.get(Repuesto, "REP-1")

    assert repuesto.stock_fisico == 10
    assert repuesto.stock_reservado == 0
    assert session.exec(select(Reserva)).all() == []
    assert session.exec(select(MovimientoStock)).all() == []

# Comprueba que al liberar una reserva sus unidades vuelvan a estar disponibles.
def test_rn05_liberar_reserva_activa(session, datos_prueba):
    datos_prueba(session, fisico=10)

    encargado = Usuario(
        nombre="Encargado de prueba",
        email="encargado@example.com",
        password_hash="hash_de_prueba",
        rol=RolUsuario.ENCARGADO,
        activo=True,
    )

    session.add(encargado)
    session.commit()
    session.refresh(encargado)

    datos = CrearReservaRequest(
        codigoRepuesto="REP-1",
        cantidad=3,
        motivo="Mantenimiento preventivo",
    )

    reserva = crear_reserva(
        datos, session=session, usuario=encargado
    )

    resultado = liberar_reserva(
        reserva["id"], session=session, usuario=encargado
    )

    assert resultado["estado"] == "liberada"
    assert resultado["cantidadLiberada"] == 3
    assert resultado["stockFisico"] == 10
    assert resultado["stockReservado"] == 0
    assert resultado["stockDisponible"] == 10

    reserva_guardada = session.get(Reserva, reserva["id"])

    assert reserva_guardada.estado == "liberada"

# Comprueba que se registre el encargado que autorizó la liberación de la reserva.
def test_rn05_registrar_autorizacion_liberacion(session, datos_prueba):
    datos_prueba(session, fisico=10)

    encargado = Usuario(
        nombre="Encargado de prueba",
        email="encargado@example.com",
        password_hash="hash_de_prueba",
        rol=RolUsuario.ENCARGADO,
        activo=True,
    )

    session.add(encargado)
    session.commit()
    session.refresh(encargado)

    datos = CrearReservaRequest(
        codigoRepuesto="REP-1",
        cantidad=3,
        motivo="Mantenimiento preventivo",
    )

    reserva = crear_reserva(
        datos, session=session, usuario=encargado
    )

    resultado = liberar_reserva(
        reserva["id"], session=session, usuario=encargado
    )

    reserva_guardada = session.get(Reserva, reserva["id"])

    assert resultado["autorizadaPor"] == encargado.id
    assert reserva_guardada.autorizada_por == encargado.id
    assert reserva_guardada.estado == "liberada"

# Comprueba que la liberación de una reserva genere un movimiento de stock.
def test_rn05_movimiento_liberacion_reserva(session, datos_prueba):
    datos_prueba(session, fisico=10)

    encargado = Usuario(
        nombre="Encargado de prueba",
        email="encargado@example.com",
        password_hash="hash_de_prueba",
        rol=RolUsuario.ENCARGADO,
        activo=True,
    )

    session.add(encargado)
    session.commit()
    session.refresh(encargado)

    datos = CrearReservaRequest(
        codigoRepuesto="REP-1",
        cantidad=3,
        motivo="Mantenimiento preventivo",
    )

    reserva = crear_reserva(
        datos, session=session, usuario=encargado
    )

    liberar_reserva(
        reserva["id"], session=session, usuario=encargado
    )

    movimiento = session.exec(
        select(MovimientoStock).where(
            MovimientoStock.tipo == "liberacion_reserva"
        )
    ).one()

    assert movimiento.codigo_repuesto == "REP-1"
    assert movimiento.cantidad == 3
    assert movimiento.referencia == f"reserva:{reserva['id']}"
    assert len(session.exec(select(MovimientoStock)).all()) == 2

# Comprueba que no se pueda liberar una reserva que ya fue liberada.
def test_rn05_no_liberar_reserva_dos_veces(session, datos_prueba):
    datos_prueba(session, fisico=10)

    encargado = Usuario(
        nombre="Encargado de prueba",
        email="encargado@example.com",
        password_hash="hash_de_prueba",
        rol=RolUsuario.ENCARGADO,
        activo=True,
    )

    session.add(encargado)
    session.commit()
    session.refresh(encargado)

    datos = CrearReservaRequest(
        codigoRepuesto="REP-1",
        cantidad=3,
        motivo="Mantenimiento preventivo",
    )

    reserva = crear_reserva(
        datos, session=session, usuario=encargado
    )

    liberar_reserva(
        reserva["id"], session=session, usuario=encargado
    )

    with pytest.raises(HTTPException) as error:
        liberar_reserva(
            reserva["id"], session=session, usuario=encargado
        )

    assert error.value.status_code == 409

    repuesto = session.get(Repuesto, "REP-1")
    reserva_guardada = session.get(Reserva, reserva["id"])

    assert repuesto.stock_fisico == 10
    assert repuesto.stock_reservado == 0
    assert repuesto.stock_disponible == 10
    assert reserva_guardada.estado == "liberada"
    assert len(session.exec(select(MovimientoStock)).all()) == 2

# Comprueba que no se pueda liberar una reserva que no existe.
def test_rn05_liberar_reserva_inexistente(session, datos_prueba):
    datos_prueba(session, fisico=10)

    encargado = Usuario(
        nombre="Encargado de prueba",
        email="encargado@example.com",
        password_hash="hash_de_prueba",
        rol=RolUsuario.ENCARGADO,
        activo=True,
    )

    session.add(encargado)
    session.commit()
    session.refresh(encargado)

    with pytest.raises(HTTPException) as error:
        liberar_reserva(
            999, session=session, usuario=encargado
        )

    assert error.value.status_code == 404

    repuesto = session.get(Repuesto, "REP-1")

    assert repuesto.stock_fisico == 10
    assert repuesto.stock_reservado == 0
    assert repuesto.stock_disponible == 10
    assert session.exec(select(Reserva)).all() == []
    assert session.exec(select(MovimientoStock)).all() == []