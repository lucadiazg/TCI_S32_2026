from sqlmodel import select

from app.models.stock import MovimientoStock, Repuesto, Reserva
from app.models.usuario import Usuario, RolUsuario
from app.services.alertas_stock import generar_alerta_umbral
from app.controllers.reservas import (
    CrearReservaRequest,
    crear_reserva,
    liberar_reserva,
)

#RN09 Notificación por correo. Se notifican por correo: incidentes, cambios de parte, 
# solicitudes de compra, informes de resolución y alertas de umbral. (Implementación 
# vía puerto de notificación con adaptador falso por defecto, sección 7.)
# Comprueba que las alertas se generen únicamente para los encargados activos.
def test_rn09_alertar_solo_a_encargados_activos(session, datos_prueba):
    datos_prueba(session, fisico=2, minimo=3)

    usuarios = [
        ("encargado_activo", RolUsuario.ENCARGADO, True),
        ("encargado_inactivo", RolUsuario.ENCARGADO, False),
        ("operario", RolUsuario.OPERARIO, True),
        ("mantenimiento", RolUsuario.MANTENIMIENTO, True),
        ("gerencia", RolUsuario.GERENCIA, True),
    ]

    # Crear usuarios con diferentes roles y estados
    for nombre, rol, activo in usuarios:
        session.add(Usuario(
            nombre=nombre,
            email=f"{nombre}@example.com",
            password_hash="hash_de_prueba",
            rol=rol,
            activo=activo,
        ))

    session.commit()

    repuesto = session.get(Repuesto, "REP-1")
    alertas = generar_alerta_umbral(session, repuesto)

    # Verificar que solamente reciba la alerta el encargado activo
    assert len(alertas) == 1
    assert alertas[0]["destinatario"] == "encargado_activo@example.com"
    assert alertas[0]["tipo"] == "umbral_minimo"
    assert alertas[0]["estado"] == "simulada"

# Comprueba que la notificación simulada contenga los datos correctos del repuesto.
def test_rn09_contenido_alerta_umbral(session, datos_prueba):
    datos_prueba(session, fisico=2, minimo=3)

    session.add(Usuario(
        nombre="Encargado de prueba",
        email="encargado@example.com",
        password_hash="hash_de_prueba",
        rol=RolUsuario.ENCARGADO,
        activo=True,
    ))

    session.commit()

    repuesto = session.get(Repuesto, "REP-1")
    alertas = generar_alerta_umbral(session, repuesto)

    assert len(alertas) == 1

    alerta = alertas[0]

    assert alerta["codigoRepuesto"] == "REP-1"
    assert alerta["nombreRepuesto"] == "Válvula"
    assert alerta["stockDisponible"] == 2
    assert alerta["umbralMinimo"] == 3
    assert "REP-1" in alerta["mensaje"]
    assert alerta["estado"] == "simulada"

# Comprueba que las notificaciones de liberación lleguen a los usuarios activos correspondientes.
def test_rn09_destinatarios_liberacion_reserva(session, datos_prueba):
    datos_prueba(session, fisico=10)

    usuarios = [
        Usuario(
            nombre="Encargado",
            email="encargado@example.com",
            password_hash="hash_de_prueba",
            rol=RolUsuario.ENCARGADO,
            activo=True,
        ),
        Usuario(
            nombre="Mantenimiento",
            email="mantenimiento@example.com",
            password_hash="hash_de_prueba",
            rol=RolUsuario.MANTENIMIENTO,
            activo=True,
        ),
        Usuario(
            nombre="Gerencia",
            email="gerencia@example.com",
            password_hash="hash_de_prueba",
            rol=RolUsuario.GERENCIA,
            activo=True,
        ),
        Usuario(
            nombre="Operario",
            email="operario@example.com",
            password_hash="hash_de_prueba",
            rol=RolUsuario.OPERARIO,
            activo=True,
        ),
        Usuario(
            nombre="Mantenimiento inactivo",
            email="inactivo@example.com",
            password_hash="hash_de_prueba",
            rol=RolUsuario.MANTENIMIENTO,
            activo=False,
        ),
    ]

    session.add_all(usuarios)
    session.commit()

    encargado = usuarios[0]

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

    notificaciones = resultado["notificaciones"]

    destinatarios = {
        notificacion["destinatario"]
        for notificacion in notificaciones
    }

    assert len(notificaciones) == 3

    assert destinatarios == {
        "encargado@example.com",
        "mantenimiento@example.com",
        "gerencia@example.com",
    }

    assert all(
        notificacion["estado"] == "simulada"
        for notificacion in notificaciones
    )

# Comprueba que la notificación contenga los datos de la reserva liberada.
def test_rn09_contenido_notificacion_liberacion(session, datos_prueba):
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

    notificaciones = resultado["notificaciones"]

    assert len(notificaciones) == 1

    notificacion = notificaciones[0]

    assert notificacion["destinatario"] == encargado.email
    assert notificacion["asunto"] == "Reserva de repuesto liberada"
    assert notificacion["estado"] == "simulada"
    assert encargado.nombre in notificacion["mensaje"]
    assert f"reserva {reserva['id']}" in notificacion["mensaje"]
    assert "REP-1" in notificacion["mensaje"]
    assert "Cantidad liberada: 3" in notificacion["mensaje"]
    assert "Mantenimiento preventivo" in notificacion["mensaje"]
    assert "disponibilidad para el mantenimiento planificado" in notificacion["mensaje"]

# Comprueba que un fallo en las notificaciones no impida liberar una reserva.
def test_rn09_fallo_notificacion_no_revierte_liberacion(session, datos_prueba, monkeypatch):
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

    # Simula un error en el servicio de notificaciones.
    def notificacion_fallida(*args, **kwargs):
        raise RuntimeError("Error simulado de notificación")

    monkeypatch.setattr(
        "app.controllers.reservas.preparar_notificaciones_liberacion",
        notificacion_fallida,
    )

    resultado = liberar_reserva(
        reserva["id"], session=session, usuario=encargado
    )

    assert resultado["estado"] == "liberada"
    assert resultado["notificaciones"] == []

    repuesto = session.get(Repuesto, "REP-1")
    reserva_guardada = session.get(Reserva, reserva["id"])

    assert repuesto.stock_fisico == 10
    assert repuesto.stock_reservado == 0
    assert repuesto.stock_disponible == 10
    assert reserva_guardada.estado == "liberada"
    assert reserva_guardada.autorizada_por == encargado.id
    assert len(session.exec(select(MovimientoStock)).all()) == 2