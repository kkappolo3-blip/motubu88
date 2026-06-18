import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, transactionsTable, installmentsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

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

router.post("/kasir/checkout", async (req, res) => {
  const parse = checkoutSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Input tidak valid", details: parse.error.issues });
    return;
  }

  const { items, payment_method, customer_name } = parse.data;

  if (payment_method === "cicilan" && !customer_name?.trim()) {
    res.status(400).json({ error: "Nama pelanggan wajib diisi untuk pembayaran cicilan" });
    return;
  }

  const totalAmount = items.reduce((sum, i) => sum + i.qty * i.custom_price, 0);
  const today = new Date().toISOString().split("T")[0];

  // Decrement stock for each item
  for (const item of items) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.product_id));
    if (!product) {
      res.status(404).json({ error: `Produk ID ${item.product_id} tidak ditemukan` });
      return;
    }
    if (product.stock_qty < item.qty) {
      res.status(400).json({ error: `Stok "${product.name}" tidak cukup (tersedia: ${product.stock_qty})` });
      return;
    }
    await db.update(productsTable)
      .set({ stock_qty: sql`${productsTable.stock_qty} - ${item.qty}` })
      .where(eq(productsTable.id, item.product_id));
  }

  // Create installment if cicilan
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

  // Create transaction
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

  res.status(201).json({
    transaction_id: transaction.id,
    installment_id: installmentId,
    total_amount: totalAmount,
    payment_method,
  });
});

export default router;
