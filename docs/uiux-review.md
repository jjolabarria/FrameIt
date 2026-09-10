# Acta de revisión senior UI/UX — FrameIt

Fecha: 9 de septiembre de 2026. Revisor: agente independiente `senior_ui_ux`.

**Resultado final: aprobados los lotes de frontend, la gestión jerárquica de clientes/proyectos/sesiones, el contexto temporal de preguntas, el acceso compartido, el cierre automático por tiempo, la exportación PDF y la coherencia de sus contratos.** No quedan hallazgos P0/P1 pendientes en los lotes aprobados; el apartado de PDF documenta un fallo independiente de alta de resultados excluido de esa corrección. La aprobación corresponde a 44 archivos de producto identificados en el [manifiesto SHA-256](../output/playwright/reviewed-files.sha256.json), incluida la configuración del proxy, del modelo IA y los servicios de temporización y documentación; cualquier modificación posterior relevante requiere nueva revisión.

## Alcance y criterio

Se contrastaron código, capturas y recorridos de interacción con el contexto de `.impeccable.md`: facilitador desde portátil, participante desde móvil y proyección en sala. Se conserva la identidad clara navy/teal/ámbar y Space Grotesk/Manrope, con jerarquía y densidad específicas para cada perfil.

La revisión cubre las rutas activas de Inicio, Sesiones, Clientes, Plantillas, Diseñador, consola, participante y proyección; los componentes y hooks que las sostienen; y los contratos UX de `Program`, `Contracts`, `TemplateMapper`, `SessionHub` y `SessionBroadcast`.

## Aprobación por lote

| Lote | Veredicto | Evidencia y comprobaciones |
|---|---|---|
| Base visual y accesibilidad | Aprobado | Tipografía, contraste de texto secundario corregido, jerarquía de acciones, foco visible, controles táctiles, estados y selección semántica; capturas en escritorio y móvil. |
| Consola y participante | Aprobado | Entrada sin falsa expulsión, recarga sin duplicar participante, borrador aislado por identidad/pregunta, recuperación al volver a pregunta, confirmación enviada tras recarga, radios con teclado, error de envío conservando texto y secuencia Cerrar → Revelar → Siguiente → Abrir. [Resultados](../output/playwright/session-lote-1b/interaction-results.json). |
| Proyección | Aprobado tras corrección | Título largo y respuesta de aproximadamente 4.000 caracteres conservados íntegramente. A 1280×720: documento 720px, pie 696px, texto 29,44px y 25 páginas. A 1920×1080: documento 1080px, pie 1056px, texto 40px y 8 páginas. Paginación manual y continuación visibles. [Resultados](../output/playwright/projection-fix/interaction-results.json). |
| Workspace y diseñador | Aprobado | 14/14 comprobaciones: sesiones cerradas fuera de activas; creación mediante parámetros; altas de cliente/proyecto/sesión; cliente y plantilla conservados; detalle de plantilla; opciones guardadas; cambio de tipo coherente; vista previa; continuar o descartar cambios sin guardar; búsqueda vacía y reintento de error. [Resultados](../output/playwright/workspace-lote-2/interaction-results.json). |
| Acabado final | Aprobado | Login desde sidebar habilita Guardar en otra instancia del hook; autoría Named por defecto; eliminación de jerga de compatibilidad; singular correcto; errores iniciales no muestran ceros ni falsos estados vacíos. [Resultados](../output/playwright/polish-final/interaction-results.json). |
| Contratos UX y privacidad | Aprobado | Agenda autenticada con IDs de instancia; separación explícita de snapshots/grupos públicos y facilitador; publicación manual AfterClose; ocultación permanente FacilitatorOnly; autor anónimo sin nombre ni ID; recuento privado y timestamp; rechazo de respuesta para otra pregunta. Se revisó la evidencia de integración real del implementador: [10/10 comprobaciones](../output/playwright/api-integration/results.json). |
| Navegador contra API real | Aprobado | 5/5 recorridos integrados: creación y login; entrada, ronda, borrador tras recarga y recepción; publicación pública con cookie de facilitador en proyección; siguiente pregunta y recuperación offline/online conservando borrador; encuesta confirmada. La última ejecución comprueba `snapshot.joinUrl` y entra usando exactamente esa URL. [Resultados](../output/playwright/real-integration/results.json). |

## Hallazgos corregidos durante la validación

- El participante podía ser marcado como expulsado entre la respuesta REST de entrada y la actualización SignalR. Se verificó la corrección con un evento deliberadamente diferido.
- El campo de respuesta quedaba por debajo del primer viewport móvil entre metadatos repetidos. Ahora pregunta, respuesta y acción principal aparecen antes de herramientas secundarias.
- Faltaba navegación de preguntas y existían acciones de fase sin prioridad. La agenda y el mando contextual permiten completar una sesión.
- La proyección compartía escala de escritorio administrativo. Se verificaron QR ampliado, tipografía propia y respuestas completas paginadas; el desbordamiento vertical con títulos largos se corrigió y reprobó.
- Se perdía el cliente al preparar una sesión desde su ficha. La navegación conserva su contexto.
- Las opciones de una pregunta de selección seguían visibles al cambiar a texto. Participante y vista previa respetan ahora el tipo.
- Se añadieron anuncio único de fase/pregunta, estado seleccionado nativo, borradores persistentes y errores recuperables.
- Los eventos offline/online actualizan inmediatamente el estado de conexión y reconstruyen suscripción y snapshot al recuperar red. El recorrido real confirma que el borrador se conserva y el envío posterior llega al servidor.
- Se corrigieron falsos estados vacíos tras error, singular/plural y etiquetas técnicas del diseñador.
- El proxy podía generar enlaces y QR con el puerto de la API. Se configuró `changeOrigin: false` para API y SignalR; la última integración verifica que el enlace recibido abre el frontend y completa la entrada usando esa URL exacta.

## Evidencia visual

| Perfil | Antes | Después |
|---|---|---|
| Participante, 390px | [Baseline](../output/playwright/baseline/participant-open-390.png) | [Respuesta prioritaria](../output/playwright/session-lote-1b/participant-open-390.png) |
| Facilitador | [Baseline](../output/playwright/baseline/facilitator.png) | [Agenda y mando contextual](../output/playwright/session-lote-1b/facilitator-1366.png) |
| Sala de espera proyectada | [Baseline](../output/playwright/baseline/projection-lobby-1280.png) | [Proyección](../output/playwright/projection-fix/projection-lobby-1280.png) |
| Diseñador | [Baseline](../output/playwright/baseline/designer.png) | [Acabado final](../output/playwright/polish-final/designer-after-login.png) |

También se revisaron capturas de selección, envío, error, opciones, vista previa, confirmación de salida, clientes creados, detalle de plantilla y proyección de continuación. Se comprobó móvil a 360/390px, consola a 1366/1440px, proyección a 1280×720 y 1920×1080, y ampliación de texto al 200% en consola.

## Método y límites de la evidencia

Las capturas y pruebas de interacción del revisor se ejecutaron con Edge headless y Playwright Core, usando fixtures REST/SignalR controladas. No accedieron a la base de datos del usuario. El QR de estas fixtures es un marcador visual y no acredita escaneabilidad física. La integración de API usa la base PostgreSQL desechable `frameit_uiux_review`, según el resultado revisado del implementador.

Se revisaron los resultados y capturas del recorrido de navegador contra la API real en `127.0.0.1:5139`, a través del frontend de prueba en `127.0.0.1:5175`. La revisión acredita los escenarios registrados; no constituye una certificación exhaustiva WCAG ni una prueba presencial de proyector o móvil físico.

