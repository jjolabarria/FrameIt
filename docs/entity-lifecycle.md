# Archivar, restaurar y eliminar

Clientes, proyectos, plantillas propias y sesiones disponen de **Gestionar → Archivar / Restaurar / Eliminar**. Las operaciones muestran una confirmación con el nombre del elemento. El filtro **Mostrar → Activos / Archivados** permite recuperar el historial.

## Reglas

- Archivar conserva los datos y no cambia el estado de los elementos relacionados. Archivar un cliente no archiva automáticamente sus proyectos ni sus sesiones.
- Los elementos archivados desaparecen de sus listados habituales y de los selectores de creación. No se pueden crear proyectos en clientes archivados ni sesiones con cliente, proyecto o plantilla archivados. Los proyectos de un cliente archivado tampoco aparecen en los selectores de creación.
- Para archivar una sesión en curso hay que finalizarla primero. Una sesión archivada conserva resultados, documentos y acceso de consulta; se bloquean todas las escrituras, incluidos los nuevos participantes, hasta restaurarla. Restaurar no reabre automáticamente una sesión finalizada.
- Eliminar un cliente exige que no tenga proyectos ni sesiones. Eliminar un proyecto o plantilla exige que no tenga sesiones. Las dependencias archivadas también cuentan.
- Solo se eliminan sesiones en estado preparado (`Draft`) sin participantes, respuestas, preguntas, acuerdos, valoraciones ni archivos. La definición copiada del taller se elimina con la sesión vacía.
- Las plantillas incorporadas no se archivan ni eliminan porque son compartidas por toda la plataforma. Se puede crear una variante propia.
- Los facilitadores operan dentro de su organización y el administrador puede gestionar todas. No hay eliminación definitiva de sesiones con aportaciones en esta entrega.

## API y persistencia

`PUT /api/lifecycle/{kind}/{id}` recibe `{ "archived": true }` para archivar y `false` para restaurar. `DELETE` en la misma dirección elimina cuando se cumplen las reglas. `kind` admite `clients`, `projects`, `templates` y `sessions`. Ambas operaciones requieren sesión con MFA y antifalsificación; devuelven 204, 404 si no existe o no es accesible, y 409 cuando una regla impide la acción.

Los listados de clientes, proyectos y sesiones en `/api/workspace`, y el listado `/api/templates`, aceptan `archived=true` (por defecto `false`). Sus filas incluyen `isArchived`; los detalles siguen siendo accesibles. El resumen de inicio excluye los elementos archivados. Las instantáneas de sesión incluyen `isArchived` y las pantallas abiertas reciben una invalidación tras archivar o restaurar.

La migración `AddEntityArchiving` añade cuatro columnas booleanas con valor inicial `false`, preservando los registros existentes, y cambia a `RESTRICT` las relaciones de cliente/proyecto/plantilla con sus dependencias principales. No elimina datos al actualizar. La reversión pierde el estado de archivo y recupera las relaciones de borrado en cascada anteriores.

Las operaciones de ciclo de vida, creación de dependencias y escritura de sesiones utilizan bloqueos de PostgreSQL por entidad. Las transacciones existentes de sesión reutilizan la transacción exterior, manteniendo sus bloqueos de fila; una respuesta de error revierte los cambios. El borrado no puede intercalarse con una nueva aportación o creación de dependencias. No se realizan operaciones sobre archivos S3 porque se rechaza eliminar sesiones que los contienen.

## Validación

- `dotnet run --project tests/Lifecycle`: reglas, conservación de datos, dependencias archivadas, plantillas protegidas, aislamiento por organización y relaciones restrictivas usando EF InMemory. No sustituye las pruebas de transacciones y claves foráneas en PostgreSQL.
- `node tests/lifecycle-browser.cjs`: archivado/restauración de los cuatro tipos, cancelación sin petición, errores de dependencias, confirmación de eliminación, teclado y móvil con APIs simuladas. Vite por defecto en `http://127.0.0.1:5175`, configurable mediante `FRAMEIT_TEST_URL`.
- Comprobar `dotnet ef migrations has-pending-model-changes --project FrameIt.Api`, compilación de API/frontend y lint.

Antes de dar por validado el despliegue, aplicar la migración en el entorno de pruebas con PostgreSQL y comprobar también una creación de sesión o entrada de participante concurrente con eliminación/archivado. Docker y PostgreSQL no estaban disponibles localmente durante esta implementación.
