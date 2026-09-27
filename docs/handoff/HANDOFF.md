# Handoff Log — Polla Mundialista

---

## Handoff: 2026-09-27 (3) — Tarea #14 (Recuperación de contraseña) completa, backend+frontend+Postman, SIN COMMITEAR

### Current Task State

**`docs/tasks.md` fue renumerado de nuevo** (nota al inicio del archivo): se insertó la Tarea #14 (Recuperación de contraseña — hueco funcional detectado al rediseñar Login: el link "¿Olvidaste tu contraseña?" no tenía backend) y la Tarea #15 (refactor del copy de interfaz). Docker Compose ahora es **#16**, Render **#17**, C4 **#18**, Cierre **#19**. El diseño de ambas tareas nuevas YA estaba escrito en `docs/design.md` (§5.1/§5.2/§7.2) antes de ejecutarlas — no se diseñó nada nuevo en esta sesión, solo se ejecutó lo ya especificado.

Además, entre el handoff anterior y este, el usuario (fuera de esta conversación, en otra sesión/directamente) ya había commiteado el rediseño visual de tema oscuro de Login/Register (`8d47bfb`) y otro commit de mejoras a predictions/history (`791d587`) — el HEAD real ya no era `3b2e972` al empezar esta sesión.

**Tarea #14 (backend + frontend + Postman) quedó completa y verificada de forma independiente en esta sesión, pero SIN COMMITEAR** (se dejó así a propósito — el usuario/orquestador decide cuándo commitear, ningún subagente hizo commit).

- Backend: **108/108 tests** (78 unit + 30 integration; baseline era 85, +23 nuevos). Build limpio, 0 warnings.
- Frontend: **108/108 tests** (18 archivos). El "baseline 48" que se usó al delegar era viejo — el repo ya traía 108 antes de tocar nada por trabajo previo no reflejado en el handoff anterior.
- Verificación end-to-end real: `curl` contra el backend real (anti-enumeración byte-a-byte, los 3 estados de error de reset, ciclo completo de contraseña vieja/nueva) + navegación real en Chrome (`/login` → link habilitado → `/forgot-password` → éxito → `/reset-password?token=...` → precarga de token → éxito/error).

### Key Decisions

- **Hash del token de reseteo = SHA-256 hex, no bcrypt/`IPasswordHasher`**: el token ya es un secreto aleatorio de 32 bytes con entropía completa (no una contraseña de usuario); necesita lookup determinístico por hash, y bcrypt no lo permite (salt distinto en cada llamada).
- **Anti-enumeración absoluta e incondicional en todo entorno**: `ForgotPasswordCommandHandler` SIEMPRE devuelve `Success` con el mismo mensaje genérico, exista o no el email — nunca hay branch de `Failure` ahí. El token crudo NUNCA viaja en el body HTTP, en ningún entorno.
- **"En Development se expone/loguea" (design.md §7.2) se interpretó como exposición solo vía `ILogger`** (en `NoOpEmailSender`, gateado por `IHostEnvironment.IsDevelopment()`), nunca en el response body — porque el host de test corre como Development por defecto, y exponerlo en el body ahí habría roto la garantía de anti-enumeración exigida como "Crítico".
- **Invalidación del JWT anterior tras reset: fuera de alcance, no implementado.** Confirmado que no existe blacklist/revocación en el proyecto (JWT stateless, sin refresh token) — documentado como decisión, no como una funcionalidad nueva improvisada.
- **Timing side-channel no eliminado del todo** (la rama "email existe" hace más trabajo async) — riesgo aceptado y documentado; la garantía exigida y testeada (status+body idénticos) sí se cumple.
- **Frontend — sin campo de confirmación de contraseña en reset-password**: sigue el patrón real de Register (que tampoco lo pide), coincide 1:1 con el contrato del backend (`token` + `newPassword`).
- **Frontend — `minLength(8)` en `newPassword`** (Login/Register usan 6): el `ResetPasswordCommandValidator` del backend exige mínimo 8; se igualó para no mostrar "éxito" en el form cuando el backend lo rechazaría.
- **Frontend — precarga de `token` desde `?token=` en la URL** de `/reset-password` vía `ActivatedRoute` (no pedido literalmente, pero refleja cómo llegaría un usuario real desde el enlace de email/log). Primera vez que se usa `ActivatedRoute` en el frontend — es API estándar de `@angular/router`, no una librería nueva.
- **Frontend — nuevo patrón visual de "éxito"** (`role="status"`, paleta `emerald-500/10`/`emerald-300`/`emerald-500/30`): no existía antes en el repo (solo el `role="alert"` rosa de error de Login/Register).
- **Lección operativa importante de esta sesión — guardada en memoria global** (`~/.claude/projects/.../memory/feedback_no_nested_delegation.md`): un subagente delegado para el backend de la Tarea #14 aplicó la regla de "delegar código a un subagente" de forma recursiva sobre sí mismo (delegó a un fork, que delegó a otro fork), y los tres quedaron esperándose sin escribir nada, desperdiciando ~13 min y 144k+ tokens antes de que el usuario lo notara y se cortara la cadena manualmente. Regla corregida: la instrucción de delegar código es SOLO para el orquestador principal; todo prompt a un subagente debe decirle explícitamente que escriba el código él mismo y NO delegue más. Se aplicó así en el subagente del frontend de esta misma tarea, sin problemas.

