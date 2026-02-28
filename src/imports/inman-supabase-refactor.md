# InMan — Refactor & Supabase Integration Reference

**Generated:** February 28, 2026  
**Scope:** Data model redesign decisions made prior to Supabase integration  
**Purpose:** Reference this document when migrating from mock data to a live Supabase backend

---

## 1. Core Conceptual Changes

### 1.1 Terminology: "Location" → "Space"

The term **Location** is retired as a name for organizational entities. Going forward:

- A **Space** is any physical node in the organizational hierarchy (a house, a room, a cabinet, a shelf, etc.)
- A **location** is a *property of an item* — it describes where an item currently resides. On the items table this becomes `space_id`, a foreign key pointing to a Space row.

This distinction matters: the nav item, page component, store methods, and database table should all use "space" / "spaces" language. The inventory form will ask "Where is this item stored?" and the answer is a `space_id`.

### 1.2 Terminology: "display_name" → "name" (short names only)

Spaces previously used a fully-qualified `display_name` like `"Back · Above · Cabinet 1"`. This is retired. Each Space now has a short `name` that describes only *that node*, e.g. `"Cabinet 1"`, `"Kitchen"`, `"My House"`.

The full path (e.g. `My House > Kitchen > Back > Above > Cabinet 1`) is always **derived at runtime** by walking the `parent_id` chain up to the root. It is never stored. The existing breadcrumb logic in the UI already does this correctly and can be adapted.

### 1.3 Dropped Fields

The following fields existed on the old `Location` type as a workaround for the lack of a true hierarchy. They are **removed entirely**:

| Field | Why removed |
|---|---|
| `area` | Captured by the Space's ancestor nodes |
| `position` | Captured by the Space's ancestor nodes |
| `sub_position` | Captured by the Space's ancestor nodes |

---

## 2. The Spaces Table

### 2.1 Schema

```sql
create table spaces (
  space_id    serial primary key,
  name        text not null,
  unit_type   text not null check (unit_type in ('premises', 'area', 'zone', 'section', 'container', 'shelf')),
  parent_id   integer references spaces(space_id) on delete restrict,
  notes       text
);
```

`parent_id` is `null` only for the root-level Premises node. Every other Space must have a parent.

### 2.2 Unit Types

The hierarchy flows strictly top-to-bottom. Not every level needs to be present in a given path — e.g. a zone can sit directly under an area without a section in between.

| unit_type | Description | Example |
|---|---|---|
| `premises` | A physical property | My House |
| `area` | A named room or functional area within a premises | Kitchen, Bar |
| `zone` | A named region within an area | Back, Center, Side, Pantry, Fridge |
| `section` | A positional subdivision of a zone | Above, Below, Top |
| `container` | Any physical storage unit | Cabinet 1, Drawer 2, Trash Bin |
| `shelf` | A shelf within a container or pantry | Shelf 1, Shelf 3 |

**Important:** The old `unit_type` values of `cabinet`, `drawer`, and `compartment` are all consolidated into `container`. The distinction between them (if needed for display) can live in the `name` field (e.g., "Drawer 1") or a future `subtype` field.

### 2.3 Seed Data — Root Nodes to Add

The existing 53 locations need two new ancestor rows added above them. All current Zone-level rows (Back, Center, Side, Pantry, Fridge) should have their `parent_id` updated to point to the new Kitchen area row.

```sql
-- Row 1: root premises
insert into spaces (name, unit_type, parent_id, notes)
values ('My House', 'premises', null, null);

-- Row 2: kitchen area (parent = My House)
insert into spaces (name, unit_type, parent_id, notes)
values ('Kitchen', 'area', <my_house_space_id>, null);

-- Then update all existing zone rows to parent Kitchen
update spaces set parent_id = <kitchen_space_id>
where unit_type = 'zone';
```

### 2.4 Migration of Existing 53 Rows

When migrating `mock-data.ts` entries to Supabase:

