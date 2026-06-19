import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DbInstance = PostgresJsDatabase<typeof schema>;

let _cachedDb: DbInstance | null = null;

/**
 * Create or return the cached DB instance.
 * Pass connectionString explicitly for Cloudflare Workers
 * (where env bindings differ from process.env).
 * In Node.js environments, falls back to process.env.DATABASE_URL.
 */
export function getDb(connectionString?: string): DbInstance {
  if (_cachedDb) return _cachedDb;
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  // prepare: false is required for PgBouncer / Supabase Transaction Pooler
  const client = postgres(url, { prepare: false });
  _cachedDb = drizzle(client, { schema });
  return _cachedDb;
}

/**
 * Lazy proxy — existing `db.select()...` calls work without changing route files.
 * In Cloudflare Workers, call getDb(env.DATABASE_URL) once in the middleware
 * before any route handler runs.
 */
export const db: DbInstance = new Proxy({} as DbInstance, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop as string | symbol);
  },
});

export * from "./schema";

// Re-export drizzle query helpers so consumers don't need to import drizzle-orm directly.
// This prevents duplicate-drizzle-orm peer-dep resolution issues in pnpm monorepos.
export {
  eq, ne, gt, lt, gte, lte, and, or, not,
  like, ilike,
  isNull, isNotNull,
  inArray, notInArray,
  asc, desc,
  sql,
  count,
} from "drizzle-orm";
