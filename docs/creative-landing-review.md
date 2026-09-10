# Contraste creativo de la landing de FrameIt

Revisión independiente de dirección de arte · 10 de septiembre de 2026.

## Dictamen

La landing es clara, sobria y consistente, pero todavía resulta intercambiable con una plantilla de colaboración SaaS. El problema no es una paleta estridente: es la combinación de frases aspiracionales simétricas, una maqueta de post-its y secciones con el mismo ritmo. Cambiar el nombre de FrameIt por el de una herramienta de pizarras dejaría casi toda la página funcionando.

La mejor oportunidad de originalidad está en el propio producto: una persona abre la ronda, el equipo responde y el facilitador decide cuándo publicar los resultados. Ese control del ritmo debe convertirse en la imagen y el relato principal.

## Alcance y evidencia

Contexto confirmado en `.impeccable.md`: facilitadores de talleres técnicos y participantes invitados; personalidad dinámica, clara y confiable; dirección «Sala de operaciones»; Space Grotesk y Manrope; tema claro, navy y teal; dinamismo producido por los estados de sesión.

Se han inspeccionado `frontend/src/pages/LandingPage.tsx`, `frontend/src/pages/LandingPage.css`, `docs/product-landing.md` y capturas existentes: `output/playwright/brand-review/landing-desktop.png`, `output/playwright/landing-review/landing-desktop.png`, `output/playwright/landing-review/landing-mobile.png` y `output/playwright/public-entry-review/landing-entry-desktop.png`. Las capturas de landing-review muestran una versión anterior de algunos accesos; el código y brand-review ya priorizan «Entrar a una sesión». No es una comprobación del navegador en vivo ni una auditoría de accesibilidad. No se ha modificado el producto.

## Qué hace que parezca una plantilla

- **La ilustración comunica un mural de ideas.** Panel inclinado, segundo marco desplazado, post-its pastel y una nota girada: códigos visuales de una pizarra colaborativa. En FrameIt la diferenciación es la ronda guiada y su publicación. No hay que prometer implícitamente una superficie de notas arrastrables.
- **El texto repite una misma fórmula.** «Dale forma… / Haz avanzar…», «Menos piezas… / Más foco…», «Facilitar con… / Participar con…», «La conversación… / Dale continuidad…». Son frases plausibles que no explican una escena específica del taller.
- **La composición no cambia de marcha.** Hero dividido, bloque de proceso dividido, bloque de perfiles dividido, formulario dividido y cierre centrado. El contenido cambia pero el recorrido conserva casi la misma distribución de masa y aire.
- **Los ejemplos también son eslóganes.** «Dar espacio a todas las voces» explica un valor de marca; no parece una respuesta de alguien trabajando en un taller técnico.
- **La ornamentación imita actividad.** El punto verde de sesión, el gran 02 y el icono Radio no expresan una transición concreta. Pueden recordar un dashboard simulado.

## Dirección propuesta: el guion de una sesión en vivo

Una composición editorial de sala de trabajo: una pregunta grande como pieza central, el estado de la ronda claramente nombrado y respuestas concretas cuando corresponde mostrarlas. Una única línea de continuidad conecta preparación, ronda y documento final. Los marcos rectos delimitan momentos de trabajo; los números identifican pasos reales, sin usarlos como decoración monumental.

El elemento memorable sería ver la misma pregunta pasar de la agenda a la ronda y después al documento. La continuidad se demuestra con contenido, sin tener que repetir la palabra varias veces.

No necesita fotografías de oficina, cambio de tipografías, nuevos colores de marca, animaciones de fondo ni una experiencia obligatoria antes de entrar a una sesión.

## Cinco cambios priorizados

| Prioridad | Cambio implementable | Criterio de resultado |
| --- | --- | --- |
| 1 | Sustituir el mockup de post-its por una escena de ronda con pregunta específica, estado textual y vista de resultados de ejemplo. Eliminar rotaciones y el marco duplicado. | La imagen permite explicar qué hace FrameIt y no sugiere una pizarra editable. Todo el ejemplo está identificado como tal. |
| 2 | Reescribir hero y titulares usando verbos y objetos del producto. Reducir la frase secundaria de audiencia y las promesas repetidas. | El primer bloque explica rondas, respuestas y publicación; conserva el CTA público «Entrar a una sesión». |
| 3 | Unificar el recorrido explicativo en una secuencia con una misma pregunta: preparar, abrir, recoger. Aprovechar los controles existentes para cambiar la escena y reducir el segundo conjunto de pseudopantallas. | Cambiar de etapa aporta información distinta y conserva contexto. Ningún estado avanza automáticamente. |
| 4 | Romper la repetición espacial: cabecera compacta, hero editorial asimétrico, escena de sesión ancha y secuencia inferior más breve. Integrar los perfiles como instrucciones de acceso y eliminar el cierre de eslogan centrado. | Cada bloque tiene una función y una jerarquía distinta. En móvil, el CTA público aparece antes de la ilustración y no exige recorrer la explicación. |
| 5 | Dar un acabado propio con reglas finas, marcos rectos y estado textual en teal/ámbar según corresponda; retirar flechas decorativas de las pestañas e iconos que no aporten significado. | Las señales visuales indican acciones o estados. Se mantienen la pareja tipográfica, el tema claro y un contraste legible. |

