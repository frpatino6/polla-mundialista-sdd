---
name: qa-harness
description: "Garantiza que la suite del harness de Polla Mundialista (seeder + ScoringEngine + integración) siga en verde. Actívala en la Tarea #1 y antes de aceptar cualquier tarea de Domain/Application/Infrastructure/API o frontend posterior que dependa del harness."
---

# QA del test harness

Verifica que el harness de pruebas definido en la Tarea #1 de `docs/tasks.md` (seeder de 12 partidos + `ScoringEngine` + integración HTTP) siga en verde antes de que avance cualquier tarea de producción posterior. El harness define el contrato ejecutable (DTOs, rutas, códigos de estado) que las capas de producción implementan — si está en rojo, ninguna tarea posterior tiene una base confiable.

## Cuándo activarla

- En la Tarea #1 misma, para validar que el harness quedó correctamente construido.
- Antes de aceptar como completa cualquier tarea de `docs/tasks.md` (Tarea #2 en adelante) que dependa del harness, es decir, toda tarea de Domain/Application/Infrastructure/API o frontend.
- Al revisar un cambio que toca `ScoringEngine`, el seeder, o `docs/fixtures/matches-seed.json`.

## Qué debe verificar

- **Casos borde de puntuación** (`docs/spec.md` §7), todos con test explícito:
  - Marcador exacto predicho e igual al real → 3 pts.
  - Empate exacto predicho y ocurrido → 3 pts.
  - Empate predicho con marcador distinto al real, pero real también empate → 1 pt.
  - Acierto de signo (local/visitante/empate) sin marcador exacto → 1 pt.
  - Predicción de signo incorrecto → 0 pts.
  - Resultado real aún no cargado → predicción en estado `Pendiente`, 0 puntos, no se computa como fallo.
  - Recálculo tras corrección de un resultado ya cargado → los puntos se sobrescriben, no se acumulan (idempotencia).
- **Invariantes del seeder**: exactamente 12 partidos, 6 por grupo `A` y 6 por grupo `B`, sin duplicados, sin `RealHomeScore`/`RealAwayScore` precargados. `docs/fixtures/matches-seed.json` es la única fuente de datos — cualquier fixture paralelo es un hallazgo a reportar.
- **Contrato HTTP mínimo**: el flujo `POST /api/predictions` → `PUT /api/admin/matches/{id}/result` → `GET /api/leaderboard` se ejercita end-to-end vía `WebApplicationFactory` + SQLite in-memory, sin Docker ni PostgreSQL.

## Procedimiento

1. **Antes de aceptar una tarea:** ejecuta la suite completa y confirma que corre sin infraestructura externa levantada.
2. **Si está en verde:** la tarea de producción puede darse por aceptada en lo que respecta al harness; documenta el resultado.
3. **Si está en rojo:** bloquea el avance de la tarea de producción que dependía del harness y reporta el fallo con ubicación y evidencia (test, mensaje, stack). No parchees el harness para que pase artificialmente (ej. relajar una aserción o eliminar un caso borde) — el harness es la especificación ejecutable; ajustarlo sin justificación de negocio invalida el contrato para el resto de las tareas.
4. **Si el fallo es preexistente o externo** (dependencia ausente, entorno incompleto): repórtalo como bloqueo separado del cambio bajo revisión, sin ampliar el alcance para arreglarlo sin autorización.

## Comando de ejecución

```sh
dotnet test backend/PollaMundialista.sln
```

Debe correr en verde sin Docker ni PostgreSQL levantados (EF Core InMemory/SQLite in-memory).

## Checklist breve

- [ ] Los 6 casos borde de puntuación de `docs/spec.md` §7 tienen test explícito y pasan.
- [ ] El seeder carga exactamente 12 partidos, 6 por grupo, sin duplicados ni resultados precargados.
- [ ] El flujo HTTP predicción → resultado → leaderboard se ejercita end-to-end sin infraestructura externa.
- [ ] `dotnet test backend/PollaMundialista.sln` corre en verde.
- [ ] Si algo falla, la tarea de producción dependiente queda bloqueada y reportada, no el harness relajado.
