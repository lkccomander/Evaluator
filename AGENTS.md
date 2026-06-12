## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the `graphify` skill if that tool is available in the current environment. If the skill tool is not available, fall back to reading `graphify-out/` artifacts directly and say that the skill could not be invoked here.

Rules:
- For codebase questions, prefer `graphify query "<question>"` when both `graphify-out/graph.json` exists and the `graphify` CLI is installed. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts when available. If the CLI is unavailable, fall back to `graphify-out/GRAPH_REPORT.md`, `graphify-out/manifest.json`, `graphify-out/graph.json`, and then raw source browsing.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- Treat graph relationships as hints, not ground truth. Verify any inferred edge before relying on it, and verify any surprising cross-language or cross-layer edge against the source code before repeating it as fact.
- After modifying code, run `graphify update .` only when the `graphify` CLI is installed. If it is unavailable, skip the refresh and mention that limitation in the handoff.

## Git workflow: stage / production

- `main` → auto-deploy a **production**
- `stage` → auto-deploy a **STAGE**
- Para pasar cambios a STAGE: `git checkout stage && git merge main && git push origin stage`
- Railway project: `humorous-passion` (API service ID `0120dd20-150d-4f7d-a9af-51b32022953a`, WEB service ID `5f3286d9-223f-4c86-b623-d27041bdc178`)
- STAGE environment ID: `54e25353-926b-45d1-9f96-78fb6cf4f868`
- Auto-deploy configurado en dashboard de Railway por servicio: `main` → production, `stage` → STAGE