- `display_name` → `name` (shorten to just the node's own name, e.g. `"Back · Above · Cabinet 1"` → `"Cabinet 1"`)
- Drop `area`, `position`, `sub_position` columns entirely
- `unit_type` values `cabinet`, `drawer`, `compartment` → `container`
- `location_id` → `space_id`

---

## 3. The Items Table

### 3.1 Field Rename

| Old field | New field | Notes |
|---|---|---|
| `location_id` | `space_id` | Foreign key → `spaces.space_id` |

All other item fields remain unchanged.

### 3.2 space_id Behavior

- `space_id` can point to **any level** in the hierarchy. An item can live on a Shelf, in a Container, on a Section surface, or anywhere else.
- There is intentionally no constraint forcing items to only resolve to leaf nodes. Some items live on open surfaces (e.g., salt and pepper on Back · Top) and `space_id` should point to that Section directly.
- `space_id` is nullable — items that have not yet been assigned a location have `space_id = null` (currently shown as "Unassigned" in the UI).

---

## 4. Frontend Renames

All of the following should be updated consistently across the codebase when wiring up Supabase.

### 4.1 TypeScript type

```ts
// Old
interface Location { location_id, display_name, unit_type, area, position, sub_position, parent_id, notes }

// New
interface Space { space_id, name, unit_type, parent_id, notes }
```

### 4.2 Store (`store.ts`)

| Old | New |
|---|---|
| `locations: Location[]` | `spaces: Space[]` |
| `addLocation` | `addSpace` |
| `updateLocation` | `updateSpace` |
| `deleteLocation` | `deleteSpace` |
| `getLocationName(id)` | `getSpaceName(id)` |
| `selectedLocationFilter` | `selectedSpaceFilter` |
| `setLocationFilter` | `setSpaceFilter` |

### 4.3 Components & Routes

| Old | New |
|---|---|
| `locations-page.tsx` | `spaces-page.tsx` |
| `LocationsPage` component | `SpacesPage` component |
| Route path `/locations` | Route path `/spaces` |
| Nav label "Locations" | Nav label "Spaces" |

### 4.4 Inventory form

The location dropdown on the inventory add/edit form should:
- Pull from `spaces` instead of `locations`
- Use `space_id` as the field name
- Display spaces as an indented tree (depth-first, non-breaking spaces for indent)
- Label the field "Location" (this is appropriate here — it's describing where the item is, which is the correct use of the word "location")

---

## 5. Planned Space Management UI (not yet built)

The Spaces page needs full CRUD, which was planned but not yet implemented. Key decisions already made:

### 5.1 Add / Edit Form Fields
- `name` — short name only (required)
- `unit_type` — select from the six valid types
- `parent_id` — rendered as an indented tree dropdown, depth-first; when editing, the space itself and all its descendants are excluded from the options to prevent circular references
- `notes` — optional

**Auto-populate behavior:** When a parent is selected, pre-fill `name` with nothing but suggest the parent context. (The old area auto-fill logic is no longer needed since the `area` field is dropped.)

### 5.2 Delete Behavior

When deleting a Space that has children, present two options:
- **Delete only this space** — promote its direct children to its own parent (orphan promotion)
- **Delete all (cascade)** — remove the space and all descendants recursively; any items pointing to deleted space IDs have their `space_id` set to `null`

In Supabase, use `on delete restrict` on the FK so the database won't silently cascade — handle cascade logic explicitly in the application layer.

---

## 6. Supabase-Specific Notes

### 6.1 Recursive Path Query

To reconstruct the full path of a Space in SQL (useful for server-side search or reporting):

```sql
with recursive space_path as (
  select space_id, name, parent_id, name::text as path
  from spaces
  where parent_id is null

  union all

  select s.space_id, s.name, s.parent_id,
         sp.path || ' > ' || s.name
  from spaces s
  join space_path sp on s.parent_id = sp.space_id
)
select * from space_path;
```

### 6.2 RLS Suggestion

Since this is a personal app (single user), Row Level Security can be kept simple: policies tied to `auth.uid()` matching a `user_id` column, or disabled entirely for local/personal use.

### 6.3 Real-time

If you want the UI to reactively update when spaces or items change (useful once mobile is added), Supabase Realtime subscriptions can replace the Zustand in-memory store. The store interface can remain the same — just swap the data source underneath.

---

## 7. What Is NOT Changing

- The self-referencing `parent_id` hierarchy design — this is correct and stays
- The `unit_type` enum concept — just the values change (collapse to 6 types, add premises/area)
- Item fields other than `location_id` → `space_id`
- The recursive breadcrumb logic already in the UI — it works correctly with the new model
- Category data model — no changes needed

---

*End of document*