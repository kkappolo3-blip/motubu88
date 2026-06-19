import { Hono } from "hono";
import { db, transactionsTable } from "@workspace/db";
import { CreateTransactionBody } from "@workspace/api-zod";

const router = new Hono();

function serializeTransaction(t: typeof transactionsTable.$inferSelect) {
  return {
    id: t.id,
    date: t.date,
    type: t.type,
    amount: Number(t.amount),
    description: t.description,
    created_at: t.created_at.toISOString(),
  };
}

router.get("/transactions", async (c) => {
  try {
    const txns = await db.select().from(transactionsTable).orderBy(transactionsTable.created_at);
    return c.json(txns.map(serializeTransaction));
  } catch (err) {
    console.error("Failed to list transactions", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.post("/transactions", async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = CreateTransactionBody.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
  try {
    const [txn] = await db.insert(transactionsTable).values({
      date: parsed.data.date,
      type: parsed.data.type,
      amount: String(parsed.data.amount),
      description: parsed.data.description,
    }).returning();
    return c.json(serializeTransaction(txn), 201);
  } catch (err) {
    console.error("Failed to create transaction", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default router;
