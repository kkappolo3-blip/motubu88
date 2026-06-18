# MOTUBU

Sistem manajemen bisnis berbasis web untuk pedagang Indonesia. Full UI dalam Bahasa Indonesia.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (`artifacts/motubu`), Tailwind CSS, shadcn/ui, Wouter
- API: Express 5 (`artifacts/api-server`)
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → `lib/api-client-react`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/index.ts` — DB schema (source of truth)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/` — Generated hooks and Zod schemas (do not edit manually)
- `artifacts/motubu/src/pages/` — All frontend page components
- `artifacts/motubu/src/components/Layout.tsx` — Two-tier sticky header with nav
- `artifacts/api-server/src/routes/` — Express route handlers

## Architecture decisions

- **Replit PostgreSQL** is used as the database (not Supabase, despite SUPABASE_* secrets being collected during setup — they are unused)
- **Auth is localStorage-only**: `motubu_auth === "admin"` in localStorage. Admin code: `88040773`
- **Contract-first API**: OpenAPI spec → codegen → typed hooks. Always run codegen after spec changes
- **No sidebar**: Amazon-style two-tier sticky header. Top row = logo + search + user. Bottom row = horizontal nav tabs
- **All mutations go through Orval hooks**: `mutate({ data: {...} })` pattern; never call fetch directly

## Product

- **Dashboard**: Real-time KPI cards (nilai stok, omzet, hutang bank, pengambilan pemilik)
- **Stok (Inventori)**: CRUD produk dengan grid foto, harga modal/jual, stok qty, supplier
- **Simulasi Order**: Buat simulasi pembelian dari supplier → commit ke stok
- **Hutang Bank**: Catat pinjaman bank, progress pelunasan, status aktif/lunas
- **Kasir, Backorder, Share Produk, Pengeluaran, Arus Kas, Riwayat, Reseller, Pengaturan**: Placeholder (segera hadir)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/db/src/schema/index.ts`: run `pnpm --filter @workspace/db run push` then `pnpm run typecheck:libs`
- After changing `lib/api-spec/openapi.yaml`: run `pnpm --filter @workspace/api-spec run codegen`
- Do NOT import types with `as ProductInput` cast in pages — import type then cast as `unknown` or remove the explicit type cast
- API hooks from `@workspace/api-client-react` need `queryKey` passed explicitly in the query options

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
