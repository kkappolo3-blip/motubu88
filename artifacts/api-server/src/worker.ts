// Cloudflare Workers entry point.
// Hono's fetch handler is natively compatible with the Workers runtime.
// DATABASE_URL and CORS_ORIGIN are injected via wrangler secrets/vars (see wrangler.toml).
import app from "./app";

export default app;
