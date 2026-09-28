# Auditoría de Seguridad — API Polla Mundialista (2026-09-27)

> **Documento de evidencia, fechado.** No se reescribe: una auditoría futura crea el suyo y compara contra este. La postura **objetivo** y las decisiones derivadas viven en `docs/design.md` §7.3; el plan de ejecución, en `docs/tasks.md` #21–#27. Este documento solo responde *qué se encontró, cómo se comprobó y qué tan grave es*.

**Alcance**: backend .NET 10 (`Api`, `Application`, `Infrastructure`, `Domain`) contra las 5 dimensiones de OWASP API Security Top 10 solicitadas. **Fuera de alcance**: frontend Angular más allá del impacto en el contrato de API, y la infraestructura de Render/Neon.

---

## 1. Método

La auditoría combinó lectura de los 96 archivos `.cs` con **3 pruebas empíricas** ejecutadas contra el harness de integración real (SQLite in-memory), que es la misma configuración que usa CI. Las pruebas se escribieron en un archivo temporal (`SecurityProbeTests.cs`, **eliminado al terminar**) y se redojeron en el punto exacto donde el análisis estático no alcanzaba.

```
secret_len=64
hs256_correcto:    leaderboard=200  admin=404   ← token Admin aceptado, llega a lógica de negocio
hs512_misma_clave: leaderboard=200  admin=404   ← LA API ACEPTA HS512  → SEC-01
alg_none:          leaderboard=401  admin=401   ← correctamente rechazado
Jwt__Secret= (vacío) → 3/3 AuthFlowTests fallan con "HttpRequestException: 500"
```

**Sobre el resultado con secreto vacío**: la hipótesis inicial fue que con `Jwt:Secret` vacío la API firmaría con una clave HMAC de 0 bytes y que eso permitiría forjar un token `Admin`. **La prueba la refutó**: la librería lanza `IDX10703` y la API falla cerrada, sin firma vulnerable. El defecto real es otro y está registrado como SEC-02.

---

## 2. Resumen

| ID | Sev | Hallazgo | CWE | Tarea |
|---|---|---|---|---|
| SEC-01 | Alta | Algoritmo de firma no fijado: la API acepta HS512 con la misma clave | CWE-327 | #22 |
| SEC-02 | Alta | Sin validación de configuración al arranque: `500` opaco y tests no reproducibles en CI | CWE-1188 | #22 |
| SEC-03 | Media | `AuthController` sin `[AllowAnonymous]` explícito ni *fallback policy* | CWE-284 | #22 |
| SEC-04 | Baja | Endpoint raíz público `"Hello World!"` | CWE-200 | #22 |
| SEC-05 | Baja | `ValidationBehavior` ejecuta solo el primer validator | CWE-20 | #22 |
| SEC-06 | Media | Perímetro HTTP sin endurecer: sin headers de seguridad, sin HTTPS/HSTS, CORS con permisos de más | CWE-693 | #23 |
| SEC-07 | Media | Enumeración de usuarios por canal temporal en login | CWE-208 | #24 |
| SEC-08 | Baja | `LoginQuery` sin validator; política de contraseñas incoherente (6 vs 8) | CWE-20 | #24 |
| SEC-09 | Media | Token de reseteo en logs, gateado por nombre de environment | CWE-532 | #24 |
| SEC-10 | Alta | Cero rate limiting en toda la API | CWE-770 | #25 |
| SEC-11 | Alta | JWT no revocable — incumple lo que `design.md` §7.2 promete | CWE-613 | #26 |
| SEC-12 | Alta | Sin `IExceptionHandler` ni RFC 7807; stack trace en Development y cambio de contrato obligatorio | CWE-209 | #27 |

**4 altas · 4 medias · 4 bajas.** Ningún hallazgo de severidad crítica: la app no expone secretos, no tiene inyección SQL y falla cerrada ante configuración inválida.

---

## 3. Hallazgos

### SEC-01 · Alta · Algoritmo de firma no fijado (CWE-327)

**Evidencia**: `Api/Program.cs:52-61`. `TokenValidationParameters` no declara `ValidAlgorithms`. **Comprobado**: un token firmado con **HS512** usando la misma clave devuelve `200` en `/api/leaderboard`; `alg=none` se rechaza correctamente (`401`).

