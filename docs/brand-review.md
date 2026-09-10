# Revisión de marca de FrameIt

> Actualización 10/09/2026: consolidación aplicada. El estado vigente y las reglas están en [brand-system.md](brand-system.md). El diagnóstico siguiente es histórico.

Fecha: 9 de septiembre de 2026. Revisión realizada por un agente especialista senior en diseño de marca. Alcance: identidad visual y coherencia entre landing, acceso público, aplicación y materiales. No se ha modificado el producto ni se ha iniciado un rediseño.

## Dictamen

FrameIt ya transmite claridad y profesionalidad. La tipografía, la contención visual y los estados de sesión son adecuados para un facilitador que trabaja delante de clientes. El problema principal es que la identidad está fragmentada: landing, aplicación y favicon presentan variantes del símbolo y diferentes familias de color, sin una regla de relación visible.

Recomiendo una evolución y consolidación de marca. Mantendría el nombre, la pareja tipográfica, la familia de iconos y la estructura funcional. Concentraría el trabajo en un símbolo vectorial único, una paleta compartida y un pequeño manual que llegue también a PDF y accesos. No hay motivo de marca suficiente para rehacer toda la interfaz.

## Contexto y evidencia

Contexto confirmado en [.impeccable.md](../.impeccable.md): facilitadores profesionales en portátil y proyección; participantes desde móvil o portátil; personalidad dinámica, clara y confiable. El dinamismo debe proceder de rondas, progreso y participación.

Inspección visual:

- [Landing actual en Docker local](../output/playwright/brand-review/landing-desktop.png), capturada durante esta revisión, sin autenticación ni cambios de datos.
- [Consola del facilitador](../output/playwright/action-menu-review/menu-desktop.png), evidencia previa de pruebas aisladas.
- [Participante móvil](../output/playwright/public-entry-review/participant-sent-mobile.png), evidencia previa.
- [Proyección](../output/playwright/docker-review/projection-results.png), evidencia previa; se utiliza para identidad y lenguaje visual, no para certificar el comportamiento actual.

Fuentes de implementación: [tokens y tipografías](../frontend/src/index.css), [estilos de aplicación](../frontend/src/App.css), [landing](../frontend/src/pages/LandingPage.tsx), [estilos de landing](../frontend/src/pages/LandingPage.css), [marca del espacio](../frontend/src/components/WorkspaceLayout.tsx), [entrada pública](../frontend/src/pages/JoinPage.tsx), [autenticación](../frontend/src/components/LocalAuth.css) y [favicon](../frontend/public/favicon.svg). Las fuentes están declaradas mediante Google Fonts; esta revisión no certifica su descarga o disponibilidad en todos los entornos.

## Qué conservar

- **Space Grotesk + Manrope.** La primera aporta personalidad geométrica y la segunda sostiene formularios y lectura. Funcionan en los dos contextos sin introducir otra familia.
- **Navy, verde y superficies claras.** Dan confianza y evitan un tono infantil. Los acentos de estado ámbar, verde y morado ya tienen una función concreta y deben conservarla.
- **Lucide.** Una familia de trazo consistente es una buena base para un producto que crecerá. Los iconos acompañados de texto en controles importantes resultan claros.
- **“Talleres que avanzan”.** Es breve, comprensible y conecta con la continuidad entre cliente, proyecto y sesión. El mensaje de la landing desarrolla esa promesa sin inflar las capacidades del producto.
- **Jerarquía operativa.** La ronda y su estado deben seguir dominando la consola y la proyección. La marca no necesita ocupar más espacio para ser reconocible.

## Hallazgos priorizados

Las prioridades siguientes son de diseño de marca; no son una clasificación de vulnerabilidades ni una auditoría exhaustiva de accesibilidad.

| Prioridad | Observado | Implicación | Acción propuesta |
| --- | --- | --- | --- |
| Alta | Landing: Fi en marco lineal y palabra FrameIt con punto; aplicación: FI blanco en bloque navy de esquinas asimétricas; favicon: Fi vectorial crema, navy y verde. | La misma sesión cambia de firma al pasar de la entrada al producto. El monograma puede leerse como FI, Fi o una forma compactada según tamaño y fuente. | Un maestro SVG y un componente de marca, con variantes explícitas de tamaño, contraste y disposición. |
| Alta | Landing y entrada usan crema y verde bosque; la aplicación usa neutrales azulados y teal; autenticación incorpora valores propios. | La diferencia parece una evolución por pantallas, más que una familia diseñada. | Unificar colores de identidad y definir superficies por contexto con tokens compartidos. No basta con reemplazar todos los colores por un único hex. |
| Media | El símbolo principal se compone con texto HTML y CSS; no existe una geometría común al favicon. | Peso, separación y forma dependen del renderizado de la fuente. Se dificulta usar la marca fuera de la web. | Diseñar y probar el monograma como vector; conservar el nombre como texto accesible o proporcionar nombre accesible al SVG. |
| Media | Seguridad y la identificación del operador utilizan Boxes en la navegación/espacio. | La forma es consistente con Lucide, pero su significado remite a módulos o inventario, no a protección o identidad. | ShieldCheck o KeyRound para seguridad; UserRound para operador. Mantener etiquetas y un criterio semántico común. |
| Media | El generador PDF usa título FrameIt y azul/grises propios, según revisión de código facilitada por el agente principal. | La documentación entregada al cliente no hereda necesariamente la identidad del producto. | Incluir PDF en el sistema de marca y comprobar un documento renderizado antes de aprobar su aplicación. No se ha inspeccionado un PDF actual en esta revisión. |
| Baja | No se ha encontrado imagen social Open Graph ni variantes para iconos de instalación en el inventario público; hay activos residuales de plantilla sin referencias de uso. | El sistema de entrega de marca está incompleto y el repositorio acumula recursos ajenos. | Preparar imagen social y exportaciones necesarias para los canales elegidos; limpiar recursos sin uso después de comprobar referencias. No se afirma que React/Vite u otros iconos residuales sean visibles al usuario. |

