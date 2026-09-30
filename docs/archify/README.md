# Diagramas generados con Archify

Carpeta exploratoria: los 5 tipos de diagrama que soporta [Archify](https://github.com/tt-a1i/archify), todos generados a partir de evidencia real del código de este repo (no inventados), verificados con los 4 gates automáticos de la skill (`validate`/`deliver`/`check`/`browser-check`).

Esto es adicional al esquema de arquitectura (C4) y de base de datos (ERD) ya entregados en [`docs/architecture/`](../architecture/), hechos con Mermaid — quedan ambos como referencia para comparar los dos enfoques.

| Archivo | Tipo | Qué muestra |
|---|---|---|
| [`architecture-backend-clean-architecture.html`](./architecture-backend-clean-architecture.html) | architecture | Arquitectura interna del backend .NET (Clean Architecture): las 4 capas (Domain, Application, Infrastructure, Api), los Controllers despachando vía `IMediator` (Mediator, no MediatR), el patrón CQRS con sus puertos, y las implementaciones concretas sobre Postgres/Neon |
| [`architecture-despliegue-render.html`](./architecture-despliegue-render.html) | architecture | Despliegue real en Render.com: SPA (Static Site) + API (Web Service) + Neon externo |
| [`workflow-recuperacion-password.html`](./workflow-recuperacion-password.html) | workflow | Recuperación de contraseña de punta a punta, con las 3 razones de rechazo (token inválido/expirado/consumido) |
| [`sequence-recalculo-puntos.html`](./sequence-recalculo-puntos.html) | sequence | Admin carga resultado → recálculo de puntos vía Mediator → `ScoringEngine` |
| [`dataflow-siembra-partidos.html`](./dataflow-siembra-partidos.html) | dataflow | `matches-seed.json` → `MatchSeedLoader` → `MatchConfiguration.HasData` → tabla `Matches` en Neon |
| [`lifecycle-token-reseteo.html`](./lifecycle-token-reseteo.html) | lifecycle | Ciclo de vida del `PasswordResetToken`: creado → válido → consumido/expirado, con el guard de un solo uso |

Cada HTML es autocontenido e interactivo (abrir directamente en el navegador) — incluye export a PNG/JPEG/WebP/SVG/WebM desde el propio visor.
