# Plan de Tareas (SDD) — Polla Mundialista

Orden estricto: el harness (Tarea #1) se construye y se verifica en verde **antes** de cualquier lógica de producción. Cada tarea indica entregable, criterios de aceptación, dependencias y el sub-agente sugerido (ver `docs/design.md` §11) para ejecutarla.

Formato de commit sugerido: `feat(scope): descripción` / `test(scope): descripción` / `docs(scope): descripción`, uno o más commits progresivos por tarea.

---

### Tarea #1 — Test Harness: Seeder + Algoritmo de Puntuación (unit + integración)
**Agente sugerido:** `qa-harness`
**Entregable:**
- `docs/fixtures/matches-seed.json` con los 12 partidos (2 grupos de 6).
- Esqueleto de solución .NET (`PollaMundialista.sln`) con los 4 proyectos de producción vacíos/mínimos (`Application` ya con la referencia al paquete `Mediator.SourceGenerator` lista, aunque sin Commands/Handlers todavía — eso llega en Tarea #3) **más** `PollaMundialista.UnitTests` y `PollaMundialista.IntegrationTests`.
- `Domain.Services.ScoringEngine` implementado (es el único código de "producción" necesario para que el harness tenga algo que testear).
- Unit tests xUnit cubriendo todos los casos borde de puntuación (sección 7 de `spec.md`) y validación del seeder (12 partidos, 6 por grupo, sin duplicados, sin resultados precargados).
- Integration tests con `WebApplicationFactory` + SQLite in-memory ejercitando el contrato HTTP mínimo: crear predicción → cargar resultado → consultar leaderboard (los endpoints pueden ser stubs mínimos en esta tarea; se completan en tareas posteriores).

**Criterios de aceptación:**
- `dotnet test` corre en verde sin Docker ni PostgreSQL levantados.
- Cobertura explícita de: marcador exacto, empate exacto, acierto de signo sin marcador exacto, fallo total, resultado pendiente, recálculo idempotente tras corrección.

**Dependencias:** ninguna (es la primera tarea).

---

### Tarea #2 — Domain Layer completo
**Agente sugerido:** `architect`
**Entregable:** entidades `User`, `Match`, `Prediction`; Value Objects `MatchResult`, `MatchOutcome`; invariantes de dominio (ej. no se puede crear `MatchResult` con marcadores negativos).
**Criterios de aceptación:** unit tests de Tarea #1 siguen en verde; nuevos unit tests cubren invariantes de las entidades.
**Dependencias:** Tarea #1.

---

### Tarea #3 — Application Layer (Commands/Queries + Handlers vía Mediator)
**Agente sugerido:** `architect`
**Entregable:** referencia al paquete `Mediator.SourceGenerator`; `RegisterPredictionCommand`/`Handler`, `SubmitMatchResultCommand`/`Handler`, `RecalculateScoresCommand`/`Handler`, `GetLeaderboardQuery`/`Handler`, `GetUserHistoryQuery`/`Handler`; interfaces `IMatchRepository`, `IPredictionRepository`, `IUserRepository`; DTOs de request/response; `ValidationBehavior`/`LoggingBehavior` como `IPipelineBehavior`; método de extensión `AddApplicationServices` que registra `AddMediator(...)`.
**Criterios de aceptación:** Handlers testeados con Moq mockeando los repositorios, instanciados directamente (sin levantar el mediador completo); regla de bloqueo por `KickoffAt` cubierta por test.
**Dependencias:** Tarea #2.

---

### Tarea #4 — Infrastructure Layer (EF Core + PostgreSQL + Seeder real)
**Agente sugerido:** `architect`
**Entregable:** `AppDbContext`, configuraciones de entidad (`IEntityTypeConfiguration`), migración inicial con `HasData` cargado desde `docs/fixtures/matches-seed.json`, implementación de repositorios, servicio de hashing de contraseñas, servicio de generación/validación de JWT.
**Criterios de aceptación:** `dotnet ef database update` contra PostgreSQL de Docker Compose crea las 12 filas de `Match` esperadas; integration tests de Tarea #1 se adaptan a usar el `AppDbCont/t` real (con SQLite in-memory) sin cambiar su intención.
**Dependencias:** Tarea #3.

---

### Tarea #5 — API: Módulo de Autenticación
**Agente sugerido:** `architect` + `code-reviewer`
**Entregable:** `AuthController` (`/register`, `/login`) despachando `RegisterUserCommand`/`LoginQuery` vía `IMediator`, middleware JWT, políticas de autorización por rol (`User`/`Admin`); composition root en `Program.cs` invocando `AddApplicationServices` (incluye `AddMediator`) y `AddInfrastructureServices`.
**Criterios de aceptación:** integration test: registro + login retorna JWT válido; endpoint protegido rechaza sin token (`401`) y con rol incorrecto (`403`).
**Dependencias:** Tarea #4.

---

### Tarea #6 — API: Módulo de Predicciones
**Agente sugerido:** `architect` + `code-reviewer`
**Entregable:** `PredictionsController` (`POST /api/predictions`, `GET /api/predictions/me`), `GET /api/matches` — todos despachando el Command/Query correspondiente vía `IMediator.Send`.
**Criterios de aceptación:** upsert verificado (segunda predicción al mismo partido actualiza, no duplica); rechazo tras kickoff verificado.
**Dependencias:** Tarea #5.

---

### Tarea #7 — API: Módulo Admin (Resultados + Recálculo)
**Agente sugerido:** `architect` + `code-reviewer`
**Entregable:** `AdminController` (`PUT /api/admin/matches/{matchId}/result`) despachando `SubmitMatchResultCommand` vía `IMediator`, cuyo Handler internamente dispara `RecalculateScoresCommand`.
**Criterios de aceptación:** cargar y luego corregir un resultado reasigna puntos correctamente (test de idempotencia); solo `Admin` puede invocar el endpoint.
**Dependencias:** Tarea #6.

---

### Tarea #8 — API: Módulo Leaderboard e Historial
**Agente sugerido:** `architect` + `code-reviewer`
**Entregable:** `LeaderboardController` (`GET /api/leaderboard`), `GET /api/predictions/user/{userId}` (solo Admin) — ambos despachando `GetLeaderboardQuery`/`GetUserHistoryQuery` vía `IMediator`.
**Criterios de aceptación:** orden correcto por puntos + criterio de desempate definido en `design.md`; `User` no puede ver historial ajeno.
**Dependencias:** Tarea #7.

---

### Tarea #9 — API: Documentación OpenAPI/Swagger
**Agente sugerido:** `architect`
**Entregable:** integración de `Swashbuckle.AspNetCore` en `PollaMundialista.Api` — `AddEndpointsApiExplorer()` + `AddSwaggerGen(...)` en el composition root (`Program.cs`) junto a `AddApplicationServices`/`AddInfrastructureServices`; esquema de seguridad Bearer JWT (`AddSecurityDefinition`/`AddSecurityRequirement`) para autorizar desde la UI; `app.UseSwagger()` + `app.UseSwaggerUI()` habilitados solo en `Development` (ver `design.md` §7.1).
**Criterios de aceptación:** `GET /swagger/v1/swagger.json` retorna un documento OpenAPI válido cubriendo los 8 endpoints del contrato de `design.md` §7; Swagger UI permite autenticar con un JWT (botón "Authorize") y ejecutar un request protegido end-to-end; la suite de integración (`WebApplicationFactory`) sigue en verde.
**Dependencias:** Tarea #8.

---

### Tarea #10 — Frontend: Scaffolding + Módulo Auth
**Agente sugerido:** `frontend-expert`
**Entregable:** workspace Angular (standalone), Tailwind/Angular Material configurado, `core/` (interceptor JWT, guards), pantallas de login/registro.
**Criterios de aceptación:** login exitoso contra la API real (Docker Compose) redirige a la pantalla de predicciones; rutas protegidas redirigen a login si no hay sesión.
**Dependencias:** Tarea #5 (API de Auth disponible).

---

### Tarea #11 — Frontend: Módulo de Predicciones
**Agente sugerido:** `frontend-expert` + `code-reviewer`
**Entregable:** pantalla con los 12 partidos agrupados por grupo, formulario de predicción por partido, deshabilitado tras kickoff.
**Criterios de aceptación:** specs Karma/Jest cubriendo el componente de formulario y el guard de horario; verificación manual en navegador (golden path + intento de predecir tras kickoff).
**Dependencias:** Tarea #6.

---

### Tarea #12 — Frontend: Panel Admin
**Agente sugerido:** `frontend-expert` + `code-reviewer`
**Entregable:** pantalla exclusiva de Admin para listar partidos y cargar/corregir resultados.
**Criterios de aceptación:** solo accesible con rol Admin (guard); feedback visual tras recálculo exitoso.
**Dependencias:** Tarea #7, Tarea #10.

---

### Tarea #13 — Frontend: Leaderboard e Historial
**Agente sugerido:** `frontend-expert` + `code-reviewer`
**Entregable:** tabla de leaderboard global, vista de historial personal.
**Criterios de aceptación:** el leaderboard se actualiza tras recálculo (sin recargar caché obsoleta); specs de ordenamiento y de desempate.
**Dependencias:** Tarea #8, Tarea #10.

---

### Tarea #14 — Orquestación Local (Docker Compose)
**Agente sugerido:** `architect`
**Entregable:** `docker-compose.yml` raíz (postgres, api, frontend), `Dockerfile` por servicio, aplicación automática de migraciones al iniciar `api`.
**Criterios de aceptación:** `docker-compose up` en un entorno limpio deja la app 100% funcional sin pasos manuales adicionales.
**Dependencias:** Tareas #4–#13 (backend, Swagger y frontend funcionales).

---

### Tarea #15 — Despliegue en Render.com
**Agente sugerido:** `architect`
**Entregable:** servicios configurados en Render (API, frontend, PostgreSQL gestionado), variables de entorno y CORS.
**Criterios de aceptación:** URL pública funcional con el golden path completo (registro → predicción → admin carga resultado → leaderboard actualizado).
**Dependencias:** Tarea #14.

---

### Tarea #16 — Diagrama de Arquitectura C4 (entregable final)
**Agente sugerido:** `architect`
**Entregable:** export de las vistas Mermaid de `design.md` §2 a `docs/architecture/` (PNG/SVG o enlace a Structurizr/draw.io).
**Criterios de aceptación:** el diagrama refleja el sistema realmente desplegado (contenedores y componentes coinciden con Tarea #15).
**Dependencias:** Tarea #15.

---

### Tarea #17 — Cierre de Documentación (AI_LOG.md, README, `.claude/`)
**Agente sugerido:** `code-reviewer`
**Entregable:** `AI_LOG.md` consolidado con los prompts complejos registrados durante todas las tareas; `README.md` con instrucciones de arranque local y enlace de despliegue; `.claude/agents/` y slash command de logging documentados.
**Criterios de aceptación:** un tercero puede clonar el repo, seguir el README, y levantar la app localmente sin contexto adicional.
**Dependencias:** todas las anteriores.