La escena puede ser estática en su primera implementación. Si se hace interactiva, usar un botón explícito «Ver resultados de ejemplo» y otro para volver al estado anterior; no una falsa consola conectada. Debe respetar los estados y controles reales del producto, sin simular votaciones, cifras comerciales, participantes conectados o un temporizador corriendo.

## Blueprint y texto propuesto

1. **Cabecera.** FrameIt / Cómo funciona / Entrar a una sesión / Facilitadores. Mantener la separación explícita entre acceso público y privado.
2. **Hero.** Antetítulo «Talleres guiados, ronda a ronda». Título «Pon una pregunta en la sala.» Texto «Prepara las rondas, recoge las respuestas del equipo y decide cuándo compartir los resultados. Al terminar, conserva la sesión en el proyecto y expórtala a PDF.» CTA «Entrar a una sesión» y enlace «Soy facilitador».
3. **Escena principal.** Etiqueta persistente «Sesión de ejemplo · Taller de adopción de IA». Pregunta «¿Qué tarea repetitiva nos quita más tiempo?». Mostrar un estado coherente, por ejemplo «Resultados publicados», y respuestas ficticias claramente cubiertas por la etiqueta de ejemplo: «Preparar el resumen de cada reunión», «Buscar la última versión de un documento», «Copiar datos entre herramientas». Usar filas sencillas, no post-its ni un ranking. La pregunta es un caso concreto, no una nueva promesa funcional.
4. **Proceso.** «La misma pregunta, de la agenda al documento.» Controles Preparar / Facilitar / Recoger. Cada estado retoma el ejemplo anterior: pregunta en la agenda; ronda y publicación; respuestas dentro de la documentación. Texto breve vinculado a las capacidades ya descritas en `docs/product-landing.md`.
5. **Entrada.** «¿Tienes un código de sesión?» Mantener `SessionCodeForm`, los modos Participar / Solo ver, normalización, validación y conservación del código ante errores. «Introduce el código que te ha compartido el facilitador.» La explicación de acceso privado debe seguir clara. No pedir autenticación ni añadir pasos a este flujo.
6. **Pie útil.** Marca, enlace «Espacio del facilitador» y retorno arriba. Puede incluir «Preparar, facilitar y documentar talleres» como descriptor breve; no necesita otra promesa en tipografía de hero.

En escritorio, propuesta de proporciones: texto principal ocupando unas ocho columnas y utilidad de acceso tres o cuatro; escena debajo a lo ancho, con su contexto en un margen lateral. Son proporciones orientativas, no un requisito de crear doce columnas en código. En móvil: cabecera, título, explicación corta, CTA público, escena, proceso y formulario. Las respuestas se apilan sin scroll horizontal y las pestañas conservan etiquetas completas.

## Elementos que conviene preservar

- Space Grotesk + Manrope, confirmadas como parte de la identidad; ajustar composición antes que sustituirlas por una pareja arbitraria.
- Tema claro, fondo ligeramente cálido, navy y teal contenido. La originalidad no necesita una ruptura de marca.
- Acceso público prioritario por `/join`; enlace privado identificado como facilitador.
- Formulario compartido y comportamiento real de Participar / Solo ver.
- Controles de etapas activados por la persona, sin reproducción automática, con estado accesible.
- Ausencia de testimonios, logos de clientes, métricas o funcionalidades inventadas.
- Enlaces de foco visible y controles táctiles existentes; deben verificarse de nuevo si cambia la estructura.

## Comprobación después de implementar

La propuesta pasará el contraste creativo cuando una persona pueda describir una ronda de FrameIt después de ver el hero, el ejemplo no se confunda con una pizarra y los títulos dejen de funcionar sin cambios para cualquier SaaS de equipo. Verificar además desktop y móvil, zoom, navegación por teclado, cambio de etapas, errores del formulario y ambos modos públicos. Estos criterios son verificaciones futuras; no se han ejecutado en esta revisión.
