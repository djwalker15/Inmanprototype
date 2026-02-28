InMan — Inventory Management System
Project Context Document
Generated: February 28, 2026  |  Kitchen Phase
1. Project Overview
InMan is a personal household inventory management system being built by Davontae, starting with kitchen consumables. The system is designed to track what items are stored, where they are stored, in what quantity, and when they need to be restocked.

The long-term vision spans multiple household categories:
Kitchen consumables (current phase)
Tool chests
Hobby collections
Other household items

The target end state is a web application, but the current phase uses Excel/Google Sheets as the data layer while the schema and data model are validated with real-world use.
2. Build Roadmap
Phase 1: Phase 1 — Spreadsheet prototype (current)
    Google Sheets / Excel as the primary data store. Validate data model, populate real inventory data, and assign storage locations.
Phase 2: Phase 2 — Local script / CLI
    Python or Node.js CLI with a SQLite or JSON backend. Commands to query stock, update quantities, flag low inventory.
Phase 3: Phase 3 — Web application
    Wrap the validated data layer with a backend (FastAPI or Express) and a frontend. Full UI for browsing, editing, and alerting.
Phase 4: Phase 4 — Expand to other categories
    Apply lessons from kitchen/food phase to tool chests, hobby collections, and the rest of the household.
3. Data Model Design
3.1 Design Decision: Self-Referencing Locations Table
Four approaches to handle cabinet/drawer-level IDs were considered:

Option 1 — More rows in a flat table (rejected: no clean hierarchy)
Option 2 — unit_number column (rejected: flat, awkward for mixed types)
Option 3 — Self-referencing parent_id (CHOSEN)
Option 4 — Separate storage_units child table (runner-up)

Option 3 was chosen because Davontae confirmed plans to go deeper than two hierarchy levels (e.g., a tool chest might go: Side Below → Tool Chest → Drawer 2 → Tray). Option 4 would eventually need to be retrofitted into Option 3 anyway, making Option 3 the more future-proof foundation.
3.2 Hierarchy Design
The locations table uses a parent_id foreign key that points back to another row in the same table. Each row has a unit_type field to indicate its level:

unit_type
Description
Example
zone
Top-level named area
Back, Center, Side, Pantry, Fridge
section
Position within a zone
Back · Above, Center · Below · Front
cabinet
Physical cabinet unit
Back · Above · Cabinet 1
drawer
Physical drawer unit
Back · Below · Drawer 2
shelf
Shelf within pantry or cabinet
Pantry · Shelf 3
compartment
Fridge zone
Fridge · Door · Left


The inventory table points its location_id to the most specific location available — e.g., a cabinet row rather than its parent section row. To reconstruct the full path in SQL, a recursive CTE walks the parent_id chain up to the root.
3.3 Table Schemas
locations
Column
Type
Notes
location_id
INTEGER PK
Auto-increment primary key
display_name
TEXT NOT NULL
Full human-readable path, e.g. 'Back · Above · Cabinet 1'
unit_type
TEXT NOT NULL
zone | section | cabinet | drawer | shelf | compartment
area
TEXT NOT NULL
Back | Center | Side | Pantry | Fridge
position
TEXT
Above | Below | Top | Microwave | Shelves | etc.
sub_position
TEXT
Front | Back | Left | Right (nullable)
parent_id
INTEGER FK
References locations(location_id); NULL for zones
notes
TEXT
Optional description


categories
Column
Type
Notes
category_id
INTEGER PK
Auto-increment
category_name
TEXT NOT NULL UNIQUE


description
TEXT




inventory
Column
Type
Notes
item_id
INTEGER PK
Auto-increment
name
TEXT NOT NULL
Item name
brand
TEXT
Optional brand
category_id
INTEGER FK
References categories(category_id)
location_id
INTEGER FK
References locations(location_id); point to most specific level
quantity
REAL NOT NULL
Current stock count
unit
TEXT NOT NULL
count | oz | lbs | g | ml | L | pkg
expiry_date
DATE
YYYY-MM-DD format (nullable)
min_stock
REAL
Reorder alert threshold, same unit as quantity
barcode
TEXT
UPC/EAN for future barcode scanning
notes
TEXT


