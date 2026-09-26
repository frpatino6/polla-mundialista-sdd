# Especificación Funcional — Polla Mundialista (Bizagi)

## 1. Resumen Ejecutivo

"Polla Mundialista" es una aplicación web donde usuarios registran predicciones de marcador para 12 encuentros de fútbol (2 grupos de 6 partidos), acumulan puntos según la precisión de su predicción frente al resultado real, y compiten en una tabla de posiciones global. Un rol Administrador carga los resultados reales y gatilla el recálculo de puntos.

Este documento define **qué** construye el sistema. La arquitectura y el **cómo** se documentan en [`docs/design.md`](./design.md). El desglose ejecutable en tareas ordenadas (metodología SDD) vive en [`docs/tasks.md`](./tasks.md).

## 2. Objetivo del Proyecto

Entregar, como prueba técnica, una aplicación full-stack (.NET 10 + Angular + PostgreSQL) construida con un flujo de desarrollo AI-First disciplinado: primero el harness de pruebas, luego la lógica de dominio, y por último la superficie de API/UI — con trazabilidad de las decisiones de IA en `AI_LOG.md` y un diagrama de arquitectura C4 como entregable final.

## 3. Alcance

### Incluido
- Autenticación JWT con dos roles: `User` y `Admin`.
- Carga precargada (seed) de 12 encuentros distribuidos en 2 grupos (6 partidos por grupo).
- Registro y edición de predicciones de marcador por usuario, mientras el partido no haya iniciado.
- Cálculo automático de puntos al ingresar el resultado real:
  - **3 pts**: marcador exacto (ej. predicho 2-1, real 2-1).
  - **1 pt**: acierto de resultado (ganador local, ganador visitante, o empate) sin marcador exacto.
  - **0 pts**: predicción incorrecta en resultado.
- Panel Admin para ingresar/editar resultados reales de cada partido y disparar el recálculo de puntos.
- Leaderboard global ordenado por puntos totales (con criterios de desempate).
- Historial de predicciones por usuario (propias; el Admin puede ver todas).
- Documentación: `AI_LOG.md`, diagrama C4, README de arranque local y de despliegue.

### Excluido (fuera de alcance para esta prueba técnica)
- Predicciones más allá de fase de grupos (octavos, cuartos, etc.).
- Sistema de pagos o premios.
- Notificaciones push/email.
- Internacionalización (i18n) — la app se entrega en español.
- Recuperación de contraseña vía email (puede quedar como mock o backlog).

## 4. Stack Tecnológico (confirmado)

