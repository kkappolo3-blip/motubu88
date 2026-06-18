import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateProductBody,
  UpdateProductBody,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/products", async (req, res) => {
  try {
    const products = await db.select().from(productsTable).orderBy(productsTable.created_at);
    res.json(products.map(serializeProduct));
  } catch (err) {
    req.log.error({ err }, "Failed to list products");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/products", async (req, res) => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
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
    res.status(201).json(serializeProduct(product));
  } catch (err) {
    req.log.error({ err }, "Failed to create product");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/products/:id", async (req, res) => {
  const params = GetProductParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(serializeProduct(product));
  } catch (err) {
    req.log.error({ err }, "Failed to get product");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/products/:id", async (req, res) => {
  const params = UpdateProductParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateProductBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const updates: Record<string, unknown> = {};
    if (body.data.name !== undefined) updates.name = body.data.name;
    if (body.data.variant !== undefined) updates.variant = body.data.variant;
    if (body.data.supplier_name !== undefined) updates.supplier_name = body.data.supplier_name;
    if (body.data.image_url !== undefined) updates.image_url = body.data.image_url;
    if (body.data.cost_price !== undefined) updates.cost_price = String(body.data.cost_price);
    if (body.data.selling_price !== undefined) updates.selling_price = String(body.data.selling_price);
    if (body.data.stock_qty !== undefined) updates.stock_qty = body.data.stock_qty;

    const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, params.data.id)).returning();
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(serializeProduct(product));
  } catch (err) {
    req.log.error({ err }, "Failed to update product");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/products/:id", async (req, res) => {
  const params = DeleteProductParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(productsTable).where(eq(productsTable.id, params.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "Internal server error" });
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