**Impacto**: no es explotable sin conocer la clave — quien la posee ya puede firmar con HS256 — pero elimina la defensa en profundidad frente a confusión de algoritmo y contradice el requisito explícito de la auditoría de fijar el algoritmo.

**Corrección**: `ValidAlgorithms = [SecurityAlgorithms.HmacSha256]`. Regresión: token HS512 debe devolver `401`.

### SEC-02 · Alta · Sin validación de configuración al arranque (CWE-1188)

**Evidencia**: `Infrastructure/Security/JwtOptions.cs` sin `[Required]`; sin `ValidateOnStart` en el registro. **Comprobado**: con `Jwt__Secret=` la aplicación **arranca sana** y el primer login devuelve `500`, sin mencionar la clave faltante. En `Development` ese `500` sale con **stack trace completo** por el `DeveloperExceptionPage` automático.

**Impacto doble**: (a) un despliegue con el secreto ausente falla de forma opaca, en el primer request de un usuario real, en vez de negarse a arrancar; (b) el harness de tests depende **en silencio de los User Secrets del desarrollador**, por lo que la suite no es reproducible en CI ni en otra máquina.

**Corrección**: `[Required]` + longitud mínima 32 bytes (HS256) + `Issuer`/`Audience` obligatorios + `ValidateOnStart()`. Adicionalmente, inyectar un secreto de test en `CustomWebApplicationFactory` para que la suite sea autocontenida, y promover la prueba de secreto vacío a regresión permanente.

> El secreto **no** está hardcodeado: vive en User Secrets (`UserSecretsId` en `Api/PollaMundialista.Api.csproj:21`), 64 bytes, con `appsettings.json` sin credenciales. Verificado.

### SEC-03 · Media · Autorización implícita en `AuthController` (CWE-284)

**Evidencia**: `Api/Controllers/AuthController.cs:10` — la clase no declara ni `[Authorize]` ni `[AllowAnonymous]`. Los cuatro endpoints (`register`, `login`, `forgot-password`, `reset-password`) son públicos únicamente porque **no existe una *fallback policy*** que niegue por defecto.

**Impacto**: un endpoint nuevo forgetting `[Authorize]` queda público en silencio. Es la clase de defecto que no se detecta en revisión de código.

**Corrección**: `FallbackPolicy` que exija JWT + `[AllowAnonymous]` explícito en `AuthController`.

### SEC-04 · Baja · Endpoint raíz público

**Evidencia**: `Api/Program.cs:92` — `app.MapGet("/", () => "Hello World!")`. **Comprobado**: responde `200` con ese body sin autenticación.

**Corrección**: eliminar, o convertir en un endpoint de health check con respuesta mínima.

### SEC-05 · Baja · `ValidationBehavior` ignora validators adicionales

**Evidencia**: `Application/Behaviors/ValidationBehavior.cs:24` — `var validator = _validators.FirstOrDefault();`. Un segundo validator registrado para el mismo request se ignora en silencio, sin error ni warning.

**Corrección**: iterar y agregar los errores de todos los validators.

### SEC-06 · Media · Perímetro HTTP sin endurecer (CWE-693)

**Evidencia**: `Api/Program.cs` — sin `UseHttpsRedirection`, sin HSTS, sin `X-Content-Type-Options`, `X-Frame-Options` ni `Referrer-Policy`; sin middleware de headers de seguridad. CORS en `Program.cs:74`: `WithOrigins(...).AllowAnyHeader().AllowAnyMethod()`.

**Verificado como correcto**: **no** hay `AllowAnyOrigin()` ni `AllowCredentials()`, que sería la combinación crítica; y `AllowedOrigins: []` en `appsettings.json` hace que producción **falla cerrado** (rechaza todo origen, incluido el Static Site de Render, que se configura por variable de entorno).

**Corrección**: headers de seguridad + `UseHttpsRedirection`/HSTS (conscientes del ambiente, para no romper el http local); policy CORS renombrada de `"AllowAngularDev"` a algo neutro y con métodos/headers explícitos en vez de `AllowAny*`.

