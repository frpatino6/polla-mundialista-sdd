# Polla Mundialista

Prueba técnica Bizagi: aplicación full-stack para registrar predicciones de marcador de 12 partidos de fútbol (2 grupos de 6), calcular puntos automáticamente y competir en un leaderboard global.

## Demo en vivo

| Servicio | URL |
|---|---|
| Frontend | https://polla-mundialista-frontend.onrender.com |
| Backend (API) | https://polla-mundialista-sdd.onrender.com |

> **Swagger UI no está disponible en producción a propósito** (`Program.cs` solo lo habilita bajo `Development`, ver §7.1 de `docs/design.md`) — para probarlo hay que correr el backend local (ver más abajo) y abrir `http://localhost:5282/swagger`. En producción, la API se explora con la [colección de Postman](./docs/postman/PollaMundialista.postman_collection.json) o el botón "Authorize" de Swagger local contra la misma base Neon.

**Credenciales de prueba:**

| Rol | Email | Password |
|---|---|---|
| Admin | `admin@pollamundialista.com` | `Admin123!` |
| User | `demo.user@pollamundialista.com` | `User123!` |

> **Nota:** ambos servicios están en el plan free de Render y "duermen" tras un período de inactividad. El primer request después de inactividad puede tardar 30-60 segundos en responder mientras el servicio despierta.

## Stack tecnológico

