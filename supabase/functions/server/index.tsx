import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { supabase } from "./supabase-client.tsx";
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
    // Check if already seeded by looking for the root space
    const { data: existing } = await supabase
      .from('spaces')
      .select('space_id')
      .eq('space_id', 1)
      .maybeSingle();

    if (existing) {
      return c.json({ message: "Already seeded", seeded: true });
    }
    await seedData();
    return c.json({ message: "Seed complete", seeded: true });
  } catch (e) {
    console.log("Seed error:", e);
    return c.json({ error: `Seed failed: ${e}` }, 500);
  }
});

// ── Reset (re-seed) ──
app.post("/make-server-d0cf987d/reset", async (c) => {
  try {
    // Delete all data (items first due to FK, then spaces, then categories)
    await supabase.from('items').delete().neq('item_id', -1);
    await supabase.from('spaces').delete().is('parent_id', null).not('space_id', 'eq', -1);
    // Delete remaining spaces (children first approach via multiple passes)
    // Since ON DELETE RESTRICT, we delete leaf nodes first
    for (let pass = 0; pass < 10; pass++) {
      const { data: remaining } = await supabase.from('spaces').select('space_id');
      if (!remaining || remaining.length === 0) break;
      // Find spaces that have no children
      const allIds = remaining.map((s: any) => s.space_id);
      const { data: parents } = await supabase
        .from('spaces')
        .select('parent_id')
        .in('parent_id', allIds);
      const parentIds = new Set((parents || []).map((p: any) => p.parent_id));
      const leafIds = allIds.filter((id: number) => !parentIds.has(id));
      if (leafIds.length === 0) break;
      await supabase.from('spaces').delete().in('space_id', leafIds);
    }
    await supabase.from('categories').delete().neq('category_id', -1);

    await seedData();
    return c.json({ message: "Reset complete" });
  } catch (e) {
    console.log("Reset error:", e);
    return c.json({ error: `Reset failed: ${e}` }, 500);
  }
});

// ════════════════════════════════════════════
// SPACES CRUD
// ════════════════════════════════════════════

app.get("/make-server-d0cf987d/spaces", async (c) => {
  try {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .order('space_id');
    if (error) throw error;
    return c.json(data);
  } catch (e) {
    console.log("GET spaces error:", e);
    return c.json({ error: `Failed to fetch spaces: ${e}` }, 500);
  }
});

app.get("/make-server-d0cf987d/spaces/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('space_id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return c.json({ error: "Space not found" }, 404);
    return c.json(data);
  } catch (e) {
    console.log("GET space error:", e);
    return c.json({ error: `Failed to fetch space: ${e}` }, 500);
  }
});

app.post("/make-server-d0cf987d/spaces", async (c) => {
  try {
    const body = await c.req.json();
    const { data, error } = await supabase
      .from('spaces')
      .insert({
        name: body.name,
        unit_type: body.unit_type,
        parent_id: body.parent_id ?? null,
        notes: body.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (e) {
    console.log("POST space error:", e);
    return c.json({ error: `Failed to create space: ${e}` }, 500);
  }
});

app.put("/make-server-d0cf987d/spaces/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    // Remove space_id from updates if present
    const { space_id, ...updates } = body;
    const { data, error } = await supabase
      .from('spaces')
      .update(updates)
      .eq('space_id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return c.json({ error: "Space not found" }, 404);
    return c.json(data);
  } catch (e) {
    console.log("PUT space error:", e);
    return c.json({ error: `Failed to update space: ${e}` }, 500);
  }
});

app.delete("/make-server-d0cf987d/spaces/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const mode = c.req.query("mode") ?? "promote";

    // Get the space to delete
    const { data: existing, error: fetchErr } = await supabase
      .from('spaces')
      .select('*')
      .eq('space_id', id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return c.json({ error: "Space not found" }, 404);

    if (mode === "cascade") {
      // Recursively find all descendant space IDs
      const descendantIds = await getDescendantIds(id);
      const allIds = [...descendantIds, id];

      // Unassign items pointing to any of these spaces
      await supabase
        .from('items')
        .update({ space_id: null })
        .in('space_id', allIds);

      // Delete spaces bottom-up (leaf nodes first to satisfy FK constraint)
      // Sort by depth (deepest first)
      for (let pass = 0; pass < 20; pass++) {
        const { data: remaining } = await supabase
          .from('spaces')
          .select('space_id')
          .in('space_id', allIds);
        if (!remaining || remaining.length === 0) break;

        const remainingIds = remaining.map((s: any) => s.space_id);
        // Find which of these are parents
        const { data: childrenOf } = await supabase
          .from('spaces')
          .select('parent_id')
          .in('parent_id', remainingIds);
        const parentSet = new Set((childrenOf || []).map((c: any) => c.parent_id));
        const leaves = remainingIds.filter((sid: number) => !parentSet.has(sid));
        if (leaves.length === 0) break;

        const { error: delErr } = await supabase
          .from('spaces')
          .delete()
          .in('space_id', leaves);
        if (delErr) throw delErr;
      }
    } else {
      // Promote: move children to this space's parent
      await supabase
        .from('spaces')
        .update({ parent_id: existing.parent_id })
        .eq('parent_id', id);

      // Unassign items pointing to this space
      await supabase
        .from('items')
        .update({ space_id: null })
        .eq('space_id', id);

      // Delete the space
      const { error: delErr } = await supabase
        .from('spaces')
        .delete()
        .eq('space_id', id);
      if (delErr) throw delErr;
    }

    return c.json({ message: "Deleted" });
  } catch (e) {
    console.log("DELETE space error:", e);
    return c.json({ error: `Failed to delete space: ${e}` }, 500);
  }
});

// Recursively get all descendant space IDs
async function getDescendantIds(parentId: number): Promise<number[]> {
  const { data: children } = await supabase
    .from('spaces')
    .select('space_id')
    .eq('parent_id', parentId);

  if (!children || children.length === 0) return [];

  const ids: number[] = [];
  for (const child of children) {
    ids.push(child.space_id);
    const grandchildren = await getDescendantIds(child.space_id);
    ids.push(...grandchildren);
  }
  return ids;
}

// ════════════════════════════════════════════
// CATEGORIES CRUD
// ════════════════════════════════════════════

app.get("/make-server-d0cf987d/categories", async (c) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('category_id');
    if (error) throw error;
    return c.json(data);
  } catch (e) {
    console.log("GET categories error:", e);
    return c.json({ error: `Failed to fetch categories: ${e}` }, 500);
  }
});

