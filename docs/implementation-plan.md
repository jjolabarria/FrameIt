# FrameIt Implementation Plan

## Resumen

FrameIt es una aplicación para facilitar talleres y dinámicas colaborativas. El producto no modela cada dinámica como un tipo rígido, sino como una **plantilla compuesta** por **secciones** y **preguntas base reutilizables**. Cada plantilla puede usarse para múltiples sesiones, y su definición se puede **importar o exportar como JSON**.

La organización operativa del negocio sigue esta jerarquía:

- `Cliente`
- `Proyecto`
- `Sesión`

Cada sesión se crea a partir de una plantilla, genera su propia copia ejecutable y se comparte por:

- código de acceso
- URL
- QR

Aunque es una **aplicación interna**, no debe sentirse como una herramienta provisional o administrativa. Se va a usar en contextos de sesión con clientes, así que la experiencia debe transmitir:

- claridad
- fiabilidad
- control de la sesión
- acabado profesional
- muy baja fricción de acceso
- interfaz y copy íntegramente en **español**
- operación segura como aplicación **publicada en Internet**

## Objetivos de producto

- Facilitar dinámicas distintas construidas sobre los mismos modelos base de pregunta.
- Permitir reutilización de plantillas entre sesiones y proyectos.
- Mantener acceso rápido para participantes sin fricción de login.
- Ofrecer una vista de facilitación en tiempo real con sincronización suficiente para taller.
- Generar una base para actas y resultados reutilizables al cierre de la sesión.
- Proyectar una imagen profesional delante del cliente aunque la herramienta sea de uso interno.

## Decisiones funcionales

- La unidad con acceso por código, QR y URL es la **sesión**.
- Las dinámicas se definen como **plantillas reutilizables**.
- Las plantillas se componen de:
  - metadatos de dinámica
  - secciones ordenadas
  - preguntas base configuradas
- El flujo de preguntas en v1 es **lineal**.
- Los participantes entran con **nombre o alias**, sin autenticación.
- El facilitador sí requiere autenticación.
- El catálogo de preguntas base es **interno y fijo** en la v1.
- La plantilla se puede **importar/exportar como JSON**, pero las respuestas de sesiones no forman parte de ese JSON.
- Los participantes pueden **hacer preguntas al facilitador** y quedan registradas en la sesión.
- Los participantes pueden **adjuntar archivos e imágenes**.
- Los adjuntos se almacenan en **S3** desde la API.
- La puesta en marcha debe ser **muy rápida**, al estilo Kahoot:
  - código corto
  - alias
  - entrada en pocos segundos
- La sesión debe funcionar en modo **híbrido-first**:
  - participantes en sala
  - participantes remotos
  - sin depender de una pantalla compartida para responder
- La gamificación en v1.1 es **ligera**:
  - temporizador
  - progreso
  - feedback inmediato
  - pequeñas celebraciones visuales
  - sin ranking competitivo fuerte
- Los resultados agregados se muestran **tras cerrar la ronda** por defecto.
- La autoría de las respuestas es **configurable por pregunta**.

## Posicionamiento de experiencia

FrameIt no es una plataforma abierta al mercado ni un producto orientado a autoservicio público. Es una herramienta interna de trabajo para consultoría y facilitación. Aun así, el estándar de diseño y comportamiento debe ser equivalente al de una aplicación profesional que se enseña a cliente.

Implicaciones:

- la UI debe ser limpia, sobria y segura en contexto de workshop
- no debe parecer una herramienta de backoffice genérica
- el flujo de acceso de participante debe ser extremadamente simple
- el facilitador debe tener sensación de control en tiempo real
- los estados vacíos, errores y transiciones deben estar resueltos con cuidado
- el lenguaje debe ser profesional y claro, evitando tono experimental o demasiado técnico

## Stack técnico

- Frontend: `React + TypeScript`
- Backend: `ASP.NET Core Minimal APIs`
- Tiempo real: `SignalR`
- Base de datos: `PostgreSQL`
- Almacenamiento de archivos: `Amazon S3`
- Persistencia del estado de sesión: `EF Core`

## Modelo conceptual

### Estructura organizativa

- `Client`
  - agrupa proyectos
