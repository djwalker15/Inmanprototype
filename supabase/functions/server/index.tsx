import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { seedData } from "./seed.tsx";

const app = new Hono();

app.use('*', logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ── Health ──
app.get("/make-server-d0cf987d/health", (c) => c.json({ status: "ok" }));

// ── Seed ──
app.post("/make-server-d0cf987d/seed", async (c) => {
  try {
    // Check if already seeded
    const existing = await kv.get("meta:seeded");
    if (existing) {
      return c.json({ message: "Already seeded", seeded: true });
    }
    await seedData();
    await kv.set("meta:seeded", true);
    return c.json({ message: "Seed complete", seeded: true });
  } catch (e) {
    console.log("Seed error:", e);
    return c.json({ error: `Seed failed: ${e}` }, 500);
  }
});

// ── Reset (re-seed) ──
app.post("/make-server-d0cf987d/reset", async (c) => {
  try {
    // Delete all existing data
    const spaces = await kv.getByPrefix("space:");
    const items = await kv.getByPrefix("item:");
    const cats = await kv.getByPrefix("category:");

    const allSpaceKeys = (await getAllKeys("space:"));
    const allItemKeys = (await getAllKeys("item:"));
    const allCatKeys = (await getAllKeys("category:"));
    const metaKeys = ["meta:seeded", "meta:next_space_id", "meta:next_item_id", "meta:next_category_id"];

    const allKeys = [...allSpaceKeys, ...allItemKeys, ...allCatKeys, ...metaKeys];
    if (allKeys.length > 0) {
      await kv.mdel(allKeys);
    }

    await seedData();
    await kv.set("meta:seeded", true);
    return c.json({ message: "Reset complete" });
  } catch (e) {
    console.log("Reset error:", e);
    return c.json({ error: `Reset failed: ${e}` }, 500);
  }
});

// Helper: get all keys with prefix (kv.getByPrefix returns values, we need keys too)
async function getAllKeys(prefix: string): Promise<string[]> {
  // We store each entity with key = prefix + id, so we can reconstruct
  const values = await kv.getByPrefix(prefix);
  // Each value has an id field - reconstruct key from it
  return values.map((v: any) => {
    if (v.space_id !== undefined) return `space:${v.space_id}`;
    if (v.item_id !== undefined) return `item:${v.item_id}`;
    if (v.category_id !== undefined) return `category:${v.category_id}`;
    return "";
  }).filter(Boolean);
}

// ════════════════════════════════════════════
// SPACES CRUD
// ════════════════════════════════════════════

app.get("/make-server-d0cf987d/spaces", async (c) => {
  try {
    const spaces = await kv.getByPrefix("space:");
    return c.json(spaces);
  } catch (e) {
    console.log("GET spaces error:", e);
    return c.json({ error: `Failed to fetch spaces: ${e}` }, 500);
  }
});

app.get("/make-server-d0cf987d/spaces/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const space = await kv.get(`space:${id}`);
    if (!space) return c.json({ error: "Space not found" }, 404);
    return c.json(space);
  } catch (e) {
    console.log("GET space error:", e);
    return c.json({ error: `Failed to fetch space: ${e}` }, 500);
  }
});

app.post("/make-server-d0cf987d/spaces", async (c) => {
  try {
    const body = await c.req.json();
    const nextId = ((await kv.get("meta:next_space_id")) ?? 1);
    const space = {
      space_id: nextId,
      name: body.name,
      unit_type: body.unit_type,
      parent_id: body.parent_id ?? null,
      notes: body.notes ?? null,
    };
    await kv.set(`space:${nextId}`, space);
    await kv.set("meta:next_space_id", nextId + 1);
    return c.json(space, 201);
  } catch (e) {
    console.log("POST space error:", e);
    return c.json({ error: `Failed to create space: ${e}` }, 500);
  }
});

app.put("/make-server-d0cf987d/spaces/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const existing = await kv.get(`space:${id}`);
    if (!existing) return c.json({ error: "Space not found" }, 404);
    const body = await c.req.json();
    const updated = { ...existing, ...body, space_id: id };
    await kv.set(`space:${id}`, updated);
    return c.json(updated);
  } catch (e) {
    console.log("PUT space error:", e);
    return c.json({ error: `Failed to update space: ${e}` }, 500);
  }
});

app.delete("/make-server-d0cf987d/spaces/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const mode = c.req.query("mode") ?? "promote"; // "promote" or "cascade"
    const existing = await kv.get(`space:${id}`);
    if (!existing) return c.json({ error: "Space not found" }, 404);

    const allSpaces = await kv.getByPrefix("space:");
    const allItems = await kv.getByPrefix("item:");

    if (mode === "cascade") {
      // Recursively find all descendants
      const toDelete = getDescendantSpaceIds(id, allSpaces);
      toDelete.push(id);

      // Unassign items pointing to any deleted space
      const affectedItems = allItems.filter((i: any) => i.space_id !== null && toDelete.includes(i.space_id));
      for (const item of affectedItems) {
        await kv.set(`item:${item.item_id}`, { ...item, space_id: null });
      }

      // Delete all spaces
      await kv.mdel(toDelete.map(sid => `space:${sid}`));
    } else {
      // Promote: move children to this space's parent
      const children = allSpaces.filter((s: any) => s.parent_id === id);
      for (const child of children) {
        await kv.set(`space:${child.space_id}`, { ...child, parent_id: existing.parent_id });
      }

      // Unassign items pointing to this space
      const affectedItems = allItems.filter((i: any) => i.space_id === id);
      for (const item of affectedItems) {
        await kv.set(`item:${item.item_id}`, { ...item, space_id: null });
      }

      await kv.del(`space:${id}`);
    }

    return c.json({ message: "Deleted" });
  } catch (e) {
    console.log("DELETE space error:", e);
    return c.json({ error: `Failed to delete space: ${e}` }, 500);
  }
});

