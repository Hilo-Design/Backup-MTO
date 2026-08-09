---
name: OpenAPI codegen rules
description: Constraints for editing lib/api-spec/openapi.yaml in this monorepo
---
Rule: numeric fields must be `type: number` (or `type: ["number","null"]`) — never `integer` (Orval + Zod v3 incompatibility). Nullable object refs use `oneOf: [$ref, {type: "null"}]`.
After spec changes: `pnpm --filter @workspace/api-spec run codegen` then `pnpm run typecheck:libs`. After Drizzle schema changes: `pnpm --filter @workspace/db run push` then `typecheck:libs` (api-server type errors about missing columns usually mean stale lib builds — rebuild libs first).
Never edit generated files under lib/api-zod/src/generated or lib/api-client-react/src/generated.
