# Avisos de preguntas al facilitador

La consola muestra un aviso cuando llegan preguntas nuevas del grupo mediante las actualizaciones de sesión en directo. Agrupa las preguntas pendientes en un contador y mantiene el aviso hasta consultar o descartar. No solicita permisos del navegador, reproduce sonidos ni mueve el foco automáticamente.

«Ver preguntas» y el botón «Preguntas» de la cabecera abren el listado y llevan el foco a su encabezado desplegable. Abrir manualmente «Preguntas del grupo» también marca los avisos pendientes como consultados. Descartar retira únicamente el aviso: las preguntas y su contexto temporal y de ronda se conservan.

La primera visita establece como referencia las preguntas existentes, sin notificarlas como nuevas. Se guardan solo identificadores vistos y pendientes en `sessionStorage`, separados por sesión; recargar conserva los pendientes y no repite avisos ya descartados. Una reconexión detecta las preguntas recibidas durante la desconexión. Las eliminaciones y las actualizaciones repetidas no generan notificaciones nuevas.

El aviso pertenece a la consola autenticada del facilitador y funciona mientras se visita esa consola. No es una notificación push del sistema ni avisa con la aplicación cerrada. No se modifica el servidor, el registro de preguntas ni su visibilidad actual para los participantes.
