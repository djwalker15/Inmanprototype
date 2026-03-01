// InMan Types — Space-based model (Location retired)

export type SpaceUnitType = 'premises' | 'area' | 'zone' | 'section' | 'sub-section' | 'container' | 'shelf';

export interface Space {
  space_id: number;
  name: string;
  unit_type: SpaceUnitType;
  parent_id: number | null;
  notes: string | null;
}

export interface Category {
  category_id: number;
  category_name: string;
  description: string | null;
}

export interface InventoryItem {
  item_id: number;
  name: string;
  brand: string | null;
  category_id: number;
  space_id: number | null;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  min_stock: number | null;
  barcode: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