- `Project`
  - pertenece a un cliente
  - agrupa sesiones
- `WorkshopSession`
  - pertenece a un proyecto y a un cliente
  - instancia una plantilla concreta
  - mantiene estado activo, participantes, respuestas y resultados

### Plantillas de dinámicas

- `DynamicTemplate`
  - definición reutilizable de una dinámica
- `TemplateSection`
  - bloque ordenado dentro de una plantilla
- `TemplateQuestion`
  - pregunta configurada a partir de un modelo base

### Ejecución de sesión

- `SessionSection`
  - copia ejecutable de una sección de plantilla
- `SessionQuestion`
  - copia ejecutable de una pregunta de plantilla
- `SessionParticipant`
  - participante unido a una sesión
- `QuestionResponse`
  - respuesta emitida por un participante
- `ParticipantQuestion`
  - pregunta o duda enviada al facilitador
- `SessionAttachment`
  - archivo o imagen subida por un participante y almacenada en S3
- `SessionOutcome`
  - resultado resumido de la sesión

## Modelos base de pregunta en v1

- `ShortText`
- `RichText`
- `StickyNotes`
- `ColumnSort`
- `Choice`
- `Ranking`
- `Voting`
- `Matrix`

Cada modelo base define:

- tipo de configuración admitida
- tipo de respuesta esperada
- representación en UI
- forma de agregación para facilitador

## Contratos compartidos

El proyecto `FrameIt.Contracts` centraliza los DTOs y enums que comparten backend y frontend:

- `QuestionKind`
- `SessionStatus`
- `SessionPhase`
- `DynamicTemplateDefinitionDto`
- `SectionDefinitionDto`
- `QuestionDefinitionDto`
- `SessionSummaryDto`
- `SessionSnapshotDto`
- `CreateSessionRequest`
- `JoinSessionRequest`
- `SubmitResponseRequest`
- `AskFacilitatorQuestionRequest`
- `ImportTemplateEnvelope`

## Importación y exportación JSON

La definición de una plantilla se serializa con un sobre JSON que contiene:

- versión de esquema
- metadatos de la plantilla
- secciones
- preguntas
- configuración de preguntas
- buckets de salida

La versión actual es:

- `frameit.dynamic-template/v2`

Reglas:

- la importación debe rechazar versiones no soportadas
- la importación debe rechazar claves de plantilla duplicadas
- la exportación no incluye respuestas, participantes ni resultados de sesiones
- la plantilla debe poder transportar también la configuración de presentación de cada pregunta:
  - temporizador
  - visibilidad de resultados
  - modo de autoría
  - progreso
  - allow late responses
  - estilo de celebración

## Backend ASP.NET Core

La API implementa:

- autenticación simple de facilitador con cookie
- catálogo de modelos base de pregunta
- CRUD básico de clientes y proyectos
- listado, detalle, importación y exportación de plantillas
- creación y lectura de sesiones
- entrada de participantes por sesión
- envío de respuestas
- registro de preguntas al facilitador
- subida de adjuntos a S3
- avance de estado de sesión
- apertura y cierre de ronda
- revelado de resultados
- publicación de actualizaciones por SignalR

