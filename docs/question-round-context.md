# Contexto de las preguntas al facilitador

Cada nueva pregunta conserva una referencia inmutable a la pregunta de la dinámica activa (su ronda), su número dentro de la agenda, el bloque y los títulos que existían al enviarla. Guarda también la fase, la apertura concreta de esa ronda y los segundos transcurridos desde el inicio de sesión y desde esa apertura. La fecha de envío y los tiempos se calculan en el servidor.

El reloj de una sesión nueva comienza al abrir su primera ronda. Cerrar una ronda no reinicia ese reloj. Reabrir la misma pregunta crea una nueva referencia de apertura y reinicia únicamente el tiempo desde apertura de ronda; las preguntas anteriores conservan la referencia previa. El tiempo mostrado es tiempo natural transcurrido, incluidas las pausas, no una suma de tiempo de participación activa.

Antes de la primera apertura se muestra «Antes del inicio». Una ronda preparada sin apertura muestra «Ronda aún no abierta». Las preguntas anteriores a esta función mantienen su fecha y muestran «Ronda no registrada». En las sesiones anteriores sin una referencia fiable de inicio se muestra «Tiempo de sesión no registrado»; no se reconstruye el comienzo a partir de la última ronda.

El participante ve este contexto en «Tus preguntas» y el facilitador en «Preguntas del grupo». El formulario captura la ronda al empezar a escribir. Si cambia o se reabre mientras se redacta, conserva el borrador y ofrece «Asociar borrador a la ronda actual». Esta acción consulta el estado vigente y requiere una decisión explícita antes de enviar. La API comprueba tanto la pregunta de la dinámica como la apertura esperada, y devuelve HTTP 409 si el contexto quedó desactualizado.

El almacenamiento añade `RoundContextJson` a las preguntas, y `SessionStartedAtUtc` y `TracksSessionTime` a la sesión mediante migración EF. Los registros anteriores se conservan; el contexto de una pregunta no depende de consultar los títulos o la ronda actuales. Los clientes anteriores que no envíen una referencia esperada siguen siendo compatibles y reciben el contexto vigente calculado por el servidor al registrar su envío.

La función no cambia la visibilidad colaborativa de las preguntas. El contrato público preexistente sigue incluyendo todas; el historial propio de la interfaz es un filtro de presentación y no una garantía de privacidad.

## Verificación aislada

`tests/question-round-context.cjs --seed-legacy` prepara una pregunta ficticia sobre el stack anterior en `localhost:18080`. Después de actualizar ese stack a las nuevas imágenes, `node tests/question-round-context.cjs` comprueba migración, preinicio, primera apertura, reapertura, rechazo del contexto antiguo, cambio de ronda y persistencia. No ejecutarlo contra la base del usuario. La revisión de navegador y las huellas del agente senior se documentan en [uiux-review.md](uiux-review.md).