created_at
DATE NOT NULL


updated_at
DATE NOT NULL



4. Kitchen Location Structure
The kitchen has been mapped to 53 distinct storage locations across 3 hierarchy levels. The naming convention follows "Area · Position · Sub-position" with numbers for individual cabinet and drawer units.

Directional note: "Front" refers to the island side facing the back wall. "Back" refers to the island side facing the living room.

Type
Area
Position
Sub-position
Notes
zone
Back




Back wall with stove/microwave
zone
Center




Island with sink
zone
Side




Fridge nook
zone
Pantry




Walk-in pantry closet
zone
Fridge




Whirlpool French door refrigerator
section
Back
Above


5 upper cabinets (Cabinet 1–5)
section
Back
Microwave


Built-in microwave
section
Back
Top


Countertop
section
Back
Below


4 lower cabinets + 4 drawers
section
Center
Top


Island countertop
section
Center
Below
Front
Under-sink area (2 cabinets + 1 drawer)
section
Center
Below
Back
Island cabinets facing living room (2 cabinets)
section
Side
Above


Tall cabinet + cabinet above fridge
section
Side
Top


Countertop
section
Side
Below


2 drawers + 1 cabinet + trash pullout
section
Pantry
Shelves


5 shelves (Shelf 1–5)
section
Pantry
Floor


Floor space
section
Fridge
Main


Main refrigerator compartment
section
Fridge
Door


Door shelves (Left & Right)
section
Fridge
Crisper


Produce drawer
section
Fridge
Freezer


Bottom freezer drawer

5. Inventory Catalog — Current State
All consumables (excluding fridge/freezer contents) have been consolidated to the pantry, photographed, and cataloged. 27 photos were taken on February 27, 2026. A total of 165 distinct items were identified across 12 categories.

Important: Location assignments (specific shelf/cabinet) have not been made yet. Items will be assigned to their location_id values as they are returned to their designated shelves.

Category
Items
Key Contents
Snacks
23
Jerky, fruit snacks, candy, pretzels, popcorn, muffins
Granola & Nuts
7
Granola bags, almonds, peanuts, pecans, sunflower seeds
Coffee & K-Cups
9
K-cups, ground coffee, creamer pods
Tea
13
Herbal, black, green, protein drinks
Condiments & Sauces
20
Hot sauces, peanut butter, cooking sauces, salsas
Marinades
9
Grill Mates, Lawry's, wing seasonings
Canned & Jarred
6
Beans, corn, green beans, chicken broth
Dry Goods — Rice/Pasta/Sides
21
Knorr, Rice-A-Roni, Zatarain's, Mahatma, Ben's, H-E-B
Spices & Seasonings
30
Salts, peppers, Cajun blends, rubs, popcorn seasonings
Oils, Vinegars & Dressings
11
ACV, olive oil, red/rice/white wine vinegar, dressings
Sweeteners & Baking
13
Sugars, agave, honeys, cooking spray
Salad Toppings
2
Crispy onions, McCormick salad toppins
TOTAL
165



6. Deliverables Produced
File
Version
Contents
InMan_Kitchen.xlsx
v1
Initial schema — flat locations table, categories, inventory template, README
InMan_Kitchen_v2.xlsx
v2
Upgraded locations table with parent_id hierarchy (53 locations), updated README schema docs
InMan_Kitchen_v2.xlsx
v2 (user-updated)
Cabinet/drawer counts corrected by Davontae — Back Below revised to 4 cabinets and 4 drawers
InMan_Kitchen_v3.xlsx
v3
165 inventory items populated from pantry photo catalog; location_id left blank pending shelf assignment

7. Next Steps
Return pantry items to their designated shelves and assign location_id to each inventory row
Consider adding shelf-level rows within individual cabinets if deeper tracking is needed
Populate expiry_date, min_stock, and barcode fields as items are scanned/reviewed
Catalog fridge and freezer contents to complete the kitchen inventory
Begin Phase 2 planning — SQLite schema migration and CLI tooling