### Endpoints principales

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/catalog/question-models`
- `GET /api/clients`
- `POST /api/clients`
- `POST /api/projects`
- `GET /api/templates`
- `GET /api/templates/{id}`
- `POST /api/templates`
- `POST /api/templates/import`
- `GET /api/templates/{id}/export`
- `GET /api/sessions`
- `POST /api/sessions`
- `GET /api/sessions/{id}`
- `GET /api/sessions/by-code/{accessCode}`
- `POST /api/sessions/{id}/join`
- `POST /api/sessions/{id}/responses`
- `POST /api/sessions/{id}/questions`
- `POST /api/sessions/{id}/attachments`
- `POST /api/sessions/{id}/advance`
- `POST /api/sessions/{id}/round-state`
- `POST /api/sessions/{id}/outcomes`

### Tiempo real

SignalR se expone en:

- `/hubs/session`

Responsabilidades:

- unir conexiones a grupos por código de sesión
- difundir snapshots actualizados de sesión
- permitir reconexión del cliente sin perder el estado actual
- sincronizar el ritmo de la sesión para participantes distribuidos

## Persistencia

La aplicación usa `PostgreSQL` con `EF Core` y un `DbContext` llamado `AppDbContext`.

Aspectos importantes:

- `EnsureCreated()` se usa para levantar la base de forma rápida en esta base inicial
- hay datos semilla para un cliente, un proyecto y una plantilla de ejemplo
- preguntas y configuraciones se almacenan en JSON (`jsonb`) cuando corresponde
- los adjuntos se persisten como metadatos en PostgreSQL y el binario vive en S3

## Frontend React

La SPA implementa tres bloques funcionales iniciales:

- panel de facilitador para crear sesión
- monitor / entrada a sesión
- vista de portfolio con clientes, proyectos y sesiones recientes

### Modo de sesión

El flujo operativo de una pregunta se articula con estos estados:

- `Lobby`
- `RoundOpen`
- `Waiting`
- `Results`
- `WrapUp`

Esto permite una experiencia más cercana a Kahoot en ritmo, pero sin caer en un modelo de quiz competitivo.

### Criterios de UX y presentación

- La interfaz debe priorizar legibilidad en sala, compartiendo pantalla o usando proyector.
- El participante debe entender en pocos segundos:
  - dónde está
  - qué dinámica está activa
  - qué se espera que haga
- El participante debe poder seguir la dinámica desde su propio dispositivo aunque no esté en la misma ubicación física que el resto.
- El facilitador debe poder operar sin fricción ni navegación compleja.
- El aspecto visual debe ser consistente con una herramienta corporativa cuidada:
  - jerarquía visual clara
  - tipografía legible
  - buen contraste
  - componentes estables
  - sin apariencia de demo técnica
- El acceso por QR, URL o código debe sentirse natural para cliente final, no como una operación de soporte.
- La entrada por código y alias debe resolverse en dos pasos máximos.
- La UX debe marcar el ritmo de ronda con claridad:
  - lobby
  - responder
  - esperando
  - resultados

Capacidades incluidas:

- carga de clientes, plantillas y sesiones
- creación de sesión desde plantilla
- resolución de sesión por código en `/join/{code}`
- unión de participante por nombre
- envío de respuesta a la pregunta activa
- envío de preguntas al facilitador
- subida de archivos e imágenes
- escucha de actualizaciones en tiempo real por SignalR
- control de ronda desde facilitador
- temporizador y progreso visibles
- revelado controlado de resultados

## Estado actual implementado

Ya se ha montado una base funcional que compila:

- solución `.NET` con `FrameIt.Api` y `FrameIt.Contracts`
- proyecto frontend con `Vite + React + TypeScript`
- dominio inicial de clientes, proyectos, plantillas y sesiones
- import/export JSON de plantillas
- snapshots de sesión
- sincronización básica por SignalR
- QR SVG generado desde backend como placeholder funcional
- estados de ronda para sesiones híbridas
- reglas de visibilidad y autoría en snapshot
- preguntas al facilitador y adjuntos dentro del snapshot de sesión

## Verificación realizada

- `dotnet build FrameIt.sln`
- `npm run build` en `frontend`

Ambas compilaciones son correctas.

## Pendientes inmediatos

- levantar PostgreSQL real para ejecutar la API end-to-end
- añadir migraciones EF Core en lugar de depender de `EnsureCreated()`
- ampliar authoring visual de plantillas desde UI
- implementar avance de secciones y preguntas desde el panel de facilitador de forma completa
- enriquecer la acta final y su persistencia
- mejorar el QR con generación real si se quiere producción
- revisar copy, estados visuales y flujo de participante con criterio de herramienta interna profesional
- refinar la gamificación ligera para que mantenga energía sin volverse infantil o invasiva

## Próximos pasos recomendados

1. Añadir `docker-compose` para PostgreSQL y arranque local reproducible.
2. Incorporar migraciones EF Core y configuración por entorno.
3. Crear pantallas dedicadas para gestionar plantillas y su import/export desde UI.
4. Completar el flujo de facilitación: avanzar bloques, cerrar dinámica y registrar outcomes.
5. Añadir exportación de acta de sesión y mejoras de autorización.
