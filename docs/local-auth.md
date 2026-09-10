# Autenticación local del facilitador

Una cuenta local inicial, contraseña y TOTP obligatorio. Los participantes siguen entrando por el enlace o QR de sesión. No hay registro público ni acceso simulado. No se crea una cuenta real durante el despliegue.

## Acceso al backoffice

Las rutas privadas redirigen a `/acceso?returnTo=…` antes de montar la navegación o pedir datos del espacio. Tras verificar contraseña y segundo factor, se recupera la ruta solicitada, incluidos filtros y fragmento. El destino se restringe al mismo origen y a las rutas admitidas; los destinos externos vuelven a `/espacio`.

El login ocupa una página completa con la marca, ayuda de recuperación, información legal y un enlace separado para participantes. El formulario conserva la configuración inicial y los códigos de recuperación existentes. No se ofrece un restablecimiento automático de contraseña que el backend no implemente.

Un 401 en una operación privada invalida el estado de autenticación del navegador, desmonta los componentes privados y devuelve al login con un aviso de sesión caducada. También se comprueba el acceso al recuperar foco/visibilidad y cada 60 segundos mientras la pestaña está visible. El cierre de sesión se comunica a otras pestañas. Los errores al comprobar el acceso muestran una pantalla de reintento sin contenido del backoffice. Estas medidas de interfaz complementan la autorización de la API.

Validación del 10/09/2026: TypeScript, build con Node 24 y lint correctos; pruebas de navegador con API simulada en `tests/loginwall-browser.cjs` para nueve rutas privadas, rutas públicas, segundo factor, retorno completo, 401, cierre entre pestañas, error de conexión y rechazo de redirección externa. Capturas a 1440 y 320 px en `output/playwright/loginwall/`. Las pruebas de esta revisión no ejercitan el proveedor real de autenticación ni el despliegue de Dokploy.

## Primer acceso local

1. Abrir http://localhost:8080/acceso.
2. En una terminal del administrador, desde la raíz del proyecto, consultar el código de instalación:

```powershell
docker compose exec api cat /app/auth-state/bootstrap-token
```

3. Introducir ese código en el formulario y elegir usuario (3–64 caracteres) y contraseña (12–128 caracteres).
4. Mostrar el QR o clave manual, añadir FrameIt a una aplicación autenticadora TOTP y confirmar el código de seis dígitos.
5. Mostrar y guardar los diez códigos de recuperación. Cada código es de un solo uso y requiere también la contraseña.

No compartir el código de instalación, QR, clave manual ni códigos de recuperación. El código de instalación deja de permitir altas en cuanto se activa la cuenta. Un alta incompleta se retoma durante 15 minutos en el mismo navegador; con el código de instalación se puede reiniciar antes de la activación.

## Acceso y seguridad

Contraseña seguida de TOTP (SHA-1, seis dígitos, periodos de 30 segundos, tolerancia de un periodo). El servidor rechaza un periodo ya consumido. Si acabas de usar un código, espera al siguiente. La verificación pendiente caduca a los cinco minutos y no concede acceso al espacio privado. Cinco fallos bloquean la cuenta durante 15 minutos; además hay limitación de peticiones por IP.

La sección Seguridad permite cambiar contraseña, regenerar recuperación o cambiar autenticador, siempre verificando contraseña y un factor vigente. El autenticador anterior funciona hasta confirmar el nuevo. Estos cambios revocan las otras sesiones al completarse. Cerrar sesión revoca la sesión del servidor, incluso si alguien conserva una copia de la cookie. Los grupos privados de SignalR están ligados a sesiones vigentes. Las cookies antiguas del acceso simulado no se aceptan.

Los diálogos de acceso mantienen montados los formularios al pedir nueva verificación. Cerrar sesión explícitamente retira el espacio privado. La sesión dura como máximo ocho horas y no hay opción para saltarse TOTP en dispositivos recordados.

## Recuperación administrativa sin credenciales

Si se han perdido la contraseña o todos los factores, el administrador del servidor puede restablecer **solo la autenticación local**. Este comando elimina las cuentas locales y sus sesiones; conserva clientes, proyectos, talleres, respuestas y documentación. Usarlo únicamente cuando se pretende sustituir el acceso existente:

```powershell
docker compose exec api dotnet FrameIt.Api.dll --reset-local-auth --confirm-local-auth-reset
```

Después repetir el primer acceso con el nuevo código de instalación. No existe endpoint HTTP de restablecimiento. El control del servidor equivale al control de esta cuenta.

## Persistencia y límites del despliegue

PostgreSQL conserva usuarios y sesiones. Identity aplica el hash de contraseñas; Data Protection protege secretos TOTP, y los códigos de recuperación se guardan como hashes SHA-256 de valores aleatorios de 128 bits. Los desafíos y factores de un uso se consumen en transacciones serializadas. Las peticiones de autenticación y las mutaciones privadas requieren antifalsificación. Las respuestas privadas no se almacenan en caché.

Respaldar juntos PostgreSQL, `data-protection` y `auth-state`. `docker compose down` los conserva; `down -v` los elimina. Proteger el acceso a estos volúmenes y al servidor; las claves Data Protection locales no están cifradas con un almacén externo.

Este Compose está limitado a localhost por HTTP. Fuera de Development las cookies requieren HTTPS. Publicar frame-it.es exige configurar HTTPS y actualizar la plataforma .NET 9, que ya no tiene soporte. Esta entrega valida el entorno local, no certifica un despliegue público.

Referencias: [ASP.NET Core Identity](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity?view=aspnetcore-9.0), [antifalsificación](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-9.0) y [Otp.NET](https://github.com/kspearrin/Otp.NET).

## Pruebas aisladas

`tests/local-auth.cjs` requiere el proyecto Compose `frameit-workspace-review` en localhost:18080 con autenticación sin configurar. Genera credenciales sintéticas en memoria y escribe únicamente resultados sin secretos. Nunca ejecutar sobre el entorno principal. Los runners históricos que usaban el acceso simulado requieren adaptar su preparación de autenticación.
