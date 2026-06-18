import { Router } from "express";
import { db, simulationOrdersTable, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateSimulationBody,
  UpdateSimulationBody,
  GetSimulationParams,
  UpdateSimulationParams,
  DeleteSimulationParams,
  CommitSimulationParams,
} from "@workspace/api-zod";

const router = Router();

function calcTotal(
  items: Array<{ quantity: number; unit_price: number }>,
  adjustments: Array<{ amount: number }>
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

router.get("/simulations", async (req, res) => {
  try {
    const sims = await db.select().from(simulationOrdersTable).orderBy(simulationOrdersTable.created_at);
    res.json(sims.map(serializeSim));
  } catch (err) {
    req.log.error({ err }, "Failed to list simulations");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/simulations", async (req, res) => {
  const parsed = CreateSimulationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
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
    res.status(201).json(serializeSim(sim));
  } catch (err) {
    req.log.error({ err }, "Failed to create simulation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/simulations/:id", async (req, res) => {
  const params = GetSimulationParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [sim] = await db.select().from(simulationOrdersTable).where(eq(simulationOrdersTable.id, params.data.id));
    if (!sim) {
      res.status(404).json({ error: "Simulation not found" });
      return;
    }
    res.json(serializeSim(sim));
  } catch (err) {
    req.log.error({ err }, "Failed to get simulation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/simulations/:id", async (req, res) => {
  const params = UpdateSimulationParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateSimulationBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const updates: Record<string, unknown> = {};
    if (body.data.supplier_name !== undefined) updates.supplier_name = body.data.supplier_name;
    if (body.data.items !== undefined) updates.items = body.data.items;
    if (body.data.adjustments !== undefined) updates.adjustments = body.data.adjustments;
    if (body.data.status !== undefined) updates.status = body.data.status;

    const items = (body.data.items ?? []) as Array<{ quantity: number; unit_price: number }>;
    const adjs = (body.data.adjustments ?? []) as Array<{ amount: number }>;
    if (body.data.items !== undefined || body.data.adjustments !== undefined) {
      updates.total_cost = String(calcTotal(items, adjs));
    }

    const [sim] = await db.update(simulationOrdersTable).set(updates).where(eq(simulationOrdersTable.id, params.data.id)).returning();
    if (!sim) {
      res.status(404).json({ error: "Simulation not found" });
      return;
    }
    res.json(serializeSim(sim));
  } catch (err) {
    req.log.error({ err }, "Failed to update simulation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/simulations/:id", async (req, res) => {
  const params = DeleteSimulationParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(simulationOrdersTable).where(eq(simulationOrdersTable.id, params.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete simulation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/simulations/:id/commit", async (req, res) => {
  const params = CommitSimulationParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [sim] = await db.select().from(simulationOrdersTable).where(eq(simulationOrdersTable.id, params.data.id));
    if (!sim) {
      res.status(404).json({ error: "Simulation not found" });
      return;
    }
    if (sim.status === "committed") {
      res.status(400).json({ error: "Simulation already committed" });
      return;
    }

    const items = sim.items as Array<{ product_name: string; variant: string | null; quantity: number; unit_price: number }>;

    // Add each simulation item to products (upsert by name+variant)
    for (const item of items) {
      const existing = await db.select().from(productsTable)
        .where(eq(productsTable.name, item.product_name));
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

    res.json(serializeSim(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to commit simulation");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