function getDescendantSpaceIds(parentId: number, allSpaces: any[]): number[] {
  const children = allSpaces.filter((s: any) => s.parent_id === parentId);
  const ids: number[] = [];
  for (const child of children) {
    ids.push(child.space_id);
    ids.push(...getDescendantSpaceIds(child.space_id, allSpaces));
  }
  return ids;
}

// ════════════════════════════════════════════
// CATEGORIES CRUD
// ════════════════════════════════════════════

app.get("/make-server-d0cf987d/categories", async (c) => {
  try {
    const categories = await kv.getByPrefix("category:");
    return c.json(categories);
  } catch (e) {
    console.log("GET categories error:", e);
    return c.json({ error: `Failed to fetch categories: ${e}` }, 500);
  }
});

app.post("/make-server-d0cf987d/categories", async (c) => {
  try {
    const body = await c.req.json();
    const nextId = ((await kv.get("meta:next_category_id")) ?? 1);
    const cat = {
      category_id: nextId,
      category_name: body.category_name,
      description: body.description ?? null,
    };
    await kv.set(`category:${nextId}`, cat);
    await kv.set("meta:next_category_id", nextId + 1);
    return c.json(cat, 201);
  } catch (e) {
    console.log("POST category error:", e);
    return c.json({ error: `Failed to create category: ${e}` }, 500);
  }
});

app.put("/make-server-d0cf987d/categories/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const existing = await kv.get(`category:${id}`);
    if (!existing) return c.json({ error: "Category not found" }, 404);
    const body = await c.req.json();
    const updated = { ...existing, ...body, category_id: id };
    await kv.set(`category:${id}`, updated);
    return c.json(updated);
  } catch (e) {
    console.log("PUT category error:", e);
    return c.json({ error: `Failed to update category: ${e}` }, 500);
  }
});

app.delete("/make-server-d0cf987d/categories/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    await kv.del(`category:${id}`);
    return c.json({ message: "Deleted" });
  } catch (e) {
    console.log("DELETE category error:", e);
    return c.json({ error: `Failed to delete category: ${e}` }, 500);
  }
});

// ════════════════════════════════════════════
// ITEMS CRUD
// ════════════════════════════════════════════

app.get("/make-server-d0cf987d/items", async (c) => {
  try {
    const items = await kv.getByPrefix("item:");
    return c.json(items);
  } catch (e) {
    console.log("GET items error:", e);
    return c.json({ error: `Failed to fetch items: ${e}` }, 500);
  }
});

app.get("/make-server-d0cf987d/items/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const item = await kv.get(`item:${id}`);
    if (!item) return c.json({ error: "Item not found" }, 404);
    return c.json(item);
  } catch (e) {
    console.log("GET item error:", e);
    return c.json({ error: `Failed to fetch item: ${e}` }, 500);
  }
});

app.post("/make-server-d0cf987d/items", async (c) => {
  try {
    const body = await c.req.json();
    const nextId = ((await kv.get("meta:next_item_id")) ?? 1);
    const now = new Date().toISOString().split("T")[0];
    const item = {
      item_id: nextId,
      name: body.name,
      brand: body.brand ?? null,
      category_id: body.category_id,
      space_id: body.space_id ?? null,
      quantity: body.quantity ?? 0,
      unit: body.unit ?? "count",
      expiry_date: body.expiry_date ?? null,
      min_stock: body.min_stock ?? null,
      barcode: body.barcode ?? null,
      notes: body.notes ?? null,
      created_at: now,
      updated_at: now,
    };
    await kv.set(`item:${nextId}`, item);
    await kv.set("meta:next_item_id", nextId + 1);
    return c.json(item, 201);
  } catch (e) {
    console.log("POST item error:", e);
    return c.json({ error: `Failed to create item: ${e}` }, 500);
  }
});

app.put("/make-server-d0cf987d/items/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const existing = await kv.get(`item:${id}`);
    if (!existing) return c.json({ error: "Item not found" }, 404);
    const body = await c.req.json();
    const now = new Date().toISOString().split("T")[0];
    const updated = { ...existing, ...body, item_id: id, updated_at: now };
    await kv.set(`item:${id}`, updated);
    return c.json(updated);
  } catch (e) {
    console.log("PUT item error:", e);
    return c.json({ error: `Failed to update item: ${e}` }, 500);
  }
});

app.delete("/make-server-d0cf987d/items/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    await kv.del(`item:${id}`);
    return c.json({ message: "Deleted" });
  } catch (e) {
    console.log("DELETE item error:", e);
    return c.json({ error: `Failed to delete item: ${e}` }, 500);
  }
});

// Bulk update items (for quick quantity adjustments)
app.put("/make-server-d0cf987d/items/:id/quantity", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const existing = await kv.get(`item:${id}`);
    if (!existing) return c.json({ error: "Item not found" }, 404);
    const { quantity } = await c.req.json();
    const now = new Date().toISOString().split("T")[0];
    const updated = { ...existing, quantity, updated_at: now };
    await kv.set(`item:${id}`, updated);
    return c.json(updated);
  } catch (e) {
    console.log("PUT item quantity error:", e);
    return c.json({ error: `Failed to update quantity: ${e}` }, 500);
  }
});

Deno.serve(app.fetch);
