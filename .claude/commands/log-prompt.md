---
description: Registra en AI_LOG.md un resumen breve del objetivo complejo actual, la respuesta y el commit asociado.
argument-hint: "[hash/ref de commit opcional]"
disable-model-invocation: true
---

Registra una entrada breve sobre el objetivo complejo tratado en esta conversación y la respuesta o cambios producidos.

Antes de escribir:
- Basa el objetivo y el resumen únicamente en lo que aparece en esta conversación. No copies prompts completos ni inventes detalles.
- Redacta en español y usa la fecha actual en formato `YYYY-MM-DD`.
- No incluyas secretos, credenciales ni datos personales sensibles; exclúyelos o redacta su valor.
- Si no puedes identificar una tarea compleja en la conversación, pide al usuario el resumen que falta y no escribas todavía.

Determina el commit así:
- Si `$ARGUMENTS` contiene una referencia, comprueba que Git la resuelve a un commit, por ejemplo con `git rev-parse --verify --quiet "$ARGUMENTS^{commit}"`. Si es válida, registra el hash corto de ese commit. No registres la referencia sin verificarla. Si no hay repositorio Git o la referencia no es válida, no atribuyas ningún commit: usa respectivamente `Pendiente (sin repositorio Git)` o `Pendiente (referencia inválida)`.
- Si no se proporcionó argumento y existe un repositorio Git, comprueba el working tree con `git status --porcelain`. Si está limpio, registra el resultado de `git rev-parse --short HEAD`. Si hay cambios, incluidos archivos sin seguimiento, registra exactamente `Pendiente (cambios sin commit)`. Si no existe repositorio Git, registra exactamente `Pendiente (sin repositorio Git)`. Si no hay un commit HEAD disponible, registra `Pendiente (sin commit HEAD)`.

Escribe en `AI_LOG.md` en la raíz del workspace. Si el archivo no existe, créalo con el título `# AI Log`; si ya existe, conserva todo su contenido y anexa la entrada al final, sin reemplazarlo. Usa siempre este formato:

```markdown
## YYYY-MM-DD
- Objetivo/prompt: <resumen breve>
- Respuesta/cambios: <resumen breve>
- Commit: <hash corto o estado Pendiente>
```

Al terminar, confirma la ruta `AI_LOG.md`, el objetivo resumido y el commit o estado pendiente registrado.