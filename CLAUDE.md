# Polla Mundialista — Instrucciones del proyecto

## Búsqueda de código: usar siempre CodeGraph

Este repo tiene CodeGraph inicializado (`.codegraph/`). Antes de usar grep/find o leer archivos a ciegas para entender o localizar código — tanto en el backend (.NET) como, eventualmente, en el frontend (Angular) — usa CodeGraph primero:

- **MCP tool** (si está disponible): `codegraph_explore` responde la mayoría de preguntas de código en una sola llamada — el código fuente verbatim de los símbolos relevantes más las rutas de llamada entre ellos, incluyendo saltos de dynamic dispatch que grep no puede seguir. Nombra un archivo o símbolo en la consulta para leer su código fuente actual con números de línea.
- **Shell** (siempre funciona): `codegraph explore "<nombres de símbolos o pregunta>"` imprime la misma salida.

No se debe reindexar ni borrar `.codegraph/` sin que el usuario lo pida explícitamente.

## Mantener sincronizada la colección de Postman

`docs/postman/PollaMundialista.postman_collection.json` es la colección de Postman usada para probar manualmente la API. Cualquier cambio que afecte el contrato de un endpoint existente — ruta, método HTTP, body de request, forma de la respuesta, o rol/auth requerido — o que agregue/elimine un endpoint, debe reflejarse ahí de inmediato, en el mismo cambio, no como una tarea aparte:

1. **Actualiza el archivo JSON** (`docs/postman/PollaMundialista.postman_collection.json`) para que la request afectada (o una nueva) coincida exactamente con el nuevo contrato — método, ruta, headers de auth, body, y cualquier variable de colección que dependa de ello.
2. **Usa las herramientas MCP de Postman** (`mcp__postman__*`, ej. `getCollection`/`updateCollectionRequest`/`createCollectionRequest`/`putCollection`) para sincronizar ese mismo cambio en la colección del workspace de Postman del usuario, no solo en el archivo local — ambos deben quedar consistentes entre sí. Si la colección todavía no existe en su workspace de Postman, créala ahí a partir del JSON antes de seguir actualizándola incrementalmente.

No se debe dejar el JSON desactualizado respecto al código real de los Controllers, ni dejar que el archivo local y la colección en Postman diverjan entre sí.
