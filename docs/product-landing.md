# Landing pública de FrameIt

La ruta `/` presenta el producto sin requerir acceso. El espacio privado anterior está en `/espacio`; sus accesos de Inicio y los retornos desde sesiones conservan ese contexto. `/acceso` vuelve por defecto a `/espacio`, manteniendo la validación de destinos locales.

La landing explica preparación, facilitación y documentación con una composición editorial clara y una vista ilustrativa con datos de ejemplo. Los controles Preparar/Facilitar/Recoger cambian el contenido mediante botones accesibles, sin temporizadores ni reproducción automática. No incluye testimonios, precios, cifras comerciales ni funcionalidades futuras presentadas como disponibles.

## Revisión creativa aplicada · 10/09/2026

Revisión de lenguaje posterior: el titular pasa a «Haz que cada taller cuente». El texto comercial se centra en dar voz al equipo, llegar con un propósito y aprovechar sus aportaciones. Los CTA de facilitador pasan a «Preparar mi taller» y «Preparar mi próximo taller». Se actualiza también la descripción SEO; las etiquetas operativas de la demostración y del formulario se conservan para facilitar su uso.

La portada se organiza alrededor de una pregunta de un taller de adopción de IA. Preparar, Facilitar y Recoger mantienen ese contexto; Facilitar permite mostrar y ocultar respuestas ficticias mediante un botón explícito. La escena está identificada como ejemplo y no realiza peticiones de sesión. Se retiraron los post-its inclinados, la repetición de bloques comerciales y el cierre de eslogan.

La landing sustituye Space Grotesk/Manrope por Bitter 500 y Source Sans 3 400/600. Los archivos se sirven desde `public/fonts`, junto con sus licencias OFL. El resto del producto conserva su tipografía existente.

La ilustración se generó específicamente para FrameIt: manos recogiendo aportaciones en una carpeta, en tinta y verde. El recurso web `public/images/workshop-to-project.jpg` mide 960×640 y pesa 138.266 bytes; tiene dimensiones declaradas y alt vacío por ser una ilustración complementaria al texto. Tras la revisión del hero se muestra en su columna visual con prioridad de carga alta, sin carga diferida. El original se conserva en `output/imagegen/workshop-to-project.png`.

El hero usa una banda petróleo a todo el ancho, texto claro y CTA ocre. Titular, argumento y acciones forman un único bloque de lectura junto a la ilustración; en móvil, las acciones preceden a la imagen. El resto mantiene superficies claras. Contrastes calculados: 10,86:1 titular, 9,32:1 cuerpo, 8,03:1 secundarios y 6,22:1 texto del CTA. Comprobado visualmente en 1440/390 px y sin desbordamiento a 320 px, donde el CTA termina a unos 530 px del inicio de la pantalla. Capturas en `output/playwright/hero-contrast-desktop.png` y `hero-contrast-mobile.png`.

Validación: compilación y lint del frontend; capturas nuevas de escritorio y móvil en `output/playwright/creative-landing-*.png`; navegación por teclado, revelado reversible, estados del ejemplo, fuentes cargadas, ancho de 320/390/768/1024/1440, error local de código inválido, modo Solo ver, foco del enlace de salto y movimiento reducido. El navegador se comprobó contra Vite en `http://127.0.0.1:5173`; el backend no estaba disponible y `/api/auth/me` devolvía 502. Esta revisión no certifica búsquedas de códigos válidos ni autenticación real. Los flujos existentes de `SessionCodeForm` no se modificaron.

Los accesos de facilitador llevan al panel protegido existente. El formulario público normaliza el código, comprueba que la sesión existe y permite participar o seguir sus resultados. Los errores se muestran antes de navegar y conservan lo escrito. No consulta listados privados ni crea una cuenta. Los enlaces y QR anteriores siguen funcionando.

El HTML identifica el idioma español y contiene título y descripción del producto. El despliegue continúa en localhost:8080; esta entrega no configura DNS ni publica frame-it.es.

## Entrada pública a sesiones

`/join` pide un código y permite elegir Participar o Solo ver. `/proyeccion` abre el mismo formulario con Solo ver seleccionado. El formulario compartido de la landing usa el mismo flujo, comprueba públicamente la existencia del código y mantiene el código/modo si hay error. Los accesos principales de la landing conducen a entrar en una sesión; los enlaces privados se identifican como facilitador.

Participar conduce a `/join/:code` y pide alias; Solo ver conduce a `/proyeccion/:code` y muestra únicamente el contenido publicado por el facilitador. Ninguno tiene cuenta, contraseña, zona privada ni diálogo de autenticación, incluso en rutas escritas en mayúsculas. El lector no crea una participación ni puede responder desde esa vista. Los códigos o enlaces erróneos permiten volver a introducir un código. El espacio privado y sus APIs mantienen la autenticación exclusiva del facilitador.
