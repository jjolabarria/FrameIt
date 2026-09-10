# FrameIt en Docker local

Desde la raíz, con Docker Desktop iniciado:

```powershell
docker compose up -d --build --wait
```

Abrir **http://localhost:8080**. Frontend y API comparten origen; Nginx conserva el host y puerto de los enlaces de entrada y admite WebSockets para SignalR.

```powershell
docker compose ps
docker compose logs --tail 80 api
docker compose down
```

`down` conserva los volúmenes de PostgreSQL y las claves de cookies. El primer arranque crea una base independiente y aplica las migraciones y datos iniciales del proyecto. No utiliza la base de datos configurada fuera de Docker.

Los archivos `FrameIt.Api/appsettings.json` y `appsettings.Development.json` se montan de solo lectura. No se copian credenciales en las imágenes. S3 mantiene su configuración existente. La exportación PDF funciona sin clave OpenAI: incluye los datos registrados de la sesión. Si se configura una clave, añade un resumen asistido por IA; si el proveedor falla, conserva la exportación con los datos registrados. No se realizan llamadas a esos servicios durante el arranque.

El puerto publicado está limitado a este ordenador. Para cambiarlo, establecer `$env:FRAMEIT_PORT='8081'` antes del arranque. Los QR con `localhost` están destinados a este equipo; el acceso desde móviles requiere configurar explícitamente una dirección de red accesible.

Este despliegue utiliza autenticación local del facilitador con contraseña y TOTP. Configura tu propia cuenta siguiendo [primer acceso y recuperación](local-auth.md). Los participantes no necesitan cuenta.

El dominio previsto para la aplicación es **frame-it.es**, indicado por el propietario del proyecto. Este Compose sigue sirviendo en localhost; la publicación del dominio, los registros DNS y HTTPS están pendientes de configurar y verificar en el alojamiento elegido.

El modelo configurado para el resumen con IA es `gpt-5.6-luna`. Para activar ese resumen hace falta una clave en `OpenAI:ApiKey` de la configuración del servidor. Sin clave, la documentación PDF sigue disponible con los datos registrados. Las pruebas locales con proveedor simulado no verifican el acceso de una cuenta real a Luna.

## Validación senior UI/UX

Despliegue local aprobado tras revisar Compose, Dockerfiles y Nginx, y ejecutar un recorrido en Microsoft Edge real contra `http://127.0.0.1:8080`, sin interceptar ni simular la red: **6 de 6 comprobaciones superadas**.

- Recarga de rutas SPA, inicio de sesión y creación de sala; enlace generado con host y puerto correctos.
- Error API 404 conservado, sin devolver la página HTML del frontend.
- Entrada de participante en contexto separado usando exactamente el enlace de la API, recuperación del borrador y envío con recepción en directo.
- Proyección con cookie de facilitador mantiene los resultados privados hasta su publicación; conexiones WebSocket reales a través de Nginx.
- Sin desbordamiento horizontal en consola a 1440 px, participante a 390 px y proyección a 1280 × 720 px; capturas inspeccionadas visualmente.
- Sesión «Prueba Docker» finalizada mediante la confirmación de la interfaz.

Evidencia: [resultados](../output/playwright/docker-review/results.json), [consola](../output/playwright/docker-review/facilitator-lobby.png), [participante](../output/playwright/docker-review/participant-sent.png) y [proyección](../output/playwright/docker-review/projection-results.png). Esta comprobación cubre el despliegue local con la autenticación simulada existente; no certifica autenticación de producción ni lectura del QR desde un dispositivo externo.
