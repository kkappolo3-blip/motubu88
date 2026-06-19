import { Hono } from "hono";
import { db, eq, sql } from "@workspace/db";
import { productsTable, transactionsTable, installmentsTable } from "@workspace/db/schema";
import { z } from "zod";

const router = new Hono();

const cartItemSchema = z.object({
  product_id: z.number().int().positive(),
  product_name: z.string(),
  variant: z.string().nullable().optional(),
  qty: z.number().int().positive(),
  custom_price: z.number().min(0),
});

const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  payment_method: z.enum(["lunas", "cicilan"]),
  customer_name: z.string().optional().nullable(),
});

router.post("/kasir/checkout", async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parse = checkoutSchema.safeParse(body);
  if (!parse.success) return c.json({ error: "Input tidak valid", details: parse.error.issues }, 400);

  const { items, payment_method, customer_name } = parse.data;

  if (payment_method === "cicilan" && !customer_name?.trim()) {
    return c.json({ error: "Nama pelanggan wajib diisi untuk pembayaran cicilan" }, 400);
  }

  const totalAmount = items.reduce((sum, i) => sum + i.qty * i.custom_price, 0);
  const today = new Date().toISOString().split("T")[0];

  for (const item of items) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.product_id));
    if (!product) return c.json({ error: `Produk ID ${item.product_id} tidak ditemukan` }, 404);
    if (product.stock_qty < item.qty) {
      return c.json({ error: `Stok "${product.name}" tidak cukup (tersedia: ${product.stock_qty})` }, 400);
    }
    await db.update(productsTable)
      .set({ stock_qty: sql`${productsTable.stock_qty} - ${item.qty}` })
      .where(eq(productsTable.id, item.product_id));
  }

  let installmentId: number | null = null;
  if (payment_method === "cicilan") {
    const [installment] = await db.insert(installmentsTable).values({
      customer_name: customer_name!.trim(),
      total_amount: String(totalAmount),
      paid_amount: "0",
      status: "active",
      items: items as unknown as object,
      payments: [] as unknown as object,
    }).returning();
    installmentId = installment.id;
  }

  const description = payment_method === "cicilan"
    ? `Penjualan cicilan - ${customer_name} (${items.length} item)`
    : `Penjualan tunai (${items.length} item)`;

  const [transaction] = await db.insert(transactionsTable).values({
    date: today,
    type: payment_method === "cicilan" ? "cicilan" : "penjualan",
    amount: String(totalAmount),
    description,
    installment_id: installmentId,
  }).returning();

  return c.json({
    transaction_id: transaction.id,
    installment_id: installmentId,
    total_amount: totalAmount,
    payment_method,
  }, 201);
});

export default router;
