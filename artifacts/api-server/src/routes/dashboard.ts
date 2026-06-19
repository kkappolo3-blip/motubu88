import { Hono } from "hono";
import { db, productsTable, bankDebtsTable, ownerDrawingsTable, transactionsTable, sql, eq } from "@workspace/db";

const router = new Hono();

router.get("/dashboard/summary", async (c) => {
  try {
    const stockResult = await db
      .select({ value: sql<string>`COALESCE(SUM(${productsTable.cost_price}::numeric * ${productsTable.stock_qty}), 0)` })
      .from(productsTable);
    const stockValue = Number(stockResult[0]?.value ?? 0);

    const revenueResult = await db
      .select({ value: sql<string>`COALESCE(SUM(${transactionsTable.amount}::numeric), 0)` })
      .from(transactionsTable)
      .where(eq(transactionsTable.type, "income"));
    const revenue = Number(revenueResult[0]?.value ?? 0);

    const debtResult = await db
      .select({
        value: sql<string>`COALESCE(SUM((${bankDebtsTable.principal_amount}::numeric + ${bankDebtsTable.interest_amount}::numeric) - ${bankDebtsTable.paid_amount}::numeric), 0)`,
      })
      .from(bankDebtsTable);
    const totalBankDebt = Number(debtResult[0]?.value ?? 0);

    const drawingsResult = await db
      .select({ value: sql<string>`COALESCE(SUM(${ownerDrawingsTable.amount}::numeric), 0)` })
      .from(ownerDrawingsTable);
    const totalOwnerDrawings = Number(drawingsResult[0]?.value ?? 0);

    const countResult = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(productsTable);
    const productCount = Number(countResult[0]?.count ?? 0);

    const lowStockResult = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(productsTable)
      .where(sql`${productsTable.stock_qty} <= 5`);
    const lowStockCount = Number(lowStockResult[0]?.count ?? 0);

    return c.json({
      stock_value: stockValue,
      revenue,
      total_bank_debt: totalBankDebt,
      total_owner_drawings: totalOwnerDrawings,
      product_count: productCount,
      low_stock_count: lowStockCount,
    });
  } catch (err) {
    console.error("Failed to get dashboard summary", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default router;
