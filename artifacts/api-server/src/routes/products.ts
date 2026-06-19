import { Hono } from "hono";
import { db, productsTable, eq } from "@workspace/db";
import {
  CreateProductBody,
  UpdateProductBody,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
} from "@workspace/api-zod";

const router = new Hono();

router.get("/products", async (c) => {
  try {
    const products = await db.select().from(productsTable).orderBy(productsTable.created_at);
    return c.json(products.map(serializeProduct));
  } catch (err) {
    console.error("Failed to list products", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.post("/products", async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = CreateProductBody.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
  try {
    const [product] = await db.insert(productsTable).values({
      name: parsed.data.name,
      variant: parsed.data.variant ?? null,
      supplier_name: parsed.data.supplier_name ?? null,
      image_url: parsed.data.image_url ?? null,
      cost_price: String(parsed.data.cost_price),
      selling_price: String(parsed.data.selling_price),
      stock_qty: parsed.data.stock_qty,
    }).returning();
    return c.json(serializeProduct(product), 201);
  } catch (err) {
    console.error("Failed to create product", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.get("/products/:id", async (c) => {
  const params = GetProductParams.safeParse({ id: Number(c.req.param("id")) });
  if (!params.success) return c.json({ error: "Invalid id" }, 400);
  try {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
    if (!product) return c.json({ error: "Product not found" }, 404);
    return c.json(serializeProduct(product));
  } catch (err) {
    console.error("Failed to get product", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.patch("/products/:id", async (c) => {
  const params = UpdateProductParams.safeParse({ id: Number(c.req.param("id")) });
  if (!params.success) return c.json({ error: "Invalid id" }, 400);
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const bodyParsed = UpdateProductBody.safeParse(body);
  if (!bodyParsed.success) return c.json({ error: "Invalid request" }, 400);
  try {
    const updates: Record<string, unknown> = {};
    if (bodyParsed.data.name !== undefined) updates.name = bodyParsed.data.name;
    if (bodyParsed.data.variant !== undefined) updates.variant = bodyParsed.data.variant;
    if (bodyParsed.data.supplier_name !== undefined) updates.supplier_name = bodyParsed.data.supplier_name;
    if (bodyParsed.data.image_url !== undefined) updates.image_url = bodyParsed.data.image_url;
    if (bodyParsed.data.cost_price !== undefined) updates.cost_price = String(bodyParsed.data.cost_price);
    if (bodyParsed.data.selling_price !== undefined) updates.selling_price = String(bodyParsed.data.selling_price);
    if (bodyParsed.data.stock_qty !== undefined) updates.stock_qty = bodyParsed.data.stock_qty;
    const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, params.data.id)).returning();
    if (!product) return c.json({ error: "Product not found" }, 404);
    return c.json(serializeProduct(product));
  } catch (err) {
    console.error("Failed to update product", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

router.delete("/products/:id", async (c) => {
  const params = DeleteProductParams.safeParse({ id: Number(c.req.param("id")) });
  if (!params.success) return c.json({ error: "Invalid id" }, 400);
  try {
    await db.delete(productsTable).where(eq(productsTable.id, params.data.id));
    return c.body(null, 204);
  } catch (err) {
    console.error("Failed to delete product", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

function serializeProduct(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    variant: p.variant,
    supplier_name: p.supplier_name,
    image_url: p.image_url,
    cost_price: Number(p.cost_price),
    selling_price: Number(p.selling_price),
    stock_qty: p.stock_qty,
    created_at: p.created_at.toISOString(),
  };
}

export default router;