Las pruebas de autorización y privacidad se ejecutaron bajo el **login simulado preexistente** del proyecto. Acreditan separación de payloads, roles y canales en ese entorno; no acreditan autenticación de producción, gestión real de identidades ni control de acceso entre organizaciones.

Reproducción de la evidencia controlada desde la raíz del repositorio:

```powershell
node frontend/node_modules/vite/bin/vite.js frontend --host 127.0.0.1 --port 5174 --strictPort
node output/playwright/capture-review.cjs session-recheck
node output/playwright/capture-review.cjs workspace-recheck
node output/playwright/capture-review.cjs projection-recheck
node output/playwright/capture-review.cjs polish-recheck
```

El runner depende de Playwright Core instalado en la caché local de revisión. Cada ejecución escribe capturas y resultados en una carpeta distinta bajo `output/playwright/`.

## Validación posterior: cierre automático del temporizador

**Aprobados los seis archivos del cambio**, identificados en su [manifiesto SHA-256](../output/playwright/timer-review/reviewed-files.sha256.json): servicio `RoundTimerService`, registro y comprobación de plazo en `Program`, invalidación en `useSessionLive` y mensajes de consola, participante y proyección. La comprobación atómica de pregunta y apertura protege las reaperturas; el evento sin payload hace que cada cliente recupere su snapshot autorizado conservando el host externo. El cierre no publica resultados nuevos y conserva los que ya estuvieran revelados explícitamente.

La última pasada independiente contra Docker local en `127.0.0.1:8080`, sin mocks de red, supera **8/8 comprobaciones**: [resultados](../output/playwright/timer-review/results.json).

- Ronda de ocho segundos cerrada por servidor sin ninguna página de facilitador abierta; actualización real del participante y de la proyección, respuesta privada conservada y borrador local retenido.
- API rechaza aportaciones después del plazo cuando no se permiten respuestas tardías.
- Reapertura restaura el borrador y permite enviarlo; el siguiente cierre conserva ambas respuestas y solo la publicación manual las revela.
- La excepción preexistente `AllowLateResponses` continúa admitiendo respuestas por API después del cierre sin publicarlas. La interfaz continúa permitiendo enviar únicamente durante la ronda abierta.
- Reabrir antes del vencimiento conserva la nueva ronda más allá del plazo anterior.
- Cambiar de pregunta conserva la ronda nueva al vencer el plazo de la anterior.
- Un temporizador de cero segundos vence inmediatamente y rechaza envíos.
- El facilitador que regresa encuentra la ronda cerrada y el mando «Revelar resultados».

Capturas finales inspeccionadas: [participante a 390 px](../output/playwright/timer-review/participant-expired.png), [proyección a 1280 × 720 px](../output/playwright/timer-review/projection-expired.png) y [consola a 1440 px](../output/playwright/timer-review/facilitator-expired.png). El aviso «Ronda cerrada» conserva un encabezado semántico dentro de un contenedor de estado accesible; el texto confirma que el borrador sigue guardado. No se atribuye la causa del cierre usando el reloj del cliente.

El implementador confirmó build de frontend/API y lint correctos. Se cerraron las sesiones de prueba y Docker quedó activo. Esta validación usa la base independiente del despliegue Docker y el login simulado existente, con los límites de autenticación indicados anteriormente.

## Validación posterior: agradecimiento tras la valoración

**Aprobados `ParticipantSessionPage.tsx` y `App.css`** para la ventana «Gracias por participar». Las huellas actuales constan en el manifiesto global y en el [manifiesto de este cambio](../output/playwright/survey-thanks-review/reviewed-files.sha256.json). El modal nativo solo abre al confirmar el éxito de la API; tiene título y descripción accesibles, foco inicial en su botón y cierre por Escape o «Volver a la sesión». Al cerrar devuelve el foco a la valoración seleccionada, ya que el botón de envío queda deshabilitado hasta editar.

**5/5 comprobaciones superadas**, con proceso final terminado correctamente: [resultados](../output/playwright/survey-thanks-review/results.json). Se verificaron guardado real y modal, teclado y retorno de foco, recarga sin reapertura, error sin agradecimiento, conservación de la selección, reintento correcto y actualización de una sola valoración en servidor. Solo se interceptó una respuesta HTTP 503 para provocar el error; todos los envíos correctos fueron a la API real de Docker.

Capturas finales inspeccionadas: [móvil a 390 px](../output/playwright/survey-thanks-review/thanks-mobile.png), [escritorio a 1440 px](../output/playwright/survey-thanks-review/thanks-desktop.png) y [error recuperable](../output/playwright/survey-thanks-review/feedback-error.png). Composición, texto y botón claros y sin desbordamiento horizontal. El tabulador no accede a controles del formulario de fondo mientras el diálogo está abierto; puede llegar a la interfaz del navegador, comportamiento nativo permitido.

Build y lint confirmados por el implementador. Sesiones de prueba cerradas y Docker activo. Sin hallazgos bloqueantes en este cambio.

## Validación posterior: exportación PDF sin dependencia obligatoria de IA

**Aprobado el servicio de documentación y su documentación de Docker**, con revisión del harness de pruebas. [Manifiesto del cambio](../output/playwright/pdf-review/reviewed-files.sha256.json). El documento determinista identifica que recoge datos registrados, no inventa narrativa y conserva preguntas, respuestas, resultados, dudas, adjuntos y valoraciones sin los límites `Take` anteriores. La autoría de respuestas anónimas se oculta tanto en PDF como en el prompt opcional de IA. El listado de participantes sigue separado de la atribución de respuestas.

La prueba independiente en navegador real de Docker descarga correctamente el PDF desde «Materiales y cierre»: HTTP 200, `application/pdf`, archivo válido de 65.823 bytes y **2 páginas A4**. El endpoint devuelve 401 sin sesión de facilitador. [Resultados de descarga e integridad](../output/playwright/pdf-review/results.json). Ambas páginas se renderizaron con Poppler y se inspeccionaron visualmente: tipografía legible, páginas numeradas y texto sin recortes ni solapamientos. La extracción confirma las 35 frases de la respuesta larga, su marcador final, la atribución «Anónimo», la respuesta nominal, las 7 dudas y la valoración final.

El implementador confirmó **6/6 escenarios de servicio**: ausencia de clave sin llamada externa, HTTP 503, JSON inválido, JSON incompleto, timeout y respuesta correcta simulada; cada escenario genera un PDF y respeta cancelación previa. Se revisó `tests/PdfExport`, que usa un proveedor local simulado y no envía datos a servicios externos. Las excepciones de proveedor preservan la exportación determinista sin registrar el contenido de la sesión en logs.

Observaciones fuera del bloqueo de esta corrección: el texto de media usa «1 respuestas» (detalle menor de plural). Durante la preparación de datos, **POST `/api/sessions/{id}/outcomes` devolvió 500 con `DbUpdateConcurrencyException`**, en `Program.cs:622`; es un fallo previo de alta de resultados excluido por el implementador de esta corrección de exportación. La fixture final no creó resultados; la eliminación de su truncamiento se verificó en código. Las dudas, respuestas y valoraciones sí se crearon y comprobaron mediante la API real.

Sesiones de prueba cerradas; Docker permanece activo. La aprobación cubre la corrección de exportación y mantiene el límite de autenticación simulada del entorno local.

## Validación posterior: valoraciones visibles y persistentes

**Aprobados los siete archivos del cambio**: contratos, mapper, servicio de documentación, tipos de frontend, consola, participante y estilos. [Manifiesto del cambio](../output/playwright/survey-results-review/reviewed-files.sha256.json). El panel «Valoraciones de la sesión» aparece directamente en la consola al abrir encuesta, al cerrar sesión o cuando ya existen valoraciones. Muestra media, recuento, cada puntuación y comentario; el estado vacío no inventa una puntuación cero.

