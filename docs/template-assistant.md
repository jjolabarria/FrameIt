# Diseño de plantillas con IA

En **Plantillas → Nueva plantilla → Diseñar con IA**, indica objetivo, audiencia, duración orientativa y contexto. El asistente puede pedir aclaraciones o proponer una dinámica. Puedes pedir ajustes sobre toda la dinámica, el bloque activo o la pregunta activa. Para cambiar el bloque o la pregunta activa, vuelve al editor manual y selecciónalos.

Cada propuesta se revisa antes de **Aplicar al borrador**. Aplicar no guarda: utiliza **Guardar** cuando la plantilla esté lista. Puedes descartar una propuesta o seguir refinándola. **Deshacer aplicación** recupera el borrador anterior; si has editado después, solicita confirmación antes de descartar esos cambios. Una propuesta generada sobre una revisión anterior no se puede aplicar después de modificar el borrador.

En el detalle de una plantilla, **Crear variante** abre una copia con nueva clave y permite guardar otra plantilla sin modificar la original. Conserva guía interna, opciones y ajustes de preguntas. Las sesiones existentes no se modifican.

## Configuración y datos

Reutiliza `FRAMEIT_OPENAI_API_KEY`, `FRAMEIT_OPENAI_MODEL` y `FRAMEIT_OPENAI_BASE_URL` de Compose. El proveedor debe admitir Responses y salidas estructuradas con JSON Schema estricto. No requiere variables nuevas ni migraciones. Sin clave, el editor manual sigue disponible y el asistente indica que no está configurado.

Se envían instrucciones, los últimos 20 mensajes como máximo y el borrador; para ajustes parciales, solo la ficha y el bloque o pregunta afectado. No se recuperan datos de talleres o participantes. La solicitud al proveedor incluye `store: false`. FrameIt no persiste el chat: al abandonar el diseñador se pierde la conversación. Los registros operativos contienen resultado, duración y consumo si el proveedor lo informa, sin contenido ni credenciales.

El administrador debe seleccionar una organización. Los facilitadores utilizan su organización. Los endpoints requieren autenticación y el POST exige antifalsificación. La asistencia está limitada a 10 solicitudes por minuto y usuario por instancia de API, sin cola ni reintentos automáticos, con timeout de 90 segundos. Si se escala a varias instancias, el límite no es una cuota global compartida.

## Contratos y validación

- `GET /api/templates/assistant/capabilities`: devuelve `{ available }`, sin información sensible.
- `POST /api/templates/assistant`: recibe `instruction`, `history` (mensajes `role`/`content`), `draft`, `scope` (`template`, `section`, `question`), `sectionKey` y `questionKey`. Devuelve `message` y `draft`, que es nulo si pide aclaraciones. No escribe en base de datos.
- La aplicación mantiene la identidad de la plantilla y del ámbito seleccionado. El resto del borrador permanece intacto en los cambios parciales. Los ajustes adicionales de preguntas conservadas se mantienen si no cambia su tipo.
- La validación compartida se aplica también a creación e importación: hasta 20 bloques, 100 preguntas, 50 opciones por pregunta, claves únicas, tipos admitidos y opciones suficientes. Los datos incompatibles se rechazan con un error de validación.
- Un fallo del proveedor, salida inválida, timeout o cancelación conserva el borrador. Los rechazos del proveedor no se presentan como una propuesta válida.

## Comprobaciones

`dotnet run --project tests/TemplateAssistant` valida el servicio con proveedor simulado y controles HTTP usando una base EF InMemory aislada. Cubre respuestas estructuradas, aclaraciones, salida inválida, rechazo, cancelación, errores HTTP, aislamiento de ajustes, conservación de configuración, creación de taller, autenticación, antifalsificación, organizaciones y limitación por usuario.

`dotnet run --project tests/TemplateAssistant -- --live` añade una llamada real al proveedor configurado con datos sintéticos. No imprime credenciales ni contenido generado.

`node tests/template-assistant-browser.cjs` ejecuta el recorrido en Edge con APIs simuladas contra Vite en `http://127.0.0.1:5175` (configurable con `FRAMEIT_TEST_URL`). Captura escritorio y móvil en `output/playwright/template-assistant/`. El script utiliza la instalación de Playwright existente en `artifacts/npm-cache`, igual que las pruebas de acceso.

La prueba real del proveedor y el recorrido de navegador no sustituyen una validación del stack completo con PostgreSQL en Dokploy.
