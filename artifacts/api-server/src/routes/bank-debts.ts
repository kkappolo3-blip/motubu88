import { Hono } from "hono";
import { db, bankDebtsTable, eq } from "@workspace/db";
import {
  CreateBankDebtBody,
  UpdateBankDebtBody,
  UpdateBankDebtParams,
  DeleteBankDebtParams,
} from "@workspace/api-zod";

const router = new Hono();

function serializeDebt(d: typeof bankDebtsTable.$inferSelect) {
  return {
    id: d.id,
    bank_name: d.bank_name,
    principal_amount: Number(d.principal_amount),
    interest_amount: Number(d.interest_amount),
    paid_amount: Number(d.paid_amount),
    status: d.status,
    created_at: d.created_at.toISOString(),
  };
}

router.get("/bank-debts", async (c) => {
  try {
    const debts = await db.select().from(bankDebtsTable).orderBy(bankDebtsTable.created_at);
    return c.json(debts.map(serializeDebt));
  } catch (err) {
    console.error("Failed to list bank debts", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.post("/bank-debts", async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = CreateBankDebtBody.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
  try {
    const [debt] = await db.insert(bankDebtsTable).values({
      bank_name: parsed.data.bank_name,
      principal_amount: String(parsed.data.principal_amount),
      interest_amount: String(parsed.data.interest_amount ?? 0),
      paid_amount: String(parsed.data.paid_amount ?? 0),
      status: "active",
    }).returning();
    return c.json(serializeDebt(debt), 201);
  } catch (err) {
    console.error("Failed to create bank debt", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.patch("/bank-debts/:id", async (c) => {
  const params = UpdateBankDebtParams.safeParse({ id: Number(c.req.param("id")) });
  if (!params.success) return c.json({ error: "Invalid id" }, 400);
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const bodyParsed = UpdateBankDebtBody.safeParse(body);
  if (!bodyParsed.success) return c.json({ error: "Invalid request" }, 400);
  try {
    const updates: Record<string, unknown> = {};
    if (bodyParsed.data.bank_name !== undefined) updates.bank_name = bodyParsed.data.bank_name;
    if (bodyParsed.data.principal_amount !== undefined) updates.principal_amount = String(bodyParsed.data.principal_amount);
    if (bodyParsed.data.interest_amount !== undefined) updates.interest_amount = String(bodyParsed.data.interest_amount);
    if (bodyParsed.data.paid_amount !== undefined) updates.paid_amount = String(bodyParsed.data.paid_amount);
    if (bodyParsed.data.status !== undefined) updates.status = bodyParsed.data.status;
    const [debt] = await db.update(bankDebtsTable).set(updates).where(eq(bankDebtsTable.id, params.data.id)).returning();
    if (!debt) return c.json({ error: "Bank debt not found" }, 404);
    return c.json(serializeDebt(debt));
  } catch (err) {
    console.error("Failed to update bank debt", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.delete("/bank-debts/:id", async (c) => {
  const params = DeleteBankDebtParams.safeParse({ id: Number(c.req.param("id")) });
  if (!params.success) return c.json({ error: "Invalid id" }, 400);
  try {
    await db.delete(bankDebtsTable).where(eq(bankDebtsTable.id, params.data.id));
    return c.body(null, 204);
  } catch (err) {
    console.error("Failed to delete bank debt", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default router;
