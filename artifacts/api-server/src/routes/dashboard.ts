import { Router } from "express";
import { db, productsTable, bankDebtsTable, ownerDrawingsTable, transactionsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    // Stock value = sum(cost_price * stock_qty)
    const stockResult = await db
      .select({ value: sql<string>`COALESCE(SUM(${productsTable.cost_price}::numeric * ${productsTable.stock_qty}), 0)` })
      .from(productsTable);
    const stockValue = Number(stockResult[0]?.value ?? 0);

    // Revenue = sum of income transactions
    const revenueResult = await db
      .select({ value: sql<string>`COALESCE(SUM(${transactionsTable.amount}::numeric), 0)` })
      .from(transactionsTable)
      .where(eq(transactionsTable.type, "income"));
    const revenue = Number(revenueResult[0]?.value ?? 0);

    // Total bank debt = sum(principal + interest - paid)
    const debtResult = await db
      .select({
        value: sql<string>`COALESCE(SUM((${bankDebtsTable.principal_amount}::numeric + ${bankDebtsTable.interest_amount}::numeric) - ${bankDebtsTable.paid_amount}::numeric), 0)`,
      })
      .from(bankDebtsTable);
    const totalBankDebt = Number(debtResult[0]?.value ?? 0);

    // Total owner drawings
    const drawingsResult = await db
      .select({ value: sql<string>`COALESCE(SUM(${ownerDrawingsTable.amount}::numeric), 0)` })
      .from(ownerDrawingsTable);
    const totalOwnerDrawings = Number(drawingsResult[0]?.value ?? 0);

    // Product count
    const countResult = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(productsTable);
    const productCount = Number(countResult[0]?.count ?? 0);

    // Low stock (qty <= 5)
    const lowStockResult = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(productsTable)
      .where(sql`${productsTable.stock_qty} <= 5`);
    const lowStockCount = Number(lowStockResult[0]?.count ?? 0);

    res.json({
      stock_value: stockValue,
      revenue,
      total_bank_debt: totalBankDebt,
      total_owner_drawings: totalOwnerDrawings,
      product_count: productCount,
      low_stock_count: lowStockCount,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
