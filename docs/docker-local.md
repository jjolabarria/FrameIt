# FrameIt en Docker local

Desde la raíz, con Docker Desktop iniciado. El archivo `compose.yaml` construye la web React/Nginx y la API .NET, y levanta PostgreSQL 17. Solo la web publica un puerto en localhost; la API y la base se comunican por la red interna de Compose.

Para personalizar la configuración, copia la plantilla una sola vez (no sobrescribas un `.env` existente):

```powershell
Copy-Item .env.example .env
```

Edita `.env` para configurar el puerto, la contraseña de PostgreSQL o los servicios opcionales. `.env` está excluido de Git y de las imágenes. Sin `.env`, se usan los valores locales predeterminados, sin IA ni adjuntos S3.

Valida y arranca:

```powershell
docker compose config --quiet
docker compose up -d --build --wait
```

Abrir **http://localhost:8080**. Frontend y API comparten origen; Nginx conserva el host y puerto de los enlaces de entrada y admite WebSockets para SignalR.

```powershell
docker compose ps
docker compose logs --tail 80 api
docker compose down
```

`down` conserva los volúmenes de PostgreSQL y las claves de cookies. El primer arranque crea una base independiente y aplica las migraciones y datos iniciales del proyecto. No utiliza la base de datos configurada fuera de Docker.

La configuración se pasa mediante variables de entorno desde `.env`; los archivos locales `appsettings.json` y `appsettings.Development.json` ya no se montan. Si antes usabas claves en esos archivos, configura los valores correspondientes de la plantilla en tu `.env`. No se copian credenciales en las imágenes.

La exportación PDF funciona sin clave OpenAI: incluye los datos registrados de la sesión. Si se configura una clave, añade un resumen asistido por IA; si el proveedor falla, conserva la exportación con los datos registrados. Para adjuntar archivos hay que configurar un bucket AWS S3 y sus credenciales. `FRAMEIT_S3_PUBLIC_BASE_URL` cambia los enlaces de descarga, no el destino de subida: el cliente actual no admite configurar endpoints de Wasabi o MinIO. No se realizan llamadas a esos servicios durante el arranque.

Conserva `FRAMEIT_DB_PASSWORD` si reutilizas un volumen existente: cambiar la variable no cambia la contraseña que PostgreSQL ya tiene guardada. La contraseña local predeterminada es solo para desarrollo. Este Compose utiliza HTTP y el entorno Development; la publicación en Internet requiere configurar HTTPS y el entorno de producción.

El puerto publicado está limitado a este ordenador. Para cambiarlo, establecer `$env:FRAMEIT_PORT='8081'` antes del arranque. Los QR con `localhost` están destinados a este equipo; el acceso desde móviles requiere configurar explícitamente una dirección de red accesible.

Este despliegue utiliza autenticación local del facilitador con contraseña y TOTP. Configura tu propia cuenta siguiendo [primer acceso y recuperación](local-auth.md). Los participantes no necesitan cuenta.

El dominio previsto para la aplicación es **frame-it.es**, indicado por el propietario del proyecto. Este Compose sigue sirviendo en localhost; la publicación del dominio, los registros DNS y HTTPS están pendientes de configurar y verificar en el alojamiento elegido.

El modelo configurado para el resumen con IA es `gpt-5.6-luna`. Para activar ese resumen hace falta una clave en `FRAMEIT_OPENAI_API_KEY` de `.env`. Sin clave, la documentación PDF sigue disponible con los datos registrados. Las pruebas locales con proveedor simulado no verifican el acceso de una cuenta real a Luna.

## Validación del Compose actualizado (10/09/2026)

Configuración validada con Docker Compose, tanto con los valores por defecto como con `.env.example`. El arranque de esta revisión no se ha ejecutado porque el motor de Docker Desktop no estaba disponible.

## Validación senior UI/UX anterior

Despliegue local aprobado tras revisar Compose, Dockerfiles y Nginx, y ejecutar un recorrido en Microsoft Edge real contra `http://127.0.0.1:8080`, sin interceptar ni simular la red: **6 de 6 comprobaciones superadas**.

- Recarga de rutas SPA, inicio de sesión y creación de sala; enlace generado con host y puerto correctos.
- Error API 404 conservado, sin devolver la página HTML del frontend.
- Entrada de participante en contexto separado usando exactamente el enlace de la API, recuperación del borrador y envío con recepción en directo.
- Proyección con cookie de facilitador mantiene los resultados privados hasta su publicación; conexiones WebSocket reales a través de Nginx.
- Sin desbordamiento horizontal en consola a 1440 px, participante a 390 px y proyección a 1280 × 720 px; capturas inspeccionadas visualmente.
- Sesión «Prueba Docker» finalizada mediante la confirmación de la interfaz.

Evidencia: [resultados](../output/playwright/docker-review/results.json), [consola](../output/playwright/docker-review/facilitator-lobby.png), [participante](../output/playwright/docker-review/participant-sent.png) y [proyección](../output/playwright/docker-review/projection-results.png). Esta comprobación cubre el despliegue local con la autenticación simulada existente; no certifica autenticación de producción ni lectura del QR desde un dispositivo externo.
