# Plan de Tareas (SDD) — Polla Mundialista

Orden estricto: el harness (Tarea #1) se construye y se verifica en verde **antes** de cualquier lógica de producción. Cada tarea indica entregable, criterios de aceptación, dependencias y el sub-agente sugerido (ver `docs/design.md` §11) para ejecutarla.

Formato de commit sugerido: `feat(scope): descripción` / `test(scope): descripción` / `docs(scope): descripción`, uno o más commits progresivos por tarea.

> **Renumeración 2026-09-27**: se insertó la Tarea #14 (Recuperación de contraseña, hueco detectado al diseñar la nueva pantalla de Login), moviendo Docker Compose a #15. Luego se agregó la Tarea #15 (refactor del copy de interfaz); Docker Compose queda en #16, Render en #17, C4 en #18 y Cierre en #19.
>
> **Renumeración 2026-09-27 (2)**: la **Tarea #16 (Docker Compose) queda EXCLUIDA/diferida por decisión explícita del usuario** — no bloquea ninguna tarea posterior; se retoma más adelante si hace falta, no forma parte del camino crítico actual. La Tarea #17 (Render) se dividió en dos, porque `design.md` §12 ya especifica el backend y el frontend como **servicios separados** en Render: **#17 — Despliegue del Backend en Render.com** y **#18 (nueva) — Despliegue del Frontend en Render.com**. El diagrama C4 pasa a **#19** y el Cierre de Documentación a **#20**. Leer este archivo completo antes de asumir el número de una tarea — ya se renumeró varias veces.

**Estado global al 2026-09-27:** #1–#15, #17, #18, #19, #20 y #21 **completas**; #16 excluida por decisión explícita; **#22–#27 pendientes** (bloque de remediación de seguridad derivado de la auditoría — ver `docs/security-audit-2026-09-27.md`).

---

### Tarea #1 — Test Harness: Seeder + Algoritmo de Puntuación (unit + integración) — ✅ COMPLETA
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

**Estado:** `docs/fixtures/matches-seed.json` con los 12 partidos (6 por grupo, sin resultados precargados); esqueleto de solución con los 4 proyectos de producción y los 2 de pruebas; `Domain.Services.ScoringEngine` puro; unit tests de todos los casos borde de puntuación (`spec.md` §7) y de validación del seeder; integration tests con `WebApplicationFactory` + SQLite in-memory recorriendo predicción → resultado → leaderboard. `dotnet test` corre en verde sin Docker ni PostgreSQL (commit `a934827`).
**Dependencias:** ninguna (es la primera tarea).

---

### Tarea #2 — Domain Layer completo — ✅ COMPLETA
**Agente sugerido:** `architect`
**Entregable:** entidades `User`, `Match`, `Prediction`; Value Objects `MatchResult`, `MatchOutcome`; invariantes de dominio (ej. no se puede crear `MatchResult` con marcadores negativos).
**Criterios de aceptación:** unit tests de Tarea #1 siguen en verde; nuevos unit tests cubren invariantes de las entidades.
**Estado:** Entidades `User`, `Match`, `Prediction`, `PasswordResetToken` (esta última para la Tarea #14) y el value object `MatchResult`, con invariantes de dominio. El `MatchResult` impide marcadores negativos y la entidad `User` centraliza el hash de contraseña. Cubierto por unit tests en `tests/PollaMundialista.UnitTests/Domain/` (commit `a934827`).
**Dependencias:** Tarea #1.

---

### Tarea #3 — Application Layer (Commands/Queries + Handlers vía Mediator) — ✅ COMPLETA
**Agente sugerido:** `architect`
**Entregable:** referencia al paquete `Mediator.SourceGenerator`; `RegisterPredictionCommand`/`Handler`, `SubmitMatchResultCommand`/`Handler`, `RecalculateScoresCommand`/`Handler`, `GetLeaderboardQuery`/`Handler`, `GetUserHistoryQuery`/`Handler`; interfaces `IMatchRepository`, `IPredictionRepository`, `IUserRepository`; DTOs de request/response; `ValidationBehavior`/`LoggingBehavior` como `IPipelineBehavior`; método de extensión `AddApplicationServices` que registra `AddMediator(...)`.
**Criterios de aceptación:** Handlers testeados con Moq mockeando los repositorios, instanciados directamente (sin levantar el mediador completo); regla de bloqueo por `KickoffAt` cubierta por test.
**Estado:** Paquete `Mediator.SourceGenerator`; comandos, queries y handlers de Matches, Predictions, Leaderboard y Auth; interfaces de repositorio (`IMatchRepository`, `IPredictionRepository`, `IUserRepository`) en `Application/Abstractions`; DTOs de request/response; `ValidationBehavior` y `LoggingBehavior` como `IPipelineBehavior`; `AddApplicationServices`. Regla de bloqueo por `KickoffAt` y handlers con Moq sobre repositorios (commits `46d3d1e`, `c4880d2`).
**Dependencias:** Tarea #2.

---

### Tarea #4 — Infrastructure Layer (EF Core + PostgreSQL + Seeder real) — ✅ COMPLETA
**Agente sugerido:** `architect`
**Entregable:** `AppDbContext`, configuraciones de entidad (`IEntityTypeConfiguration`), migración inicial con `HasData` cargado desde `docs/fixtures/matches-seed.json`, implementación de repositorios, servicio de hashing de contraseñas, servicio de generación/validación de JWT.
**Criterios de aceptación:** `dotnet ef database update` contra PostgreSQL de Docker Compose crea las 12 filas de `Match` esperadas; integration tests de Tarea #1 se adaptan a usar el `AppDbCont/t` real (con SQLite in-memory) sin cambiar su intención.
**Estado:** `AppDbContext` con configuraciones por entidad y migración inicial con `HasData` cargado desde `docs/fixtures/matches-seed.json`; repositorios EF Core; `IPasswordHasher` (BCrypt) y `JwtTokenGenerator`/`JwtOptions`. Los integration tests de la Tarea #1 corren contra el `AppDbContext` real con SQLite in-memory. La migración también se aplicó contra el Neon real (commits `46d3d1e`, `c4880d2`, `0ecf527`).
**Dependencias:** Tarea #3.

---

### Tarea #5 — API: Módulo de Autenticación — ✅ COMPLETA
**Agente sugerido:** `architect` + `code-reviewer`
**Entregable:** `AuthController` (`/register`, `/login`) despachando `RegisterUserCommand`/`LoginQuery` vía `IMediator`, middleware JWT, políticas de autorización por rol (`User`/`Admin`); composition root en `Program.cs` invocando `AddApplicationServices` (incluye `AddMediator`) y `AddInfrastructureServices`.
**Criterios de aceptación:** integration test: registro + login retorna JWT válido; endpoint protegido rechaza sin token (`401`) y con rol incorrecto (`403`).
**Estado:** `AuthController` (`/register`, `/login`) despachando vía `IMediator`, middleware JWT Bearer, políticas de autorización por rol y composition root en `Program.cs`. Cubierto por `AuthFlowTests.cs`: registro + login retornan JWT válido, y un endpoint protegido rechaza sin token (`401`) y con rol incorrecto (`403`). Ampliado después por la Tarea #14 con los dos endpoints de recuperación (commit `c4880d2`).
**Dependencias:** Tarea #4.

---

### Tarea #6 — API: Módulo de Predicciones — ✅ COMPLETA
**Agente sugerido:** `architect` + `code-reviewer`
**Entregable:** `PredictionsController` (`POST /api/predictions`, `GET /api/predictions/me`), `GET /api/matches` — todos despachando el Command/Query correspondiente vía `IMediator.Send`.
**Criterios de aceptación:** upsert verificado (segunda predicción al mismo partido actualiza, no duplica); rechazo tras kickoff verificado.
**Estado:** `PredictionsController` (`POST /api/predictions`, `GET /api/predictions/me`) y `GET /api/matches`, todos despachando vía `IMediator.Send`. Upsert verificado (una segunda predicción al mismo partido actualiza, no duplica) y rechazo posterior al kickoff cubiertos en `PredictionsFlowTests.cs`.
**Dependencias:** Tarea #5.

---

### Tarea #7 — API: Módulo Admin (Resultados + Recálculo) — ✅ COMPLETA
**Agente sugerido:** `architect` + `code-reviewer`
**Entregable:** `AdminController` (`PUT /api/admin/matches/{matchId}/result`) despachando `SubmitMatchResultCommand` vía `IMediator`, cuyo Handler internamente dispara `RecalculateScoresCommand`.
**Criterios de aceptación:** cargar y luego corregir un resultado reasigna puntos correctamente (test de idempotencia); solo `Admin` puede invocar el endpoint.
**Estado:** `AdminController` (`PUT /api/admin/matches/{matchId}/result`) despachando `SubmitMatchResultCommand`, cuyo handler dispara internamente `RecalculateScoresCommand`. Cargar y luego corregir un resultado reasigna los puntos correctamente (test de idempotencia en `EndToEndFlowTests.cs`) y solo `Admin` puede invocarlo.
**Dependencias:** Tarea #6.

---

### Tarea #8 — API: Módulo Leaderboard e Historial — ✅ COMPLETA
**Agente sugerido:** `architect` + `code-reviewer`
**Entregable:** `LeaderboardController` (`GET /api/leaderboard`), `GET /api/predictions/user/{userId}` (solo Admin) — ambos despachando `GetLeaderboardQuery`/`GetUserHistoryQuery` vía `IMediator`.
**Criterios de aceptación:** orden correcto por puntos + criterio de desempate definido en `design.md`; `User` no puede ver historial ajeno.
**Estado:** `LeaderboardController` (`GET /api/leaderboard`) y `GET /api/predictions/user/{userId}` (solo Admin), despachando `GetLeaderboardQuery`/`GetUserHistoryQuery`. Orden por puntos y desempate determinístico cubiertos en `LeaderboardFlowTests.cs`; un `User` no puede ver el historial de otro usuario.
**Dependencias:** Tarea #7.

---

### Tarea #9 — API: Documentación OpenAPI/Swagger — ✅ COMPLETA
**Agente sugerido:** `architect`
**Entregable:** integración de `Swashbuckle.AspNetCore` en `PollaMundialista.Api` — `AddEndpointsApiExplorer()` + `AddSwaggerGen(...)` en el composition root (`Program.cs`) junto a `AddApplicationServices`/`AddInfrastructureServices`; esquema de seguridad Bearer JWT (`AddSecurityDefinition`/`AddSecurityRequirement`) para autorizar desde la UI; `app.UseSwagger()` + `app.UseSwaggerUI()` habilitados solo en `Development` (ver `design.md` §7.1).
**Criterios de aceptación:** `GET /swagger/v1/swagger.json` retorna un documento OpenAPI válido cubriendo los 8 endpoints del contrato de `design.md` §7; Swagger UI permite autenticar con un JWT (botón "Authorize") y ejecutar un request protegido end-to-end; la suite de integración (`WebApplicationFactory`) sigue en verde.
**Estado:** `Swashbuckle.AspNetCore` integrado con `AddEndpointsApiExplorer()` + `AddSwaggerGen(...)` en `Program.cs`, esquema de seguridad Bearer JWT, y `UseSwagger()`/`UseSwaggerUI()` habilitados solo en Development (`design.md` §7.1). `SwaggerDocumentationTests.cs` valida que el documento OpenAPI cubra los endpoints del contrato; la UI permite autenticar con un JWT desde el botón "Authorize" (commits `d2fcbf4`, `5bba65c`).
**Dependencias:** Tarea #8.

---

### Tarea #10 — Frontend: Scaffolding + Módulo Auth — ✅ COMPLETA
**Agente sugerido:** `frontend-expert`
**Entregable:** workspace Angular (standalone), Tailwind/Angular Material configurado, `core/` (interceptor JWT, guards), pantallas de login/registro.
**Criterios de aceptación:** login exitoso contra la API real (Docker Compose) redirige a la pantalla de predicciones; rutas protegidas redirigen a login si no hay sesión.
**Estado:** Workspace Angular standalone con Tailwind configurado, `core/` con interceptor JWT y guards (`authGuard`, `adminGuard`), y pantallas de login y registro con el lenguaje visual de `design.md` §5.1. Las rutas protegidas redirigen a login sin sesión. Specs de componente en verde (commits `46d3d1e`, `8d47bfb`, `127ec56`).
**Dependencias:** Tarea #5 (API de Auth disponible).

---

### Tarea #11 — Frontend: Módulo de Predicciones — ✅ COMPLETA
**Agente sugerido:** `frontend-expert` + `code-reviewer`
**Entregable:** pantalla con los 12 partidos agrupados por grupo, formulario de predicción por partido, deshabilitado tras kickoff.
**Criterios de aceptación:** specs Karma/Jest cubriendo el componente de formulario y el guard de horario; verificación manual en navegador (golden path + intento de predecir tras kickoff).
**Estado:** Pantalla con los 12 partidos agrupados por grupo, formulario de predicción por partido y deshabilitación tras el kickoff. Specs cubren el componente de formulario y el guard de horario; el enlace de cierre de sesión de la navbar funciona. Verificado además en navegador contra la API real desplegada (commits `791d587`, `a1f9147`).
**Dependencias:** Tarea #6.

---

### Tarea #12 — Frontend: Panel Admin — ✅ COMPLETA
**Agente sugerido:** `frontend-expert` + `code-reviewer`
**Entregable:** pantalla exclusiva de Admin para listar partidos y cargar/corregir resultados.
**Criterios de aceptación:** solo accesible con rol Admin (guard); feedback visual tras recálculo exitoso.
**Estado:** Pantalla exclusiva de Admin para listar partidos y cargar/corregir resultados, con feedback visual tras el recálculo exitoso. Accesible solo con rol Admin mediante `adminGuard` (commits `3b2e972`, `127ec56`).
**Dependencias:** Tarea #7, Tarea #10.

---

### Tarea #13 — Frontend: Leaderboard e Historial — ✅ COMPLETA
**Agente sugerido:** `frontend-expert` + `code-reviewer`
**Entregable:** tabla de leaderboard global, vista de historial personal.
**Criterios de aceptación:** el leaderboard se actualiza tras recálculo (sin recargar caché obsoleta); specs de ordenamiento y de desempate.
**Estado:** Tabla de leaderboard global y vista de historial personal, actualizándose tras el recálculo sin caché obsoleta, con specs de ordenamiento y de desempate. Verificadas en navegador contra el leaderboard real con los 12 partidos (commits `791d587`, `a1f9147`).
**Dependencias:** Tarea #8, Tarea #10.

---

### Tarea #14 — Recuperación de contraseña (backend + frontend) — ✅ COMPLETA
**Agente sugerido:** `architect` (backend) + `frontend-expert` (pantallas)
**Contexto:** hueco funcional detectado durante el refactor visual de la pantalla de Login (ver `design.md` §5.1 y §7.2). El enlace "¿Olvidaste tu contraseña?" quedó en la UI sin ningún endpoint que lo respaldara. Diseño completo y decisiones de seguridad ya están escritos en `design.md` §7.2 — esta tarea es su ejecución, no su diseño.
**Entregable:**
- Backend: `PasswordResetToken` (Domain: entidad + invariantes de expiración/uso único; Infrastructure: `IEntityTypeConfiguration` + migración), `IEmailSender` en `Application` con implementación no-op por defecto, `ForgotPasswordCommand`/`ResetPasswordCommand` + Handlers vía Mediator, y `AuthController` Desbloqueando los dos endpoints públicos (`POST /api/auth/forgot-password`, `POST /api/auth/reset-password`).
- Frontend: rutas públicas `/forgot-password` y `/reset-password` en la feature `auth/`, con el mismo lenguaje visual de `design.md` §5.1, y el enlace de Login dejando de estar deshabilitado.
- Colección de Postman sincronizada: los dos endpoints nuevos se agregan a `docs/postman/PollaMundialista.postman_collection.json` **y** a la colección real del workspace de Postman vía MCP (regla de `CLAUDE.md`).
**Criterios de aceptación:**
- Test de integración que verifica la **anti-enumeración**: `forgot-password` con un email existente y con uno inexistente devuelven status y cuerpo indistinguibles.
- Test de integración: token expirado, token ya consumido y token inválido devuelven `400` con mensaje de dominio; tras un reseteo válido, la contraseña nueva funciona en `POST /api/auth/login` y la anterior deja de funcionar.
- El token se persiste hasheado: un test verifica que la columna `TokenHash` de la BD no contiene el token en claro.
- Specs Angular cubren el envío del formulario y los tres estados de error; verificación manual en navegador del flujo completo en modo `Development` (donde el token se expone/loguea).
**Estado:** Backend: `PasswordResetToken` (entidad + invariantes de expiración y uso único, configuración EF + migración), `IEmailSender` con implementación no-op, `ForgotPasswordCommand`/`ResetPasswordCommand` + Handlers, y los dos endpoints públicos en `AuthController`. Frontend: rutas `/forgot-password` y `/reset-password` con el enlace de Login habilitado. Colección de Postman sincronizada en el archivo local y en el workspace. Verificado: anti-enumeración (respuesta indistinguible con y sin email), token expirado/consumido/inválido devuelven `400`, la columna `TokenHash` nunca contiene el token en claro, y la contraseña nueva funciona mientras la anterior deja de hacerlo. La revocación del JWT queda pendiente y tracked como SEC-11 / Tarea #26 (commit `c4880d2`).
**Dependencias:** Tarea #5 (API de Auth), Tarea #10 (pantallas de Auth). Debe cerrarse antes de Tarea #16/#17 para que el build desplegado incluya el flujo completo.

---

### Tarea #15 — Refactor del copy de interfaz Angular — ✅ COMPLETA
**Agente sugerido:** `frontend-expert` + `code-reviewer`
**Contexto:** los templates de las features contienen textos de interfaz literales. La estrategia arquitectónica para extraerlos está definida en `design.md` §5.2; esta tarea la aplica sin rediseñar ni cambiar el contenido visible.
**Entregable:** módulos de copy tipados e inmutables, ubicados junto a cada feature/pantalla (`*.copy.ts`), y templates que consumen esos valores. Incluir títulos, instrucciones, acciones, estados, errores, confirmaciones y etiquetas accesibles; mantener en los modelos solo los datos dinámicos del dominio. Colocar en `core/` únicamente el copy realmente compartido.
**Criterios de aceptación:** no quedan literales de copy de interfaz en los templates de las features existentes; las pruebas de componentes verifican los textos visibles y las asociaciones de etiquetas accesibles; el comportamiento y el copy visible no cambian.
**Estado:** Módulos de copy tipados e inmutables en las 9 pantallas (`*.copy.ts`) y copy compartido en `core/copy/`. Se preservaron los 109 strings visibles sin cambiar el contenido; 5 interpolaciones pasaron a funciones tipadas. Un guard de duplicados en `core/copy/copy.spec.ts` documenta los 4 duplicados deliberados (`Leaderboard`, `Mi Historial`, `Puntos` y la regla de contraseña mínima). Sin literales de copy en los templates de las features; 129/129 specs en 19 archivos. `design.md` §5.2 documenta la estrategia (commits `370d2aa`, `e060804`, `1f2b24d`).
**Dependencias:** Tareas #10–#14 (features de frontend entregadas). Debe cerrarse antes de Docker Compose y del despliegue.

---

### Tarea #16 — Orquestación Local (Docker Compose) — **EXCLUIDA / diferida**
**Agente sugerido:** `architect`
**Estado:** excluida del alcance actual por decisión explícita del usuario (2026-09-27). No bloquea ninguna tarea posterior — el despliegue a Render (#17/#18) no depende de esta tarea. Queda documentada aquí para retomarla más adelante si se decide.
**Entregable (cuando se retome):** `docker-compose.yml` raíz (postgres, api, frontend), `Dockerfile` por servicio, aplicación automática de migraciones al iniciar `api`.
**Criterios de aceptación (cuando se retome):** `docker-compose up` en un entorno limpio deja la app 100% funcional sin pasos manuales adicionales.
**Dependencias:** ninguna tarea posterior depende de esta.

---

### Tarea #17 — Despliegue del Backend en Render.com — ✅ COMPLETA
**Agente sugerido:** `architect`
**Contexto:** primera mitad del despliegue en la nube descrito en `design.md` §12 — la API y el frontend se despliegan como **dos servicios separados** en Render (no bundleados en una sola tarea), porque el frontend (#18) necesita la URL pública real de esta API para su propia configuración (`environment.prod.ts` / variable de build) y para las pruebas del golden path.
**Entregable:** `Web Service` (Docker) en Render para `PollaMundialista.Api`, `Dockerfile` de backend (build multi-stage .NET), conexión al **Neon real ya existente** (`polla_mundialista`, decisión explícita del usuario 2026-09-27 — NO se aprovisiona un Postgres nuevo de Render, se reutiliza el mismo Neon que ya usa el entorno local), variables de entorno en Render (`ConnectionStrings__DefaultConnection` con el connection string de Neon, secretos JWT, etc. — nunca committeados), migraciones ya aplicadas (la de `PasswordResetToken` ya corrió contra este mismo Neon en la Tarea #14, no hace falta re-aplicar), CORS configurado para aceptar (todavía sin confirmar el dominio exacto) el origen del frontend que se desplegará en la Tarea #18.
**Criterios de aceptación:** URL pública de la API responde; `GET /swagger/v1/swagger.json` accesible (o Swagger UI si se decide exponerlo); el flujo completo probado por Postman/curl contra la URL real (`register` → `login` → `predictions` → `admin` resultado → `leaderboard`) funciona igual que en local.
**Estado:** `Web Service` (Docker) en Render para `PollaMundialista.Api` con `Dockerfile` de backend multi-stage .NET, conectado al Neon real ya existente (`polla_mundialista`, sin aprovisionar un Postgres nuevo) vía `ConnectionStrings__DefaultConnection`; secretos JWT y origins de CORS configurados como variables de entorno, nunca committeados. Migraciones aplicadas. CORS parametrizado con `Cors:AllowedOrigins` en vez de hardcodeado a `localhost`. Flujo completo verificado contra la URL real de producción, con login devolviendo JWT y rol Admin (commits `27be930`, `2f12d8f`, `a1f9147`).
**Dependencias:** Tareas #1–#9 (backend funcional) y #14 (recuperación de contraseña, backend). **No depende de la Tarea #16** (excluida).

---

### Tarea #18 — Despliegue del Frontend en Render.com — ✅ COMPLETA
**Agente sugerido:** `architect` + `frontend-expert`
**Contexto:** segunda mitad del despliegue en la nube de `design.md` §12. Se ejecuta después de la #17 porque necesita la URL real del backend ya desplegado.
**Entregable:** `Static Site` (o `Web Service` Docker+Nginx, según se decida al ejecutar) en Render para el build de producción de Angular (`ng build`); configuración de `environment.prod.ts` (o variable de entorno de build) apuntando a la URL real de la API de la Tarea #17; verificación de que las rutas de Angular (SPA con `Router`) no rompen con refresh directo en Render (fallback a `index.html`).
**Criterios de aceptación:** URL pública del frontend funcional con el golden path completo (registro → login → predicción → admin carga resultado → leaderboard actualizado → recuperación de contraseña) contra la API real desplegada; sin errores de CORS en consola del navegador.
**Estado:** Frontend desplegado en Render como sitio estático con el build de producción de Angular; `environment.prod.ts` corregido para apuntar a la URL real de la API (bug: apuntaba a `localhost:5282`); y regla de rewrite `/* → index.html` creada directamente contra la API de Render porque el fallback de `_redirects` estilo Netlify no funcionaba en Render. Golden path completo verificado en Chrome real contra producción: registro, login, predicción, carga de resultado en Admin, leaderboard actualizado y recuperación de contraseña, sin errores de CORS (commits `a1f9147`, `0fab7e7`).
**Dependencias:** Tarea #17 (backend ya desplegado) y Tareas #10–#15 (todas las features de frontend, incluyendo recuperación de contraseña y refactor de copy).

---

### Tarea #19 — Diagrama de Arquitectura C4 (entregable final) — ✅ COMPLETA
**Agente sugerido:** `architect`
**Entregable:** export de las vistas Mermaid de `design.md` §2 a `docs/architecture/` (PNG/SVG o enlace a Structurizr/draw.io).
**Criterios de aceptación:** el diagrama refleja el sistema realmente desplegado (contenedores y componentes coinciden con Tareas #17 y #18).
**Dependencias:** Tareas #17 y #18.
**Estado:** `design.md` §2 actualizado (2 servicios Render + Neon externo, en vez del Postgres/Docker Compose original) y exportado a `docs/architecture/` como `.mmd` (fuente) + `.svg`/`.png` (entregable) para las 3 vistas: contexto, contenedores y componentes de la API.

---

### Tarea #20 — Cierre de Documentación (AI_LOG.md, README, `.claude/`) — ✅ COMPLETA
**Agente sugerido:** `code-reviewer`
**Entregable:** `AI_LOG.md` consolidado con los prompts complejos registrados durante todas las tareas; `README.md` con instrucciones de arranque local y enlaces de despliegue (backend y frontend); `.claude/agents/` y slash command de logging documentados.
**Criterios de aceptación:** un tercero puede clonar el repo, seguir el README, y levantar la app localmente sin contexto adicional.
**Dependencias:** todas las anteriores (excepto la #16, excluida).
**Estado:** `README.md` con demo en vivo, credenciales de prueba, stack, arquitectura (enlace a C4 de la Tarea #19), instrucciones de arranque local (backend+frontend) y tests, despliegue en producción, y documentación adicional (incluyendo el slash command `/log-prompt`). `AI_LOG.md` consolidado con los prompts complejos de todas las tareas, incluyendo el de la Tarea #15 (recuperado retroactivamente) y la saga de despliegue de #17/#18/#19. `.claude/agents/` ya existía y quedó referenciado en el README.

---

## Remediación de seguridad (auditoría 2026-09-27)

> **Bloque originado por la auditoría de seguridad del backend** (evidencia completa en `docs/security-audit-2026-09-27.md`; postura objetivo y decisiones en `docs/design.md` §7.3 + ADR #13/#14/#15). Cada hallazgo tiene ID `SEC-nn` y se cierra en una tarea concreta, con su test de regresión en la misma tarea. Verificar los números antes de asumirlos: `tasks.md` ya se renumeró dos veces.
>
> **Restricciones transversales** (aplican a #22–#27): (a) toda configuración nueva es opcional con default seguro, para no romper el deploy existente en Render; (b) un cambio de contrato HTTP se migra atómicamente con sus consumidores (Postman + Angular) o es un outage; (c) ningún hallazgo se cierra sin su test de regresión.

### Tarea #21 — Documentar los hallazgos de seguridad (SEC-01…SEC-12) — ✅ COMPLETA
**Agente sugerido:** `architect`
**Entregable:** `docs/security-audit-2026-09-27.md` con los 12 hallazgos (severidad, CWE, evidencia `archivo:línea`, impacto, corrección y tarea dueña), la tabla de controles verificados como limpios, las divergencias diseño↔código y el plan de remediación; sección §7.3 de `docs/design.md` con la postura objetivo y sus restricciones transversales; anotación de las 3 divergencias detectadas en §7.2 (revocación de JWT prometida y no implementada, token "expuesto en la respuesta" cuando el código solo lo loguea, y alcance real del "sin throttling" aceptado); ADR #13/#14/#15.
**Criterios de aceptación:** cada `SEC-nn` tiene severidad, tarea dueña y referencia de evidencia; `design.md` §7.2 ya no afirma como implementado lo que no lo está; no hay secretos ni valores de credenciales en los tres documentos.
**Dependencias:** ninguna.
**Estado:** ✅ COMPLETA

### Tarea #22 — Arranque seguro y configuración validada (SEC-01, SEC-02, SEC-03, SEC-04, SEC-05)
**Agente sugerido:** `architect`
**Entregable:** `ValidAlgorithms = [HmacSha256]` en `TokenValidationParameters`; `[Required]` + longitud mínima 32 bytes + `Issuer`/`Audience` obligatorios en `JwtOptions` con `ValidateOnStart()`; `FallbackPolicy` que exija JWT con `[AllowAnonymous]` explícito en `AuthController`; eliminación del endpoint raíz `Hello World!`; `ValidationBehavior` iterando todos los validators en vez de `FirstOrDefault()`; y harness autocontenido, inyectando un secreto de test en `CustomWebApplicationFactory` para que la suite deje de depender de los User Secrets del desarrollador.
**Criterios de aceptación:** (1) un token firmado con HS512 y la misma clave devuelve `401`; (2) con `Jwt__Secret=` la aplicación **falla al arrancar** con un mensaje que nombre la clave faltante, y no en el primer request con un `500`; (3) `dotnet test` corre en verde en una máquina sin User Secrets; (4) los cuatro endpoints de `AuthController` siguen siendo accesibles sin token, y `Predictions`/`Leaderboard`/`Admin` siguen exigiéndolo; (5) `AppDbContext` registra dos validators para un request y ambos se ejecutan.
**Dependencias:** #21.
**Estado:** Pendiente

### Tarea #23 — Perímetro HTTP: headers, HTTPS y CORS acotado (SEC-06)
**Agente sugerido:** `architect`
**Entregable:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`; `UseHttpsRedirection` + HSTS activos fuera de Development; policy CORS renombrada de `"AllowAngularDev"` a un nombre neutro y con métodos y headers explícitos en lugar de `AllowAnyHeader`/`AllowAnyMethod`, conservando la ausencia de `AllowCredentials` y el comportamiento de `AllowedOrigins: []` en producción.
**Criterios de aceptación:** (1) una respuesta de la API incluye los tres headers; (2) HSTS se emite fuera de Development y **no** en local, para no romper el desarrollo por http; (3) el CORS sigue rechazando orígenes no configurados y sigue aceptando el Static Site de Render vía variable de entorno; (4) ninguna respuesta incluye `Access-Control-Allow-Origin: *` junto a `Allow-Credentials`.
**Dependencias:** #22.
**Estado:** Pendiente

### Tarea #24 — Endurecer el flujo de autenticación (SEC-07, SEC-08, SEC-09)
**Agente sugerido:** `architect`
**Entregable:** hash BCrypt señuelo en `LoginQueryHandler` para igualar el costo de un email inexistente con uno existente; `LoginQueryValidator` con longitud acotada; alineación del copy de la pantalla de Login con la política real de 8 caracteres; y `NoOpEmailSender` gateado por el flag `PasswordReset:ExposeToken` (default `false`) en vez de `IsDevelopment()`, con el email redactado en el log.
**Criterios de aceptación:** (1) un test verifica que login con email inexistente y con contraseña incorrecta tardan un orden de magnitud comparable (el umbral debe ser amplio para no volverse flaky); (2) `LoginQuery` rechaza entradas por encima de la longitud máxima; (3) con `PasswordReset:ExposeToken` ausente o `false`, ningún test de integración escribe un token de reseteo en el log, incluso con `ASPNETCORE_ENVIRONMENT=Development`; (4) con el flag en `true` el token se loguea para poder probar el flujo end-to-end.
**Dependencias:** #23.
**Estado:** Pendiente

### Tarea #25 — Rate limiting por IP en endpoints de autenticación (SEC-10)
**Agente sugerido:** `architect`
**Entregable:** `AddRateLimiter`/`UseRateLimiter` con *fixed window* por IP en `register`, `login`, `forgot-password` y `reset-password`, más un límite global; respuesta `429` con cuerpo ProblemDetails; y `ForwardedHeaders` antes del limitador para que la IP real se resuelva detrás del proxy de Render.
**Criterios de aceptación:** (1) superar el umbral en `login` devuelve `429` y el contador se reinicia al vencer la ventana; (2) los endpoints de lectura (`/api/matches`, `/api/leaderboard`, `/api/predictions`) no quedan limitados de forma que rompa la UX normal; (3) un test confirma que dos IPs simuladas tienen contadores independientes; (4) con `ForwardedHeaders` configurado, el limitador opera sobre la IP del header y no sobre la del proxy.
**Dependencias:** #24.
**Estado:** Pendiente

### Tarea #26 — Revocación de JWT al cambiar la contraseña (SEC-11)
**Agente sugerido:** `architect`
**Entregable:** columna `SecurityStamp` en `User` (con migración), claim `security_stamp` emitido en `JwtTokenGenerator`, evento `OnTokenValidated` que compare el claim contra la BD y rechace el token con `401` si no coincide, e invalidación explícita del stamp en `User.ChangePassword` y en `ResetPasswordCommandHandler`.
**Criterios de aceptación:** (1) un JWT emitido **antes** de un reseteo de contraseña devuelve `401` en `/api/predictions` y en `/api/leaderboard`; (2) un JWT emitido **después** funciona con normalidad; (3) cambiar la contraseña invalida también los JWT emitidos para otras sesiones del mismo usuario; (4) la migración se aplica limpia contra el Neon existente sin perder datos, y el harness de tests sigue en verde en SQLite in-memory.
**Dependencias:** #25.
**Estado:** Pendiente

### Tarea #27 — RFC 7807 end-to-end: errores estándar sin romper el frontend (SEC-12)
**Agente sugerido:** `architect` (con revisión de `code-reviewer` por cambiar contrato público)
**Entregable:** `IExceptionHandler` global que traduzca toda excepción no controlada a `ProblemDetails` con `traceId` y sin stack trace en ningún ambiente; `ResultExtensions` migrado a `ProblemDetails`; **preservando `message`** como extensión o actualizando los 5 services Angular que leen `err?.error?.message`, en el mismo cambio; y actualización de `docs/postman/PollaMundialista.postman_collection.json` sincronizada con el workspace de Postman.
**Criterios de aceptación:** (1) un `404`, un `400` de validación y una excepción interna devuelven `application/problem+json` con `type`/`title`/`status`/`detail`/`traceId`; (2) ninguna respuesta en ningún ambiente incluye stack trace ni nombres de tablas de EF; (3) **la UI sigue mostrando el mensaje de error real** en login, registro, forgot y reset, verificado en el navegador — sin esto la tarea se considera fallida aunque el backend sea correcto; (4) la colección de Postman local y la del workspace reflejan el nuevo shape y fueron probadas manualmente; (5) la suite de integración y la de Angular quedan en verde.
**Dependencias:** #26.
**Estado:** Pendiente
