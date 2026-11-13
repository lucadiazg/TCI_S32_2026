from fastapi import HTTPException
from sqlmodel import Session, select
from sqlalchemy.exc import SQLAlchemyError

from app.models.compras import PedidoCompra, PedidoItem, Recepcion
from app.models.stock import Repuesto, Ubicacion, MovimientoStock


def registrar_recepcion_service(
    session: Session,
    pedido_id: int,
    codigo_repuesto: str,
    cantidad_recibida: int,
    ubicacion_codigo: str,
    ubicacion_descripcion: str | None = None
):
    #Busca el pedido en la base de datos
    pedido = session.get(PedidoCompra, pedido_id)

    #Verifica que el pedido exista, codigo error 404
    if pedido is None:
        raise HTTPException(
            status_code=404,
            detail="El id no corresponde a un pedido de compra existente"
        )

    #Busca el repuesto dentro del pedido de compra y bloquea el registro hasta finalizar la transaccion 
    #para evitar que dos recepciones simultaneas modifiquen simultaneamente
    item = session.exec(
        select(PedidoItem).where(
            PedidoItem.pedido_id == pedido_id,
            PedidoItem.codigo_repuesto == codigo_repuesto
        ).with_for_update()
    ).first()

    #Verifica que el repuesto pertenezca al pedido. Codigo 400 solicitud incorrecta
    if item is None:
        raise HTTPException(
            status_code=400,
            detail="El repuesto indicado no pertenece al pedido de compra"
        )
    
    #Calcula la cantidad pendiente de recibir
    cantidad_pendiente = (
        item.cantidad_solicitada - item.cantidad_recibida
    )

    #Verifica que la cantidad recibida sea positiva. Codigo 400 solicitud incorrecta cuando no cumple las condiciones
    if cantidad_recibida < 1:
        raise HTTPException(
            status_code=400,
            detail="La cantidad recibida debe ser mayor a cero"
        )

    #Evita recibir más unidades de las solicitadas. Codigo 400 solicitud incorrecta
    if cantidad_recibida > cantidad_pendiente:
        raise HTTPException(
            status_code=400,
            detail="La cantidad ingresada supera las unidades pendientes a recibir del pedido de compra"
        )
    
    #Busca el repuesto en el inventario y bloquea su registo para evitar modificaciones en simultaneo en el stock
    repuesto = session.exec(
        select(Repuesto).where(
            Repuesto.codigo == codigo_repuesto
        ).with_for_update()
    ).first()

    #Verifica que el repuesto exista. Codido 404 error
    if repuesto is None:
        raise HTTPException(
            status_code=404,
            detail="El repuesto no existe en el inventario"
        )
    
    #Busca la ubicación indicada
    ubicacion = session.get(Ubicacion, ubicacion_codigo)

    #Si no existe prepara una nueva ubicación antes de registrar la recepcion
    if ubicacion is None:
        ubicacion = Ubicacion(
            codigo=ubicacion_codigo,
            descripcion=ubicacion_descripcion
        )
        session.add(ubicacion)
        session.flush()

    #Actualiza la cantidad recibida del pedido
    item.cantidad_recibida += cantidad_recibida

    #Incrementa el stock físico del repuesto y actualiza la ubicacion
    repuesto.stock_fisico += cantidad_recibida
    repuesto.ubicacion_codigo = ubicacion_codigo

    #Crea el registro de recepción
    recepcion = Recepcion(
        pedido_id=pedido_id,
        codigo_repuesto=codigo_repuesto,
        ubicacion_codigo=ubicacion_codigo,
        cantidad_recibida=cantidad_recibida
    )

    #Prepara la recepción para guardarla
    session.add(recepcion)

    #Registra el movimiento de entrada al inventario
    movimiento = MovimientoStock(
        codigo_repuesto=codigo_repuesto,
        tipo="entrada",
        cantidad=cantidad_recibida,
        referencia=f"Pedido de compra {pedido_id}"
    )

    #Prepara el movimiento para guardarlo
    session.add(movimiento)

    
    #guarda todos los cambios en PostgreSQL
    try:
        session.flush()
        session.commit()
    #Si hay error revierte la transacción. codigo 500 error interno del servidor
    except SQLAlchemyError as error:
        session.rollback()
        print(f"ERROR DE POSTGRESQL: {error}")
        raise HTTPException(
            status_code=500,
            detail="Error. No se pudo registrar la recepción en la base de datos"
        )

    #Actualiza los datos del repuesto después del commit
    session.refresh(repuesto)


    #Devuelve la información de la recepción
    return {
        "pedidoId": pedido_id,
        "cantidadRecibida": cantidad_recibida,
        "repuesto": {
            "codigo": repuesto.codigo,
            "nombre": repuesto.nombre,
            "lote": repuesto.lote,
            "stockFisico": repuesto.stock_fisico,
            "stockReservado": repuesto.stock_reservado,
            "stockDisponible": repuesto.stock_disponible,
            "umbralMinimo": repuesto.umbral_minimo
        }
    }
