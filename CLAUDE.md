# Polla Mundialista — Instrucciones del proyecto

## Búsqueda de código: usar siempre CodeGraph

Este repo tiene CodeGraph inicializado (`.codegraph/`). Antes de usar grep/find o leer archivos a ciegas para entender o localizar código — tanto en el backend (.NET) como, eventualmente, en el frontend (Angular) — usa CodeGraph primero:

- **MCP tool** (si está disponible): `codegraph_explore` responde la mayoría de preguntas de código en una sola llamada — el código fuente verbatim de los símbolos relevantes más las rutas de llamada entre ellos, incluyendo saltos de dynamic dispatch que grep no puede seguir. Nombra un archivo o símbolo en la consulta para leer su código fuente actual con números de línea.
- **Shell** (siempre funciona): `codegraph explore "<nombres de símbolos o pregunta>"` imprime la misma salida.

No se debe reindexar ni borrar `.codegraph/` sin que el usuario lo pida explícitamente.
