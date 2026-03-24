# InMan — Design Document

> Adapt this document to define your own project. Replace domain-specific content (categories, space hierarchy, seed data) while keeping the architecture, patterns, and tech stack as your starting point.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Database Schema](#4-database-schema)
5. [TypeScript Types](#5-typescript-types)
6. [Space Hierarchy](#6-space-hierarchy)
7. [API Contract](#7-api-contract)
8. [Zustand Store](#8-zustand-store)
9. [Frontend Pages](#9-frontend-pages)
10. [Layout & Navigation](#10-layout--navigation)
11. [Styling System](#11-styling-system)
12. [Seed Data](#12-seed-data)
13. [Deployment](#13-deployment)
14. [Future Considerations](#14-future-considerations)

---

## 1. Project Overview

**InMan** (Inventory Manager) is a personal household inventory tracking web application. The initial scope covers kitchen consumables — pantry items, condiments, spices, coffee, and similar goods.

### Original Vision (Multi-Phase Roadmap)
| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Spreadsheet prototype (Excel/Google Sheets) with schema validation | ✅ Done |
| 2 | CLI tool (Python/Node) with SQLite/JSON backend | Skipped |
| 3 | Web application with React frontend + Supabase backend | ✅ Current |
| 4 | Expand to other household categories (tool chests, hobbies, etc.) | Planned |

### Current State (Phase 3)
- 5-page React SPA deployed on Google Cloud Run
- Hono.js REST API running on Supabase Edge Functions (Deno)
- Supabase Postgres database with 3 relational tables
- 165 kitchen inventory items seeded across 12 categories and 55 storage spaces

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────┐
│  Browser                                             │
│  React SPA (Vite build, React Router, Zustand)       │
└──────────────────┬───────────────────────────────────┘
                   │ HTTP (fetch, Bearer token)
                   ▼
┌──────────────────────────────────────────────────────┐
│  Google Cloud Run                                    │
│  nginx:alpine serving static dist/ on :8080          │
│  (React bundle — no server-side logic here)          │
└──────────────────────────────────────────────────────┘
                   │ Direct API calls from browser
                   ▼
┌──────────────────────────────────────────────────────┐
│  Supabase Edge Functions (Deno runtime)              │
│  Hono.js REST API                                    │
│  Route prefix: /functions/v1/make-server-{slug}      │
└──────────────────┬───────────────────────────────────┘
                   │ @supabase/supabase-js (service role)
                   ▼
┌──────────────────────────────────────────────────────┐
│  Supabase Postgres                                   │
│  Tables: spaces, categories, items                   │
└──────────────────────────────────────────────────────┘
```

### Key Design Decisions
- **No server-side rendering** — pure SPA, all routing is client-side
- **Backend stays on Supabase** — Edge Functions are already "deployed"; only the frontend needs a cloud host
- **Credentials in source** — `utils/supabase/info.tsx` holds project ID and public anon key (acceptable for Supabase anon keys; service role key is env-var only)
- **No RLS** — designed for single-user personal use; add RLS policies to scale to multi-user
- **Zustand for state** — single global store, initialized on app mount via `store.initialize()`

---

## 3. Tech Stack

### Frontend
| Category | Package | Version |
|----------|---------|---------|
| Framework | react, react-dom | 18.3.1 |
| Routing | react-router | 7.13.0 |
| State | zustand | 5.0.11 |
| Forms | react-hook-form | 7.55.0 |
| Charts | recharts | 2.15.2 |
| Toasts | sonner | 2.0.3 |
| Date utils | date-fns | 3.6.0 |
| Animations | motion | 12.23.24 |

### UI Components
| Category | Package | Notes |
|----------|---------|-------|
| Primitives | @radix-ui/react-* (20+ packages) | Headless, accessible |
| Icons | lucide-react | 0.487.0 |
| Styling | tailwindcss | 4.1.12 |
| Style utils | tailwind-merge, clsx, class-variance-authority | shadcn/ui pattern |
| Theming | next-themes | Dark mode support |

### Build & Tooling
| Category | Package | Version |
|----------|---------|---------|
| Build tool | vite | 6.3.5 |
| React plugin | @vitejs/plugin-react | 4.7.0 |
| Tailwind plugin | @tailwindcss/vite | 4.1.12 |
| Package manager | pnpm | — |

### Backend (Supabase Edge Functions)
| Category | Package | Notes |
|----------|---------|-------|
| Server framework | hono (npm:hono) | Deno runtime |
| Supabase client | @supabase/supabase-js@2 (npm:) | Server-side, service role |
| Runtime | Deno | Edge Function environment |

---

## 4. Database Schema

Run these in the Supabase SQL Editor to create the tables:

```sql
-- Spaces (self-referencing hierarchy)
CREATE TABLE spaces (
  space_id   SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  unit_type  TEXT NOT NULL CHECK (unit_type IN (
               'premises','area','zone','section','sub-section','container','shelf'
             )),
  parent_id  INTEGER REFERENCES spaces(space_id) ON DELETE RESTRICT,
  notes      TEXT
);

-- Categories
CREATE TABLE categories (
  category_id   SERIAL PRIMARY KEY,
  category_name TEXT NOT NULL,
  description   TEXT
);

-- Items
CREATE TABLE items (
  item_id      SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  brand        TEXT,
  category_id  INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
  space_id     INTEGER REFERENCES spaces(space_id) ON DELETE SET NULL,
  quantity     NUMERIC NOT NULL DEFAULT 0,
  unit         TEXT NOT NULL DEFAULT 'count',
  expiry_date  DATE,
  min_stock    NUMERIC,
  barcode      TEXT,
  notes        TEXT,
  created_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at   DATE NOT NULL DEFAULT CURRENT_DATE
);
```

### Foreign Key Behaviors
| Constraint | Behavior |
|-----------|---------|
| `items.category_id` | `ON DELETE RESTRICT` — categories with items cannot be deleted (enforced at app layer with 409) |
| `items.space_id` | `ON DELETE SET NULL` — deleting a space unassigns its items |
| `spaces.parent_id` | `ON DELETE RESTRICT` — spaces with children cannot be deleted (promote/cascade handled at app layer) |

### After Seeding: Reset Sequences
```sql
SELECT setval('spaces_space_id_seq',     (SELECT MAX(space_id)    FROM spaces));
SELECT setval('categories_category_id_seq', (SELECT MAX(category_id) FROM categories));
SELECT setval('items_item_id_seq',        (SELECT MAX(item_id)     FROM items));
```

---

## 5. TypeScript Types

**File:** `src/app/data/types.ts`

```typescript
export type SpaceUnitType =
  | 'premises'
  | 'area'
  | 'zone'
  | 'section'
  | 'sub-section'
  | 'container'
  | 'shelf';

export interface Space {
  space_id:  number;
  name:      string;
  unit_type: SpaceUnitType;
  parent_id: number | null;   // null = root node
  notes:     string | null;
}

export interface Category {
  category_id:   number;
  category_name: string;
  description:   string | null;
}

export interface InventoryItem {
  item_id:     number;
  name:        string;
  brand:       string | null;
  category_id: number;
  space_id:    number | null;   // null = unassigned
  quantity:    number;
  unit:        string;          // 'count' | 'oz' | 'lbs' | 'g' | 'ml' | 'L' | 'pkg'
  expiry_date: string | null;   // ISO date string (YYYY-MM-DD)
  min_stock:   number | null;
  barcode:     string | null;
  notes:       string | null;
  created_at:  string;
  updated_at:  string;
}
```

---

## 6. Space Hierarchy

The `unit_type` field defines a 7-level semantic hierarchy. **No parent-child validation is enforced in code** — any type can be a child of any other. The ordering is a convention for UI display only.

| Level | unit_type | Icon | Tailwind Color | Description |
|-------|-----------|------|----------------|-------------|
| 1 | `premises` | 🏠 | `bg-slate-100 text-slate-700` | Whole property (e.g. "My House") |
| 2 | `area` | 🏡 | `bg-indigo-100 text-indigo-700` | Major functional area (e.g. "Kitchen") |
| 3 | `zone` | 📍 | `bg-violet-100 text-violet-700` | Logical zone within area (e.g. "Back", "Pantry") |
| 4 | `section` | 📦 | `bg-emerald-100 text-emerald-700` | Sub-area within zone (e.g. "Above", "Below") |
| 5 | `sub-section` | 🗂️ | `bg-teal-100 text-teal-700` | Nested section (e.g. sub-grouping within a section) |
| 6 | `container` | 🗄️ | `bg-amber-100 text-amber-700` | Storage unit (e.g. "Cabinet 1", "Drawer 2") |
| 7 | `shelf` | 📚 | `bg-sky-100 text-sky-700` | Individual shelf within a container |

---

## 7. API Contract

### Connection

**File:** `src/app/data/api.ts` and `utils/supabase/info.tsx`

```typescript
// Base URL pattern
const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-{slug}`;

// All requests include:
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`,
}
```

Replace `{slug}` with your Supabase Edge Function's deploy name.

---

### Admin Endpoints

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| `POST` | `/seed` | — | `{ message, seeded: boolean }` | Idempotent; checks if space_id=1 exists |
| `POST` | `/reset` | — | `{ message }` | Wipes all data and re-seeds |
| `GET` | `/health` | — | `{ status: "ok" }` | Health check |

---

### Spaces

| Method | Path | Query | Request Body | Response | Notes |
|--------|------|-------|--------------|----------|-------|
| `GET` | `/spaces` | — | — | `Space[]` | Ordered by space_id |
| `GET` | `/spaces/:id` | — | — | `Space` | 404 if not found |
| `POST` | `/spaces` | — | `{ name, unit_type, parent_id?, notes? }` | `Space` (201) | |
| `PUT` | `/spaces/:id` | — | `Partial<Space>` (no space_id) | `Space` | |
| `DELETE` | `/spaces/:id` | `mode` | — | `{ message }` | See delete modes below |

**Space Delete Modes:**

| mode | Behavior |
|------|---------|
| `promote` (default) | Move all direct children to the deleted space's parent; unassign items at this space only |
| `cascade` | Recursively delete all descendants; unassign items at any descendant space |

---

### Categories

| Method | Path | Request Body | Response | Notes |
|--------|------|--------------|----------|-------|
| `GET` | `/categories` | — | `Category[]` | Ordered by category_id |
| `POST` | `/categories` | `{ category_name, description? }` | `Category` (201) | |
| `PUT` | `/categories/:id` | `Partial<Category>` (no category_id) | `Category` | |
| `DELETE` | `/categories/:id` | — | `{ message }` | **409** if any items reference this category |

---

### Items

| Method | Path | Request Body | Response | Notes |
|--------|------|--------------|----------|-------|
| `GET` | `/items` | — | `InventoryItem[]` | Ordered by item_id |
| `GET` | `/items/:id` | — | `InventoryItem` | 404 if not found |
| `POST` | `/items` | `{ name, brand?, category_id, space_id?, quantity?, unit?, expiry_date?, min_stock?, barcode?, notes? }` | `InventoryItem` (201) | Auto-sets created_at/updated_at |
| `PUT` | `/items/:id` | `Partial<InventoryItem>` (no item_id, no created_at) | `InventoryItem` | Auto-updates updated_at |
| `DELETE` | `/items/:id` | — | `{ message }` | |
| `PUT` | `/items/:id/quantity` | `{ quantity: number }` | `InventoryItem` | Convenience endpoint; also updates updated_at |

**Item defaults on create:** `brand: null`, `space_id: null`, `quantity: 0`, `unit: 'count'`, all optional fields `null`.

---

### Backend Environment Variables (Supabase Edge Function)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL (e.g. `https://xxxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin access, never expose to client) |

---

## 8. Zustand Store

**File:** `src/app/data/store.ts`

```typescript
interface InManStore {
  // ── State ────────────────────────────────────────────
  items:      InventoryItem[];
  spaces:     Space[];
  categories: Category[];
  loading:    boolean;
  initialized: boolean;
  error:      string | null;

  // ── Filters ──────────────────────────────────────────
  searchQuery:           string;
  selectedCategoryFilter: number | null;
  selectedSpaceFilter:   number | null;

  // ── Filter Actions ───────────────────────────────────
  setSearchQuery:    (q: string) => void;
  setCategoryFilter: (id: number | null) => void;
  setSpaceFilter:    (id: number | null) => void;

  // ── Initialization ───────────────────────────────────
  // Calls api.seed(), then fetches all data in parallel.
  // Guarded by `initialized` + `loading` to prevent double-calls.
  initialize: () => Promise<void>;

  // ── Item Actions ─────────────────────────────────────
  addItem:            (item: Omit<InventoryItem, 'item_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateItem:         (id: number, updates: Partial<InventoryItem>) => Promise<void>;
  deleteItem:         (id: number) => Promise<void>;
  updateItemQuantity: (id: number, quantity: number) => Promise<void>;

  // ── Space Actions ────────────────────────────────────
  addSpace:    (space: Omit<Space, 'space_id'>) => Promise<void>;
  updateSpace: (id: number, updates: Partial<Space>) => Promise<void>;
  // After delete: refetches both spaces and items (promote/cascade affects both)
  deleteSpace: (id: number, mode: 'promote' | 'cascade') => Promise<void>;

  // ── Category Actions ─────────────────────────────────
  addCategory:    (cat: Omit<Category, 'category_id'>) => Promise<void>;
  updateCategory: (id: number, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;

  // ── Derived Helpers (non-reactive) ───────────────────
  getCategoryName: (id: number) => string;           // returns "Unknown" if not found
  getSpaceName:    (id: number | null) => string;    // null → "Unassigned"
  getSpacePath:    (id: number | null) => string;    // null → "Unassigned"; else "My House > Kitchen > Cabinet 1"
}
```

### Initialization Pattern
```typescript
// In Layout component (app shell):
useEffect(() => {
  store.initialize();
}, []);

// In initialize():
if (initialized || loading) return;
set({ loading: true });
await api.seed();  // idempotent — no-op if already seeded
const [items, spaces, categories] = await Promise.all([
  api.fetchItems(), api.fetchSpaces(), api.fetchCategories()
]);
set({ items, spaces, categories, initialized: true, loading: false });
```

---

## 9. Frontend Pages

### Routes (`src/app/routes.ts`)
```
/             → DashboardPage
/inventory    → InventoryPage
/spaces       → SpacesPage
/categories   → CategoriesPage
/low-stock    → LowStockPage
```
All nested under `Layout` (persistent sidebar + mobile nav).

---

### Dashboard (`/`)

**Purpose:** At-a-glance metrics and alerts.

**Stat Cards (4, responsive 2→4 col grid):**
- Total Items — count + sum of all quantities
- Categories — number of categories
- Spaces — total space nodes
- Low Stock — count of items at/below min_stock (amber/red highlight if > 0)

**Assignment Progress Bar:**
- `assignedCount / totalItems` — shows how many items have a space_id

**Charts:**
- Horizontal bar chart (Recharts) — items per category, sorted descending
- Pie chart (Recharts) — items by zone (unit_type === 'zone'), counts include all descendants via recursive `getDescendantIds()`

**Low Stock Preview:**
- First 8 items below threshold, "+ N more" indicator

**Store reads:** `items`, `categories`, `spaces`

---

### Inventory (`/inventory`)

**Purpose:** Full item CRUD with search and filtering.

**Table Columns:**
| Column | Hidden at |
|--------|-----------|
| Item name | — |
| Brand | < md |
| Category (badge) | — |
| Location (path) | < lg |
| Qty | — |
| Min Stock | < sm |
| Actions (edit/delete) | — |

**Filters:** Search (name or brand, case-insensitive) + Category dropdown. Pagination: 20 items/page.

**Add/Edit Dialog Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | text | ✅ | |
| Brand | text | | |
| Category | select | ✅ | |
| Quantity | number | ✅ | step="any", min=0 |
| Unit | select | ✅ | count, oz, lbs, g, ml, L, pkg |
| Min Stock | number | | |
| Location | select (tree) | | Indented tree dropdown |
| Expiry Date | date | | |
| Notes | text | | |

**UX:** Low-stock rows highlighted amber. "Low" badge on item name. Unassigned shows MapPinOff icon.

**Store reads/writes:** `items`, `categories`, `spaces`, `searchQuery`, `selectedCategoryFilter` → `addItem`, `updateItem`, `deleteItem`, `setSearchQuery`, `setCategoryFilter`

---

### Spaces (`/spaces`)

**Purpose:** Hierarchical storage space management.

**Hierarchy Bar (always visible):**
Shows all 7 unit types in order with icon, name, description, and count badge. Selected space's type gets a colored ring highlight.

**Tree View (left, lg:col-span-3):**
- Recursive tree with chevron expand/collapse per node
- Each node: icon + name + type badge + item count
- "Expand All" / "Collapse All" controls
- Indentation: `paddingLeft = depth * 24 + 12`

**Detail Panel (right, lg:col-span-2, sticky):**
- Header: icon, name, type badge, space_id, Edit/Delete buttons
- Breadcrumb: clickable path to root
- Properties: notes, parent link
- Children: list of direct child spaces (clickable)
- Items Here: items directly assigned to this space (not descendants)

**Add/Edit Dialog Fields:**
| Field | Type | Required |
|-------|------|----------|
| Name | text | ✅ |
| Type | select (7 options) | ✅ |
| Parent Space | select (indented tree) | |
| Notes | text | |

Parent dropdown excludes the space being edited and all its descendants (prevents circular refs).

**Delete Dialog:**
- No children: simple delete
- Has children: choice of "Delete & Promote Children" or "Delete All (cascade)"

**Store reads/writes:** `spaces`, `items` → `addSpace`, `updateSpace`, `deleteSpace`

---

### Categories (`/categories`)

**Purpose:** Read-only stats view per category.

**Display:** Responsive card grid (1→2→3 cols).

**Per Card:**
- Category name + percentage badge (% of all items)
- Description
- Item count, total quantity sum
- Progress bar (visual share of total)
- "X low stock" destructive badge if any items in category are below min_stock

Cards sorted by item count descending. 12-color cycling palette (red, orange, yellow, green, teal, cyan, blue, indigo, violet, purple, pink, rose).

**Store reads:** `items`, `categories` (no writes — read-only page)

---

### Low Stock (`/low-stock`)

**Purpose:** Focused restocking view with quick quantity adjustments.

**Low stock definition:** `item.min_stock !== null && item.quantity <= item.min_stock`

**Summary Cards (3):**
- Total Low Stock (amber)
- Out of Stock — quantity = 0 (red)
- Low but Available — quantity > 0 (green)

**Table Columns:**
| Column | Hidden at |
|--------|-----------|
| Status badge (Out/Low) | — |
| Item + Brand | — |
| Category | < md |
| Current quantity | — |
| Minimum | — |
| Adjust (−/+) | — |

Sorted by `quantity / min_stock` ratio ascending (most critical first). Row colors: red for out-of-stock, amber for low.

**Adjust buttons:** ± 1 quantity, calls `updateItemQuantity`. Minus disabled at 0.

**Empty state:** Check icon + "All stocked up!"

**Store reads/writes:** `items`, `categories` → `updateItemQuantity`

---

## 10. Layout & Navigation

**File:** `src/app/components/layout.tsx`

### Sidebar (Desktop, w-64, fixed)
- **Header:** ChefHat icon + "InMan" title + "Kitchen Inventory" subtitle
- **Nav items** (5, with active blue highlight):
  - Dashboard (LayoutDashboard icon) → `/`
  - Inventory (Package icon) → `/inventory`
  - Spaces (Box icon) → `/spaces`
  - Categories (Tags icon) → `/categories`
  - Low Stock (AlertTriangle icon) → `/low-stock` + red badge showing count
- **Footer:** version label + item count

### Mobile Nav
- Hamburger toggle (Menu/X icon)
- Full-screen overlay (z-50, bg-background/95)
- Closes on link click

### Initialization Lifecycle
```typescript
// On mount: store.initialize()
// While loading: centered Loader2 spinner + "Loading InMan..."
// On error: AlertTriangle + error message + retry button
// After init: render <Outlet /> (child routes)
```

**Low stock count:**
```typescript
items.filter(i => i.min_stock !== null && i.quantity <= i.min_stock).length
```

---

## 11. Styling System

**Files:** `src/styles/theme.css`, `src/styles/tailwind.css`, `src/styles/index.css`

### Design Tokens (CSS Custom Properties)

The theme uses **OKLCH color space** for perceptually uniform color transitions and accessible contrast.

```css
:root {
  /* Core */
  --background:  #ffffff;
  --foreground:  oklch(0.145 0 0);       /* near-black text */
  --primary:     #030213;                /* deep navy */
  --secondary:   oklch(0.95 0.0058 264.53); /* light purple */

  /* Semantic */
  --muted:       #ececf0;
  --accent:      #e9ebef;                /* hover states */
  --destructive: #d4183d;                /* errors/danger */
  --border:      rgba(0,0,0,0.1);

  /* Radius */
  --radius:      0.625rem;               /* base = 10px */
  /* Also: --radius-sm, --radius-md, --radius-lg, --radius-xl */

  /* Charts: --chart-1 through --chart-5 */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ...all tokens inverted for dark mode */
}
```

### Typography Defaults
- Headings (h1–h4): `font-weight: 500`, `line-height: 1.5`
- Labels, buttons: `font-weight: 500`
- Inputs: `font-weight: 400`

### Utility Pattern (shadcn/ui)
```typescript
// cn() helper in src/app/components/ui/utils.ts
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs) { return twMerge(clsx(inputs)); }

// Usage:
<div className={cn('base-class', condition && 'conditional-class', props.className)} />
```

---

## 12. Seed Data

**File:** `supabase/functions/server/seed.tsx`

Seeding is idempotent (upsert on primary key). Called automatically on app init via `POST /seed`. If `space_id=1` already exists, seed is skipped.

### Categories (12)
Snacks, Granola & Nuts, Coffee & K-Cups, Tea, Condiments & Sauces, Marinades, Canned & Jarred, Dry Goods — Rice/Pasta/Sides, Spices & Seasonings, Oils Vinegars & Dressings, Sweeteners & Baking, Salad Toppings

### Spaces (55) — Kitchen Hierarchy
```
My House (1, premises)
└─ Kitchen (2, area)
   ├─ Back (3, zone)
   │  ├─ Above (8, section) → Cabinet 1–5 (12–16, container)
   │  ├─ Microwave (9, section)
   │  ├─ Top (10, section)
   │  └─ Below (11, section) → Cabinet 1–4 (17–20), Drawer 1–4 (21–24)
   ├─ Center (4, zone)
   │  ├─ Top (25, section)
   │  ├─ Below Front (26, section) → Cabinet 1–2 (28–29), Drawer 1 (30)
   │  └─ Below Back (27, section) → Cabinet 1–2 (31–32)
   ├─ Side (5, zone)
   │  ├─ Above (33, section) → Tall Cabinet (36), Cabinet Above Fridge (37)
   │  ├─ Top (34, section)
   │  └─ Below (35, section) → Drawer 1–2 (38–39), Cabinet 1 (40), Trash Pullout (41)
   ├─ Pantry (6, zone)
   │  ├─ Shelves (42, section) → Shelf 1–5 (44–48)
   │  └─ Floor (43, section) → Left (55, section)
   └─ Fridge (7, zone)
      ├─ Main (49, section)
      ├─ Door (50, section) → Left (53), Right (54) [containers]
      ├─ Crisper (51, section)
      └─ Freezer (52, section)
```

### Items (165)
All items start with `space_id: null` (unassigned — to be placed as items are returned to shelves).

| Category | Count |
|----------|-------|
| Snacks | 23 |
| Condiments & Sauces | 20 |
| Spices & Seasonings | 30 |
| Dry Goods | 21 |
| Tea | 13 |
| Sweeteners & Baking | 13 |
| Coffee & K-Cups | 9 |
| Marinades | 9 |
| Oils, Vinegars & Dressings | 11 |
| Granola & Nuts | 7 |
| Canned & Jarred | 6 |
| Salad Toppings | 3 |

---

## 13. Deployment

### Local Development
```bash
npm run dev        # Vite dev server on :5173
```

### Build & Test Locally with Docker
```bash
docker build -t inman-test .
docker run -p 8080:8080 inman-test
# → http://localhost:8080
# Test deep links: http://localhost:8080/spaces, /inventory (must NOT 404)
```

### Deploy to Google Cloud Run (Frontend)

```bash
# 1. Authenticate
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID

# 2. Enable APIs (first time only)
gcloud services enable run.googleapis.com artifactregistry.googleapis.com

# 3. Create Artifact Registry repo (first time only)
gcloud artifacts repositories create inman \
  --repository-format=docker \
  --location=us-central1

# 4. Configure Docker auth
gcloud auth configure-docker us-central1-docker.pkg.dev

# 5. Build and push
docker build -t us-central1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/inman/frontend .
docker push us-central1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/inman/frontend

# 6. Deploy
gcloud run deploy inman-frontend \
  --image us-central1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/inman/frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

### Deploy Backend (Supabase Edge Function)

```bash
# Install Supabase CLI if needed
npm install -g supabase

supabase login
supabase functions deploy server --project-ref YOUR_PROJECT_REF
```

### Container Files
| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage: node:20-alpine builds Vite, nginx:alpine serves on :8080 |
| `nginx.conf` | SPA routing (`try_files ... /index.html`), gzip, port 8080 |
| `.dockerignore` | Excludes `node_modules`, `dist`, `.git`, markdown, guidelines |

---

## 14. Future Considerations

These are noted in the original project documents and are ready to build on top of this foundation:

| Feature | Notes |
|---------|-------|
| **Barcode scanning** | `barcode` field already exists on items; ready for camera/scanner integration |
| **Multi-room expansion** | Space hierarchy supports arbitrary depth — add `tool-chest`, `garage`, etc. as new premises/areas |
| **Supabase Realtime** | Swap `fetchItems()` for `supabase.channel().on('postgres_changes', ...)` for multi-device sync |
| **RLS (Row Level Security)** | Add `user_id` to tables + RLS policies to support multiple users per Supabase project |
| **Mobile app** | Schema and API are already mobile-ready; build a React Native or Flutter client against the same API |
| **Expiry tracking** | `expiry_date` field exists; add a dashboard alert for soon-to-expire items |
| **Shopping list** | Derive from low-stock items; export or share as a list |
| **Import/Export** | CSV import/export for bulk item management |
