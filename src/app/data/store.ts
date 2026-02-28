import { create } from 'zustand';
import type { InventoryItem, Space, Category } from './types';
import * as api from './api';

interface InManStore {
  // Data
  items: InventoryItem[];
  spaces: Space[];
  categories: Category[];

  // Loading state
  loading: boolean;
  initialized: boolean;
  error: string | null;

  // Filters
  searchQuery: string;
  selectedCategoryFilter: number | null;
  selectedSpaceFilter: number | null;

  // Actions — filters
  setSearchQuery: (q: string) => void;
  setCategoryFilter: (id: number | null) => void;
  setSpaceFilter: (id: number | null) => void;

  // Actions — data loading
  initialize: () => Promise<void>;

  // Actions — items
  addItem: (item: Omit<InventoryItem, 'item_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateItem: (id: number, updates: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  updateItemQuantity: (id: number, quantity: number) => Promise<void>;

  // Actions — spaces
  addSpace: (space: Omit<Space, 'space_id'>) => Promise<void>;
  updateSpace: (id: number, updates: Partial<Space>) => Promise<void>;
  deleteSpace: (id: number, mode: 'promote' | 'cascade') => Promise<void>;

  // Actions — categories
  addCategory: (cat: Omit<Category, 'category_id'>) => Promise<void>;
  updateCategory: (id: number, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;

  // Derived data helpers (non-reactive — use useMemo in components)
  getCategoryName: (id: number) => string;
  getSpaceName: (id: number | null) => string;
  getSpacePath: (id: number | null) => string;
}

export const useStore = create<InManStore>((set, get) => ({
  items: [],
  spaces: [],
  categories: [],
  loading: false,
  initialized: false,
  error: null,
  searchQuery: '',
  selectedCategoryFilter: null,
  selectedSpaceFilter: null,

  setSearchQuery: (q) => set({ searchQuery: q }),
  setCategoryFilter: (id) => set({ selectedCategoryFilter: id }),
  setSpaceFilter: (id) => set({ selectedSpaceFilter: id }),

  initialize: async () => {
    if (get().initialized || get().loading) return;
    set({ loading: true, error: null });
    try {
      // Seed if needed (idempotent)
      await api.seed();
      // Fetch all data in parallel
      const [items, spaces, categories] = await Promise.all([
        api.fetchItems(),
        api.fetchSpaces(),
        api.fetchCategories(),
      ]);
      set({ items, spaces, categories, loading: false, initialized: true });
    } catch (e: any) {
      console.error('Store initialization error:', e);
      set({ loading: false, error: e.message ?? 'Failed to load data' });
    }
  },

  // ── Items ──
  addItem: async (item) => {
    try {
      const created = await api.createItem(item);
      set((s) => ({ items: [...s.items, created] }));
    } catch (e: any) {
      console.error('addItem error:', e);
      throw e;
    }
  },

  updateItem: async (id, updates) => {
    try {
      const updated = await api.updateItem(id, updates);
      set((s) => ({ items: s.items.map(i => i.item_id === id ? updated : i) }));
    } catch (e: any) {
      console.error('updateItem error:', e);
      throw e;
    }
  },

  deleteItem: async (id) => {
    try {
      await api.deleteItem(id);
      set((s) => ({ items: s.items.filter(i => i.item_id !== id) }));
    } catch (e: any) {
      console.error('deleteItem error:', e);
      throw e;
    }
  },

  updateItemQuantity: async (id, quantity) => {
    try {
      const updated = await api.updateItemQuantity(id, quantity);
      set((s) => ({ items: s.items.map(i => i.item_id === id ? updated : i) }));
    } catch (e: any) {
      console.error('updateItemQuantity error:', e);
      throw e;
    }
  },

  // ── Spaces ──
  addSpace: async (space) => {
    try {
      const created = await api.createSpace(space);
      set((s) => ({ spaces: [...s.spaces, created] }));
    } catch (e: any) {
      console.error('addSpace error:', e);
      throw e;
    }
  },

  updateSpace: async (id, updates) => {
    try {
      const updated = await api.updateSpace(id, updates);
      set((s) => ({ spaces: s.spaces.map(sp => sp.space_id === id ? updated : sp) }));
    } catch (e: any) {
      console.error('updateSpace error:', e);
      throw e;
    }
  },

  deleteSpace: async (id, mode) => {
    try {
      await api.deleteSpace(id, mode);
      // Re-fetch all data after delete to get updated parent_ids and nulled space_ids
      const [items, spaces] = await Promise.all([api.fetchItems(), api.fetchSpaces()]);
      set({ items, spaces });
    } catch (e: any) {
      console.error('deleteSpace error:', e);
      throw e;
    }
  },

  // ── Categories ──
  addCategory: async (cat) => {
    try {
      const created = await api.createCategory(cat);
      set((s) => ({ categories: [...s.categories, created] }));
    } catch (e: any) {
      console.error('addCategory error:', e);
      throw e;
    }
  },

  updateCategory: async (id, updates) => {
    try {
      const updated = await api.updateCategory(id, updates);
      set((s) => ({ categories: s.categories.map(c => c.category_id === id ? updated : c) }));
    } catch (e: any) {
      console.error('updateCategory error:', e);
      throw e;
    }
  },

  deleteCategory: async (id) => {
    try {
      await api.deleteCategory(id);
      set((s) => ({ categories: s.categories.filter(c => c.category_id !== id) }));
    } catch (e: any) {
      console.error('deleteCategory error:', e);
      throw e;
    }
  },

  // ── Helpers ──
  getCategoryName: (id) => {
    return get().categories.find(c => c.category_id === id)?.category_name ?? 'Unknown';
  },

  getSpaceName: (id) => {
    if (id === null) return 'Unassigned';
    return get().spaces.find(s => s.space_id === id)?.name ?? 'Unknown';
  },

  getSpacePath: (id) => {
    if (id === null) return 'Unassigned';
    const { spaces } = get();
    const path: string[] = [];
    let current = spaces.find(s => s.space_id === id);
    while (current) {
      path.unshift(current.name);
      current = current.parent_id !== null
        ? spaces.find(s => s.space_id === current!.parent_id)
        : undefined;
    }
    return path.join(' > ') || 'Unknown';
  },
}));