## Dirección recomendada: dar marco al trabajo compartido

La idea de un marco tiene relación directa con FrameIt: dar contexto a una pregunta, ordenar una ronda y conservar el resultado. Esa relación ofrece más recorrido que añadir un símbolo genérico de inteligencia artificial, una bombilla o varios globos de conversación.

**Logotipo.** Recomiendo desarrollar la opción Fi dentro de un marco como punto de partida, con trazos dibujados y una proporción común entre símbolo y nombre. La i puede sugerir una persona aportando dentro de un contexto compartido. Es una propuesta conceptual, no un diseño final ni una afirmación de originalidad registrada. Hay que comprobar especialmente que se lea bien a 16 y 24 píxeles; si el punto se pierde, debe existir una versión simplificada del símbolo. Evitar depender de dos letras comprimidas mediante tracking negativo.

Usaría **FrameIt** como nombre canónico. El punto actual puede retirarse de la firma o mantenerse únicamente como recurso editorial documentado; no conviene alternar sin criterio FrameIt y FrameIt. en marcas de navegación. El dominio **frame-it.es** es una dirección, no otra grafía del logotipo. Prepararía firma horizontal, símbolo solo, versión monocroma y versión invertida. El mismo maestro debe alimentar favicon, encabezados y documentos. El componente debe exponer un único nombre accesible FrameIt y ocultar el monograma decorativo a tecnologías de asistencia cuando el nombre ya esté presente, evitando una lectura redundante FI FrameIt.

**Color.** Tomaría la paleta existente de la landing como referencia de identidad: navy #183541, verde #266b5e y papel #f8f8f2. Es una recomendación de dirección, pendiente de comparación visual en la consola antes de fijar tokens definitivos. La aplicación puede mantener una superficie más neutra y paneles más claros para lectura densa; lo que debe coincidir es el color de la marca, la acción principal y los criterios de contraste. El verde decorativo de marca y el verde de ronda abierta deben tener nombres y usos distintos, aunque pertenezcan a la misma familia. Los estados deben seguir incluyendo texto o forma, no depender solo del color.

Como comprobación puntual sobre colores CSS de la landing, los contrastes calculados del navy, verde y texto secundario sobre papel son aproximadamente 12,13:1, 5,89:1 y 5,71:1. Son una buena base. Esto no certifica todos los estados, tamaños o componentes. El número ilustrativo 02 tiene contraste bajo, pero es redundante y decorativo dentro de una vista marcada como ejemplo; no debe convertirse automáticamente en una incidencia crítica de accesibilidad.

**Tipografía e iconos.** Conservar las dos familias actuales y documentar pesos, tamaños y funciones. Reducir el tracking negativo extremo en firmas y títulos pequeños. Para iconos, fijar tamaños de 16/20/24 px según contexto y un grosor óptico consistente; las flechas y los chevrones también deben proceder de la familia común cuando tengan función de interfaz. Reservar el símbolo de marca para identidad, no utilizarlo como botón genérico o como icono de estado. Las animaciones, si se añaden, deben explicar cambios de sesión y respetar movimiento reducido.

## Entrega y validación de una futura implementación

1. Presentar una lámina breve con el maestro del símbolo, firma, tamaños pequeños, variantes de contraste y paleta. Validarla con el especialista de marca y el agente senior UI/UX antes de extenderla.
2. Centralizar los activos y tokens y aplicar primero a landing, /join y un encabezado de aplicación. Comparar esas tres vistas lado a lado, incluido móvil, sin alterar la entrada pública ni los roles.
3. Extender la identidad aprobada a autenticación, participante, lector/proyección y PDF. La proyección debe conservar su prioridad funcional y legibilidad a distancia.
4. Verificar favicon a 16/32 px, firma en 320 px de ancho, estados de foco/error/éxito, contraste de texto y controles, y PDF en color y escala de grises. Revisar la marca con y sin carga de fuentes externas.
5. Guardar un manual breve con grafía, área de protección, tamaño mínimo probado, variantes permitidas, tokens, iconografía, tono y ejemplos de uso. Toda modificación de producto debe recibir validación del agente senior UI/UX, conforme al requisito vigente del usuario.

La propuesta no requiere cambiar el nombre ni replantear los flujos de la aplicación. Esta revisión no incluye investigación de percepción con clientes, comparativa de competidores, búsqueda de marcas registradas ni validación legal.