| Capa | Tecnología |
|---|---|
| Backend | .NET 10 (C#, `net10.0`), Clean Architecture, 4 capas (Domain/Application/Infrastructure/API) |
| Frontend | Angular (standalone components), RxJS, Tailwind CSS o Angular Material |
| Base de datos (dev/prod) | PostgreSQL + Entity Framework Core |
| Base de datos (test harness) | EF Core InMemory Provider / SQLite in-memory |
| Testing backend | xUnit + Moq + `WebApplicationFactory` |
| Testing frontend | Karma/Jasmine o Jest |
| Orquestación local | Docker Compose |
| Despliegue cloud | Render.com |
| Repositorio | Monorepo único (`/backend`, `/frontend`, `/docs`, `/.claude`) |

## 5. Actores y Roles

| Rol | Descripción | Permisos clave |
|---|---|---|
| **User** | Usuario autenticado que participa en la polla | Registrar/editar sus predicciones (antes del kickoff), ver leaderboard, ver su propio historial |
| **Admin** | Administrador de la competencia | Todo lo anterior + ingresar resultados reales, disparar recálculo de puntos, ver historial de todos los usuarios |

## 6. Módulos Funcionales

### 6.1 Módulo 1 — Autenticación JWT y Roles

- Registro de usuario (email + password, hash con algoritmo seguro — ej. BCrypt/Argon2).
- Login que retorna un JWT con claims de `userId` y `role`.
- Middleware de autorización basado en rol (`[Authorize(Roles = "Admin")]` en endpoints administrativos).
- Expiración e invalidación de token vía tiempo de vida configurable (no se requiere refresh token para el alcance de esta prueba, salvo que se decida ampliarlo).

**Criterios de aceptación**
- Un usuario no autenticado no puede acceder a endpoints de predicciones, admin ni leaderboard protegido.
- Un usuario con rol `User` que intenta acceder a un endpoint `Admin` recibe `403 Forbidden`.
- Las contraseñas nunca se almacenan ni se loguean en texto plano.

### 6.2 Módulo 2 — Registro de Predicciones

- 12 encuentros precargados (seed), agrupados en 2 grupos de 6 partidos cada uno.
- Un usuario registra una predicción de marcador (ej. `2-1`) por partido, una sola predicción vigente por partido/usuario (upsert).
- **Regla de bloqueo**: una predicción solo puede crearse o editarse mientras `now < partido.fechaHoraInicio`. Pasado ese instante, el endpoint rechaza la operación (`409 Conflict` o `400 Bad Request` con mensaje explícito).
- Algoritmo de puntuación (aplicado cuando el Admin ingresa el resultado real):
  - `3 pts` si predicción == resultado real exacto.
  - `1 pt` si el "signo" coincide (ambos: victoria local, victoria visitante, o empate) pero el marcador exacto no coincide.
  - `0 pts` en cualquier otro caso.
- Mientras el resultado real no exista, la predicción muestra estado `Pendiente` y 0 puntos provisionales.

**Criterios de aceptación**
- No se puede crear una segunda predicción para el mismo partido/usuario; se actualiza la existente (upsert), nunca se duplica.
- Un intento de predicción después del kickoff es rechazado con un mensaje claro.
- El cálculo de puntos es determinístico y cubierto por pruebas unitarias exhaustivas (incluye empates 0-0, marcadores altos, y casos límite).

### 6.3 Módulo 3 — Panel Admin (Resultados y Recálculo)

- Endpoint(s) exclusivos de `Admin` para ingresar o corregir el resultado real de cualquiera de los 12 partidos.
- Al guardar/corregir un resultado, se dispara el recálculo de puntos de **todas** las predicciones asociadas a ese partido (idempotente: recalcular dos veces con el mismo resultado no debe duplicar ni alterar puntos).
- Vista administrativa que lista los 12 partidos con su estado (`Pendiente` / `Finalizado`) y resultado cargado.

**Criterios de aceptación**
- Corregir un resultado ya cargado reactualiza correctamente los puntos de todos los usuarios afectados (no solo se suma, se recalcula).
- Solo `Admin` puede invocar estos endpoints; intentos desde `User` devuelven `403`.

### 6.4 Módulo 4 — Leaderboard e Historial

- Leaderboard global: usuarios ordenados por puntos totales descendente.
- Criterio de desempate (a definir en Task de diseño de detalle, sugerido: mayor número de marcadores exactos acertados; si persiste el empate, orden alfabético o por fecha de registro).
- Historial de predicciones por usuario: lista de los 12 partidos con la predicción registrada, el resultado real (si existe) y los puntos obtenidos por partido.
- Un `User` solo puede ver su propio historial; `Admin` puede ver el historial de cualquier usuario.

**Criterios de aceptación**
- El leaderboard refleja el recálculo de puntos inmediatamente después de que Admin actualiza un resultado (sin caché desactualizado).
- El historial de un usuario nunca expone predicciones de otro usuario salvo que quien consulta sea `Admin`.

## 7. Reglas de Negocio — Detalle del Algoritmo de Puntuación

```
dado prediccion (predLocal, predVisitante)
dado resultado  (realLocal, realVisitante)

si (predLocal == realLocal) y (predVisitante == realVisitante):
    puntos = 3
sino si signo(predLocal, predVisitante) == signo(realLocal, realVisitante):
    puntos = 1
sino:
    puntos = 0

donde signo(a, b) ∈ { LOCAL_GANA, VISITANTE_GANA, EMPATE }
```

Casos borde que el harness (Task #1) debe cubrir explícitamente:
- Empate exacto predicho y ocurrido (ej. predicho 1-1, real 1-1) → 3 pts.
- Empate predicho con marcador distinto al real, pero real también empate (ej. predicho 0-0, real 2-2) → 1 pt.
- Predicción de victoria local con marcador exacto distinto de la realidad, pero incluso el ganador es distinto → 0 pts.
- Resultado real aún no cargado → predicción en estado `Pendiente`, 0 puntos, no se computa como fallo.
- Recálculo tras corrección de un resultado ya cargado → los puntos se sobrescriben, no se acumulan.

## 8. Requisitos No Funcionales

- **Seguridad**: JWT firmado, contraseñas hasheadas, validación de entrada en todos los endpoints, protección contra IDOR (un usuario no accede a recursos de otro usuario vía manipulación de `id`).
- **Testabilidad**: la lógica de puntuación y el seeder deben ser testeables sin infraestructura externa (PostgreSQL, Docker) — de ahí el uso de EF Core InMemory/SQLite en el harness.
- **Portabilidad**: `docker-compose.yml` debe levantar backend + frontend + PostgreSQL con un solo comando en un entorno limpio.
- **Documentación viva**: `AI_LOG.md` debe reflejar los prompts complejos usados durante el desarrollo, actualizado bajo demanda vía slash command.
- **Trazabilidad arquitectónica**: diagrama C4 (Contexto, Contenedores, Componentes) como entregable, coherente con `docs/design.md`.

## 9. Entregables

1. Repositorio Git (monorepo) con commits progresivos y mensajes descriptivos por tarea.
2. URL de despliegue funcional en Render.com (backend + frontend + PostgreSQL).
3. `AI_LOG.md` con los prompts complejos utilizados.
4. Diagrama de Arquitectura C4 (Contexto/Contenedores/Componentes) en `docs/architecture/`.
5. `docs/spec.md`, `docs/design.md`, `docs/tasks.md` (este set de documentos).
6. Suite de pruebas: xUnit (backend) + Karma/Jest (frontend) ejecutable localmente y en CI si se configura.

## 10. Criterios de Aceptación Generales del Sistema

- Un usuario nuevo puede registrarse, iniciar sesión, predecir los 12 partidos, y ver su historial y el leaderboard.
- Un Admin puede iniciar sesión, cargar los 12 resultados reales, y verificar que el leaderboard y el historial de cada usuario reflejan los puntos correctos.
- Toda la lógica de puntuación está cubierta por pruebas unitarias que corren en segundos, sin Docker ni PostgreSQL.
- La aplicación completa se levanta localmente con `docker-compose up`.

## 11. Glosario

| Término | Definición |
|---|---|
| Predicción | Marcador que un usuario registra para un partido antes de su inicio |
| Resultado real | Marcador oficial ingresado por un Admin tras finalizar el partido |
| Signo | Resultado categórico de un partido: victoria local, victoria visitante o empate |
| Recálculo | Proceso que recomputa los puntos de todas las predicciones de un partido tras cargar/corregir su resultado |
| Harness | Infraestructura de pruebas (seeder + tests) construida antes que la lógica de producción (Task #1) |
| Seeder | Componente que precarga los 12 partidos/2 grupos en la base de datos |