### SEC-07 · Media · Enumeración de usuarios por canal temporal (CWE-208)

**Evidencia**: `Application/Auth/LoginQueryHandler.cs:30`
```csharp
if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
```

**Impacto**: el `||` hace *short-circuit*. Un email inexistente responde en el orden de ~1 ms; uno existente paga los ~100-300 ms de BCrypt. La diferencia es trivial de medir de forma remota, y **deshace la garantía anti-enumeración que la Tarea #14 construyó deliberadamente** en `forgot-password` (`design.md` §7.2): el sistema la implementa en un endpoint y la pierde en el otro.

**Corrección**: cuando `user is null`, verificar igualmente contra un hash BCrypt señuelo para igualar el costo.

### SEC-08 · Baja · Validación de login ausente y política incoherente

**Evidencia**: `RegisterUserCommandValidator.cs:10` exige `MinimumLength(8)`; la pantalla de Login informa **6** caracteres; y no existe `LoginQueryValidator`, por lo que `/api/auth/login` acepta entradas sin cota de longitud.

**Corrección**: validator de `LoginQuery` con longitud máxima acotada y copy alineado a la política real de 8.

### SEC-09 · Media · Token de reseteo en logs, gateado por environment (CWE-532)

**Evidencia**: `Infrastructure/Services/NoOpEmailSender.cs:25-26` — `if (_environment.IsDevelopment())` y luego `_logger.LogInformation("[DEV] ... {Email}: token={Token}", email, token)`.

**Riesgo real**: la intención es correcta y el body HTTP no incluye el token, pero la condición es **el nombre del ambiente**. Si en Render alguien deja `ASPNETCORE_ENVIRONMENT=Development` (misconfiguración frecuente y silenciosa), todos los tokens de reseteo y los emails quedan expuestos en los logs.

**Corrección**: gatear con un flag explícito de configuración (`PasswordReset:ExposeToken`, default `false`) en vez del nombre del ambiente, y redactar el email en el log.

### SEC-10 · Alta · Cero rate limiting (CWE-770)

**Evidencia**: sin `AddRateLimiter` / `UseRateLimiter` en `Api/Program.cs`. `login`, `register`, `forgot-password` y `reset-password` quedan sin throttling → credential stuffing y fuerza bruta. SEC-07 agrava el impacto porque además permite enumerar cuentas.

**Contexto de diseño**: `design.md` §7.2 ya aceptaba explícitamente "sin throttling" para `forgot-password` como riesgo conocido. Lo que **no** estaba documentado es que `login` tampoco lo tuviera.

**Corrección**: *fixed window* por IP en los cuatro endpoints de auth, más un límite global. **Advertencia**: detrás del proxy de Render, sin `ForwardedHeaders` el limitador ve todas las requests como una única IP, lo que deja el control inoperante.

### SEC-11 · Alta · JWT no revocable (CWE-613)

**Evidencia**: `Domain/Entities/User.cs:27-32` — `ChangePassword` solo reasigna `PasswordHash`. Búsqueda de `SecurityStamp|TokenVersion|Revoc|Blacklist` en todo el backend: **sin coincidencias**.

**Impacto**: un JWT robado permanece válido hasta su expiración (60 min) incluso después de que el usuario resetee su contraseña. Un atacante con el token mantiene acceso completo a `/predictions` y `/leaderboard`.

**Divergencia con el diseño**: `design.md` §7.2 promete literalmente que *"el JWT del usuario deja de ser válido y debe volver a iniciar sesión"*. **El código no lo implementa.** No se corrige documentsalmente porque aceptarlo como limitation sería una regresión de seguridad disfrazada de decisión de diseño.

**Corrección**: columna `SecurityStamp` en `User` + claim en el JWT + evento `OnTokenValidated` que compare contra la BD + invalidación explícita al cambiar la contraseña, con su test de regresión.

### SEC-12 · Alta · Sin manejo global de errores ni RFC 7807 (CWE-209)

**Evidencia**: `Api/Common/ResultExtensions.cs:9,16-18` devuelve objetos ad-hoc `{ "message": ... }` con `BadRequestObjectResult` / `NotFoundObjectResult` / `ConflictObjectResult` — **no es RFC 7807**. No hay `IExceptionHandler` ni `UseExceptionHandler` en `Api/Program.cs`.

