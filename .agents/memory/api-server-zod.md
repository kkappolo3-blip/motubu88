---
name: API server zod import
description: How to correctly import and use zod in api-server routes — esbuild can't resolve zod/v4 subpath exports
---

## Rule
In `artifacts/api-server/src/routes/*.ts`, always import zod as:
```ts
import { z } from "zod";
```
Never use `import { z } from "zod/v4"`.

Also ensure `"zod": "catalog:"` is in `artifacts/api-server/package.json` `dependencies`.

**Why:** esbuild bundles the api-server and cannot resolve package subpath exports like `zod/v4`. Even though other workspace packages (like `lib/db`) use `zod/v4`, the api-server build will fail with "Could not resolve zod/v4".

**How to apply:** Whenever adding validation to a new route file, use `import { z } from "zod"`. If the build fails with "Could not resolve", check whether zod is in the api-server's package.json dependencies.
