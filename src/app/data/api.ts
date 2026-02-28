// API client for InMan Supabase backend
import { projectId, publicAnonKey } from '/utils/supabase/info';
import type { Space, Category, InventoryItem } from './types';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-d0cf987d`;

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`,
});

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers(), ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`API error ${res.status} on ${path}: ${body}`);
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Seed / Reset ──
export const seed = () => request<{ message: string; seeded: boolean }>('/seed', { method: 'POST' });
export const reset = () => request<{ message: string }>('/reset', { method: 'POST' });

// ── Spaces ──
export const fetchSpaces = () => request<Space[]>('/spaces');
export const createSpace = (data: Omit<Space, 'space_id'>) =>
  request<Space>('/spaces', { method: 'POST', body: JSON.stringify(data) });
export const updateSpace = (id: number, data: Partial<Space>) =>
  request<Space>(`/spaces/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSpace = (id: number, mode: 'promote' | 'cascade' = 'promote') =>
  request<{ message: string }>(`/spaces/${id}?mode=${mode}`, { method: 'DELETE' });

// ── Categories ──
export const fetchCategories = () => request<Category[]>('/categories');
export const createCategory = (data: Omit<Category, 'category_id'>) =>
  request<Category>('/categories', { method: 'POST', body: JSON.stringify(data) });
export const updateCategory = (id: number, data: Partial<Category>) =>
  request<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCategory = (id: number) =>
  request<{ message: string }>(`/categories/${id}`, { method: 'DELETE' });

// ── Items ──
export const fetchItems = () => request<InventoryItem[]>('/items');
export const createItem = (data: Omit<InventoryItem, 'item_id' | 'created_at' | 'updated_at'>) =>
  request<InventoryItem>('/items', { method: 'POST', body: JSON.stringify(data) });
export const updateItem = (id: number, data: Partial<InventoryItem>) =>
  request<InventoryItem>(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteItem = (id: number) =>
  request<{ message: string }>(`/items/${id}`, { method: 'DELETE' });
export const updateItemQuantity = (id: number, quantity: number) =>
  request<InventoryItem>(`/items/${id}/quantity`, { method: 'PUT', body: JSON.stringify({ quantity }) });
