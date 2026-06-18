---
name: Orval generated hook parameter shape
description: How path-param hooks from Orval codegen expect their arguments
---

## Rule
Orval-generated hooks for routes with path parameters (e.g. `GET /installments/:id`) take the id as a **bare primitive**, not wrapped in an object:

```ts
// CORRECT
useGetInstallment(id, { query: { queryKey: getGetInstallmentQueryKey(id) } })

// WRONG — causes TS2345 "Argument of type '{ id: number }' is not assignable to parameter of type 'number'"
useGetInstallment({ id }, { query: { queryKey: getGetInstallmentQueryKey({ id }) } })
```

Same pattern applies to the query key helper: `getGetInstallmentQueryKey(id)`.

**Why:** Orval generates the signature as `useGetX(id: number, options?)`, not `useGetX(params: { id: number }, options?)`.

**How to apply:** When using any generated hook with a path param, pass the primitive value directly. Check the generated file at `lib/api-client-react/src/generated/api.ts` if unsure.
