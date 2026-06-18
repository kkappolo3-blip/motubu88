import { Router } from "express";
import { db } from "@workspace/db";
import { installmentsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.get("/installments", async (_req, res) => {
  const rows = await db.select().from(installmentsTable).orderBy(installmentsTable.created_at);
  res.json(rows);
});

router.get("/installments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(installmentsTable).where(eq(installmentsTable.id, id));
  if (!row) { res.status(404).json({ error: "Cicilan tidak ditemukan" }); return; }
  res.json(row);
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional().nullable(),
});

router.post("/installments/:id/payment", async (req, res) => {
  const id = Number(req.params.id);
  const parse = paymentSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Input tidak valid", details: parse.error.issues });
    return;
  }

  const [installment] = await db.select().from(installmentsTable).where(eq(installmentsTable.id, id));
  if (!installment) { res.status(404).json({ error: "Cicilan tidak ditemukan" }); return; }
  if (installment.status === "lunas") {
    res.status(400).json({ error: "Cicilan sudah lunas" });
    return;
  }

  const { amount, note } = parse.data;
  const currentPaid = Number(installment.paid_amount);
  const total = Number(installment.total_amount);
  const newPaid = Math.min(currentPaid + amount, total);
  const newStatus = newPaid >= total ? "lunas" : "active";

  const today = new Date().toISOString().split("T")[0];
  const newPayment = { date: today, amount, note: note ?? null };
  const existingPayments = Array.isArray(installment.payments) ? installment.payments : [];
  const updatedPayments = [...existingPayments, newPayment];

  const [updated] = await db.update(installmentsTable)
    .set({
      paid_amount: String(newPaid),
      status: newStatus,
      payments: updatedPayments as unknown as object,
    })
    .where(eq(installmentsTable.id, id))
    .returning();

  res.json(updated);
});

export default router;
