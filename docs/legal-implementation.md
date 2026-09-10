# Información legal de FrameIt

Implementación local: 10/09/2026.

## Fuentes verificadas

- https://olatic.es/aviso-legal.html: razón social OLATIC GROUP SOLUTIONS, S.L., NIF B95800488, domicilio en C/ Andrés Eliseo de Mañaricua 15, 48003 Bilbao, Bizkaia; info@olatic.es y 944 362 257.
- https://olatic.es/privacidad.html: contacto de derechos, marco corporativo de finalidades, conservación y proveedores.
- https://olatic.es/cookies.html: política del sitio corporativo. No se ha copiado su inventario de cookies a FrameIt.
- https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758: LSSI, información del prestador y almacenamiento en terminales.
- https://www.aepd.es/guias/guia-cookies.pdf: criterios para cookies técnicas y consentimiento.
- https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32016R0679: marco RGPD.

## Entrega

Rutas públicas /aviso-legal, /privacidad y /cookies, accesibles sin autenticación. Pie con identificación de OLATIC, contacto y enlaces legales. Información de primera capa junto a los formularios de código, alias y acceso privado. No se ha añadido una casilla de consentimiento general ni un banner de aceptación: no hay analítica ni publicidad configuradas en el frontend inspeccionado.

El inventario de cookies se ha contrastado con LocalAuth.cs y el almacenamiento de pestaña con storage.ts, ParticipantSessionPage.tsx y QuestionNotification.tsx. Se informa también de Google Fonts y del envío de contenido al proveedor de IA cuando se solicita documentación y esa función está configurada. No se afirma anonimización completa, borrado al cerrar la sesión ni ausencia de transferencias internacionales.

## Información pendiente de OLATIC

La implementación no certifica cumplimiento jurídico completo. Se ha solicitado al usuario:

- Inscripción en el Registro Mercantil: no figura en el aviso corporativo consultado; debe completarse en el aviso de FrameIt.
- Proveedores efectivos y países de alojamiento, almacenamiento e IA; verificar contratos de encargo y garantías de transferencias y concretar la política.
- Plazos de conservación y eliminación de sesiones, adjuntos y copias de seguridad; la política actual describe criterios sin inventar un plazo automático.

El organizador de cada taller debe identificar su responsabilidad y base jurídica ante participantes. Confirmar esta distribución con los acuerdos reales de servicio. La inspección del repositorio no acredita cookies que añadan proxies, CDN u otros servicios del despliegue.

## Verificación

Compilación frontend, lint y revisión de 10 vistas (landing, tres páginas legales y entrada a sesión; escritorio 1440 px y móvil 320 px). Comprobados ausencia de desbordamiento horizontal, navegación desde el pie, rutas públicas, título y foco de lectura. Datos API simulados; no se han enviado mensajes ni modificado sesiones reales. Evidencias en output/playwright/legal-review/. Sin despliegue.
