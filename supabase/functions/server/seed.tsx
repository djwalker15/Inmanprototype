import { supabase } from "./supabase-client.tsx";

// ── Seed data for InMan ──
// Inserts into real Supabase tables: spaces, categories, items
// Uses upsert to be idempotent (safe to call multiple times)

export async function seedData() {
  // ═══════ CATEGORIES (12) ═══════
  const categories = [
    { category_id: 1, category_name: 'Snacks', description: 'Jerky, fruit snacks, candy, pretzels, popcorn, muffins' },
    { category_id: 2, category_name: 'Granola & Nuts', description: 'Granola bags, almonds, peanuts, pecans, sunflower seeds' },
    { category_id: 3, category_name: 'Coffee & K-Cups', description: 'K-cups, ground coffee, creamer pods' },
    { category_id: 4, category_name: 'Tea', description: 'Herbal, black, green, protein drinks' },
    { category_id: 5, category_name: 'Condiments & Sauces', description: 'Hot sauces, peanut butter, cooking sauces, salsas' },
    { category_id: 6, category_name: 'Marinades', description: "Grill Mates, Lawry's, wing seasonings" },
    { category_id: 7, category_name: 'Canned & Jarred', description: 'Beans, corn, green beans, chicken broth' },
    { category_id: 8, category_name: 'Dry Goods — Rice/Pasta/Sides', description: "Knorr, Rice-A-Roni, Zatarain's, Mahatma, Ben's, H-E-B" },
    { category_id: 9, category_name: 'Spices & Seasonings', description: 'Salts, peppers, Cajun blends, rubs, popcorn seasonings' },
    { category_id: 10, category_name: 'Oils, Vinegars & Dressings', description: 'ACV, olive oil, red/rice/white wine vinegar, dressings' },
    { category_id: 11, category_name: 'Sweeteners & Baking', description: 'Sugars, agave, honeys, cooking spray' },
    { category_id: 12, category_name: 'Salad Toppings', description: 'Crispy onions, McCormick salad toppins' },
  ];

  const { error: catError } = await supabase
    .from('categories')
    .upsert(categories, { onConflict: 'category_id' });
  if (catError) throw new Error(`Seed categories failed: ${catError.message}`);

  // ═══════ SPACES (55) ═══════
  // Must insert in order respecting parent_id FK constraints
  // Root nodes first, then children layer by layer
  const spaces = [
    // Root nodes
    { space_id: 1, name: 'My House', unit_type: 'premises', parent_id: null, notes: null },
    { space_id: 2, name: 'Kitchen', unit_type: 'area', parent_id: 1, notes: null },
    // Zones
    { space_id: 3, name: 'Back', unit_type: 'zone', parent_id: 2, notes: 'Back wall with stove/microwave' },
    { space_id: 4, name: 'Center', unit_type: 'zone', parent_id: 2, notes: 'Island with sink' },
    { space_id: 5, name: 'Side', unit_type: 'zone', parent_id: 2, notes: 'Fridge nook' },
    { space_id: 6, name: 'Pantry', unit_type: 'zone', parent_id: 2, notes: 'Walk-in pantry closet' },
    { space_id: 7, name: 'Fridge', unit_type: 'zone', parent_id: 2, notes: 'Whirlpool French door refrigerator' },
    // Sections under Back
    { space_id: 8, name: 'Above', unit_type: 'section', parent_id: 3, notes: '5 upper cabinets (Cabinet 1-5)' },
    { space_id: 9, name: 'Microwave', unit_type: 'section', parent_id: 3, notes: 'Built-in microwave' },
    { space_id: 10, name: 'Top', unit_type: 'section', parent_id: 3, notes: 'Countertop' },
    { space_id: 11, name: 'Below', unit_type: 'section', parent_id: 3, notes: '4 lower cabinets + 4 drawers' },
    // Containers under Back > Above
    { space_id: 12, name: 'Cabinet 1', unit_type: 'container', parent_id: 8, notes: null },
    { space_id: 13, name: 'Cabinet 2', unit_type: 'container', parent_id: 8, notes: null },
    { space_id: 14, name: 'Cabinet 3', unit_type: 'container', parent_id: 8, notes: null },
    { space_id: 15, name: 'Cabinet 4', unit_type: 'container', parent_id: 8, notes: null },
    { space_id: 16, name: 'Cabinet 5', unit_type: 'container', parent_id: 8, notes: null },
    // Containers under Back > Below
    { space_id: 17, name: 'Cabinet 1', unit_type: 'container', parent_id: 11, notes: null },
    { space_id: 18, name: 'Cabinet 2', unit_type: 'container', parent_id: 11, notes: null },
    { space_id: 19, name: 'Cabinet 3', unit_type: 'container', parent_id: 11, notes: null },
    { space_id: 20, name: 'Cabinet 4', unit_type: 'container', parent_id: 11, notes: null },
    { space_id: 21, name: 'Drawer 1', unit_type: 'container', parent_id: 11, notes: null },
    { space_id: 22, name: 'Drawer 2', unit_type: 'container', parent_id: 11, notes: null },
    { space_id: 23, name: 'Drawer 3', unit_type: 'container', parent_id: 11, notes: null },
    { space_id: 24, name: 'Drawer 4', unit_type: 'container', parent_id: 11, notes: null },
    // Sections under Center
    { space_id: 25, name: 'Top', unit_type: 'section', parent_id: 4, notes: 'Island countertop' },
    { space_id: 26, name: 'Below Front', unit_type: 'section', parent_id: 4, notes: 'Under-sink area (2 cabinets + 1 drawer)' },
    { space_id: 27, name: 'Below Back', unit_type: 'section', parent_id: 4, notes: 'Island cabinets facing living room (2 cabinets)' },
    // Containers under Center > Below Front
    { space_id: 28, name: 'Cabinet 1', unit_type: 'container', parent_id: 26, notes: null },
    { space_id: 29, name: 'Cabinet 2', unit_type: 'container', parent_id: 26, notes: null },
    { space_id: 30, name: 'Drawer 1', unit_type: 'container', parent_id: 26, notes: null },
    // Containers under Center > Below Back
    { space_id: 31, name: 'Cabinet 1', unit_type: 'container', parent_id: 27, notes: null },
    { space_id: 32, name: 'Cabinet 2', unit_type: 'container', parent_id: 27, notes: null },
    // Sections under Side
    { space_id: 33, name: 'Above', unit_type: 'section', parent_id: 5, notes: 'Tall cabinet + cabinet above fridge' },
    { space_id: 34, name: 'Top', unit_type: 'section', parent_id: 5, notes: 'Countertop' },
    { space_id: 35, name: 'Below', unit_type: 'section', parent_id: 5, notes: '2 drawers + 1 cabinet + trash pullout' },
    // Containers under Side
    { space_id: 36, name: 'Tall Cabinet', unit_type: 'container', parent_id: 33, notes: null },
    { space_id: 37, name: 'Cabinet Above Fridge', unit_type: 'container', parent_id: 33, notes: null },
    { space_id: 38, name: 'Drawer 1', unit_type: 'container', parent_id: 35, notes: null },
    { space_id: 39, name: 'Drawer 2', unit_type: 'container', parent_id: 35, notes: null },
    { space_id: 40, name: 'Cabinet 1', unit_type: 'container', parent_id: 35, notes: null },
    { space_id: 41, name: 'Trash Pullout', unit_type: 'container', parent_id: 35, notes: null },
    // Sections under Pantry
    { space_id: 42, name: 'Shelves', unit_type: 'section', parent_id: 6, notes: '5 shelves (Shelf 1-5)' },
    { space_id: 43, name: 'Floor', unit_type: 'section', parent_id: 6, notes: 'Floor space' },
    // Shelves under Pantry > Shelves
    { space_id: 44, name: 'Shelf 1', unit_type: 'shelf', parent_id: 42, notes: null },
    { space_id: 45, name: 'Shelf 2', unit_type: 'shelf', parent_id: 42, notes: null },
    { space_id: 46, name: 'Shelf 3', unit_type: 'shelf', parent_id: 42, notes: null },
    { space_id: 47, name: 'Shelf 4', unit_type: 'shelf', parent_id: 42, notes: null },
    { space_id: 48, name: 'Shelf 5', unit_type: 'shelf', parent_id: 42, notes: null },
    // Sections under Fridge
    { space_id: 49, name: 'Main', unit_type: 'section', parent_id: 7, notes: 'Main refrigerator compartment' },
    { space_id: 50, name: 'Door', unit_type: 'section', parent_id: 7, notes: 'Door shelves (Left & Right)' },
    { space_id: 51, name: 'Crisper', unit_type: 'section', parent_id: 7, notes: 'Produce drawer' },
    { space_id: 52, name: 'Freezer', unit_type: 'section', parent_id: 7, notes: 'Bottom freezer drawer' },
    // Containers under Fridge > Door
    { space_id: 53, name: 'Left', unit_type: 'container', parent_id: 50, notes: null },
    { space_id: 54, name: 'Right', unit_type: 'container', parent_id: 50, notes: null },
    // Section under Pantry > Floor
    { space_id: 55, name: 'Left', unit_type: 'section', parent_id: 43, notes: null },
  ];

  // Insert spaces in order (parent_id FK requires parents exist first)
  // Upsert in batches, ordered by space_id which respects the hierarchy
  for (const space of spaces) {
    const { error } = await supabase
      .from('spaces')
      .upsert(space, { onConflict: 'space_id' });
    if (error) throw new Error(`Seed space ${space.space_id} (${space.name}) failed: ${error.message}`);
  }

  // ═══════ ITEMS (165) ═══════
  const today = '2026-02-27';
  const items = [
    // Snacks (23)
    { item_id: 1, name: "Jack Link's Original Beef Jerky", brand: "Jack Link's", category_id: 1, space_id: null, quantity: 2, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 2, name: "Jack Link's Teriyaki Beef Jerky", brand: "Jack Link's", category_id: 1, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 3, name: "Welch's Fruit Snacks", brand: "Welch's", category_id: 1, space_id: null, quantity: 3, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 4, name: "Mott's Fruit Snacks", brand: "Mott's", category_id: 1, space_id: null, quantity: 2, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 5, name: "Haribo Goldbears", brand: "Haribo", category_id: 1, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 6, name: "Skittles Original", brand: "Skittles", category_id: 1, space_id: null, quantity: 2, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 7, name: "Snyder's Pretzel Pieces", brand: "Snyder's", category_id: 1, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 8, name: "Rold Gold Pretzels", brand: "Rold Gold", category_id: 1, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 9, name: "Smartfood White Cheddar Popcorn", brand: "Smartfood", category_id: 1, space_id: null, quantity: 2, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 10, name: "Orville Redenbacher's Butter Popcorn", brand: "Orville Redenbacher's", category_id: 1, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 11, name: "Little Debbie Blueberry Muffins", brand: "Little Debbie", category_id: 1, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 12, name: "Cheez-It Original", brand: "Cheez-It", category_id: 1, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 13, name: "Goldfish Cheddar", brand: "Goldfish", category_id: 1, space_id: null, quantity: 2, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 14, name: "Takis Fuego", brand: "Takis", category_id: 1, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 15, name: "Doritos Nacho Cheese", brand: "Doritos", category_id: 1, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 16, name: "Lay's Classic Chips", brand: "Lay's", category_id: 1, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 17, name: "Pringles Sour Cream & Onion", brand: "Pringles", category_id: 1, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 18, name: "Nature Valley Granola Bars", brand: "Nature Valley", category_id: 1, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 19, name: "Rice Krispies Treats", brand: "Kellogg's", category_id: 1, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 20, name: "Pop-Tarts Strawberry", brand: "Pop-Tarts", category_id: 1, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 21, name: "Nutri-Grain Bars", brand: "Kellogg's", category_id: 1, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 22, name: "M&M's Peanut", brand: "M&M's", category_id: 1, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 23, name: "Reese's Cups", brand: "Reese's", category_id: 1, space_id: null, quantity: 2, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    // Granola & Nuts (7)
    { item_id: 24, name: "Bear Naked Granola", brand: "Bear Naked", category_id: 2, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 25, name: "Blue Diamond Almonds", brand: "Blue Diamond", category_id: 2, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 26, name: "Planters Dry Roasted Peanuts", brand: "Planters", category_id: 2, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 27, name: "Fisher Pecan Halves", brand: "Fisher", category_id: 2, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 28, name: "David Sunflower Seeds", brand: "David", category_id: 2, space_id: null, quantity: 2, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 29, name: "H-E-B Trail Mix", brand: "H-E-B", category_id: 2, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 30, name: "Great Value Mixed Nuts", brand: "Great Value", category_id: 2, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    // Coffee & K-Cups (9)
    { item_id: 31, name: "Green Mountain Breakfast Blend K-Cups", brand: "Green Mountain", category_id: 3, space_id: null, quantity: 12, unit: 'count', expiry_date: null, min_stock: 6, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 32, name: "Starbucks Pike Place K-Cups", brand: "Starbucks", category_id: 3, space_id: null, quantity: 10, unit: 'count', expiry_date: null, min_stock: 6, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 33, name: "Dunkin' Original Blend K-Cups", brand: "Dunkin'", category_id: 3, space_id: null, quantity: 8, unit: 'count', expiry_date: null, min_stock: 6, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 34, name: "Folgers Classic Roast Ground", brand: "Folgers", category_id: 3, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 35, name: "Community Coffee Dark Roast", brand: "Community Coffee", category_id: 3, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 36, name: "International Delight Creamer Pods", brand: "International Delight", category_id: 3, space_id: null, quantity: 24, unit: 'count', expiry_date: null, min_stock: 12, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 37, name: "Cafe Bustelo Espresso K-Cups", brand: "Cafe Bustelo", category_id: 3, space_id: null, quantity: 6, unit: 'count', expiry_date: null, min_stock: 4, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 38, name: "Swiss Miss Hot Cocoa K-Cups", brand: "Swiss Miss", category_id: 3, space_id: null, quantity: 8, unit: 'count', expiry_date: null, min_stock: 4, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 39, name: "Coffee Mate French Vanilla Creamer", brand: "Coffee Mate", category_id: 3, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    // Tea (13)
    { item_id: 40, name: "Bigelow Green Tea", brand: "Bigelow", category_id: 4, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 41, name: "Celestial Seasonings Sleepytime", brand: "Celestial Seasonings", category_id: 4, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 42, name: "Twinings English Breakfast", brand: "Twinings", category_id: 4, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 43, name: "Yogi Detox Tea", brand: "Yogi", category_id: 4, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 44, name: "Tazo Chai Tea", brand: "Tazo", category_id: 4, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 45, name: "Lipton Black Tea", brand: "Lipton", category_id: 4, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 46, name: "Traditional Medicinals Peppermint", brand: "Traditional Medicinals", category_id: 4, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 47, name: "Bigelow Chamomile", brand: "Bigelow", category_id: 4, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 48, name: "Arizona Green Tea", brand: "Arizona", category_id: 4, space_id: null, quantity: 2, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 49, name: "Premier Protein Shake Chocolate", brand: "Premier Protein", category_id: 4, space_id: null, quantity: 4, unit: 'count', expiry_date: null, min_stock: 2, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 50, name: "Premier Protein Shake Vanilla", brand: "Premier Protein", category_id: 4, space_id: null, quantity: 3, unit: 'count', expiry_date: null, min_stock: 2, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 51, name: "Stash Earl Grey Tea", brand: "Stash", category_id: 4, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 52, name: "Pure Leaf Unsweetened Tea", brand: "Pure Leaf", category_id: 4, space_id: null, quantity: 2, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    // Condiments & Sauces (20)
    { item_id: 53, name: "Frank's RedHot Original", brand: "Frank's", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 54, name: "Cholula Original", brand: "Cholula", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 55, name: "Sriracha Hot Chili Sauce", brand: "Huy Fong", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 56, name: "Tabasco Original", brand: "Tabasco", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 57, name: "Louisiana Hot Sauce", brand: "Louisiana", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 58, name: "Jif Creamy Peanut Butter", brand: "Jif", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 59, name: "Skippy Chunky Peanut Butter", brand: "Skippy", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 60, name: "Kikkoman Soy Sauce", brand: "Kikkoman", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 61, name: "Hoisin Sauce", brand: "Lee Kum Kee", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 62, name: "Worcestershire Sauce", brand: "Lea & Perrins", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 63, name: "Tostitos Medium Salsa", brand: "Tostitos", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 64, name: "Pace Picante Sauce", brand: "Pace", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 65, name: "Sweet Baby Ray's BBQ Sauce", brand: "Sweet Baby Ray's", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 66, name: "Stubb's Original BBQ Sauce", brand: "Stubb's", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 67, name: "Heinz Yellow Mustard", brand: "Heinz", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 68, name: "French's Spicy Brown Mustard", brand: "French's", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 69, name: "Heinz Ketchup", brand: "Heinz", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 70, name: "Duke's Mayonnaise", brand: "Duke's", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 71, name: "Ranch Dressing", brand: "Hidden Valley", category_id: 5, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 72, name: "Rotel Diced Tomatoes & Green Chilies", brand: "Rotel", category_id: 5, space_id: null, quantity: 2, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    // Marinades (9)
    { item_id: 73, name: "McCormick Grill Mates Montreal Steak", brand: "McCormick", category_id: 6, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 74, name: "McCormick Grill Mates Montreal Chicken", brand: "McCormick", category_id: 6, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 75, name: "Lawry's Herb & Garlic Marinade", brand: "Lawry's", category_id: 6, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 76, name: "Lawry's Mesquite Marinade", brand: "Lawry's", category_id: 6, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 77, name: "Frank's RedHot Buffalo Wing Sauce", brand: "Frank's", category_id: 6, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 78, name: "Sweet Baby Ray's Buffalo Wing Sauce", brand: "Sweet Baby Ray's", category_id: 6, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 79, name: "McCormick Grill Mates Brown Sugar Bourbon", brand: "McCormick", category_id: 6, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 80, name: "Lawry's Teriyaki Marinade", brand: "Lawry's", category_id: 6, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 81, name: "Kinder's Lemon Butter Herb", brand: "Kinder's", category_id: 6, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    // Canned & Jarred (6)
    { item_id: 82, name: "Bush's Black Beans", brand: "Bush's", category_id: 7, space_id: null, quantity: 3, unit: 'count', expiry_date: null, min_stock: 2, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 83, name: "Del Monte Sweet Corn", brand: "Del Monte", category_id: 7, space_id: null, quantity: 2, unit: 'count', expiry_date: null, min_stock: 2, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 84, name: "Del Monte Green Beans", brand: "Del Monte", category_id: 7, space_id: null, quantity: 2, unit: 'count', expiry_date: null, min_stock: 2, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 85, name: "Swanson Chicken Broth", brand: "Swanson", category_id: 7, space_id: null, quantity: 2, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 86, name: "Bush's Pinto Beans", brand: "Bush's", category_id: 7, space_id: null, quantity: 2, unit: 'count', expiry_date: null, min_stock: 2, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 87, name: "Hunt's Diced Tomatoes", brand: "Hunt's", category_id: 7, space_id: null, quantity: 2, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    // Dry Goods (21)
    { item_id: 88, name: "Knorr Rice Sides Chicken", brand: "Knorr", category_id: 8, space_id: null, quantity: 2, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 89, name: "Knorr Rice Sides Herb & Butter", brand: "Knorr", category_id: 8, space_id: null, quantity: 2, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 90, name: "Knorr Pasta Sides Alfredo", brand: "Knorr", category_id: 8, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 91, name: "Knorr Pasta Sides Butter", brand: "Knorr", category_id: 8, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 92, name: "Rice-A-Roni Chicken", brand: "Rice-A-Roni", category_id: 8, space_id: null, quantity: 2, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 93, name: "Rice-A-Roni Spanish Rice", brand: "Rice-A-Roni", category_id: 8, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 94, name: "Zatarain's Jambalaya Mix", brand: "Zatarain's", category_id: 8, space_id: null, quantity: 2, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 95, name: "Zatarain's Red Beans & Rice", brand: "Zatarain's", category_id: 8, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 96, name: "Zatarain's Dirty Rice", brand: "Zatarain's", category_id: 8, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 97, name: "Mahatma White Rice", brand: "Mahatma", category_id: 8, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 98, name: "Mahatma Jasmine Rice", brand: "Mahatma", category_id: 8, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 99, name: "Ben's Original Ready Rice", brand: "Ben's Original", category_id: 8, space_id: null, quantity: 3, unit: 'pkg', expiry_date: null, min_stock: 2, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 100, name: "H-E-B Penne Pasta", brand: "H-E-B", category_id: 8, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 101, name: "H-E-B Spaghetti", brand: "H-E-B", category_id: 8, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 102, name: "Barilla Rotini", brand: "Barilla", category_id: 8, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 103, name: "Kraft Mac & Cheese", brand: "Kraft", category_id: 8, space_id: null, quantity: 3, unit: 'pkg', expiry_date: null, min_stock: 2, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 104, name: "Velveeta Shells & Cheese", brand: "Velveeta", category_id: 8, space_id: null, quantity: 2, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 105, name: "Top Ramen Chicken", brand: "Top Ramen", category_id: 8, space_id: null, quantity: 6, unit: 'count', expiry_date: null, min_stock: 3, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 106, name: "Maruchan Beef", brand: "Maruchan", category_id: 8, space_id: null, quantity: 4, unit: 'count', expiry_date: null, min_stock: 3, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 107, name: "Idahoan Mashed Potatoes", brand: "Idahoan", category_id: 8, space_id: null, quantity: 2, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 108, name: "Stove Top Stuffing", brand: "Stove Top", category_id: 8, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    // Spices & Seasonings (30)
    { item_id: 109, name: "Morton Iodized Salt", brand: "Morton", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 110, name: "Morton Kosher Salt", brand: "Morton", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 111, name: "McCormick Black Pepper", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 112, name: "McCormick Garlic Powder", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 113, name: "McCormick Onion Powder", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 114, name: "McCormick Paprika", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 115, name: "McCormick Smoked Paprika", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 116, name: "McCormick Cayenne Pepper", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 117, name: "McCormick Chili Powder", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 118, name: "McCormick Cumin", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 119, name: "McCormick Italian Seasoning", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 120, name: "McCormick Oregano", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 121, name: "McCormick Cinnamon", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 122, name: "Tony Chachere's Creole Seasoning", brand: "Tony Chachere's", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 123, name: "Slap Ya Mama Cajun Seasoning", brand: "Slap Ya Mama", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 124, name: "Lawry's Seasoned Salt", brand: "Lawry's", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 125, name: "Old Bay Seasoning", brand: "Old Bay", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 126, name: "Adobo All-Purpose Seasoning", brand: "Goya", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 127, name: "Lemon Pepper Seasoning", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 128, name: "Everything Bagel Seasoning", brand: "Trader Joe's", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 129, name: "Taco Seasoning", brand: "McCormick", category_id: 9, space_id: null, quantity: 3, unit: 'pkg', expiry_date: null, min_stock: 2, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 130, name: "Ranch Seasoning Mix", brand: "Hidden Valley", category_id: 9, space_id: null, quantity: 2, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 131, name: "Kernel Season's White Cheddar", brand: "Kernel Season's", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 132, name: "Kernel Season's Ranch", brand: "Kernel Season's", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 133, name: "McCormick Bay Leaves", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 134, name: "McCormick Crushed Red Pepper", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 135, name: "McCormick Ground Ginger", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 136, name: "McCormick Nutmeg", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 137, name: "McCormick Turmeric", brand: "McCormick", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 138, name: "Meat Church Holy Gospel Rub", brand: "Meat Church", category_id: 9, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    // Oils, Vinegars & Dressings (11)
    { item_id: 139, name: "Bragg Apple Cider Vinegar", brand: "Bragg", category_id: 10, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 140, name: "Bertolli Extra Virgin Olive Oil", brand: "Bertolli", category_id: 10, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 141, name: "Vegetable Oil", brand: "Crisco", category_id: 10, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 142, name: "Sesame Oil", brand: "Kadoya", category_id: 10, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 143, name: "Red Wine Vinegar", brand: "Pompeian", category_id: 10, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 144, name: "Rice Vinegar", brand: "Marukan", category_id: 10, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 145, name: "White Wine Vinegar", brand: "Heinz", category_id: 10, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 146, name: "Italian Dressing", brand: "Wish-Bone", category_id: 10, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 147, name: "Balsamic Vinaigrette", brand: "Ken's", category_id: 10, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 148, name: "Avocado Oil", brand: "Chosen Foods", category_id: 10, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 149, name: "Coconut Oil", brand: "Nutiva", category_id: 10, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    // Sweeteners & Baking (13)
    { item_id: 150, name: "Domino Granulated Sugar", brand: "Domino", category_id: 11, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 151, name: "C&H Brown Sugar", brand: "C&H", category_id: 11, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 152, name: "C&H Powdered Sugar", brand: "C&H", category_id: 11, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 153, name: "Madhava Agave Nectar", brand: "Madhava", category_id: 11, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 154, name: "Local Raw Honey", brand: null, category_id: 11, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: "From farmer's market", created_at: today, updated_at: today },
    { item_id: 155, name: "Sue Bee Clover Honey", brand: "Sue Bee", category_id: 11, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 156, name: "PAM Original Cooking Spray", brand: "PAM", category_id: 11, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 157, name: "PAM Olive Oil Spray", brand: "PAM", category_id: 11, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 158, name: "Arm & Hammer Baking Soda", brand: "Arm & Hammer", category_id: 11, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 159, name: "Clabber Girl Baking Powder", brand: "Clabber Girl", category_id: 11, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 160, name: "Gold Medal All-Purpose Flour", brand: "Gold Medal", category_id: 11, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 161, name: "McCormick Vanilla Extract", brand: "McCormick", category_id: 11, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 162, name: "Nestle Toll House Chocolate Chips", brand: "Nestle", category_id: 11, space_id: null, quantity: 1, unit: 'pkg', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    // Salad Toppings (3)
    { item_id: 163, name: "French's Crispy Fried Onions", brand: "French's", category_id: 12, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 164, name: "McCormick Salad Toppins", brand: "McCormick", category_id: 12, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: null, created_at: today, updated_at: today },
    { item_id: 165, name: "Bacon Bits", brand: "Oscar Mayer", category_id: 12, space_id: null, quantity: 1, unit: 'count', expiry_date: null, min_stock: 1, barcode: null, notes: 'Added to match 165 total', created_at: today, updated_at: today },
  ];

  // Batch upsert items in groups of 50
  for (let i = 0; i < items.length; i += 50) {
    const batch = items.slice(i, i + 50);
    const { error } = await supabase
      .from('items')
      .upsert(batch, { onConflict: 'item_id' });
    if (error) throw new Error(`Seed items batch starting at ${i} failed: ${error.message}`);
  }

  // NOTE: After seeding with explicit IDs, Postgres sequences may be behind.
  // If creating new records fails with a unique constraint error, run in Supabase SQL Editor:
  //   SELECT setval('spaces_space_id_seq', (SELECT MAX(space_id) FROM spaces));
  //   SELECT setval('categories_category_id_seq', (SELECT MAX(category_id) FROM categories));
  //   SELECT setval('items_item_id_seq', (SELECT MAX(item_id) FROM items));
}
