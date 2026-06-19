import { Hono } from "hono";
import { db, eq } from "@workspace/db";
import { installmentsTable } from "@workspace/db/schema";
import { z } from "zod";

const router = new Hono();

router.get("/installments", async (c) => {
  const rows = await db.select().from(installmentsTable).orderBy(installmentsTable.created_at);
  return c.json(rows);
});

router.get("/installments/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [row] = await db.select().from(installmentsTable).where(eq(installmentsTable.id, id));
  if (!row) return c.json({ error: "Cicilan tidak ditemukan" }, 404);
  return c.json(row);
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional().nullable(),
});

router.post("/installments/:id/payment", async (c) => {
  const id = Number(c.req.param("id"));
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parse = paymentSchema.safeParse(body);
  if (!parse.success) return c.json({ error: "Input tidak valid", details: parse.error.issues }, 400);

  const [installment] = await db.select().from(installmentsTable).where(eq(installmentsTable.id, id));
  if (!installment) return c.json({ error: "Cicilan tidak ditemukan" }, 404);
  if (installment.status === "lunas") return c.json({ error: "Cicilan sudah lunas" }, 400);

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

  return c.json(updated);
});

export default router;
