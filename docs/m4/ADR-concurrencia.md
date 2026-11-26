
# ADR - Control de concurrencia en la gestión de stock
## Estado
Aceptado.

## Contexto
El sistema PharmaPlant CORE permite registrar consumos de repuestos y realizar reservas de stock.
Estas operaciones pueden ser ejecutadas simultáneamente por diferentes usuarios sobre un mismo repuesto.
Si dos operaciones consultan el mismo stock disponible antes de actualizarlo, podrían utilizar cantidades superiores a las existentes, generar inconsistencias en el inventario o afectar la trazabilidad de los movimientos. Para evitar esto se implementa un mecanismo de control de concurrencia que permite garantizar el cumplimiento de las reglas de negocio RN-01 y RN-05.

## Alternativas consideradas
### 1. Restricciones CHECK en la base de datos
Consiste en establecer restricciones sobre los valores almacenados para impedir estados inválidos, como un stock físico negativo.
Ventajas:
- Permite proteger la integridad de los datos.
- Las restricciones se verifican directamente en la base de datos.
Desventajas:
- No controla por sí sola la lectura simultánea del stock.
- No garantiza por sí sola la consistencia de los movimientos asociados.

### 2. Bloqueo optimista
Consiste en utilizar un campo de versión para detectar si un registro fue modificado por otra transacción antes de actualizarlo.
Ventajas:
- Evita bloquear registros durante la lectura.
- Resulta adecuado cuando existen pocos conflictos concurrentes.
Desventajas:
- Requiere incorporar un mecanismo de versionado.
- Requiere gestionar los conflictos y posibles reintentos.

### 3. Bloqueo pesimista mediante SELECT FOR UPDATE
Consiste en bloquear la fila correspondiente al repuesto durante la transacción que modifica su stock.
Ventajas:
- Evita modificaciones simultáneas incompatibles sobre un mismo repuesto.
- Permite validar el stock actualizado antes de realizar una operación.
- Facilita el cumplimiento de las reglas de negocio.
Desventajas:
- Puede generar tiempos de espera entre transacciones.
- Requiere mantener las transacciones lo más breves posible.
- Puede generar interbloqueos si se adquieren múltiples bloqueos en distinto orden.

## Decisión adoptada
Se utiliza el bloqueo pesimista a nivel de fila mediante SELECT FOR UPDATE de PostgreSQL.
La implementación utiliza SQLModel y el método `with_for_update()` para bloquear el registro del repuesto antes de validar y modificar su stock.
El bloqueo se mantiene hasta que la transacción finaliza mediante un commit o un rollback.

## Implementación
El mecanismo se encuentra implementado en los siguientes archivos:
- `backend/app/repositories/usos.py`
- `backend/app/services/usos.py`
- `backend/app/controllers/reservas.py`

En el repositorio de usos se obtiene el repuesto mediante la siguiente consulta:
```python
consulta = (
    select(Repuesto)
    .where(Repuesto.codigo == codigo)
    .with_for_update()
)
```
Una vez obtenido el bloqueo, se verifica el stock disponible y se realiza la operación correspondiente.
Si existe stock suficiente, se actualizan los datos y se registran los movimientos asociados dentro de la misma transacción.
Si la operación no cumple las reglas de negocio, se rechaza y se ejecuta un rollback.

## Validación de la decisión
Se implementaron dos pruebas de integración concurrentes utilizando PostgreSQL, sesiones independientes, ThreadPoolExecutor y Barrier.
Las pruebas se encuentran en:
`backend/tests/test_concurrencia.py`

### Prueba 1. Consumos simultáneos
Se dispone de un stock inicial de cinco unidades y se ejecutan dos consumos concurrentes de cuatro unidades cada uno.
Se verifica que:
- Solamente un consumo sea aceptado.
- El segundo consumo sea rechazado por stock insuficiente.
- El stock físico y disponible final sea de una unidad.
- Se registre un único consumo.
- Se registre un único movimiento de salida.

### Prueba 2. Consumo y reserva simultáneos
Se dispone de un stock inicial de cinco unidades y se ejecutan un consumo y una reserva concurrentes de cuatro unidades cada uno.
Se verifica que:
- Solamente una de las operaciones sea aceptada.
- El stock disponible final sea de una unidad.
- El stock físico y reservado sean consistentes con la operación aceptada.
- Se registre un único movimiento de stock.
Ambas pruebas fueron ejecutadas correctamente sobre la base de datos `pharmaplant_test`.
Las pruebas verifican la consistencia de los resultados ante operaciones concurrentes. No miden directamente el tiempo de espera ni comprueban de forma específica la existencia de un bloqueo efectivo entre las transacciones.

## Consecuencias
La decisión adoptada permite proteger la consistencia del inventario frente a operaciones concurrentes sobre un mismo repuesto.
El bloqueo se realiza a nivel de fila, por lo que las operaciones sobre diferentes repuestos pueden continuar de manera independiente, siempre que no existan otros conflictos entre transacciones.
Como contrapartida, las operaciones sobre un mismo repuesto pueden experimentar tiempos de espera hasta que finalice la transacción que mantiene el bloqueo.

## Conclusión
La utilización de SELECT FOR UPDATE permite controlar las modificaciones concurrentes del stock y contribuir al cumplimiento de las reglas de negocio RN-01 y RN-05, manteniendo la consistencia y la trazabilidad de los movimientos del sistema.