### Modified/Created Files (NINGUNO commiteado todavía)

**Backend:**
- Domain: `Entities/PasswordResetToken.cs` (nuevo), `Exceptions/DomainErrorMessages.cs` (+2 constantes), `Entities/User.cs` (+`ChangePassword`).
- Application: `Abstractions/{IEmailSender.cs, IPasswordResetTokenRepository.cs}` (nuevos), `Abstractions/IUserRepository.cs` (+`UpdateAsync`), `Dtos/{ForgotPasswordResultDto.cs, ResetPasswordResultDto.cs}` (nuevos), `Auth/{ForgotPasswordCommand(Validator/Handler).cs, ResetPasswordCommand(Validator/Handler).cs}` (nuevos).
- Infrastructure: `Persistence/Configurations/PasswordResetTokenConfiguration.cs`, `Persistence/Repositories/PasswordResetTokenRepository.cs` (nuevos), `Persistence/Repositories/UserRepository.cs` (+`UpdateAsync`), `Persistence/AppDbContext.cs` (+`DbSet<PasswordResetToken>`), `Services/NoOpEmailSender.cs` (nuevo), `DependencyInjection.cs` (+2 registros), migración `20260927153346_AddPasswordResetToken` (+Designer+Snapshot) — **ya aplicada** contra la BD Neon real vía `dotnet ef database update` (tabla `PasswordResetTokens` sí existe ahora en Neon).
- Api: `Controllers/AuthController.cs` (+`ForgotPassword`/`ResetPassword`).
- Tests: unit `PasswordResetTokenTests.cs`, `UserTests.cs` (+3), `ForgotPasswordCommandHandlerTests.cs`, `ResetPasswordCommandHandlerTests.cs`; integración `PasswordResetFlowTests.cs` (6 escenarios).

**Frontend:**
- `auth/forgot-password/{forgot-password.ts,.html,.css,.spec.ts}` (nuevo).
- `auth/reset-password/{reset-password.ts,.html,.css,.spec.ts}` (nuevo).
- `core/models/auth.models.ts` (+`ForgotPasswordResultDto`, `ResetPasswordResultDto`).
- `core/services/auth.service.ts` (+`forgotPassword`, `resetPassword`), `auth.service.spec.ts` (+2 tests).
- `app.routes.ts` (+rutas públicas `/forgot-password`, `/reset-password`, sin guard).
- `auth/login/login.html` (link "¿Olvidaste tu contraseña?" ahora `routerLink` habilitado), `login.spec.ts` (test actualizado).

