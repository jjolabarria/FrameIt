# Gestión de clientes, proyectos y sesiones

El espacio del facilitador organiza el trabajo en tres niveles:

1. **Clientes**: directorio con búsqueda por nombre o sector, contadores y paginación.
2. **Detalle del cliente**: proyectos de ese cliente, búsqueda por nombre o código, edición del cliente y creación de proyectos.
3. **Detalle del proyecto**: sesiones del proyecto, edición de sus datos y creación de una sesión con el cliente y proyecto ya seleccionados.

El catálogo global **Sesiones** muestra cliente, proyecto, código, estado, última actividad y número de valoraciones. Permite buscar por sesión, cliente, proyecto, código de proyecto, código de acceso o dinámica, filtrar por cliente/proyecto/estado y ordenar por actividad o nombre.

Los filtros, orden y página quedan en la URL. Abrir o cancelar la creación conserva esa vista. El enlace de vuelta desde la consola recupera el listado de origen. Cambiar los filtros mientras se completa un formulario no reasigna su cliente ni proyecto.

Los códigos de proyecto son únicos dentro de cada cliente. La edición modifica nombre/sector o nombre/código sin mover proyectos ni sesiones a otros registros. Los errores de validación conservan el formulario.

## Carga y acceso

Las pantallas de gestión requieren entrar como facilitador y utilizan `/api/workspace`, con consultas autenticadas y paginación en PostgreSQL. El listado carga 25 filas por defecto y permite 10, 25, 50 o 100; el servidor limita cualquier petición a 100. Los selectores buscan en servidor y devuelven hasta 10 opciones.

Los catálogos no incluyen QR, respuestas, participantes ni documentos de las sesiones. Inicio obtiene contadores y un máximo de seis sesiones recientes y seis en curso. Plantillas carga únicamente su catálogo. La consola conserva su carga detallada y sincronización en directo.

Los endpoints antiguos se mantienen por compatibilidad; el nuevo frontend de gestión ya no los utiliza para descargar todos los clientes o sesiones. Esta mejora se ha comprobado con miles de registros, no constituye una garantía de latencia para volúmenes ilimitados.

## Pruebas aisladas

Después de construir las imágenes con `docker compose build`:

```powershell
docker compose -p frameit-workspace-review -f tests/compose.workspace-review.yaml up -d --wait
node tests/workspace-api.cjs
node output/playwright/management-volume-review.cjs
node output/playwright/management-real-ui-review.cjs
```

El entorno usa exclusivamente `http://localhost:18080` y la base `frameit_review`. El test API crea 50 clientes, 1.000 proyectos y 1.000 sesiones ficticias, además de sesiones de integración. El runner de volumen intercepta respuestas para presentar 2.000 sesiones y nombres largos. No se añaden estos registros al entorno principal del puerto 8080.

Resultados y capturas: `output/playwright/management-api-review`, `management-volume-review` y `management-real-ui-review`. La aprobación del agente senior se registra en [uiux-review.md](uiux-review.md).

Una vez terminada la revisión, se puede retirar exclusivamente este entorno de pruebas:

```powershell
docker compose -p frameit-workspace-review -f tests/compose.workspace-review.yaml down -v
```