**5/5 comprobaciones superadas** en navegador y Docker reales, sin mocks de red, con salida correcta: [resultados](../output/playwright/survey-results-review/results.json). Dos participantes enviaron puntuaciones 5 y 3 y sus comentarios: la consola recibió los cambios en directo y mostró media 4,0 y dos valoraciones. Los datos siguen visibles al cerrar la sesión, abrirla desde Sesiones y recargar.

La lista de detalle solo se devuelve al facilitador, sin nombre ni ID de participante. Las respuestas públicas incluyen una lista vacía; no aparecen comentarios en REST público aun con cookie de facilitador, en la respuesta del envío de participante ni en los eventos SignalR de proyección. El formulario explica el destinatario y la ausencia del nombre. El prompt opcional de documentación tampoco vincula valoraciones con nombres.

Capturas inspeccionadas: [escritorio a 1440 px](../output/playwright/survey-results-review/survey-results-desktop.png), [móvil a 390 px](../output/playwright/survey-results-review/survey-results-mobile.png) y [estado vacío](../output/playwright/survey-results-review/survey-empty.png). Los comentarios largos se conservan completos en una lista con desplazamiento, nombre accesible y foco de teclado; se comprobó su desplazamiento con End y ausencia de desbordamiento horizontal.

Build y lint confirmados por el implementador. Sesión de prueba KGGRFP cerrada; Docker activo. Sin hallazgos bloqueantes en este cambio y con los límites de autenticación del entorno local ya indicados.

## Validación posterior: reapertura después de la valoración final

**Aprobado el cambio de `Program.cs` en los handlers `advance` y `round-state`**. [Huella del cambio](../output/playwright/reopen-review/reviewed-files.sha256.json). Las transiciones explícitas a fases de trabajo desactivan la encuesta final; `WrapUp` la activa. Las valoraciones guardadas permanecen intactas y la encuesta puede lanzarse de nuevo mediante su acción específica.

**5/5 comprobaciones superadas** en Docker y navegador reales, con salida correcta: [resultados](../output/playwright/reopen-review/results.json). Cerrar, valorar y reabrir desde la consola devuelve al participante a su pregunta con el borrador original; la recarga conserva esa situación. También se verificaron `advance` hacia Lobby, cambio de pregunta con encuesta abierta y un nuevo cierre que recupera la valoración guardada sin duplicarla ni reabrir el agradecimiento.

Capturas inspeccionadas: [pregunta y borrador recuperados](../output/playwright/reopen-review/participant-reopened-draft.png) y [valoración conservada al cerrar de nuevo](../output/playwright/reopen-review/participant-closed-again.png). Observación visual menor fuera de esta corrección: el contador puede mostrar transitoriamente 1:01 para una duración de 60 segundos inmediatamente después de reabrir, porque el tick local precede a la nueva fecha de apertura. No afecta al cierre del servidor ni a la salida de la encuesta.

No hay hallazgos bloqueantes de reapertura. Sesión de prueba cerrada y Docker activo.

## Validación posterior: configuración del modelo Luna

