# Plan de Tareas (SDD) — Polla Mundialista

Orden estricto: el harness (Tarea #1) se construye y se verifica en verde **antes** de cualquier lógica de producción. Cada tarea indica entregable, criterios de aceptación, dependencias y el sub-agente sugerido (ver `docs/design.md` §11) para ejecutarla.

Formato de commit sugerido: `feat(scope): descripción` / `test(scope): descripción` / `docs(scope): descripción`, uno o más commits progresivos por tarea.

> **Renumeración 2026-09-27**: se insertó la Tarea #14 (Recuperación de contraseña, hueco detectado al diseñar la nueva pantalla de Login), moviendo Docker Compose a #15. Luego se agregó la Tarea #15 (refactor del copy de interfaz); Docker Compose queda en #16, Render en #17, C4 en #18 y Cierre en #19.
>
> **Renumeración 2026-09-27 (2)**: la **Tarea #16 (Docker Compose) queda EXCLUIDA/diferida por decisión explícita del usuario** — no bloquea ninguna tarea posterior; se retoma más adelante si hace falta, no forma parte del camino crítico actual. La Tarea #17 (Render) se dividió en dos, porque `design.md` §12 ya especifica el backend y el frontend como **servicios separados** en Render: **#17 — Despliegue del Backend en Render.com** y **#18 (nueva) — Despliegue del Frontend en Render.com**. El diagrama C4 pasa a **#19** y el Cierre de Documentación a **#20**. Leer este archivo completo antes de asumir el número de una tarea — ya se renumeró varias veces.

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

### Tarea #14 — Recuperación de contraseña (backend + frontend)
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
**Dependencias:** Tarea #5 (API de Auth), Tarea #10 (pantallas de Auth). Debe cerrarse antes de Tarea #16/#17 para que el build desplegado incluya el flujo completo.

---

### Tarea #15 — Refactor del copy de interfaz Angular
**Agente sugerido:** `frontend-expert` + `code-reviewer`
**Contexto:** los templates de las features contienen textos de interfaz literales. La estrategia arquitectónica para extraerlos está definida en `design.md` §5.2; esta tarea la aplica sin rediseñar ni cambiar el contenido visible.
**Entregable:** módulos de copy tipados e inmutables, ubicados junto a cada feature/pantalla (`*.copy.ts`), y templates que consumen esos valores. Incluir títulos, instrucciones, acciones, estados, errores, confirmaciones y etiquetas accesibles; mantener en los modelos solo los datos dinámicos del dominio. Colocar en `core/` únicamente el copy realmente compartido.
**Criterios de aceptación:** no quedan literales de copy de interfaz en los templates de las features existentes; las pruebas de componentes verifican los textos visibles y las asociaciones de etiquetas accesibles; el comportamiento y el copy visible no cambian.
**Dependencias:** Tareas #10–#14 (features de frontend entregadas). Debe cerrarse antes de Docker Compose y del despliegue.

---

### Tarea #16 — Orquestación Local (Docker Compose) — **EXCLUIDA / diferida**
**Agente sugerido:** `architect`
**Estado:** excluida del alcance actual por decisión explícita del usuario (2026-09-27). No bloquea ninguna tarea posterior — el despliegue a Render (#17/#18) no depende de esta tarea. Queda documentada aquí para retomarla más adelante si se decide.
**Entregable (cuando se retome):** `docker-compose.yml` raíz (postgres, api, frontend), `Dockerfile` por servicio, aplicación automática de migraciones al iniciar `api`.
**Criterios de aceptación (cuando se retome):** `docker-compose up` en un entorno limpio deja la app 100% funcional sin pasos manuales adicionales.
**Dependencias:** ninguna tarea posterior depende de esta.

---

### Tarea #17 — Despliegue del Backend en Render.com
**Agente sugerido:** `architect`
**Contexto:** primera mitad del despliegue en la nube descrito en `design.md` §12 — la API y el frontend se despliegan como **dos servicios separados** en Render (no bundleados en una sola tarea), porque el frontend (#18) necesita la URL pública real de esta API para su propia configuración (`environment.prod.ts` / variable de build) y para las pruebas del golden path.
**Entregable:** `Web Service` (Docker) en Render para `PollaMundialista.Api`, `Dockerfile` de backend (build multi-stage .NET), conexión al **Neon real ya existente** (`polla_mundialista`, decisión explícita del usuario 2026-09-27 — NO se aprovisiona un Postgres nuevo de Render, se reutiliza el mismo Neon que ya usa el entorno local), variables de entorno en Render (`ConnectionStrings__DefaultConnection` con el connection string de Neon, secretos JWT, etc. — nunca committeados), migraciones ya aplicadas (la de `PasswordResetToken` ya corrió contra este mismo Neon en la Tarea #14, no hace falta re-aplicar), CORS configurado para aceptar (todavía sin confirmar el dominio exacto) el origen del frontend que se desplegará en la Tarea #18.
**Criterios de aceptación:** URL pública de la API responde; `GET /swagger/v1/swagger.json` accesible (o Swagger UI si se decide exponerlo); el flujo completo probado por Postman/curl contra la URL real (`register` → `login` → `predictions` → `admin` resultado → `leaderboard`) funciona igual que en local.
**Dependencias:** Tareas #1–#9 (backend funcional) y #14 (recuperación de contraseña, backend). **No depende de la Tarea #16** (excluida).

---

### Tarea #18 — Despliegue del Frontend en Render.com
**Agente sugerido:** `architect` + `frontend-expert`
**Contexto:** segunda mitad del despliegue en la nube de `design.md` §12. Se ejecuta después de la #17 porque necesita la URL real del backend ya desplegado.
**Entregable:** `Static Site` (o `Web Service` Docker+Nginx, según se decida al ejecutar) en Render para el build de producción de Angular (`ng build`); configuración de `environment.prod.ts` (o variable de entorno de build) apuntando a la URL real de la API de la Tarea #17; verificación de que las rutas de Angular (SPA con `Router`) no rompen con refresh directo en Render (fallback a `index.html`).
**Criterios de aceptación:** URL pública del frontend funcional con el golden path completo (registro → login → predicción → admin carga resultado → leaderboard actualizado → recuperación de contraseña) contra la API real desplegada; sin errores de CORS en consola del navegador.
**Dependencias:** Tarea #17 (backend ya desplegado) y Tareas #10–#15 (todas las features de frontend, incluyendo recuperación de contraseña y refactor de copy).

---

### Tarea #19 — Diagrama de Arquitectura C4 (entregable final) — ✅ COMPLETA
**Agente sugerido:** `architect`
**Entregable:** export de las vistas Mermaid de `design.md` §2 a `docs/architecture/` (PNG/SVG o enlace a Structurizr/draw.io).
**Criterios de aceptación:** el diagrama refleja el sistema realmente desplegado (contenedores y componentes coinciden con Tareas #17 y #18).
**Dependencias:** Tareas #17 y #18.
**Estado:** `design.md` §2 actualizado (2 servicios Render + Neon externo, en vez del Postgres/Docker Compose original) y exportado a `docs/architecture/` como `.mmd` (fuente) + `.svg`/`.png` (entregable) para las 3 vistas: contexto, contenedores y componentes de la API.

---

### Tarea #20 — Cierre de Documentación (AI_LOG.md, README, `.claude/`)
**Agente sugerido:** `code-reviewer`
**Entregable:** `AI_LOG.md` consolidado con los prompts complejos registrados durante todas las tareas; `README.md` con instrucciones de arranque local y enlaces de despliegue (backend y frontend); `.claude/agents/` y slash command de logging documentados.
**Criterios de aceptación:** un tercero puede clonar el repo, seguir el README, y levantar la app localmente sin contexto adicional.
**Dependencias:** todas las anteriores (excepto la #16, excluida).