**Impacto**: (a) toda excepción no controlada (BD caída, timeout de Neon, el `IDX10703` de SEC-02) devuelve un `500` **sin cuerpo** en producción y **con stack trace completo en Development**, filtrando detalles internos de EF/Npgsql; (b) el contrato de error no es estándar ni autodocumentable.

**Bloqueante de contrato**: adoptar ProblemDetails **rompe el frontend**. Los services Angular leen `err?.error?.message`, y ProblemDetails serializa `type`/`title`/`status`/`detail`: `message` quedaría `undefined` y **todos los mensajes de error de la UI caerían silenciosamente al copy genérico**. Exige preservar `message` como extensión o actualizar los 5 services en el mismo cambio.

**Corrección**: `IExceptionHandler` global con `ProblemDetails` y `traceId`; migrar `ResultExtensions`; **actualizar en el mismo cambio** `docs/postman/PollaMundialista.postman_collection.json` y sincronizarlo con el workspace de Postman, porque cambia la forma de la respuesta de todos los endpoints.

---

## 4. Verificado como limpio

Un reporte que solo lista lo que anda mal no es auditable. Estos controles se comprobaron y **no** presentan hallazgo:

| Control | Verificación |
|---|---|
| **Inyección SQL** | Sin `FromSqlRaw`, `ExecuteSqlRaw`, `FromSql` ni concatenación en los 4 repositorios; todo por LINQ, EF parametriza |
| **Secretos en el repo** | `Jwt:Secret` y `ConnectionStrings:DefaultConnection` solo en User Secrets; `appsettings.json` sin credenciales |
| **Falla con secreto inválido** | Clave de 0 bytes → `IDX10703`, la API **falla cerrada** (corrige la hipótesis inicial) |
| **`alg=none`** | Rechazado con `401` |
| **RBAC** | `[Authorize(Roles = Admin)]` en `AdminController`; historial ajeno restringido a Admin |
| **IDOR** | `PredictionsController` toma el `userId` **del claim JWT**, no del body |
| **PII en logs** | `LoggingBehavior.cs:23-31` loguea solo el nombre del tipo y el mensaje de dominio; **nunca** el objeto request, así que no pueden filtrarse contraseñas ni tokens |
| **Anti-enumeración en forgot-password** | Respuesta indistinguible con y sin email, verificado por test de integración |
| **CORS crítico** | Sin `AllowAnyOrigin` + `AllowCredentials`; `AllowedOrigins: []` en producción |
| **SQLite/Migration en tests** | La BD in-memory del harness no se contamina entre tests |

---

## 5. Divergencias diseño ↔ código

Detectadas durante la auditoría, para que no se pierdan:

1. **`design.md` §7.2 promete revocación de JWT; el código no la implementa** → SEC-11 / Tarea #26. Anotada en §7.2 y §7.3.
2. **`design.md` §7.2 dice que el token "se expone en la respuesta" en Development; el código solo lo loguea.** El diseño exagera la superficie de exposición. La corrección de SEC-09 mueve el gate a un flag explícito, lo que además cierra la divergencia.
3. **`design.md` §7.2 acepta "sin throttling" en `forgot-password` como riesgo conocido, pero el alcance real era toda la API** → SEC-10 / Tarea #25.

---

## 6. Plan de remediación

| Tarea | Contenido | Riesgo |
|---|---|---|
| #21 | Este documento + §7.3 de `design.md` + anotación de divergencias | Ninguno (solo docs) |
| #22 | SEC-01, SEC-02, SEC-03, SEC-04, SEC-05 | Bajo, sin cambio de contrato |
| #23 | SEC-06 | Bajo, consciente del ambiente |
| #24 | SEC-07, SEC-08, SEC-09 | Bajo |
| #25 | SEC-10 | Medio (comportamiento observable en 429) |
| #26 | SEC-11 | Medio (**migración de BD**) |
| #27 | SEC-12 | **Alto: cambia el contrato de toda la API**, atómico con Angular + Postman |

Restricción transversal: **toda configuración nueva debe ser opcional con default seguro**, para no romper el deploy existente en Render.
