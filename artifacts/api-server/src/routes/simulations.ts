import { Hono } from "hono";
import { db, simulationOrdersTable, productsTable, eq, sql } from "@workspace/db";
import {
  CreateSimulationBody,
  UpdateSimulationBody,
  GetSimulationParams,
  UpdateSimulationParams,
  DeleteSimulationParams,
  CommitSimulationParams,
} from "@workspace/api-zod";

const router = new Hono();

function calcTotal(
  items: Array<{ quantity: number; unit_price: number }>,
  adjustments: Array<{ amount: number }>,
): number {
  const itemTotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const adjTotal = adjustments.reduce((sum, a) => sum + a.amount, 0);
  return itemTotal + adjTotal;
}

function serializeSim(s: typeof simulationOrdersTable.$inferSelect) {
  return {
    id: s.id,
    supplier_name: s.supplier_name,
    total_cost: Number(s.total_cost),
    items: s.items as Array<{ product_name: string; variant: string | null; quantity: number; unit_price: number }>,
    adjustments: s.adjustments as Array<{ label: string; amount: number }>,
    status: s.status,
    created_at: s.created_at.toISOString(),
  };
}

router.get("/simulations", async (c) => {
  try {
    const sims = await db.select().from(simulationOrdersTable).orderBy(simulationOrdersTable.created_at);
    return c.json(sims.map(serializeSim));
  } catch (err) {
    console.error("Failed to list simulations", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.post("/simulations", async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = CreateSimulationBody.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
  try {
    const items = parsed.data.items ?? [];
    const adjustments = parsed.data.adjustments ?? [];
    const total = calcTotal(items, adjustments);
    const [sim] = await db.insert(simulationOrdersTable).values({
      supplier_name: parsed.data.supplier_name,
      total_cost: String(total),
      items,
      adjustments,
      status: "draft",
    }).returning();
    return c.json(serializeSim(sim), 201);
  } catch (err) {
    console.error("Failed to create simulation", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.get("/simulations/:id", async (c) => {
  const params = GetSimulationParams.safeParse({ id: Number(c.req.param("id")) });
  if (!params.success) return c.json({ error: "Invalid id" }, 400);
  try {
    const [sim] = await db.select().from(simulationOrdersTable).where(eq(simulationOrdersTable.id, params.data.id));
    if (!sim) return c.json({ error: "Simulation not found" }, 404);
    return c.json(serializeSim(sim));
  } catch (err) {
    console.error("Failed to get simulation", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.patch("/simulations/:id", async (c) => {
  const params = UpdateSimulationParams.safeParse({ id: Number(c.req.param("id")) });
  if (!params.success) return c.json({ error: "Invalid id" }, 400);
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const bodyParsed = UpdateSimulationBody.safeParse(body);
  if (!bodyParsed.success) return c.json({ error: "Invalid request" }, 400);
  try {
    const updates: Record<string, unknown> = {};
    if (bodyParsed.data.supplier_name !== undefined) updates.supplier_name = bodyParsed.data.supplier_name;
    if (bodyParsed.data.items !== undefined) updates.items = bodyParsed.data.items;
    if (bodyParsed.data.adjustments !== undefined) updates.adjustments = bodyParsed.data.adjustments;
    if (bodyParsed.data.status !== undefined) updates.status = bodyParsed.data.status;

    const items = (bodyParsed.data.items ?? []) as Array<{ quantity: number; unit_price: number }>;
    const adjs = (bodyParsed.data.adjustments ?? []) as Array<{ amount: number }>;
    if (bodyParsed.data.items !== undefined || bodyParsed.data.adjustments !== undefined) {
      updates.total_cost = String(calcTotal(items, adjs));
    }

    const [sim] = await db.update(simulationOrdersTable).set(updates).where(eq(simulationOrdersTable.id, params.data.id)).returning();
    if (!sim) return c.json({ error: "Simulation not found" }, 404);
    return c.json(serializeSim(sim));
  } catch (err) {
    console.error("Failed to update simulation", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.delete("/simulations/:id", async (c) => {
  const params = DeleteSimulationParams.safeParse({ id: Number(c.req.param("id")) });
  if (!params.success) return c.json({ error: "Invalid id" }, 400);
  try {
    await db.delete(simulationOrdersTable).where(eq(simulationOrdersTable.id, params.data.id));
    return c.body(null, 204);
  } catch (err) {
    console.error("Failed to delete simulation", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.post("/simulations/:id/commit", async (c) => {
  const params = CommitSimulationParams.safeParse({ id: Number(c.req.param("id")) });
  if (!params.success) return c.json({ error: "Invalid id" }, 400);
  try {
    const [sim] = await db.select().from(simulationOrdersTable).where(eq(simulationOrdersTable.id, params.data.id));
    if (!sim) return c.json({ error: "Simulation not found" }, 404);
    if (sim.status === "committed") return c.json({ error: "Simulation already committed" }, 400);

    const items = sim.items as Array<{ product_name: string; variant: string | null; quantity: number; unit_price: number }>;

    for (const item of items) {
      const existing = await db.select().from(productsTable).where(eq(productsTable.name, item.product_name));
      if (existing.length > 0) {
        await db.update(productsTable)
          .set({ stock_qty: sql`${productsTable.stock_qty} + ${item.quantity}` })
          .where(eq(productsTable.id, existing[0].id));
      } else {
        await db.insert(productsTable).values({
          name: item.product_name,
          variant: item.variant ?? null,
          supplier_name: sim.supplier_name,
          image_url: null,
          cost_price: String(item.unit_price),
          selling_price: String(Math.round(item.unit_price * 1.3)),
          stock_qty: item.quantity,
        });
      }
    }

    const [updated] = await db.update(simulationOrdersTable)
      .set({ status: "committed" })
      .where(eq(simulationOrdersTable.id, params.data.id))
      .returning();

    return c.json(serializeSim(updated));
  } catch (err) {
    console.error("Failed to commit simulation", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default router;