app.post("/make-server-d0cf987d/categories", async (c) => {
  try {
    const body = await c.req.json();
    const { data, error } = await supabase
      .from('categories')
      .insert({
        category_name: body.category_name,
        description: body.description ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (e) {
    console.log("POST category error:", e);
    return c.json({ error: `Failed to create category: ${e}` }, 500);
  }
});

app.put("/make-server-d0cf987d/categories/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    const { category_id, ...updates } = body;
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('category_id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return c.json({ error: "Category not found" }, 404);
    return c.json(data);
  } catch (e) {
    console.log("PUT category error:", e);
    return c.json({ error: `Failed to update category: ${e}` }, 500);
  }
});

app.delete("/make-server-d0cf987d/categories/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    // Check if any items reference this category
    const { data: items } = await supabase
      .from('items')
      .select('item_id')
      .eq('category_id', id)
      .limit(1);
    if (items && items.length > 0) {
      return c.json({ error: "Cannot delete category: items still reference it" }, 409);
    }
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('category_id', id);
    if (error) throw error;
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
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('item_id');
    if (error) throw error;
    return c.json(data);
  } catch (e) {
    console.log("GET items error:", e);
    return c.json({ error: `Failed to fetch items: ${e}` }, 500);
  }
});

app.get("/make-server-d0cf987d/items/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('item_id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return c.json({ error: "Item not found" }, 404);
    return c.json(data);
  } catch (e) {
    console.log("GET item error:", e);
    return c.json({ error: `Failed to fetch item: ${e}` }, 500);
  }
});

app.post("/make-server-d0cf987d/items", async (c) => {
  try {
    const body = await c.req.json();
    const now = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from('items')
      .insert({
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
      })
      .select()
      .single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (e) {
    console.log("POST item error:", e);
    return c.json({ error: `Failed to create item: ${e}` }, 500);
  }
});

app.put("/make-server-d0cf987d/items/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    const now = new Date().toISOString().split("T")[0];
    const { item_id, created_at, ...updates } = body;
    const { data, error } = await supabase
      .from('items')
      .update({ ...updates, updated_at: now })
      .eq('item_id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return c.json({ error: "Item not found" }, 404);
    return c.json(data);
  } catch (e) {
    console.log("PUT item error:", e);
    return c.json({ error: `Failed to update item: ${e}` }, 500);
  }
});

app.delete("/make-server-d0cf987d/items/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('item_id', id);
    if (error) throw error;
    return c.json({ message: "Deleted" });
  } catch (e) {
    console.log("DELETE item error:", e);
    return c.json({ error: `Failed to delete item: ${e}` }, 500);
  }
});

// Quantity update endpoint
app.put("/make-server-d0cf987d/items/:id/quantity", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const { quantity } = await c.req.json();
    const now = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from('items')
      .update({ quantity, updated_at: now })
      .eq('item_id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return c.json({ error: "Item not found" }, 404);
    return c.json(data);
  } catch (e) {
    console.log("PUT item quantity error:", e);
    return c.json({ error: `Failed to update quantity: ${e}` }, 500);
  }
});

Deno.serve(app.fetch);