**Aprobados los cinco archivos del cambio**: `OpenAiOptions`, el campo `OpenAI:Model` de ambos archivos appsettings, documentación local y ampliación del harness PDF. [Manifiesto](../output/playwright/luna-review/reviewed-files.sha256.json). La configuración usa `gpt-5.6-luna`, cuyo identificador, Responses API y salidas estructuradas se comprobaron en la [documentación oficial de OpenAI](https://developers.openai.com/api/docs/models/gpt-5.6-luna). El PDF conserva su alternativa basada en datos registrados cuando no hay clave o falla el proveedor.

Se revisó el test que exige `model=gpt-5.6-luna` y `text.format.type=json_schema`. El implementador confirmó build Docker correcto, API saludable y **6/6 escenarios de proveedor simulado** con cancelación respetada. También informó de una petición real de conectividad con texto técnico fijo, sin información de usuarios ni sesiones: HTTP 200, modelo devuelto `gpt-5.6-luna` y estado `completed`. [Registro de evidencias y procedencia](../output/playwright/luna-review/results.json).

El alcance de la prueba real es acceso al modelo, no la generación completa de un informe con datos de sesión. La revisión automática de aprobación rechazó esa exportación con contenido de sesión; se utilizó la alternativa técnica sintética permitida. El recorrido completo de exportación IA permanece comprobado mediante proveedor simulado. Las credenciales añadidas concurrentemente se conservaron sin registrar sus valores; la revisión de configuración se limita al modelo solicitado.

No hubo cambios de interfaz ni se requirieron nuevas sesiones o capturas. Sin hallazgos bloqueantes de configuración.

## Validación posterior: acceso visible a valoraciones en modo lectura

Se reprodujo el problema sobre el Docker actual en `http://localhost:8080`, sin apoyarse únicamente en pruebas anteriores: entrar desde Sesiones a una sala con dos valoraciones, sin autenticar, ocultaba por completo el panel aunque la API pública ya devolviera su media y recuento. Después de iniciar sesión, aparecían los dos detalles. Se confirmó también que una cookie obtenida en `127.0.0.1` no autentica `localhost`. [Diagnóstico y capturas previas](../output/playwright/ratings-visibility-diagnostic/results.json).

**Aprobado el ajuste de `FacilitatorSessionPage.tsx`**: el resumen aparece también en modo lectura, la llamada «Consultar valoraciones» permite acceder como facilitador, y el detalle continúa protegido. El enlace «Valoraciones (n)» en cabecera lleva al encabezado del panel, especialmente útil cuando la agenda precede al contenido en móvil. [Huella del cambio](../output/playwright/ratings-visibility-review/reviewed-files.sha256.json).

**4/4 comprobaciones superadas**, con navegador real sobre `localhost:8080`, build/lint correctos y salida del runner sin error: [resultados](../output/playwright/ratings-visibility-review/results.json). Se verificaron entrada anónima desde Sesiones, resumen y CTA visibles, detalles ocultos y endpoint privado 401, autenticación desde el panel mostrando ambas valoraciones, retorno autenticado desde Sesiones y salto móvil sin desbordamiento horizontal.

Capturas finales inspeccionadas: [resumen sin autenticar](../output/playwright/ratings-visibility-review/anonymous-summary.png), [comentarios tras autenticar](../output/playwright/ratings-visibility-review/authenticated-comments.png) y [salto móvil al panel](../output/playwright/ratings-visibility-review/mobile-panel-jump.png). La prueba utilizó una sesión existente: no creó ni alteró sesiones o valoraciones y no llamó a PDF ni IA. Sin hallazgos bloqueantes de esta corrección.

## Validación posterior: gestión de clientes, proyectos y sesiones con volumen

**Aprobado el lote completo de 13 archivos de producto**, con revisión de documentación y pruebas auxiliares: [manifiesto del lote](../output/playwright/management-volume-review/reviewed-files.sha256.json). Se revisaron el nuevo `WorkspaceEndpoints`, su registro y validadores en `Program`, las rutas, componentes de catálogo y edición, carga independiente, utilidades de contexto, estilos y las páginas de Clientes, Sesiones, Inicio, Plantillas y consola. También se revisaron `workspace-management.md`, el entorno aislado y su harness de API. La frase de `docker-local.md` identifica **frame-it.es** como dominio previsto: no afirma publicación, DNS ni HTTPS verificados.

El [baseline real](../output/playwright/management-baseline/audit.md) confirmó dos problemas de orientación: las sesiones omitían cliente/proyecto y el alta de un proyecto podía cambiar de cliente al modificar la búsqueda. También mostró 244.423 bytes para solo 14 sesiones, de los cuales 202.087 correspondían a QR que la lista no utilizaba.

El resultado aprobado mantiene cuatro destinos globales y ofrece rutas propias para cliente y proyecto. Cada sesión identifica cliente, proyecto y código. La creación conserva los padres elegidos; editar no mueve sus relaciones. Búsqueda, filtros, orden y paginación permanecen en la URL; la consola vuelve al contexto de origen. Inicio limita cada lista a seis elementos. Las nuevas consultas paginan en PostgreSQL, limitan a 100 filas y omiten QR y contenido de las sesiones; los selectores remotos devuelven hasta diez opciones. Los endpoints de gestión requieren el acceso de facilitador preexistente, cuya autenticación es simulada y no se certifica como mecanismo de producción.

**7/7 comprobaciones de interfaz superadas** con 50 clientes, 1.000 proyectos y 2.000 sesiones simulados mediante respuestas interceptadas: [resultados](../output/playwright/management-volume-review/results.json). Se verificaron 25 filas por página, recarga y URL, búsqueda por código, cancelación conservando filtros, selección única y desplazamiento por teclado, cambio entre edición de cliente y alta de proyecto sin reutilizar campos, padre fijado aunque cambie la búsqueda, creación en el segundo proyecto y retorno desde consola. El error del catálogo de sesiones no presenta un vacío falso ni bloquea Clientes. No se escribieron esos datos en ninguna base persistente.

**4/4 comprobaciones adicionales superadas contra la API real de `localhost:18080`**, sin interceptar respuestas ni modificar registros: [resultados](../output/playwright/management-real-ui-review/results.json). Incluyen acceso explícito desde contexto anónimo, Inicio acotado, cliente → proyecto → consola con agenda real y breadcrumb, regreso con estado/orden/tamaño conservados, directorio de clientes paginado y composición móvil sin desbordamiento.

Capturas inspeccionadas directamente: [catálogo con nombres largos](../output/playwright/management-volume-review/sessions-desktop.png), [sesiones en móvil](../output/playwright/management-volume-review/sessions-mobile-row.png), [clientes en móvil](../output/playwright/management-volume-review/clients-mobile.png), [Inicio real](../output/playwright/management-real-ui-review/home-desktop.png), [directorio real](../output/playwright/management-real-ui-review/clients-desktop.png), [proyectos del cliente](../output/playwright/management-real-ui-review/client-projects-desktop.png), [detalle del proyecto](../output/playwright/management-real-ui-review/project-desktop.png) y [catálogo real móvil](../output/playwright/management-real-ui-review/sessions-mobile.png). Se comprobó escritorio de 1440 px y móvil de 390 px. Esta pasada dirigida no equivale a una nueva auditoría WCAG completa.

La [integración de API ejecutada por el implementador](../output/playwright/management-api-review/results.json), cuyo harness fue revisado, pasó con 50 clientes, 1.000 proyectos y 1.000 sesiones ficticias en una base aislada: filtros, orden estable, paginación y límites, DTO ligero, contadores, edición conservando relaciones, creación en el proyecto exacto y rechazo de padres incompatibles. La última versión también comprobó HTTP 409 al crear/editar un código de proyecto repetido y HTTP 400 para un título vacío. En la última ejecución, una página de 25 filas pesó 10.974 bytes y las cinco lecturas locales tardaron 145, 72, 79, 77 y 73 ms; son mediciones locales, no una garantía de rendimiento para cualquier volumen.

El implementador confirmó build/lint correctos y posterior despliegue en `localhost:8080`: Compose terminó sin error, los tres servicios quedaron saludables y el bundle fue `index-BzXneXgv.js`. Su smoke de cuatro endpoints de workspace devolvió HTTP 200 sin QR. Esta comprobación del despliegue principal se registra como evidencia informada por el implementador; la revisión visual independiente se realizó en el entorno aislado con ese mismo frontend. No se llamó a PDF ni IA y las pruebas masivas no tocaron la base principal.

**Veredicto senior final: aprobado, sin hallazgos bloqueantes pendientes en este lote.** Los defectos tempranos del editor compartido y del selector por teclado se corrigieron y revalidaron. Los endpoints antiguos permanecen por compatibilidad; las vistas nuevas no los usan para descargar todos los clientes o sesiones. Cualquier cambio posterior relevante requiere nueva revisión.

## Validación posterior: historial de preguntas del participante

**Aprobados `ParticipantSessionPage.tsx` y las reglas de historial de `App.css`**: [huellas](../output/playwright/participant-questions-review/reviewed-files.sha256.json). El participante ve sus preguntas enviadas, su contador, fecha y texto completo, con la más reciente primero. La confirmación y los errores se sitúan junto al formulario; el textarea queda bloqueado durante el envío y un error conserva el borrador. La recarga recupera el historial guardado sin anunciar un nuevo envío.

**4/4 comprobaciones superadas en navegador y API reales del entorno aislado `localhost:18080`**, con build `index-DLFLusey.js`, build/lint correctos informados por el implementador y runner terminado con código 0: [resultados](../output/playwright/participant-questions-review/results.json). Dos participantes enviaron preguntas diferentes: cada interfaz mostró su historial y contador propios, mientras el snapshot del facilitador conservó ambas. Se comprobaron recarga, bloqueo durante la petición, error 503 interceptado conservando texto sin añadir entrada ni confirmación, reintento real sin duplicación y contenido largo a 390 px. Las sesiones de prueba se cerraron al terminar; no se escribieron fixtures en 8080 ni se llamó a PDF o IA.

Capturas inspeccionadas: [historial móvil completo](../output/playwright/participant-questions-review/own-history-mobile.png), [historial del segundo participante en escritorio](../output/playwright/participant-questions-review/own-history-desktop.png) y [error junto al borrador](../output/playwright/participant-questions-review/question-error-mobile.png). La composición es legible y no presenta desbordamiento horizontal.

El alcance de este arreglo es la presentación del historial propio. El contrato público preexistente continúa incluyendo todas las preguntas; el filtro de interfaz por alias único no constituye una nueva garantía de privacidad. El texto «Enviada al facilitador» describe el envío sin prometer exclusividad. Compartir preguntas ajenas en la interfaz o incorporar moderación queda fuera de esta corrección y requiere definir ese flujo. **Sin hallazgos bloqueantes pendientes en los dos archivos aprobados.**

Tras la aprobación, el implementador confirmó despliegue en 8080 con salida correcta, servicios saludables y bundle `index-DLFLusey.js` verificado por HTTP. Esta comprobación del despliegue se registra como evidencia informada por el implementador; la revisión visual directa se hizo en 18080. El entorno aislado fue retirado.

## Validación posterior: referencia temporal y ronda de cada pregunta

**Aprobados los 14 archivos de producto del lote y su migración**, junto con documentación y pruebas: [manifiesto](../output/playwright/question-context-review/reviewed-files.sha256.json). La revisión incluye entidades, configuración EF, migración/descriptor/snapshot, contratos, handlers, mapper, componente compartido `QuestionContext`, normalización del snapshot, tipos, páginas de participante/facilitador y estilos.

Cada pregunta nueva guarda una referencia inmutable a la ronda, su número global en la agenda, título, bloque, fase y apertura concreta, además de la fecha de envío y los segundos desde primera apertura de sesión y desde apertura de ronda. Los tiempos proceden del servidor e incluyen las pausas. Reabrir reinicia únicamente la referencia de apertura de ronda; no modifica lo guardado. Antes de abrir se indica la ausencia de reloj. Los registros anteriores conservan su contenido y muestran contexto no registrado; las sesiones anteriores no reciben un inicio reconstruido artificialmente.

El formulario captura la ronda al empezar a redactar. Si cambia la pregunta activa o su apertura, conserva el borrador, bloquea el envío y ofrece asociarlo explícitamente al estado actual. La API comprueba la referencia bajo bloqueo de fila y devuelve HTTP 409 cuando está desactualizada. Se corrigió y revisó la diferencia de precisión entre fechas .NET y PostgreSQL: ambos handlers normalizan la apertura antes de guardar/devolver y la comparación utiliza microsegundos UTC, evitando conflictos falsos sin confundir reaperturas.

**5/5 comprobaciones de navegador y API reales superadas**, con salida 0 en `localhost:18080` y frontend final `index-DYsbg9eE.js`: [resultados](../output/playwright/question-context-review/results.json). Se probaron envío previo al inicio, envío durante primera ronda, cambio de ronda mientras se redacta, asociación explícita conservando texto, nueva ronda preparada sin apertura, reapertura sin alterar registros y recarga. El mismo contexto se mostró al participante y al facilitador, con capturas de escritorio de 1366 px y móvil de 390 px sin desbordamiento horizontal.

La revisión visual detectó dos defectos finales y exigió corregirlos antes de aprobar: SignalR entregaba la fase anidada como número y la confirmación anterior permanecía al editar otro borrador. La última pasada incluye asserts específicos **antes de recargar**: fase textual tras SignalR y ausencia de confirmación antigua. Ambos pasan. También se corrigió un selector CSS que sobrescribía la disposición del componente de contexto en el historial participante.

Capturas inspeccionadas: [borrador tras cambiar de ronda](../output/playwright/question-context-review/changed-round-mobile.png), [historial participante con contextos](../output/playwright/question-context-review/participant-context-mobile.png), [facilitador en escritorio](../output/playwright/question-context-review/facilitator-context-desktop.png) y [facilitador en móvil](../output/playwright/question-context-review/facilitator-context-mobile.png). La jerarquía distingue referencia, momento y texto de la pregunta; los estados sin datos históricos se expresan sin inventarlos.

El [harness de API ejecutado por el implementador](../output/playwright/question-round-api/results.json), revisado por este agente, pasó **4/4 grupos**: migración de pregunta anterior preservada con contexto nulo y reloj de sesión desconocido, preinicio, reapertura con conservación histórica y rechazo de apertura anterior, y cambio de ronda con rechazo del borrador obsoleto y persistencia. La migración añade tres columnas; no elimina ni reconstruye preguntas previas. Build y lint correctos fueron confirmados por el implementador.

**Veredicto senior final: aprobado, sin hallazgos bloqueantes pendientes.** Las sesiones de revisión se cerraron al terminar y el agente no creó fixtures en 8080 ni llamó a PDF/IA. La función conserva el alcance de visibilidad existente de las preguntas y no implica una nueva política de colaboración o privacidad. La evidencia visual directa corresponde al entorno aislado; el despliegue principal y conservación de registros se verifican después por el implementador.

El implementador confirmó posteriormente la API saludable y el bundle `index-DYsbg9eE.js` servido en 8080. Su comprobación SQL después de migrar conservó **14 sesiones y 16 preguntas**, coincidiendo con el recuento previo; las 16 preguntas anteriores mantuvieron contexto nulo. Este smoke y la conservación de registros se atribuyen al implementador, diferenciados de la revisión visual independiente.

## Validación posterior: acceso local con contraseña y TOTP

**Aprobación senior global del lote para el despliegue local**, sin hallazgos bloqueantes pendientes. Se revisaron los 23 archivos de producto enumerados en el [manifiesto de esta revisión](../output/playwright/local-auth-review/reviewed-files.sha256.json), además de documentación, configuración aislada y pruebas. El alcance incluye Identity/EF y migración aditiva, inicialización administrativa, contraseña/TOTP/recuperación, cookies revocables y CSRF, grupos privados de SignalR, contenedores persistentes, acceso global, seguridad de cuenta y conservación del diseñador.

El alta requiere el código local de instalación y no activa el acceso privado hasta confirmar TOTP. QR, clave manual y recuperación se revelan mediante una acción expresa; los códigos requieren confirmación de guardado. Los campos permiten pegar y utilizar autocompletado. El diálogo nativo mantiene montado el editor durante una nueva identificación. El cierre explícito retira el espacio privado; los participantes conservan el acceso por código. Cambiar el autenticador no sustituye el anterior hasta confirmar el nuevo. La migración añade tablas de autenticación y no reconstruye ni elimina talleres.

**6/6 grupos de navegador y API reales superados** en `http://localhost:18080`, con Edge headless, frontend final `index-AKLhdolv.js` y salida 0: [resultados](../output/playwright/local-auth-review/results.json), [runner](../output/playwright/local-auth-review.cjs). Se comprobaron alta reanudada tras recarga, falta de autorización antes del segundo factor, código inválido, TOTP pegado con espacios, recuperación oculta y confirmación obligatoria, caducidad real de cookie conservando el borrador exacto y guardado posterior, rotación cancelada, cierre en otra pestaña, recuperación de acceso y regreso con filtros en la URL. Un error 503 interceptado exclusivamente en logout mantuvo abierto el diálogo obligatorio y conservó el borrador.

La prueba final también cerró la sesión de acceso en el servidor y completó otra identificación en la consola. Tras renovar el grupo privado, una nueva pregunta de participante llegó por SignalR sin recargar. Para abrir ese diálogo dirigido se emitió el evento de 401 de la aplicación; cierre, identificación y tráfico posterior fueron reales. El taller sintético se dejó cerrado. La comprobación móvil a 390 px no presentó desbordamiento; escritorio se revisó a 1366 px.

Capturas inspeccionadas directamente: [acceso móvil](../output/playwright/local-auth-review/login-mobile.png), [recuperación móvil enmascarada](../output/playwright/local-auth-review/recovery-mobile-masked.png), [diseñador conservado](../output/playwright/local-auth-review/designer-restored-desktop.png) y [consola tras renovar el acceso](../output/playwright/local-auth-review/console-renewed-private-live.png). Contraseñas, token de instalación, secreto TOTP y códigos de recuperación se mantuvieron en memoria y se enmascararon en las capturas. No se creó una cuenta del propietario ni se eligieron sus credenciales en 8080.

Los defectos detectados durante la revisión se corrigieron antes de aprobar: sincronización del acceso al reconocer una sesión, cierre accidental del paso de recuperación, selector de recuperación heredado al rotar TOTP, envíos duplicados mientras se verifica, retorno malformado, cierre del diálogo pese a fallar logout, renovación del grupo privado tras MFA, respuesta tardía de autenticación después de logout y mensaje 401 antiguo en el diseñador. Las correcciones de los estados críticos se incluyeron en la pasada final; las defensas de concurrencia y configuración también se revisaron en código.

El [harness de API del implementador](../output/playwright/local-auth-api/results.json), revisado independientemente en fuente, pasó **12/12 grupos**: catálogos protegidos y eliminación del acceso simulado; CSRF; alta con instalación y TOTP; hashes y Data Protection; entrada pública de participante; revocación del socket privado manteniendo el público; PDF autenticado sin IA en el entorno aislado; rechazo de TOTP caducado/consumido y recuperación reutilizada; invalidación de cookie copiada; rotación y cambio de contraseña revocando sesiones; consumo concurrente único; regeneración de recuperación; persistencia tras reiniciar y bloqueo por fallos reiterados. Build y lint correctos fueron confirmados por el implementador.

Esta aprobación cubre el uso local documentado en [autenticación local](local-auth.md). No es una certificación de seguridad, una auditoría WCAG completa ni una validación de publicación de `frame-it.es`: el acceso externo requiere HTTPS y actualizar .NET 9, actualmente fuera de soporte. Los informes anteriores que mencionan autenticación simulada son evidencia histórica del estado de aquellos lotes. Las pruebas de este lote usaron únicamente la base aislada; la conservación de los 14 talleres y 16 preguntas del despliegue principal se comprueba por el implementador después de aplicar la migración.

El implementador confirmó el [smoke del despliegue principal](../output/playwright/local-auth-deploy/results.json): tres servicios saludables, bundle `index-AKLhdolv.js`, **14 sesiones y 16 preguntas conservadas**, cero facilitadores, `setupRequired: true` y HTTP 401 para el catálogo privado sin acceso. El archivo de instalación tiene permisos 600 y no se leyó su contenido durante ese smoke. Esta comprobación de 8080 se atribuye al implementador; la revisión visual independiente se realizó en 18080. El propietario puede configurar su cuenta siguiendo la guía local.

## Validación posterior: landing pública de producto

**Aprobados los ocho archivos de producto de la landing**, junto con su documentación y prueba: [manifiesto](../output/playwright/landing-review/reviewed-files.sha256.json). Se revisaron `LandingPage.tsx`, sus estilos, rutas de `App`, retorno de `LocalAuth`, enlaces de `WorkspaceLayout`, `safeReturnPath`, metadata HTML y favicon. La entrada pública ocupa `/` y el dashboard permanece protegido en `/espacio`; los enlaces de Inicio y el regreso desde sesiones admiten esa ruta. No hay cambios de API ni de datos.

La dirección editorial mantiene tipografías y colores compatibles con FrameIt, combina una explicación directa con una vista de taller identificada como ilustrativa y distingue facilitación de participación. La demostración Preparar/Facilitar/Recoger es voluntaria, operable mediante botones y no avanza sola. No incorpora testimonios, cifras comerciales o resultados de clientes inventados. El favicon sustituye el gráfico del starter por el monograma del producto.

**6/6 grupos de pruebas superados**, con Edge headless, frontend final `index-CRV-vJh6.js` / `index-DWdy6F5J.css` y salida 0 en `localhost:18080`: [resultados](../output/playwright/landing-review/results.json), [runner](../output/playwright/landing-review.cjs). La landing pública no solicita catálogos ni sesiones privados. Se probaron las tres etapas mediante Tab/Enter/Espacio, estado seleccionado único y anuncio del contenido; CTA hacia el gate de `/espacio` y diálogo existente; validación local del código y normalización antes de recibir un HTTP 404 real para un taller inexistente. El error se asocia al campo y se limpia al editar. Los enlaces de participante no activan el acceso de facilitador.

Se verificó ausencia de desbordamiento horizontal a 360, 390, 640 y 1366 px; todos los enlaces y botones visibles de la landing alcanzan 44 px en la comprobación móvil, y las transiciones son imperceptibles con movimiento reducido. **Solo para las pruebas de retorno autenticado** se interceptaron `/api/auth/me`, `/api/auth/status` y el overview vacío: el acceso sin retorno, con URL externa o malformada termina en `/espacio`, mientras que un retorno local válido conserva su query. Esta prueba comprueba enrutamiento, no repite la integración MFA del lote anterior. No se creó cuenta ni se modificaron datos, en 18080 o en 8080.

Capturas inspeccionadas: [landing en escritorio](../output/playwright/landing-review/landing-desktop.png), [hero móvil final](../output/playwright/landing-review/hero-mobile.png), [etapas en móvil](../output/playwright/landing-review/workflow-mobile.png) y [error del código](../output/playwright/landing-review/join-error-mobile.png). Se corrigieron antes de aprobar los enlaces táctiles demasiado bajos y la división del número decorativo de ronda en móvil. La representación principal conserva el número de ronda textual y omite el duplicado decorativo en pantallas pequeñas.

Auditoría dirigida: **17/20, buena**, sin P0/P1/P2 pendientes del lote. Es una valoración de esta revisión, no una certificación WCAG ni una medición de rendimiento de campo.

| Dimensión | Puntuación | Evidencia y límite |
| --- | --- | --- |
| Accesibilidad | 3/4 | Semántica, teclado, estados, formulario y movimiento reducido comprobados; no se repitió una auditoría completa con lector de pantalla. |
| Rendimiento | 3/4 | Sin dependencias nuevas, imágenes pesadas ni consultas privadas; conserva el bundle y las fuentes globales existentes. |
| Responsive | 4/4 | Cuatro anchuras comprobadas, objetivos táctiles de 44 px y corrección visual móvil revalidada. |
| Tema | 3/4 | Paleta clara coherente mediante variables locales; algunos tonos secundarios siguen declarados directamente. |
| Patrones visuales | 4/4 | Jerarquía editorial, demostración vinculada al producto y ausencia de métricas ficticias o decoración que obstaculice el recorrido. |

**Veredicto senior final: aprobado para desplegar en el entorno local.** Build y lint correctos fueron confirmados por el implementador. La landing no publica por sí misma `frame-it.es`; DNS y HTTPS continúan fuera del alcance de este lote. La [documentación de producto](product-landing.md) describe la nueva distribución de rutas y el carácter ilustrativo de la presentación.

El implementador confirmó el [smoke posterior en 8080](../output/playwright/landing-deploy/results.json): landing HTTP 200, bundle `index-CRV-vJh6.js`, favicon coincidente, HTML en español, API saludable y catálogo privado HTTP 401. Solo se actualizó el contenedor web. Esta comprobación se registra como evidencia del implementador; la inspección visual independiente corresponde al entorno aislado, retirado al terminar junto con sus volúmenes sintéticos.

## Validación posterior: entrada pública para participantes y lectores

**Aprobados los nueve archivos de producto del lote**, junto con documentación y runner: [manifiesto](../output/playwright/public-entry-review/reviewed-files.sha256.json). La revisión incluye el formulario compartido y sus estilos, `JoinPage`, rutas de `App`, landing/estilos, cliente `api` y enlaces de recuperación en participante/proyección. No modifica API, datos ni migraciones.

`/join` ofrece código y modo Participar; `/proyeccion` preselecciona Solo ver. La landing utiliza el mismo formulario y prioriza entrar a una sesión, mientras los accesos privados se identifican como facilitador. El código se normaliza, se valida públicamente antes de navegar y permanece junto al modo si falla. Hay estado de consulta, bloqueo de campos/doble envío, error accesible y reintento. Participar lleva al alias; Solo ver lleva a la proyección pública sin registrar una participación. Las rutas públicas, incluidas mayúsculas, no montan el diálogo de autenticación ni muestran navegación del espacio privado.

**5/5 grupos superados con navegador, API y SignalR reales**, Edge headless sobre `localhost:18080`, frontend final `index-DVX5oftq.js` / `index-_K_pzVO8.css`, salida 0: [resultados](../output/playwright/public-entry-review/results.json), [runner](../output/playwright/public-entry-review.cjs). Se verificaron rutas sin código y modo inicial, código inválido y HTTP 404 reales, fallo de red interceptado conservando código/modo, bloqueo mientras se consulta y rechazo del envío duplicado. Un código válido con espacios/minúsculas llevó al alias y permitió entrar/enviar una respuesta sin llamadas de autenticación ni CSRF en el recorrido público.

La prueba de lector usó deliberadamente un contexto con **cookie válida de facilitador**. Las peticiones REST públicas omitieron esa cookie, no solicitaron endpoints privados y SignalR invocó `JoinSession`, nunca `JoinFacilitatorSession`. La respuesta permaneció oculta hasta la publicación manual y después apareció sin recarga. El transporte de SignalR conserva su configuración existente; la separación comprobada allí corresponde al grupo público, no a afirmar ausencia de cookie en el handshake. Las variantes `/JOIN/BAD401` y `/PROYECCION/BAD401`, con HTTP 401 interceptado, mostraron un error público y enlace para introducir otro código sin modal de acceso. El acceso anónimo a `/espacio` continuó mostrando el gate y el catálogo privado respondió HTTP 401 real.

Capturas inspeccionadas: [entrada pública móvil](../output/playwright/public-entry-review/join-mobile.png), [formulario compartido móvil](../output/playwright/public-entry-review/landing-entry-mobile.png), [formulario en escritorio](../output/playwright/public-entry-review/landing-entry-desktop.png), [respuesta enviada](../output/playwright/public-entry-review/participant-sent-mobile.png) y [lector con resultados publicados](../output/playwright/public-entry-review/reader-public-results-desktop.png). Composición legible a 390 y 1366 px, sin desbordamiento horizontal en los formularios comprobados. La revisión también verificó que los estilos antiguos de la landing ya no alteran los radios del componente compartido. No se acredita una nueva auditoría WCAG completa.

Las primeras ejecuciones ajustaron únicamente el fixture/selector del test al contrato existente: alta de plantilla devuelve GUID directo, el recibo de respuesta utiliza `role=status` y los radios nativos pueden medir 18 px. La ejecución final completa pasa sin cambios de producto derivados de esos ajustes. Los fallos controlados de red/401 se usaron solo para comprobar errores; entrada, envío y publicación fueron reales.

**Veredicto senior final: aprobado, sin bloqueantes pendientes.** La cuenta y los talleres utilizados fueron sintéticos, exclusivamente en 18080; los talleres se cerraron al terminar y los secretos permanecieron en memoria. No se creó ninguna cuenta ni fixture en 8080. La protección del servidor del facilitador permanece vigente: separar la interfaz pública no se presenta como sustituto de autorización. Build y lint correctos fueron confirmados por el implementador.

El implementador confirmó el [smoke del despliegue principal](../output/playwright/public-entry-deploy/results.json): `/`, `/join`, `/proyeccion` y `/JOIN` devuelven HTTP 200 con el bundle `index-DVX5oftq.js`; la API responde saludable, el catálogo privado conserva HTTP 401 y un código inexistente devuelve HTTP 404. Solo se actualizó el contenedor web. Esta evidencia de 8080 se atribuye al implementador y se distingue de la inspección visual independiente en 18080. El entorno aislado y sus credenciales sintéticas se retiraron al terminar.

## Validación posterior: valoración única y bloqueo al finalizar

**Aprobados los cuatro archivos de producto del lote**: `Program.cs` y las páginas de participante, facilitador y proyección, junto con documentación y runner: [manifiesto](../output/playwright/feedback-final-review/reviewed-files.sha256.json). Se revisaron todos los cambios respecto a las huellas anteriores. No hay migración ni modificación de valoraciones históricas.

La encuesta debe lanzarse antes de finalizar. El cierre desactiva la encuesta y rechaza valoraciones, aunque una pestaña conserve un formulario anterior. Cada identificador de participación puede registrar una valoración por sesión; posteriores envíos reciben HTTP 409 y no actualizan puntuación, comentario ni fecha. Cierre/cambio de fase, estado de encuesta y envío comparten un bloqueo transaccional de la fila de sesión, conservando además el índice único existente. El recibo público devuelve solo `submitted` y `canSubmit`, sin puntuación, comentario ni identidad del autor, y no se almacena en caché.

La interfaz avisa de que el envío es definitivo. Después de guardarlo conserva el agradecimiento modal y muestra un recibo sin controles de edición; al cerrarlo el foco vuelve al recibo. La recarga consulta el servidor en lugar de confiar en `saved` local. Un fallo conserva el borrador y comprueba si el envío llegó antes de ofrecer reintento. Participante y proyección priorizan el estado finalizado; la consola avisa antes de cerrar y deshabilita lanzar encuesta mientras la sesión siga cerrada. El cierre también prevalece sobre un flag histórico `SatisfactionSurveyOpen=true`; no se inventa ni reescribe ese histórico en el mapper.

**5/5 grupos superados con Edge, API y SignalR reales en `localhost:18080`**, salida 0, frontend servido `index-M_OQFK2N.js` / `index-_K_pzVO8.css`: [resultados](../output/playwright/feedback-final-review/results.json), [runner](../output/playwright/feedback-final-review.cjs). La prueba verificó:

- Aviso previo, envío y agradecimiento, foco al cerrar y recibo del servidor tras recargar habiendo borrado únicamente el almacenamiento local de la encuesta; ningún formulario editable ni modal repetido.
- Segundo POST diferente rechazado con 409; dos POST simultáneos de otro participante producen exactamente 200 y 409. El identificador, puntuación, comentario y timestamp originales permanecen idénticos.
- Error 503 interceptado conservando borrador sin agradecimiento; cierre real desde la consola mientras otro participante mantiene el formulario abierto. Las tres pantallas reflejan el cierre, desaparecen los controles de valoración, POST tardío y reapertura directa de encuesta reciben 409 y el recuento no aumenta.
- Reabrir la sesión y relanzar la encuesta mantiene bloqueado al participante que ya valoró y recupera el borrador del que todavía no lo hizo. Este segundo participante puede completar un único envío y los registros anteriores siguen intactos.
- Carrera entre un envío nuevo y cierre por `advance`: el envío obtuvo 200 y el estado final quedó Closed con el recuento consistente. Ambos POST posteriores al cierre obtuvieron 409; la primera valoración siguió intacta. La revisión del bloqueo compartido complementa esta ejecución concreta; no se presenta como prueba exhaustiva de todos los intercalados posibles.

Capturas inspeccionadas: [recibo tras recarga en móvil](../output/playwright/feedback-final-review/receipt-reloaded-mobile.png), [participante con sesión finalizada](../output/playwright/feedback-final-review/closed-participant-mobile.png), [proyección finalizada](../output/playwright/feedback-final-review/closed-projection-desktop.png) y [consola con valoraciones conservadas](../output/playwright/feedback-final-review/closed-facilitator-desktop.png). Composición clara a 390 px y 1366 px, sin invitaciones a valorar en las pantallas públicas cerradas. El recibo de recarga se capturó mientras el socket terminaba de conectar; la comprobación del estado de valoración ya había respondido desde el servidor.

**Veredicto senior final: aprobado, sin hallazgos bloqueantes pendientes.** Build de API/frontend, lint de las tres pantallas y `diff --check` correctos fueron confirmados por el implementador. Las cuentas y talleres fueron sintéticos y solo se usaron en 18080; los talleres quedaron cerrados. El agente no tocó cuentas ni datos de 8080. La garantía es por participación, dado el acceso mediante alias: no equivale a verificar la identidad física de una persona. La [guía de valoración](session-feedback.md) recoge esta regla y sus límites.

El implementador confirmó **6/6 comprobaciones de solo lectura** del [despliegue principal](../output/playwright/feedback-final-deploy/results.json): rutas `/`, `/join` y `/proyeccion` con HTTP 200 y bundle `index-M_OQFK2N.js`, API saludable, catálogo anónimo HTTP 401 y asset nuevo disponible con el recibo `feedback-status`. Compose terminó con salida 0 y los tres servicios saludables. No se crearon cuentas ni datos en ese smoke. Esta evidencia se atribuye al implementador; las pruebas funcionales y visuales independientes corresponden al entorno aislado. Los recursos de ese proyecto de revisión se retiraron al terminar.

## Validación posterior: avisos de preguntas nuevas

**Aprobados los tres archivos de producto del lote**: `QuestionNotification.tsx`, su integración en `FacilitatorSessionPage.tsx` y los estilos de `App.css`, junto con la [guía de avisos](question-notifications.md) y el runner: [manifiesto](../output/playwright/question-notification-review/reviewed-files.sha256.json). No se modifica el servidor ni la visibilidad actual de las preguntas.

La consola autenticada presenta un aviso persistente con contador agrupado y un acceso permanente en la cabecera. La llegada no abre un modal ni mueve el foco; el mensaje se anuncia mediante una región de estado cortés. «Ver preguntas» abre el listado y enfoca su encabezado desplegable. La apertura manual también marca los pendientes como consultados. Descartar conserva las preguntas y devuelve el foco al botón de cabecera. El indicador usa singular para una pregunta y plural para varias.

La primera entrada toma las preguntas existentes como referencia silenciosa. Los identificadores vistos y pendientes se guardan en `sessionStorage`, separados por sesión, sin contenido de las preguntas. Los pendientes sobreviven a recarga y reconexión; las actualizaciones repetidas no duplican avisos y los identificadores eliminados dejan de estar pendientes. La notificación pertenece a la consola abierta: no es push ni funciona con la aplicación cerrada.

**5/5 grupos superados con Edge, API y SignalR reales en `localhost:18080`**, salida 0, frontend `index-ub1vqq7t.js` / `index-Boegk6ox.css`: [resultados](../output/playwright/question-notification-review/results.json), [runner](../output/playwright/question-notification-review.cjs). Se verificaron historial inicial silencioso, envío real desde participante, agrupación de tres avisos sin robo de foco, persistencia exacta tras recarga/refetch/offline-online, contenido del almacenamiento limitado a IDs, consulta y descarte, apertura manual, aviso nuevo con el listado ya abierto, aislamiento entre dos sesiones y limpieza de pendientes tras retirar al participante sintético.

Capturas inspeccionadas: [aviso agrupado en escritorio](../output/playwright/question-notification-review/grouped-notice-desktop.png), [aviso en móvil](../output/playwright/question-notification-review/notification-mobile.png) y [listado abierto en móvil](../output/playwright/question-notification-review/questions-open-mobile.png). El aviso cabe a 390 px sin desbordamiento horizontal, conserva el botón de consulta y un cierre de 44 × 44 px. La captura de escritorio muestra que el foco continúa en «Abrir proyección» pese a la llegada de preguntas. No se acredita una nueva auditoría WCAG completa.

**Veredicto senior final: aprobado, sin bloqueantes pendientes.** Las dos correcciones solicitadas en revisión —singular del indicador y lectura al abrir manualmente— están incluidas y comprobadas en la ejecución final. Build y lint correctos fueron confirmados por el implementador. Cuenta y sesiones de prueba exclusivamente sintéticas en 18080, secretos solo en memoria y sesiones cerradas al terminar; el revisor no tocó cuentas ni datos de 8080.

El implementador confirmó **6/6 comprobaciones de solo lectura** del [despliegue principal](../output/playwright/question-notification-deploy/results.json): `/`, `/join` y `/proyeccion` devuelven HTTP 200 con `index-ub1vqq7t.js`, la API está saludable, el catálogo anónimo conserva HTTP 401 y el asset nuevo incluye el aviso. Solo se actualizó el contenedor web, con salida 0 y estado saludable, sin modificar datos. Esta evidencia de 8080 se atribuye al implementador; las pruebas visuales y funcionales independientes corresponden a 18080. El entorno aislado y sus volúmenes sintéticos se retiraron con salida 0.

## Validación posterior: menú flotante de acciones

**Aprobados los tres archivos de producto del lote**: `SessionActionsMenu.tsx`, su integración en `FacilitatorSessionPage.tsx` y los estilos de `App.css`, junto con la [guía del menú](session-actions-menu.md) y el runner: [manifiesto](../output/playwright/action-menu-review/reviewed-files.sha256.json). Las opciones existentes se trasladan a la cabecera del panel de sesión, antes de las valoraciones, manteniendo el mando principal independiente. No cambia el servidor ni sus reglas.

El desplegable vertical usa un portal y permanece dentro del viewport, recalculando su posición al desplazar o redimensionar. El disparador comunica apertura y relación con el menú. Enter, flechas y Home/End permiten acceder a las acciones habilitadas; ArrowUp abre en la última. Escape devuelve el foco al disparador y Tab sale sin atraparlo. Pulsar fuera conserva el destino del foco. Elegir una acción cierra el menú inmediatamente; «Finalizar sesión», separado visualmente, conserva la confirmación y enfoca Cancelar. La encuesta y Finalizar quedan deshabilitados en una sesión cerrada. Desconectar o perder permisos deshabilita el disparador y cierra el menú; la clave por sesión evita conservarlo al cambiar de sesión.

**4/4 grupos superados con Edge y API reales en `localhost:18080`**, salida 0, frontend `index-CgPV_mMx.js` / `index-CLIxgtcj.css`: [resultados](../output/playwright/action-menu-review/results.json), [runner](../output/playwright/action-menu-review.cjs). Se comprobaron posición respecto al mando principal y ausencia de desplazamiento del contenido, recorrido de teclado y restauración de foco, cierre exterior, acciones reales de reabrir ronda/volver al lobby/lanzar y ocultar encuesta, cancelación y confirmación de cierre, omisión de acciones deshabilitadas al navegar por teclado y bloqueo sin conexión.

Capturas inspeccionadas: [escritorio](../output/playwright/action-menu-review/menu-desktop.png), [móvil 390 px](../output/playwright/action-menu-review/menu-mobile.png), [móvil 360 px](../output/playwright/action-menu-review/menu-small-mobile.png) y [viewport reducido de 683 × 450](../output/playwright/action-menu-review/menu-reduced-viewport.png). Menú legible y contenido dentro de pantalla; el viewport reducido comprueba el espacio disponible, sin presentarlo como una prueba completa de zoom o auditoría WCAG. Las opciones de la sesión cerrada se muestran deshabilitadas en las capturas móviles. El portal mantiene el menú visible incluso cuando un cambio de tamaño desplaza su disparador fuera del área visible.

La primera ejecución comprobó el estado de encuesta cuando la UI todavía indicaba «Guardando…»: cerrar el menú no implica que el POST haya concluido. Se corrigió exclusivamente la sincronización del runner para esperar la respuesta. La ejecución final completa pasa sin cambios de producto derivados de esa interrupción.

**Veredicto senior final: aprobado, sin bloqueantes pendientes.** Build, lint y `diff --check` correctos fueron confirmados por el implementador. Cuenta y talleres exclusivamente sintéticos en 18080, secretos solo en memoria y talleres cerrados al terminar; el revisor no tocó cuentas ni datos de 8080.

El implementador confirmó **6/6 comprobaciones de solo lectura** del [despliegue principal](../output/playwright/action-menu-deploy/results.json): `/`, `/join` y `/proyeccion` devuelven HTTP 200 con `index-CgPV_mMx.js`, la API está saludable, el catálogo anónimo conserva HTTP 401 y el asset nuevo incluye el menú. Solo se actualizó el contenedor web, con salida 0 y estado saludable, sin modificar datos. Esta evidencia de 8080 se atribuye al implementador; las pruebas funcionales y visuales independientes corresponden a 18080. El entorno aislado y sus volúmenes sintéticos se retiraron con salida 0.
