# Handoff Log — Polla Mundialista

---

## Handoff: 2026-09-27

### Current Task State

Backend (Tareas #1-9 de `docs/tasks.md`) está **completo, verde y commiteado** (`origin/main`, commit `5bba65c`). Frontend Angular (Tarea #10: scaffolding + Auth; Tarea #11: módulo de Predicciones) está **completo y verificado, pero SIN COMMITEAR** — igual que un fix crítico de backend hecho después de la Tarea #11. Próximo paso pendiente de confirmación del usuario: Tarea #12 (panel Admin) o commitear primero.

### Key Decisions

- **.NET 10 / Angular 22**, no .NET 8 como decía el prompt original — se actualizó temprano en el proyecto.
- **Mediator** (martinothamar, source-generator) para CQRS — no MediatR (licenciamiento comercial en v13+). Handlers reales son `ICommandHandler<,>`/`IQueryHandler<,>`, NO `IRequestHandler<,>` (contradice una asunción inicial de `design.md`, ya corregida).
- **Neon** (Postgres serverless) para la base real, vía MCP `neon`: proyecto `polla-mundialista` (id `wandering-pine-69265807`), base `polla_mundialista`, región `aws-us-east-1`. Connection string real vive en `dotnet user-secrets` de `PollaMundialista.Api` (`ConnectionStrings:DefaultConnection`), NO en el repo.
- **Admin real sembrado directo en Neon** (bypass del registro público, que solo crea rol `User`): `admin@pollamundialista.com` / `Admin123!`.
- **Tailwind CSS** (no Angular Material) para el frontend — decisión cerrada en `docs/design.md` §5.
- **RxJS `BehaviorSubject`** para el estado de sesión (`AuthService`), NO Signals — decisión explícita de `design.md` §5, respetada aunque Angular 22 favorece Signals.
- **Angular CLI 22 usa Vitest + jsdom por defecto, NO Karma** — descubierto en la Tarea #10; toda mención futura de "Karma/Jasmine" en `docs/tasks.md` debe leerse como Vitest.
- **Puerto 4200 ocupado en esta máquina** por una app ajena (ver memoria de proyecto `project_port_4200_conflict.md`) — usar `ng serve --port 4300`. CORS en `Program.cs` (`AllowAngularDev`) permite `4200` y `4300`.
- **`AI_LOG.md` ya NO se actualiza automáticamente** — el usuario pidió explícitamente hacerlo manualmente vía `/log-prompt`. No tocarlo salvo pedido explícito (ver memoria `feedback_ai_log.md`).
- **CLAUDE.md del proyecto** (raíz del repo) exige: (1) usar CodeGraph (`codegraph_explore`/`codegraph explore`) antes que grep/Read a ciegas; (2) mantener sincronizados `docs/postman/PollaMundialista.postman_collection.json` Y la colección real en el workspace de Postman (vía MCP `postman`) cada vez que cambie el contrato de un endpoint.
- **Patrón de trabajo establecido**: toda escritura de código se delega a un subagente (regla del `CLAUDE.md` global del usuario); el orquestador SIEMPRE verifica independientemente (build/test propios, lectura de código clave, y para UI, navegador real vía `claude-in-chrome`) antes de dar algo por bueno — esto ya destapó bugs reales que el reporte de un subagente no mencionaba correctamente.

### Modified Files (sin commitear al momento de este handoff)

- `backend/src/PollaMundialista.Api/Program.cs` — CORS (`AllowAngularDev` para 4200/4300), Swagger, y el fix de `.AddJsonOptions(JsonStringEnumConverter)` en `AddControllers()`.
- `backend/tests/PollaMundialista.IntegrationTests/{TestAuthHelper.cs, EndToEndFlowTests.cs, HarnessFlowTests.cs, LeaderboardFlowTests.cs, PredictionsFlowTests.cs}` — centralizados en `TestAuthHelper.JsonOptions` (antes duplicado) para deserializar enums como string correctamente.
- `docs/design.md` — línea de "Estilos" (Tailwind cerrado), criterio de desempate del leaderboard (§7), nota de orquestación Submit/Recalculate en Handler (no en Controller).
- `frontend/` — **todo nuevo, sin trackear en git todavía** (workspace Angular completo: `core/`, `auth/`, `predictions/`, `environments/`, config de Tailwind, etc.).

### Blockers / Open Questions

- **Nada bloqueante técnicamente** — todo compila y los tests pasan (backend 85/85, frontend 31/31). El único pendiente es una decisión del usuario: ¿commitear el estado actual (Tareas #10-11 + fix de enums) antes de seguir con la Tarea #12, o seguir avanzando y commitear después?
- `docs/tasks.md` fue renumerado por el usuario a mitad de sesión (se insertó la Tarea #9 de Swagger, desplazando Frontend/Docker/Render/C4/Cierre de #9-16 a #10-17) — **siempre releer `docs/tasks.md` antes de asumir el número de una tarea**, ya cambió más de una vez.

### Next Steps

1. Confirmar con el usuario si se commitea ahora el trabajo pendiente (Tareas #10-11 + fix de serialización de enums) antes de continuar.
2. **Tarea #12 — Frontend: Panel Admin** (revisar `docs/tasks.md` para el número/alcance exacto vigente): pantalla exclusiva de Admin para cargar/corregir resultados de partidos, protegida con `adminGuard` (ya existe y ahora SÍ funciona correctamente tras el fix de enums).
3. **Tarea #13 — Frontend: Leaderboard e Historial**.
4. Luego: Docker Compose, despliegue a Render.com, diagrama C4 final, documentación de cierre (README, `.claude/`).
5. Actualizar la colección de Postman (`docs/postman/PollaMundialista.postman_collection.json`) y sincronizarla vía MCP si algún endpoint cambia durante las tareas de frontend restantes (regla de `CLAUDE.md`).

### Critical Context

- **Bug de serialización de enums (ya arreglado, pero ojo si aparece de nuevo)**: `ConfigureHttpJsonOptions` en `Program.cs` solo configura el serializador de **Minimal API**, NO el de los Controllers MVC (`AddControllers()`). Si se agrega un nuevo enum a un DTO expuesto por un Controller, hay que asegurarse de que `AddControllers().AddJsonOptions(...)` (ya configurado con `JsonStringEnumConverter`) siga aplicando — si alguien "simplifica" Program.cs sin darse cuenta, los enums pueden volver a salir como número silenciosamente (los tests de integración lo detectarían SI deserializan con `TestAuthHelper.JsonOptions`/el patrón de `JsonStringEnumConverter`; los tests que usan tipos sin enums no lo notarían).
- **Angular 22 es zoneless** (sin zone.js). Mutar campos planos dentro de objetos referenciados por un array que alimenta el template NO dispara detección de cambios tras una respuesta HTTP asíncrona — hay que reemplazar la referencia del array/objeto (visto en `predictions.ts`, método `notifyGroupsChanged()`) para que la UI se actualice. Este bug NO lo detectan los tests unitarios (Angular `TestBed` fuerza `detectChanges()` externamente) — solo se detectó con verificación manual real en navegador.
- **Los 12 partidos reales en Neon están todos en el futuro** (diciembre 2026) — para probar el rechazo por kickoff pasado (409) contra datos reales, hay que sembrar un partido adicional con `kickoffAt` pasado directo en la BD (patrón ya usado en `PredictionsFlowTests.PostAfterKickoff_Returns409Conflict` y disponible para verificación manual vía MCP `neon` → `run_sql`).
- **Nunca tocar el proceso en el puerto 4200** de esta máquina — es una app ajena real, no el frontend del proyecto.
- El repo YA es un repositorio git con remoto (`origin/main`) — el usuario lo inicializó y ha hecho push él mismo en algunos puntos; **nunca hacer `git init`/commit/push sin que lo pida explícitamente**.

### Model Summary

- Backend completo (.NET 10, Clean Architecture, Mediator, JWT, EF Core+Neon Postgres, Swagger) — Tareas #1-9, commiteado y en verde (85/85 tests).
- Frontend en progreso (Angular 22 standalone + Tailwind): scaffolding+Auth (Tarea #10) y módulo de Predicciones (Tarea #11) completos, verificados en navegador real, 31/31 tests — pero sin commitear.
- Se encontró y arregló un bug real de serialización (enums numéricos en vez de string en los 4 Controllers) que rompía silenciosamente `adminGuard` en el frontend — root-caused y corregido en backend + tests, no parcheado en el frontend.
- Colección de Postman creada (`docs/postman/PollaMundialista.postman_collection.json`) con datos reales de Neon; el usuario ya la subió a mano a su workspace de Postman; regla en `CLAUDE.md` exige mantenerla sincronizada (archivo + MCP) ante cambios de contrato.
- `CLAUDE.md` del proyecto exige CodeGraph-first para toda búsqueda de código.
- Patrón operativo: delegar código a subagentes, verificar todo de forma independiente (build, test, curl, y navegador real para UI) antes de aceptar cualquier entrega.
- `docs/tasks.md` fue renumerado a mitad de sesión — siempre releerlo antes de asumir qué tarea sigue.
- `AI_LOG.md` ya no se actualiza automáticamente — solo bajo pedido explícito o `/log-prompt`.
- Próximo paso natural: Tarea #12 (Panel Admin), después Leaderboard, Docker Compose, Render, C4, cierre.

### Handoff Context (paste into next session)

Estás retomando "Polla Mundialista" (prueba técnica Bizagi). Backend .NET 10 completo y commiteado (85/85 tests, Neon Postgres real). Frontend Angular 22 + Tailwind con Auth (Tarea #10) y Predicciones (Tarea #11) completos pero SIN COMMITEAR, igual que un fix de un bug real de serialización de enums en los Controllers (backend). Antes de nada: (1) relee `docs/tasks.md` completo para confirmar la numeración vigente de tareas (se renumeró a mitad de sesión); (2) corre `dotnet test backend/PollaMundialista.sln` (espera 85/85) y `cd frontend && npx ng test --watch=false` (espera 31/31) para confirmar que el estado sigue verde; (3) pregunta al usuario si quiere commitear el trabajo pendiente antes de seguir. El repo YA tiene git+remoto — nunca inicialices ni hagas push sin pedido explícito. Sigue el patrón: cada pieza de código nuevo se delega a un subagente (`Agent` tool), y tú verificas independientemente después (build/test propios, lectura de archivos clave, y para cambios de UI, navegador real vía herramientas `claude-in-chrome` — usa el puerto 4300 para `ng serve`, el 4200 está ocupado por una app ajena en esta máquina, NUNCA la toques). Usa CodeGraph (`codegraph_explore`) antes de grep/Read. La siguiente tarea natural es el Panel Admin (frontend) — revisa el número exacto en `docs/tasks.md` y su entregable/criterios antes de delegar. No toques `AI_LOG.md` salvo pedido explícito.

---
