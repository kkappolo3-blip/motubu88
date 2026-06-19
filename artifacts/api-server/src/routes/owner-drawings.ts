import { Hono } from "hono";
import { db, ownerDrawingsTable, eq } from "@workspace/db";
import {
  CreateOwnerDrawingBody,
  UpdateOwnerDrawingBody,
  UpdateOwnerDrawingParams,
  DeleteOwnerDrawingParams,
} from "@workspace/api-zod";

const router = new Hono();

function serializeDrawing(d: typeof ownerDrawingsTable.$inferSelect) {
  return {
    id: d.id,
    description: d.description,
    amount: Number(d.amount),
    date: d.date,
    created_at: d.created_at.toISOString(),
  };
}

router.get("/owner-drawings", async (c) => {
  try {
    const drawings = await db.select().from(ownerDrawingsTable).orderBy(ownerDrawingsTable.created_at);
    return c.json(drawings.map(serializeDrawing));
  } catch (err) {
    console.error("Failed to list owner drawings", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.post("/owner-drawings", async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = CreateOwnerDrawingBody.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
  try {
    const [drawing] = await db.insert(ownerDrawingsTable).values({
      description: parsed.data.description,
      amount: String(parsed.data.amount),
      date: parsed.data.date,
    }).returning();
    return c.json(serializeDrawing(drawing), 201);
  } catch (err) {
    console.error("Failed to create owner drawing", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.patch("/owner-drawings/:id", async (c) => {
  const params = UpdateOwnerDrawingParams.safeParse({ id: Number(c.req.param("id")) });
  if (!params.success) return c.json({ error: "Invalid id" }, 400);
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const bodyParsed = UpdateOwnerDrawingBody.safeParse(body);
  if (!bodyParsed.success) return c.json({ error: "Invalid request" }, 400);
  try {
    const updates: Record<string, unknown> = {};
    if (bodyParsed.data.description !== undefined) updates.description = bodyParsed.data.description;
    if (bodyParsed.data.amount !== undefined) updates.amount = String(bodyParsed.data.amount);
    if (bodyParsed.data.date !== undefined) updates.date = bodyParsed.data.date;
    const [drawing] = await db.update(ownerDrawingsTable).set(updates).where(eq(ownerDrawingsTable.id, params.data.id)).returning();
    if (!drawing) return c.json({ error: "Owner drawing not found" }, 404);
    return c.json(serializeDrawing(drawing));
  } catch (err) {
    console.error("Failed to update owner drawing", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.delete("/owner-drawings/:id", async (c) => {
  const params = DeleteOwnerDrawingParams.safeParse({ id: Number(c.req.param("id")) });
  if (!params.success) return c.json({ error: "Invalid id" }, 400);
  try {
    await db.delete(ownerDrawingsTable).where(eq(ownerDrawingsTable.id, params.data.id));
    return c.body(null, 204);
  } catch (err) {
    console.error("Failed to delete owner drawing", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default router;