**Postman (sincronizado, JSON local + MCP):**
- `docs/postman/PollaMundialista.postman_collection.json`: +2 requests ("Olvidé mi Contraseña", "Resetear Contraseña") en la carpeta Auth, +variable de colección `resetToken`.
- Colección remota real sincronizada vía MCP `postman`: `collectionId` = `3567004-a65aaeb2-4329-4c11-a91c-1534f0af52bd`, workspace "My Workspace" (`8752af08-c147-43da-832d-58c78b23fe4a`).

### Blockers / Open Questions

- **Nada bloqueante funcionalmente** — Tarea #14 verificada de punta a punta. Pendiente de decisión del usuario: ¿commitear ahora o seguir con la Tarea #15 antes de commitear?
- **`git status`/`git log` fallan en el sandbox de Bash de ESTA sesión** con `fatal: unable to access '.git/config': Operation not permitted` (el binario resuelto es `/Applications/Xcode.app/Contents/Developer/usr/bin/git`). El archivo `.git/config` se pudo leer sin problema con la herramienta `Read` (contenido normal, sin nada raro) y otros comandos Bash (find/stat/ps) funcionan bien — parece un problema puntual del sandbox de esta sesión, no del repo. Verificar en la próxima sesión si persiste; si sí, probablemente haga falta que el usuario revise permisos de Xcode Command Line Tools / Full Disk Access para la app Claude Code.
- **Dos procesos de servidor quedaron corriendo en la máquina** desde verificaciones de esta sesión (y posiblemente de antes): `dotnet run` del backend en `:5282` y `ng serve --port 4300`. Revisar con `lsof -iTCP:4300 -sTCP:LISTEN` / `:5282` antes de levantar nuevos, y matarlos si ya no hacen falta.

### Next Steps

