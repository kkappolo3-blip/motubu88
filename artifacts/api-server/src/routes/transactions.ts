import { Router } from "express";
import { db, transactionsTable } from "@workspace/db";
import { CreateTransactionBody } from "@workspace/api-zod";

const router = Router();

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

router.get("/transactions", async (req, res) => {
  try {
    const txns = await db.select().from(transactionsTable).orderBy(transactionsTable.created_at);
    res.json(txns.map(serializeTransaction));
  } catch (err) {
    req.log.error({ err }, "Failed to list transactions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/transactions", async (req, res) => {
  const parsed = CreateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [txn] = await db.insert(transactionsTable).values({
      date: parsed.data.date,
      type: parsed.data.type,
      amount: String(parsed.data.amount),
      description: parsed.data.description,
    }).returning();
    res.status(201).json(serializeTransaction(txn));
  } catch (err) {
    req.log.error({ err }, "Failed to create transaction");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
