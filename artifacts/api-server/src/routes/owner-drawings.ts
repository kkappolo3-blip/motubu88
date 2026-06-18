import { Router } from "express";
import { db, ownerDrawingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateOwnerDrawingBody,
  UpdateOwnerDrawingBody,
  UpdateOwnerDrawingParams,
  DeleteOwnerDrawingParams,
} from "@workspace/api-zod";

const router = Router();

function serializeDrawing(d: typeof ownerDrawingsTable.$inferSelect) {
  return {
    id: d.id,
    description: d.description,
    amount: Number(d.amount),
    date: d.date,
    created_at: d.created_at.toISOString(),
  };
}

router.get("/owner-drawings", async (req, res) => {
  try {
    const drawings = await db.select().from(ownerDrawingsTable).orderBy(ownerDrawingsTable.created_at);
    res.json(drawings.map(serializeDrawing));
  } catch (err) {
    req.log.error({ err }, "Failed to list owner drawings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/owner-drawings", async (req, res) => {
  const parsed = CreateOwnerDrawingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [drawing] = await db.insert(ownerDrawingsTable).values({
      description: parsed.data.description,
      amount: String(parsed.data.amount),
      date: parsed.data.date,
    }).returning();
    res.status(201).json(serializeDrawing(drawing));
  } catch (err) {
    req.log.error({ err }, "Failed to create owner drawing");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/owner-drawings/:id", async (req, res) => {
  const params = UpdateOwnerDrawingParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateOwnerDrawingBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const updates: Record<string, unknown> = {};
    if (body.data.description !== undefined) updates.description = body.data.description;
    if (body.data.amount !== undefined) updates.amount = String(body.data.amount);
    if (body.data.date !== undefined) updates.date = body.data.date;

    const [drawing] = await db.update(ownerDrawingsTable).set(updates).where(eq(ownerDrawingsTable.id, params.data.id)).returning();
    if (!drawing) {
      res.status(404).json({ error: "Owner drawing not found" });
      return;
    }
    res.json(serializeDrawing(drawing));
  } catch (err) {
    req.log.error({ err }, "Failed to update owner drawing");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/owner-drawings/:id", async (req, res) => {
  const params = DeleteOwnerDrawingParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(ownerDrawingsTable).where(eq(ownerDrawingsTable.id, params.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete owner drawing");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