1. **Decidir con el usuario si se commitea ahora** el trabajo de la Tarea #14 (backend+frontend+Postman) antes de seguir.
2. **Tarea #15 — Refactor del copy de interfaz Angular** (`docs/tasks.md` líneas 140-146, diseño en `design.md` §5.2): extraer literales de UI a módulos tipados `*.copy.ts` por feature/pantalla. Sin cambiar copy visible ni comportamiento.
3. Luego: Docker Compose (**#16**), Render (**#17**), diagrama C4 (**#18**), cierre de documentación (**#19**).
4. Revisar si el problema de `git status` (ver Blockers) persiste en la próxima sesión.

### Critical Context

- Todo lo de las entradas anteriores de este log sigue aplicando (releer si hace falta contexto de Tareas #1-13).
- **Regla nueva y crítica de esta sesión**: cuando se delega código a un subagente, el prompt DEBE incluir explícitamente "escribe el código tú mismo, no delegues a otro subagente ni a un fork" — la regla global de "delegar a un subagente" es solo para el orquestador principal, no se re-aplica en cadena. Ver memoria global `feedback_no_nested_delegation.md`.
- La migración `AddPasswordResetToken` ya está aplicada contra la BD Neon real de desarrollo (no solo en SQLite de test) — la tabla `PasswordResetTokens` existe ahí.
- El repo tiene git+remoto (`origin/main`, `https://github.com/frpatino6/polla-mundialista-sdd.git`); el usuario commitea él mismo o lo confirma explícitamente — nunca commitear/pushear sin pedido explícito.

### Model Summary

- Tarea #14 (Recuperación de contraseña: backend .NET + frontend Angular + Postman) completa y verificada de forma independiente — 108/108 tests backend, 108/108 tests frontend, verificación end-to-end real (curl + Chrome). SIN COMMITEAR a propósito.
- `docs/tasks.md` renumerado otra vez: #14 Recuperación de contraseña (nueva), #15 Refactor de copy (nueva), Docker Compose ahora #16, Render #17, C4 #18, Cierre #19.
- Decisiones de seguridad clave: hash SHA-256 del token de reseteo, anti-enumeración absoluta (mismo status+body siempre), token nunca en el body HTTP (solo logueado server-side en Development), invalidación de JWT anterior fuera de alcance (no hay mecanismo de revocación en el proyecto).
- Colección de Postman sincronizada (archivo local + workspace remoto vía MCP) con los 2 endpoints nuevos.
- **Incidente operativo importante**: un subagente aplicó la regla de "delegar código" recursivamente sobre sí mismo (fork→fork→fork), quedando los tres bloqueados esperándose sin escribir nada — el usuario lo detectó y se corrigió. Ahora es una regla explícita guardada en memoria: cada prompt a un subagente debe prohibirle delegar más.
- Hallazgo pendiente sin resolver: `git status`/`git log` fallan con `Operation not permitted` en el sandbox Bash de esta sesión (el archivo en sí está bien, se lee normal con `Read`) — no bloqueó el trabajo (se verificó todo con `dotnet test`/`npx ng test`/`find`/`Read`), pero hay que revisarlo en la próxima sesión.
- Quedaron corriendo en background un `dotnet run` (:5282) y un `ng serve --port 4300` de verificaciones de esta sesión — revisar/matar si ya no se usan.
- Próximo paso natural: decidir commit, luego Tarea #15 (refactor de copy), luego Docker Compose/Render/C4/Cierre.

### Handoff Context (paste into next session)

Retomas "Polla Mundialista". La Tarea #14 (Recuperación de contraseña: backend .NET + frontend Angular + sync de Postman) está 100% completa y verificada de forma independiente (108/108 tests backend, 108/108 frontend, verificación end-to-end real con curl+Chrome) pero **SIN COMMITEAR** — pregunta primero al usuario si quiere commitear antes de seguir. `docs/tasks.md` se renumeró de nuevo: la #15 (refactor de copy de interfaz, diseño ya en `design.md` §5.2) es el siguiente paso natural tras el commit; Docker Compose/Render/C4/Cierre pasaron a #16-#19. Antes de nada: (1) relee `docs/tasks.md` completo para confirmar numeración vigente; (2) corre `dotnet test backend/PollaMundialista.sln` (espera 108/108) y `cd frontend && npx ng test --watch=false` (espera 108/108); (3) revisa si `git status`/`git log` siguen fallando con `Operation not permitted` en `.git/config` (problema puntual de sandbox detectado en la sesión anterior, no del repo — si persiste, puede requerir que el usuario revise permisos de Xcode CLT/Full Disk Access); (4) revisa con `lsof -iTCP:4300 -sTCP:LISTEN`/`:5282` si quedaron procesos `dotnet run`/`ng serve` corriendo de sesiones anteriores antes de levantar nuevos. Regla operativa crítica ahora vigente: TODO prompt a un subagente que escriba código debe decirle explícitamente que no delegue a otro subagente/fork (ver memoria global `feedback_no_nested_delegation.md`) — ya causó un bloqueo real de ~13 min y 144k+ tokens en la sesión anterior. Sigue usando CodeGraph (`codegraph_explore`) antes de grep/Read. No toques `AI_LOG.md` salvo pedido explícito. No commitees/pushees sin pedido explícito.

---

## Handoff: 2026-09-27 (2) — Frontend completo (Tareas #10-13) y commiteado

### Current Task State

**Todo el frontend planeado está completo, verificado y COMMITEADO** (commit `3b2e972`, "feat: add admin panel for match results management" — el mensaje solo menciona Admin pero el commit real incluye también Leaderboard, Historial y el fix de logout). `git status` está limpio, no hay nada pendiente de commitear. Backend (#1-9) y Frontend (#10-13) completos: **85/85 tests backend, 48/48 tests frontend**, ambos verificados de forma independiente (no solo por reporte de subagente) incluyendo navegación real en Chrome. Próximo paso: Tarea #14 (Docker Compose) — todavía no empezada.

### Key Decisions (acumulado, ver también la entrada anterior de este log)

- Todo lo de la entrada anterior sigue vigente (stack, Neon, Tailwind, BehaviorSubject, Vitest, puerto 4200 ocupado, reglas de `AI_LOG.md`/`CLAUDE.md`/Postman, patrón de delegar+verificar).
- **Bug real encontrado y arreglado durante la Tarea #11**: los 4 Controllers (`Auth`, `Predictions`, `Admin`, `Leaderboard`) serializaban enums (`role`, `group`) como número en vez de string, porque `ConfigureHttpJsonOptions` (Minimal API) no aplica a `AddControllers()` (MVC) — son configuraciones separadas en ASP.NET Core. Esto rompía silenciosamente `adminGuard` en el frontend. Arreglado en `Program.cs` con `.AddJsonOptions(JsonStringEnumConverter)` en `AddControllers()`, y corregidos los tests que sin querer dependían del bug (`TestAuthHelper.JsonOptions` ahora centralizado).
- **Bug real encontrado y arreglado durante la Tarea #13**: `AuthService.logout()` limpiaba la sesión pero no navegaba — el usuario quedaba "colgado" en la pantalla actual porque los guards de Angular solo corren al activar una ruta nueva. Arreglado inyectando `Router` en `AuthService` y llamando `router.navigateByUrl('/login')` dentro de `logout()` (fix centralizado, no hubo que tocar cada componente).
- **Angular 22 es zoneless** (sin zone.js) — mutar campos planos de objetos dentro de un array respaldado por un signal NO dispara detección de cambios tras una respuesta HTTP async; hay que reemplazar la referencia del array/objeto completo (patrón `notifyChanged()`/`notifyGroupsChanged()` usado en `predictions.ts` y `admin-matches.ts`). Los tests unitarios NO detectan este bug (TestBed fuerza `detectChanges()`), solo la verificación manual en navegador real lo revela.
- **Leaderboard sin caché**: `LeaderboardService.getLeaderboard()` es un `http.get` plano sin `shareReplay`, para que cada visita a `/leaderboard` traiga datos frescos tras un recálculo de Admin — verificado en vivo (guardé un resultado como Admin, volví a `/leaderboard` como User, el ranking cambió sin ningún paso extra).
- El frontend NO reordena el leaderboard client-side — confía en el orden que ya aplica el backend (puntos desc → exactos desc → email asc, `design.md` §7).

### Modified/Created Files (todo YA commiteado en `3b2e972`)

- `backend/src/PollaMundialista.Api/Program.cs`, varios archivos de `backend/tests/PollaMundialista.IntegrationTests/` (fix de enums, de la entrada anterior de este log — commiteado en un commit previo, verificar con `git log` si hace falta el hash exacto).
- `frontend/src/app/admin/admin-matches/` (Tarea #12, completo).
- `frontend/src/app/leaderboard/leaderboard/` (Tarea #13).
- `frontend/src/app/predictions/history/` (Tarea #13, historial personal).
- `frontend/src/app/core/models/leaderboard.models.ts`, `frontend/src/app/core/services/{admin.service.ts, leaderboard.service.ts}`.
- `frontend/src/app/core/services/auth.service.ts` (fix de logout — inyecta `Router`, navega a `/login`).
- `frontend/src/app/app.routes.ts` (rutas `/admin`, `/leaderboard`, `/history`, todas con `authGuard`/`adminGuard` según corresponda).
- `frontend/src/app/predictions/predictions/predictions.html` (nav con links a Panel Admin condicional + Leaderboard/Mi Historial siempre visibles).

### Blockers / Open Questions

- Ninguno técnico. Todo verde y commiteado.
- Como siempre: **releer `docs/tasks.md` antes de asumir el número/alcance de la próxima tarea** — ya se renumeró una vez en esta sesión.

### Next Steps

1. **Tarea #14 — Orquestación Local (Docker Compose)**: `docker-compose.yml` en la raíz (postgres, api, frontend), `Dockerfile` por servicio, migraciones automáticas al iniciar `api`. Ojo: el usuario decidió explícitamente NO usar Docker en esta máquina (usa Neon remoto) — confirmar con el usuario el alcance real de esta tarea antes de asumir que hay que levantar contenedores localmente para verificarla; puede que solo haga falta que el `docker-compose.yml`/Dockerfiles queden bien escritos y documentados, sin verificación local con Docker real.
2. **Tarea #15 — Despliegue en Render.com**.
3. **Tarea #16 — Diagrama de Arquitectura C4** (ya hay fuente Mermaid en `docs/design.md` §2, falta exportarlo/generarlo como entregable final).
4. **Tarea #17 — Cierre de Documentación** (`AI_LOG.md` — recordar que el usuario lo llena manualmente, no tocarlo de más —, `README.md`, `.claude/`).

### Critical Context

- Todo lo de la entrada anterior de este log sigue aplicando (releer si hace falta contexto de Tareas #1-11).
- El repo tiene git+remoto y el usuario commitea él mismo cuando se lo confirmas — sigue sin inicializar/pushear nada sin pedido explícito.
- Credenciales de prueba ya sembradas en Neon: Admin real `admin@pollamundialista.com` / `Admin123!`. Hay además varios usuarios de prueba creados durante las verificaciones manuales de las Tareas #11-13 (emails tipo `*-test-*@test.com`/`@example.com`) con predicciones y resultados reales cargados — el leaderboard real en Neon ya NO está vacío, tiene datos de prueba mezclados. Si se necesita un estado "limpio" para una demo, avisar al usuario antes de borrar nada de la base real.

### Model Summary

- Backend (.NET 10, Clean Architecture, Mediator, JWT, EF Core+Neon) y Frontend (Angular 22 standalone + Tailwind) completos: Tareas #1-13 de `docs/tasks.md`, TODO commiteado (`3b2e972` es el HEAD actual), `git status` limpio.
- 85/85 tests backend, 48/48 tests frontend — ambos verificados de forma independiente por el orquestador (no solo confiando en reportes de subagentes), incluyendo navegación real en Chrome para cada pantalla (login, predicciones, admin, leaderboard, historial).
- Dos bugs reales encontrados y arreglados durante la verificación manual (no los detectaron los tests automatizados): (1) enums serializados como número en los Controllers, rompía `adminGuard`; (2) `logout()` no redirigía a `/login`. Ambos root-caused y corregidos correctamente, no parcheados superficialmente.
- Patrón operativo consolidado: delegar código a subagentes vía `Agent` tool, verificar SIEMPRE de forma independiente (build/test propios, lectura de código clave, navegador real para UI vía `claude-in-chrome`, puerto 4300 para `ng serve` — el 4200 está ocupado por una app ajena en esta máquina, nunca tocarla).
- CodeGraph (`codegraph_explore`) es obligatorio antes de grep/Read, por regla de `CLAUDE.md` del proyecto.
- `AI_LOG.md` ya no se actualiza automáticamente (solo `/log-prompt` o pedido explícito); la colección de Postman debe mantenerse sincronizada (archivo + MCP `postman`) si cambia algún contrato de endpoint durante las tareas restantes.
- La base de datos real en Neon (`polla_mundialista`) ya tiene datos de prueba mezclados (usuarios, predicciones, resultados) de las verificaciones manuales — no es una base "limpia".
- Próximas tareas: #14 Docker Compose (confirmar alcance dado que no se usa Docker local en esta sesión), #15 Render, #16 diagrama C4, #17 cierre de documentación.

### Handoff Context (paste into next session)

Retomas "Polla Mundialista". Backend (#1-9) y Frontend (#10-13) están 100% completos, verificados y COMMITEADOS (`git log` HEAD = `3b2e972`, `git status` limpio — no hay nada pendiente). 85/85 tests backend, 48/48 tests frontend. Antes de nada: (1) relee `docs/tasks.md` completo (la numeración se ajustó a mitad de la sesión anterior, la próxima tarea natural es la #14, Docker Compose — confirma el número exacto); (2) corre `dotnet test backend/PollaMundialista.sln` y `cd frontend && npx ng test --watch=false` para confirmar que sigue todo verde; (3) para la Tarea #14 (Docker Compose), ten en cuenta que el usuario decidió NO usar Docker en esta máquina (usa Neon remoto para todo) — pregúntale explícitamente el alcance esperado antes de asumir que hay que levantar y probar contenedores localmente. Sigue el patrón ya establecido: todo código nuevo se delega a un subagente (`Agent` tool) y tú verificas independientemente después (build/test propios, lectura de archivos clave, y para UI, navegador real vía herramientas `claude-in-chrome` — usa `ng serve --port 4300`, NUNCA el puerto 4200, ocupado por una app ajena real en esta máquina). Usa CodeGraph (`codegraph_explore`) antes de grep/Read, por regla del `CLAUDE.md` del proyecto. La base Neon real ya tiene datos de prueba mezclados de sesiones anteriores (usuarios, predicciones, resultados) — no asumas que está "limpia". No toques `AI_LOG.md` salvo pedido explícito. No inicialices git/hagas push sin pedido explícito.

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

---

## Handoff: 2026-09-27T14:19:11.591Z (auto-saved before compaction)

### Compaction Snapshot

- Trigger: opencode session compaction
- Last user message:
  (unavailable)

- Last assistant message:
  (unavailable)

### Git Snapshot

- Branch: main
- Status (actualizado al cierre del rediseño, todo sin commitear):
  M docs/design.md
   M docs/handoff/HANDOFF.md
   M docs/tasks.md
   M frontend/src/app/admin/admin-matches/admin-matches.css
   M frontend/src/app/admin/admin-matches/admin-matches.html
   M frontend/src/app/admin/admin-matches/admin-matches.spec.ts
   M frontend/src/app/admin/admin-matches/admin-matches.ts
   M frontend/src/app/app.config.ts
   M frontend/src/app/core/models/predictions.models.ts
   M frontend/src/app/leaderboard/leaderboard/leaderboard.html
   M frontend/src/app/leaderboard/leaderboard/leaderboard.spec.ts
   M frontend/src/app/leaderboard/leaderboard/leaderboard.ts
   M frontend/src/app/predictions/history/history.html
   M frontend/src/app/predictions/history/history.spec.ts
   M frontend/src/app/predictions/history/history.ts
   M frontend/src/app/predictions/predictions/predictions.css
   M frontend/src/app/predictions/predictions/predictions.html
   M frontend/src/app/predictions/predictions/predictions.spec.ts
   M frontend/src/app/predictions/predictions/predictions.ts
  ?? .codegraph/      (apareció durante la sesión; NO tocar sin pedido del usuario)
  ?? .vscode/         (idem: auto-approve del CLI codegraph)
  ?? frontend/src/app/core/components/   (navbar nuevo)
- Recent commits:
  8d47bfb feat(auth): enhance login and register forms with improved UI and accessibility
  3b2e972 feat: add admin panel for match results management
  6de9f32 feat: add handoff log for Polla Mundialista project with current task state and key decisions
  127ec56 feat: add role guard and admin guard for route protection
  5bba65c feat: integrate Swagger for API documentation and add tests for OpenAPI compliance

### Model Summary

- Rediseño premium "Sports & Tournament Dashboard" **completo y verificado** en las 4 pantallas internas, con navbar compartido. El tema oscuro dejó de ser solo de Auth: ahora las 6 pantallas de la app usan el mismo sistema visual.
- Decisiones confirmadas por el usuario: migrar **las 4 pantallas + navbar unificado**, navegación por **pestañas Grupo A / Grupo B con A por defecto**, e **identidad de equipo por bandera emoji**.
- Nuevo `core/components/navbar/` (sticky, estado activo con `isActiveChange` → signal, link Admin solo para rol Admin, logout vía `AuthService`). Va **dentro del template de cada pantalla** y no en `app.html`, a propósito: los tests consultan links con `fixture.nativeElement` y el DOM de un hijo cae dentro del host.
- Predicciones: `activeGroup` signal + `visibleMatches` computed, tabs con el patrón ARIA completo (flechas ← →, Home/End), cards con fecha/resultado/badge de puntos, fila VS con inputs de 56×48 y feedback de guardado animado con `@keyframes` en `predictions.css`.
- Banderas: `TEAM_FLAGS` + `teamFlag()`/`teamInitials()` en `core/models/predictions.models.ts`, matching normalizado con NFD ("Países Bajos" = "Paises Bajos") y fallback a iniciales; ahora toleran `null`/`undefined` sin romper.
- **Bug real encontrado y corregido**: el botón "Guardar predicción" había quedado fuera de su `<form>` en el rediseño, así que nunca disparaba `ngSubmit` (0 requests de red). Los tests no lo detectaban porque llamaban `component.submit(vm)` en vez de clickear el DOM. Corregido y cubierto con un test de regresión que clickea el botón renderizado.
- Fechas en español: `registerLocaleData(localeEs)` + `LOCALE_ID: 'es'` en `app.config.ts`, y formato `d MMM y, HH:mm` (el `medium` de Angular agregaba segundos de más).
- Contraste **medido sobre el render real**, no estimado: el texto blanco sobre `emerald-600` da 3.65:1 y no cumple AA, por eso toda acción primaria usa `bg-emerald-700`; el texto nunca baja de `text-slate-400`. 0 fallos WCAG en las 4 pantallas.
- Verificación real con Chrome/CDP: tabs por click y teclado, navbar sticky al scrollear, guardado real contra la API (POST → feedback + badge actualizado), sin errores de consola y sin overflow horizontal a 390px en las 4 pantallas. El guardado de Admin se verificó interceptando la respuesta con `Fetch.fulfillRequest`, **sin escribir en la DB sembrada**.
- Tests: 48 → **87 en 16 archivos, todos verdes**; `ng build` sin warnings; Prettier OK. Ningún test existente fue borrado ni debilitado.
- `docs/design.md` §5.1 reescrito y ADR #10 revertido formalmente (oscuro solo en Auth → oscuro en toda la app).
- Todo el rediseño está **sin commit**. `.codegraph/` (4.3 MB) y `.vscode/` aparecieron como untracked durante la sesión y no se tocaron.

### Handoff Context (paste into next session)

- El rediseño está terminado y verificado; lo único que falta es commit, y solo si el usuario lo pide.
- Verificar antes de dar cualquier cosa por buena: `cd frontend && npx ng test --watch=false` (esperar 87/87 en 16 archivos), `npx ng build` y `npx prettier --check "src/app/**"`.
- Para levantar: backend en `dotnet run --project src/PollaMundialista.Api` (5282) y frontend en `npx ng serve --port 4300`. El 4200 está ocupado por otra app: no lo tocar.
- Usar siempre `http://localhost:4300` (nunca `127.0.0.1`): el CORS de `backend/src/PollaMundialista.Api/Program.cs` está hardcodeado a `localhost:4200` y `localhost:4300`. Render y otros orígenes siguen bloqueados — es deuda conocida.
- CodeGraph: `.codegraph/` **ahora existe** (contrario al handoff anterior). No se reindexó ni se borró; preguntar al usuario antes de tocarlo.
- `AI_LOG.md` ya tiene la entrada `## 2026-09-27`; solo agregar otra con pedido explícito.
- La colección de Postman **no** se tocó: este rediseño es 100% frontend, sin cambios de contrato HTTP.
- No reintroducir: botón `type="submit"` dentro de su `<form>`; `notify…Changed()` en toda mutación de view model (zoneless); `teamFlag`/`teamInitials` tolerantes.
- Si se toca el tema, re-medir contraste con el helper CDP antes de dar por bueno un color: la conversión a sRGB tiene que componer alfa (un `globalCompositeOperation='copy'` rompe la medición y da falsos fallos).
- Siguiente trabajo grande del plan: Tarea #14, recuperación de contraseña (ya especificada en §7.2 y en tasks.md; ADR #11 y #12 la sostienen).
- Después siguen #15 Docker Compose, #16 Render, #17 diagrama C4 y #18 cierre.

---

---

## Handoff: 2026-09-27T16:30:09.843Z (auto-saved before compaction)

### Compaction Snapshot

- Trigger: opencode session compaction
- Last user message:
  (unavailable)

- Last assistant message:

  El archivo se lee bien (`read` y `head` funcionan), así que no es un permiso de archivo: es git blocked. Aíslo la causa:

### Git Snapshot

- (not a git repo)

### Model Summary

(TODO: rellenar tras la compactación — 8–12 bullets)

### Handoff Context (paste into next session)

(TODO: rellenar tras la compactación — 10–20 líneas de instrucciones concretas)

---