**Backend**
- .NET 10 (`net10.0`), Clean Architecture: `Domain` / `Application` / `Infrastructure` / `Api`
- CQRS con [Mediator](https://github.com/martinothamar/Mediator) (`Mediator.Abstractions` / `Mediator.SourceGenerator` 3.0.2) — no MediatR
- EF Core 10.0.12 + `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.3 contra Postgres (Neon serverless en producción)
- `FluentValidation` 12.1.1, `BCrypt.Net-Next` 4.2.0, JWT (`Microsoft.AspNetCore.Authentication.JwtBearer` 10.0.0 / `System.IdentityModel.Tokens.Jwt` 8.23.0)
- `Swashbuckle.AspNetCore` 8.1.4 (Swagger UI, solo en `Development`)

**Frontend**
- Angular 22 (standalone, zoneless, sin NgRx)
- Tailwind CSS 4
- Vitest para tests unitarios (no Karma)

**Auth**: JWT con roles `User` / `Admin`.

## Arquitectura

Diseño completo (Clean Architecture, modelo de datos, contrato de API, decisiones ADR) en [`docs/design.md`](./docs/design.md). Diagramas C4 (contexto, contenedores, componentes de la API) y el **esquema de la base de datos** (diagrama entidad-relación, verificado contra el esquema real en Neon) — fuente `.mmd` y exportados a `.svg`/`.png` — en [`docs/architecture/`](./docs/architecture/): [`erd.svg`](./docs/architecture/erd.svg) para el modelo de datos (base relacional Postgres), `c4-*.svg` para la arquitectura de contenedores/componentes.

Además, en [`docs/archify/`](./docs/archify/) hay 6 diagramas interactivos (HTML autocontenido, abrir directo en el navegador) generados con [Archify](https://github.com/tt-a1i/archify) a partir de evidencia real del código: arquitectura interna del backend (Clean Architecture), despliegue en Render, workflow de recuperación de contraseña, secuencia de recálculo de puntos, dataflow del seeder de partidos y ciclo de vida del token de reseteo — ver el detalle de cada uno en [`docs/archify/README.md`](./docs/archify/README.md).

## Cómo correr el backend localmente

Requiere el SDK de .NET 10 y acceso a una base Postgres (Neon remoto real u otro Postgres — el proyecto no fuerza Neon, solo fue la que se usó en desarrollo).

1. Configurar los secretos de usuario (no van en `appsettings.json`, que se deja vacío a propósito):

   ```bash
   cd backend/src/PollaMundialista.Api
   dotnet user-secrets set "ConnectionStrings:DefaultConnection" "<tu-connection-string-postgres>"
   dotnet user-secrets set "Jwt:Secret" "<una-clave-secreta-larga-aleatoria>"
   ```

2. Aplicar migraciones (crea el esquema y siembra los 12 partidos vía `HasData`, a partir de [`docs/fixtures/matches-seed.json`](./docs/fixtures/matches-seed.json)):

   ```bash
   dotnet ef database update --project backend/src/PollaMundialista.Infrastructure --startup-project backend/src/PollaMundialista.Api
   ```

   Si `dotnet-ef` no está instalado: `dotnet tool install --global dotnet-ef`.

3. Correr la API:

   ```bash
   dotnet run --project backend/src/PollaMundialista.Api
   ```

   Por defecto queda en `http://localhost:5282` (perfil `http` de `launchSettings.json`). En `Development`, Swagger UI está disponible en `http://localhost:5282/swagger`, con botón "Authorize" para JWT Bearer.

CORS en `Development` ya acepta `http://localhost:4200` y `http://localhost:4300` (ver `appsettings.Development.json`), así que ambos puertos del frontend funcionan sin configuración adicional.

## Cómo correr el frontend localmente

Requiere Node/npm (`packageManager: npm@11.19.0`).

```bash
cd frontend
npm install
npm start          # ng serve, puerto 4200 por defecto
```

Si el puerto 4200 está ocupado por otra aplicación, usa:

```bash
npx ng serve --port 4300
```

`ng serve` usa por defecto la configuración `development` de Angular (`angular.json`), que reemplaza `src/environments/environment.ts` por [`environment.development.ts`](./frontend/src/environments/environment.development.ts) — este último ya apunta a `http://localhost:5282`. Es decir, **no hace falta editar nada**: corriendo el backend local en el puerto por defecto, `npm start` se conecta a él automáticamente. El `environment.ts` (usado solo en build de producción) apunta a la API desplegada en Render.

## Cómo correr los tests

**Backend** (corren contra SQLite in-memory, no necesitan Postgres real):

```bash
dotnet test backend/PollaMundialista.sln
```

Proyectos de test: `backend/tests/PollaMundialista.UnitTests` y `backend/tests/PollaMundialista.IntegrationTests`.

**Frontend** (Vitest):

```bash
cd frontend
npx ng test --watch=false
```

## Despliegue en producción

- **Backend**: [`polla-mundialista-sdd.onrender.com`](https://polla-mundialista-sdd.onrender.com) — Render Web Service (Docker), conectado a Neon Postgres real.
- **Frontend**: [`polla-mundialista-frontend.onrender.com`](https://polla-mundialista-frontend.onrender.com) — Render Static Site.
- Ambos servicios tienen `autoDeploy` activado desde la rama `main` en GitHub.

## Documentación adicional

- [`docs/spec.md`](./docs/spec.md) — especificación funcional (qué construye el sistema).
- [`docs/design.md`](./docs/design.md) — diseño de arquitectura (cómo se construye: C4, modelo de datos, contrato de API, ADRs).
- [`docs/tasks.md`](./docs/tasks.md) — plan de tareas (metodología SDD).
- [`docs/postman/PollaMundialista.postman_collection.json`](./docs/postman/PollaMundialista.postman_collection.json) — colección Postman sincronizada con el contrato de API (endpoints contra `localhost`).
- [`AI_LOG.md`](./AI_LOG.md) — log de prompts complejos de IA usados durante el desarrollo, alimentado a demanda con el slash command [`.claude/commands/log-prompt.md`](./.claude/commands/log-prompt.md) (`/log-prompt`) cuando un prompt fue complejo (diseño de un algoritmo, resolución de un bug no trivial) — nunca automático.
- [`.claude/agents/`](./.claude/agents/) — subagentes documentados usados durante el desarrollo (`architect`, `frontend-expert`, `code-reviewer`, `qa-harness`).

## Roles y funcionalidades

La aplicación se organiza en cuatro módulos (ver detalle funcional completo en [`docs/spec.md`](./docs/spec.md)):

- **Auth**: registro e inicio de sesión con JWT; roles `User` y `Admin`.
- **Predicciones**: cada usuario registra/edita su predicción de marcador para cada uno de los 12 partidos mientras el partido no haya iniciado.
- **Admin**: panel para ingresar/editar los resultados reales de cada partido y disparar el recálculo de puntos (3 pts marcador exacto, 1 pt acierto de resultado, 0 pts predicción incorrecta).
- **Leaderboard / Historial**: tabla de posiciones global ordenada por puntos (con criterios de desempate) e historial de predicciones por usuario (el Admin puede ver las de todos).
