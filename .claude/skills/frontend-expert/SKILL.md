---
name: frontend-expert
description: "Implementa o revisa el SPA Angular standalone de Polla Mundialista (auth, predictions, admin, leaderboard). Actívala para las Tareas #9-#12 de docs/tasks.md: scaffolding, formularios de predicción, panel Admin y leaderboard/historial."
---

# Frontend Angular de Polla Mundialista

Ayuda a implementar y revisar el SPA Angular standalone de Polla Mundialista consumiendo el contrato de API definido en `docs/design.md` §7. Usa `docs/spec.md` y `docs/design.md` como contexto del proyecto; no los dupliques ni los cambies salvo petición explícita.

Esta skill es la capa de contexto específico de Polla Mundialista. Para patrones de implementación Angular (signals, forms, DI, routing, testing, etc.) remite a `.claude/skills/angular-developer/`; para scaffolding inicial del workspace a `.claude/skills/angular-new-app/`; para dirección visual a `.claude/skills/frontend-design/`. No reemplaza esas skills genéricas, las contextualiza.

## Cuándo activarla

- Al implementar o revisar las Tareas #9-#12 de `docs/tasks.md`: scaffolding + Auth, Predicciones, Panel Admin, Leaderboard/Historial.
- Al añadir o modificar componentes, servicios, guards, interceptores o rutas del SPA.
- Al verificar que el frontend respeta el contrato HTTP y las reglas de negocio definidas por el backend.

El backend .NET y la operación de PostgreSQL quedan fuera de alcance, salvo para preservar el contrato HTTP consumido (`docs/design.md` §7). Si detectas que ese contrato no coincide con lo que expone el backend, repórtalo como hallazgo y delega la decisión al agente `architect`.

## Estructura de features

- `core/`: `AuthInterceptor` (adjunta JWT a cada request), `AuthGuard`/`RoleGuard` (protección de rutas, incluida la de Admin), `ApiService` base.
- `auth/`, `predictions/`, `admin/`, `leaderboard/`: componentes standalone agrupados por feature, cada uno con sus propios componentes, servicios y rutas (`*.routes.ts`) cargadas vía lazy loading (`loadChildren`/`loadComponent`).
- No introduzcas una estructura de carpetas paralela ni un módulo NgModule clásico: el workspace es standalone-only.

## Principios prácticos

- **Estado**: RxJS + servicios con `BehaviorSubject`. No introduzcas NgRx u otra librería de estado — no se justifica por el tamaño del dominio (ver `docs/design.md` §5 y ADR #3 de §13).
- **Estilos**: Tailwind CSS o Angular Material, según lo que ya esté configurado en el workspace (`docs/design.md` §5); mantén consistencia con lo existente en vez de mezclar ambos sin necesidad.
- Prefiere la solución más simple que respete el contrato de API y las reglas de negocio. No añadas capas, wrappers o abstracciones sin una necesidad demostrable.

## Reglas de negocio del proyecto que debe respetar el frontend

- El formulario de predicción se deshabilita cuando `now >= partido.fechaHoraInicio` (`KickoffAt`); no dependas solo de la validación del backend, refleja el estado en la UI.
- El panel Admin solo es accesible con rol `Admin` (guard); un usuario `User` no debe poder navegar a esas rutas ni ver sus acciones en la UI.
- El leaderboard y el historial deben reflejar el recálculo de puntos inmediatamente después de que Admin actualiza un resultado, sin caché obsoleta del lado del cliente.
- Un `User` solo puede ver su propio historial; la UI no debe exponer rutas ni acciones para consultar el historial de otro usuario (eso es exclusivo de `Admin`).

## Procedimiento

1. **Antes de cambiar:** identifica la feature y el contrato de API involucrado (`docs/design.md` §7). Lee los componentes, servicios y specs cercanos antes de proponer cambios.
2. **Durante la implementación:** coloca cada componente/servicio en su feature; mantén los guards y el interceptor en `core/`. Añade o adapta specs junto con cada cambio.
3. **Durante la revisión:** verifica que el componente no contenga lógica de negocio que debería vivir en un servicio, que las rutas protegidas usen los guards correctos, y que el estado se sincronice tras acciones del Admin.
4. **Después:** revisa el diff para confirmar que solo incluye el alcance pedido y que las specs cubren el comportamiento nuevo. Comunica claramente resultados, fallos previos y bloqueos externos.

## Pruebas y validación

- Karma/Jasmine o Jest para componentes y guards, según lo que ya esté configurado en el workspace.
- `docs/fixtures/matches-seed.json` es la fuente única de partidos también en specs Angular — no la copies a un fixture paralelo, evita drift con el backend (`docs/design.md` §9).
- Para el detalle técnico de testing (TestBed, patrones async, `RouterTestingHarness`), consulta `.claude/skills/angular-developer/references/testing-fundamentals.md` y `references/router-testing.md` en vez de duplicarlo aquí.
- Verifica los criterios de aceptación de la tarea correspondiente en `docs/tasks.md` (Tareas #9-#12) antes de dar por cerrado un cambio.

## Checklist breve

- [ ] El componente/servicio vive en la feature correcta (`auth`/`predictions`/`admin`/`leaderboard`/`core`).
- [ ] No se introdujo NgRx ni una estructura de estado distinta a RxJS + `BehaviorSubject`.
- [ ] Las rutas de Admin están protegidas por guard; un `User` no puede acceder a ellas.
- [ ] El formulario de predicción refleja el bloqueo por `KickoffAt` en la UI.
- [ ] El leaderboard/historial no muestra datos obsoletos tras un recálculo.
- [ ] Specs Karma/Jest cubren el cambio y usan `matches-seed.json` como fixture cuando aplica.
