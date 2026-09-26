---
name: architect
description: "Diseña, implementa, revisa o refactoriza el backend de Polla Mundialista. Actívala para cambios de Domain, Application, Infrastructure o API, decisiones de Clean Architecture y SOLID, análisis de dependencias, casos de uso, persistencia o pruebas de arquitectura."
---

# Arquitectura del backend

Ayuda a implementar y revisar cambios del backend de Polla Mundialista manteniendo Clean Architecture y SOLID de forma pragmática. Usa `docs/design.md` y `docs/tasks.md` como contexto del proyecto; no los dupliques ni los cambies salvo petición explícita.

## Cuándo activarla

- Al añadir o modificar entidades, reglas, casos de uso, repositorios, persistencia, endpoints o composición de dependencias.
- Al revisar un diff o investigar una violación de límites, acoplamiento, responsabilidades o cobertura de pruebas.
- Al refactorizar backend existente sin cambiar su comportamiento o contratos intencionadamente.

El frontend Angular y la operación de PostgreSQL quedan fuera del alcance, excepto al preservar o explicar contratos HTTP consumidos por el frontend.

## Límites que debes preservar

| Proyecto | Responsabilidad y dependencias permitidas |
|---|---|
| `PollaMundialista.Domain` | Entidades, value objects, invariantes y servicios de dominio puros. No depende de otros proyectos, EF Core, HTTP ni infraestructura. |
| `PollaMundialista.Application` | Commands, Queries, Handlers, puertos de repositorio, DTOs y behaviors. Depende de Domain y usa `Mediator.SourceGenerator`. No conoce EF Core ni controllers. |
| `PollaMundialista.Infrastructure` | Implementa persistencia, `AppDbContext`, configuraciones EF Core, repositorios e integraciones. Depende de Application/Domain; usa EF Core y Npgsql. |
| `PollaMundialista.Api` | HTTP, controllers, middleware y configuración. Depende de Application; la referencia a Infrastructure se limita al composition root (`Program.cs`). Los controllers envían requests por `IMediator`. |

Las dependencias apuntan hacia Domain. No muevas reglas de negocio a API o Infrastructure para facilitar una implementación concreta. No introduzcas un repositorio genérico si los puertos específicos existentes expresan mejor las necesidades de los casos de uso.

## Principios prácticos

- **SRP:** cada Handler, entidad, servicio y componente de infraestructura tiene una responsabilidad coherente. Mantén delgados los controllers.
- **OCP:** extiende comportamiento mediante contratos y composición existentes cuando haya una variación real; evita diseñar puntos de extensión hipotéticos.
- **LSP:** las implementaciones respetan las precondiciones, resultados y errores del contrato; no hagas que un mock o adaptador cambie su significado.
- **ISP:** define interfaces pequeñas y orientadas al consumidor, especialmente puertos de repositorio de Application.
- **DIP:** Application depende de abstracciones propias; Infrastructure las implementa y el composition root conecta implementaciones.
- Prefiere la solución más simple que mantenga los límites. No añadas capas, interfaces, factories, wrappers o genéricos sin una necesidad demostrable.

## Procedimiento

1. **Antes de cambiar:** identifica el comportamiento o hallazgo, el proyecto propietario y el contrato afectado. Lee las implementaciones y pruebas cercanas, además de las secciones relevantes de `docs/design.md` y `docs/tasks.md`. Comprueba las referencias entre proyectos antes de proponer cambios.
2. **Durante la implementación:** coloca cada regla en su capa; conserva las APIs públicas salvo que el requisito exija cambiarlas. Los casos de uso se expresan como Command/Query y Handler de Mediator. Los controllers solo traducen HTTP/DTO, despachan mediante `IMediator.Send` y traducen el resultado a HTTP. Añade o adapta pruebas junto con cada cambio.
3. **Durante la revisión/refactorización:** sigue el flujo desde controller a Handler, puertos y adaptadores concretos; verifica quién conoce a quién y dónde se decide el comportamiento. Reporta primero defectos concretos con ubicación, impacto y evidencia. Separa observaciones de preferencias de estilo y no cambies código que no sea necesario para resolver el alcance.
4. **Después:** revisa el diff para confirmar que solo incluye el alcance pedido y que las pruebas cubren el comportamiento nuevo y sus límites relevantes. Ejecuta las validaciones siguientes y comunica claramente resultados, fallos previos y bloqueos externos.

## Reglas de dominio del proyecto

- Las reglas son puras y viven en Domain. `ScoringEngine` asigna 3 puntos al marcador exacto, 1 al signo correcto y 0 en otro caso.
- Una predicción no puede modificarse una vez alcanzado `KickoffAt`; valida esa regla en el caso de uso y cúbrela con pruebas.
- Recalcular puntos con el mismo resultado debe ser idempotente; corregir un resultado debe actualizar los puntos derivados.
- `docs/fixtures/matches-seed.json` es la fuente única de partidos de prueba/seed. No copies sus datos a fixtures paralelos.
- El backend y sus proyectos usan `net10.0`. Mantén coherentes las versiones de paquetes de EF Core, Npgsql y ASP.NET Core Testing con el estado actual de la solución; no rebajes el target framework por conveniencia.

## Pruebas y validación

- **Domain:** pruebas unitarias puras de reglas e invariantes.
- **Application:** xUnit con Moq para Handlers, simulando puertos y sin levantar EF Core ni Mediator completo; cubre límites temporales, errores y efectos relevantes.
- **API/integración:** `WebApplicationFactory` con SQLite in-memory para ejercitar el comportamiento HTTP sin PostgreSQL ni Docker. Conserva los contratos de rutas, DTOs y estados HTTP.
- Ejecuta desde la raíz, si el entorno lo permite:

```sh
dotnet test backend/PollaMundialista.sln
dotnet build backend/PollaMundialista.sln
```

Si una validación falla, distingue los errores causados por el cambio de fallos preexistentes, dependencias ausentes o servicios externos no disponibles. Informa estos últimos como hallazgos o bloqueos; no amplíes el alcance para arreglarlos sin autorización.

## Checklist breve

- [ ] Cada cambio está en su capa; Domain no tiene dependencias externas.
- [ ] Application usa puertos propios; Infrastructure implementa esos puertos.
- [ ] API solo coordina HTTP y Mediator; Infrastructure solo se conecta en composition root.
- [ ] SOLID se aplica para resolver una necesidad real, sin abstracciones innecesarias.
- [ ] Reglas, errores y contratos relevantes tienen pruebas adecuadas.
- [ ] `dotnet test` y `dotnet build` se ejecutaron o sus bloqueos quedaron reportados.