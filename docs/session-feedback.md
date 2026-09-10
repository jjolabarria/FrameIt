# Valoración de la sesión

El facilitador debe lanzar la encuesta antes de finalizar la sesión. Al finalizar, la encuesta se cierra y no se admiten nuevas valoraciones; tampoco se puede lanzar otra encuesta mientras la sesión siga finalizada.

Cada participación puede registrar una sola valoración por sesión. El envío es definitivo: los intentos posteriores se rechazan sin modificar la puntuación, el comentario ni la fecha originales. Reabrir la sesión o relanzar la encuesta conserva este bloqueo. Como los participantes acceden mediante alias sin cuenta, esta regla se aplica a su identificador de participación, no a una identidad personal verificada.

La interfaz consulta el justificante del servidor al mostrar la encuesta. Recargar la página o borrar el borrador local no habilita un segundo envío si se conserva la participación. Tras guardar se muestra el agradecimiento y un justificante sin controles de edición. Un fallo de red conserva el borrador y permite comprobar si el envío llegó al servidor.

## Garantías del servidor

- `POST /api/sessions/{id}/feedback` requiere sesión activa, encuesta abierta y participante de esa sesión. Devuelve HTTP 409 si la encuesta está cerrada o ya existe una valoración.
- `GET /api/sessions/{id}/feedback-status?participantId=…` devuelve únicamente `submitted` y `canSubmit`, con `Cache-Control: no-store`. No expone puntuaciones ni comentarios asociados a participantes.
- Envío, cierre/cambio de fase y apertura/cierre de encuesta comparten un bloqueo transaccional de la fila de sesión. Dos envíos simultáneos no pueden sobrescribirse; un envío posterior al cierre no puede aceptarse.
- Se conserva el índice único existente por sesión y participante. No se necesita migración ni se alteran valoraciones históricas.

La vista del facilitador mantiene el resumen de las valoraciones ya registradas. Participantes y lectores ven el estado de sesión finalizada sin invitaciones a valorar.
