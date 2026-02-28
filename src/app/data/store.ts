import { create } from 'zustand';
import {
  type InventoryItem,
  type Location,
  type Category,
  inventoryItems as initialItems,
  locations as initialLocations,
  categories as initialCategories,
} from './mock-data';

interface InManStore {
  items: InventoryItem[];
  locations: Location[];
  categories: Category[];
  searchQuery: string;
  selectedCategoryFilter: number | null;
  selectedLocationFilter: number | null;

  setSearchQuery: (q: string) => void;
  setCategoryFilter: (id: number | null) => void;
  setLocationFilter: (id: number | null) => void;

  addItem: (item: Omit<InventoryItem, 'item_id' | 'created_at' | 'updated_at'>) => void;
  updateItem: (id: number, updates: Partial<InventoryItem>) => void;
  deleteItem: (id: number) => void;

  getFilteredItems: () => InventoryItem[];
  getLowStockItems: () => InventoryItem[];
  getUnassignedItems: () => InventoryItem[];
  getCategoryName: (id: number) => string;
  getLocationName: (id: number | null) => string;
}

export const useStore = create<InManStore>((set, get) => ({
  items: initialItems,
  locations: initialLocations,
  categories: initialCategories,
  searchQuery: '',
  selectedCategoryFilter: null,
  selectedLocationFilter: null,

  setSearchQuery: (q) => set({ searchQuery: q }),
  setCategoryFilter: (id) => set({ selectedCategoryFilter: id }),
  setLocationFilter: (id) => set({ selectedLocationFilter: id }),

  addItem: (item) => {
    const now = new Date().toISOString().split('T')[0];
    const maxId = Math.max(...get().items.map(i => i.item_id), 0);
    set((state) => ({
      items: [...state.items, { ...item, item_id: maxId + 1, created_at: now, updated_at: now }],
    }));
  },

  updateItem: (id, updates) => {
    const now = new Date().toISOString().split('T')[0];
    set((state) => ({
      items: state.items.map(i =>
        i.item_id === id ? { ...i, ...updates, updated_at: now } : i
      ),
    }));
  },

  deleteItem: (id) => {
    set((state) => ({
      items: state.items.filter(i => i.item_id !== id),
    }));
  },

  getFilteredItems: () => {
    const { items, searchQuery, selectedCategoryFilter, selectedLocationFilter } = get();
    return items.filter(item => {
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesCategory = selectedCategoryFilter === null || item.category_id === selectedCategoryFilter;
      const matchesLocation = selectedLocationFilter === null || item.location_id === selectedLocationFilter;
      return matchesSearch && matchesCategory && matchesLocation;
    });
  },

  getLowStockItems: () => {
    return get().items.filter(i => i.min_stock !== null && i.quantity <= i.min_stock);
  },

  getUnassignedItems: () => {
    return get().items.filter(i => i.location_id === null);
  },

  getCategoryName: (id) => {
    return get().categories.find(c => c.category_id === id)?.category_name ?? 'Unknown';
  },

  getLocationName: (id) => {
    if (id === null) return 'Unassigned';
    return get().locations.find(l => l.location_id === id)?.display_name ?? 'Unknown';
  },
}));
