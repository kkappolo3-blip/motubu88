import { Hono } from "hono";
import { cors } from "hono/cors";
import { getDb } from "@workspace/db";
import router from "./routes";

type Bindings = {
  DATABASE_URL: string;
  CORS_ORIGIN?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS — set CORS_ORIGIN Worker binding to your Pages domain in production
app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = (c.env as Bindings | undefined)?.CORS_ORIGIN;
      if (!allowed) return origin ?? "*";
      const origins = allowed.split(",").map((o) => o.trim());
      return origins.includes(origin ?? "") ? (origin ?? origins[0]) : origins[0];
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// Initialise DB — in CF Workers, env.DATABASE_URL comes from Worker bindings;
// in Node.js getDb() falls back to process.env.DATABASE_URL automatically.
app.use("*", async (c, next) => {
  const dbUrl = (c.env as Bindings | undefined)?.DATABASE_URL;
  getDb(dbUrl);
  await next();
});

app.route("/api", router);

export default app;
