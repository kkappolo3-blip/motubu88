import { Router } from "express";
import { db, bankDebtsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateBankDebtBody,
  UpdateBankDebtBody,
  UpdateBankDebtParams,
  DeleteBankDebtParams,
} from "@workspace/api-zod";

const router = Router();

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

router.get("/bank-debts", async (req, res) => {
  try {
    const debts = await db.select().from(bankDebtsTable).orderBy(bankDebtsTable.created_at);
    res.json(debts.map(serializeDebt));
  } catch (err) {
    req.log.error({ err }, "Failed to list bank debts");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bank-debts", async (req, res) => {
  const parsed = CreateBankDebtBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [debt] = await db.insert(bankDebtsTable).values({
      bank_name: parsed.data.bank_name,
      principal_amount: String(parsed.data.principal_amount),
      interest_amount: String(parsed.data.interest_amount ?? 0),
      paid_amount: String(parsed.data.paid_amount ?? 0),
      status: "active",
    }).returning();
    res.status(201).json(serializeDebt(debt));
  } catch (err) {
    req.log.error({ err }, "Failed to create bank debt");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/bank-debts/:id", async (req, res) => {
  const params = UpdateBankDebtParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateBankDebtBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const updates: Record<string, unknown> = {};
    if (body.data.bank_name !== undefined) updates.bank_name = body.data.bank_name;
    if (body.data.principal_amount !== undefined) updates.principal_amount = String(body.data.principal_amount);
    if (body.data.interest_amount !== undefined) updates.interest_amount = String(body.data.interest_amount);
    if (body.data.paid_amount !== undefined) updates.paid_amount = String(body.data.paid_amount);
    if (body.data.status !== undefined) updates.status = body.data.status;

    const [debt] = await db.update(bankDebtsTable).set(updates).where(eq(bankDebtsTable.id, params.data.id)).returning();
    if (!debt) {
      res.status(404).json({ error: "Bank debt not found" });
      return;
    }
    res.json(serializeDebt(debt));
  } catch (err) {
    req.log.error({ err }, "Failed to update bank debt");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/bank-debts/:id", async (req, res) => {
  const params = DeleteBankDebtParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(bankDebtsTable).where(eq(bankDebtsTable.id, params.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete bank debt");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
