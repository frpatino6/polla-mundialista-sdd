---
name: code-reviewer
description: "Revisa PRs o diffs de Polla Mundialista contra las convenciones del repo. Actívala antes de mergear cambios de backend (.NET) o frontend (Angular): naming, manejo de errores, cobertura de pruebas asociadas, formato de commits y actualización de AI_LOG.md."
---

# Revisión de código

Ayuda a revisar diffs y PRs de Polla Mundialista verificando convenciones, calidad y cobertura de pruebas — no la arquitectura en sí. Usa `docs/tasks.md` para ubicar los criterios de aceptación de la tarea que originó el cambio y `docs/design.md` como referencia de contratos (rutas, DTOs, capas).

## Cuándo activarla

- Al revisar un diff o PR antes de mergear, en backend o frontend.
- Al cerrar una tarea de `docs/tasks.md` (Tarea #5 en adelante) para confirmar que el entregable cumple sus criterios de aceptación.
- Al revisar la documentación de cierre (Tarea #16: `AI_LOG.md`, `README.md`, `.claude/`).

Las violaciones de límites de Clean Architecture (capas, dependencias, DIP) no se resuelven aquí: repórtalas y delega la decisión al agente `architect`. El foco de esta skill es convenciones, calidad y pruebas, no el diseño arquitectónico.

## Qué revisar

- **Naming y convenciones C#/.NET**: PascalCase en tipos/métodos/propiedades públicas, camelCase en variables locales y parámetros, sufijos consistentes (`Command`, `CommandHandler`, `Query`, `QueryHandler`, `Dto`, `Repository`). Nulabilidad y async/await correctos (`Async` en métodos asíncronos).
- **Naming y convenciones Angular/TypeScript**: componentes standalone agrupados por feature, sufijos `.component.ts`/`.service.ts`/`.routes.ts`, uso de `signal`/RxJS consistente con el resto del feature, sin lógica de negocio filtrada al componente que debería vivir en un servicio.
- **Manejo de errores**: los Handlers de Application devuelven `Result`/DTO de error explícito en vez de lanzar excepciones para flujos esperados (ej. predicción tras kickoff); los Controllers traducen esos resultados al código HTTP correcto (`400`/`403`/`409`) sin exponer detalles internos ni stack traces.
- **Cobertura de pruebas**: cada cambio de producción trae pruebas que cubren su criterio de aceptación en `docs/tasks.md`.
  - Backend: xUnit + Moq para Handlers (sin EF Core ni Mediator completo); `WebApplicationFactory` + SQLite in-memory para el contrato HTTP.
  - Frontend: Karma/Jasmine o Jest para componentes y guards.
  - Si el cambio toca el algoritmo de puntuación o el seeder, verifica que los casos borde de `docs/spec.md` §7 sigan cubiertos.
- **Commits**: formato `feat(scope): descripción` / `test(scope): descripción` / `docs(scope): descripción`, uno o más commits progresivos por tarea; el `scope` identifica la capa o feature afectada.
- **`AI_LOG.md`**: si el cambio involucró un prompt complejo (diseño de algoritmo, resolución de bug no trivial), confirma que se registró vía `/log-prompt` (`.claude/commands/log-prompt.md`, ver `docs/design.md` §11). El comando no se autoinvoca (`disable-model-invocation: true`): es responsabilidad del desarrollador dispararlo, así que si falta la entrada, señálalo como hallazgo y pide que se ejecute antes de cerrar la tarea.

## Procedimiento

1. **Antes de revisar:** identifica la tarea de `docs/tasks.md` que originó el diff y sus criterios de aceptación. Lee el diff completo, no solo el archivo modificado más grande.
2. **Durante la revisión:** recorre naming, manejo de errores, pruebas asociadas y commits en ese orden. Si detectas una violación de capas o dependencias, anótala como hallazgo separado y remite a `architect` en vez de bloquear la revisión por ese motivo.
3. **Después:** reporta hallazgos concretos con ubicación (`archivo:línea`), impacto y evidencia; separa defectos de preferencias de estilo. No reescribas código fuera del alcance del PR.

## Checklist breve

- [ ] Naming y convenciones consistentes con el resto del repo (backend y frontend).
- [ ] Manejo de errores traduce correctamente a códigos HTTP sin exponer detalles internos.
- [ ] El cambio trae pruebas que cubren su criterio de aceptación en `docs/tasks.md`.
- [ ] Mensajes de commit siguen el formato `tipo(scope): descripción`.
- [ ] `AI_LOG.md` actualizado (vía `/log-prompt`) si el cambio vino de un prompt complejo.
- [ ] Violaciones arquitectónicas (si existen) señaladas y delegadas a `architect`, no resueltas aquí.
