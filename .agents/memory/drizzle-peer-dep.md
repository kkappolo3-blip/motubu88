---
name: Drizzle duplicate peer dep fix
description: How to prevent incompatible drizzle-orm TS types in pnpm monorepos
---

## Rule
Always import `eq`, `sql`, `and`, `or`, `desc`, `asc`, etc. from `@workspace/db`, never from `drizzle-orm` directly in any artifact package.

## Why
pnpm resolves `drizzle-orm` per peer-dep combination. If two packages import `drizzle-orm` with different peer dep sets (e.g. one has `@types/pg` in its tree, the other does not), pnpm installs two separate resolved instances. `drizzle-orm` uses private TypeScript class properties (`shouldInlineParams`), so the two instances are structurally incompatible — TS2345/TS2769 errors everywhere.

## How to apply
`lib/db/src/index.ts` re-exports all commonly needed drizzle helpers:
```ts
export { eq, ne, gt, lt, gte, lte, and, or, not, like, ilike,
         isNull, isNotNull, inArray, notInArray, asc, desc, sql, count }
from "drizzle-orm";
```
Route files in `artifacts/api-server` import everything from `@workspace/db`:
```ts
import { db, productsTable, eq, sql } from "@workspace/db";
```
`drizzle-orm` is NOT a direct dependency of `artifacts/api-server` — it is removed from its `package.json`.
