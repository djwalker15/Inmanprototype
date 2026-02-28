import { useState, useMemo } from 'react';
import { useStore } from '../data/store';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Label } from './ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  MapPinOff,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import type { InventoryItem } from '../data/mock-data';

const UNITS = ['count', 'oz', 'lbs', 'g', 'ml', 'L', 'pkg'];
const PAGE_SIZE = 20;

export function InventoryPage() {
  const items = useStore((s) => s.items);
  const categories = useStore((s) => s.categories);
  const locations = useStore((s) => s.locations);
  const searchQuery = useStore((s) => s.searchQuery);
  const selectedCategoryFilter = useStore((s) => s.selectedCategoryFilter);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const setCategoryFilter = useStore((s) => s.setCategoryFilter);
  const getCategoryName = useStore((s) => s.getCategoryName);
  const getLocationName = useStore((s) => s.getLocationName);
  const addItem = useStore((s) => s.addItem);
  const updateItem = useStore((s) => s.updateItem);
  const deleteItem = useStore((s) => s.deleteItem);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesCategory = selectedCategoryFilter === null || item.category_id === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategoryFilter]);
  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const pagedItems = filteredItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const openAddDialog = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleSave = (formData: FormData) => {
    const name = formData.get('name') as string;
    const brand = (formData.get('brand') as string) || null;
    const category_id = Number(formData.get('category_id'));
    const location_id = formData.get('location_id') ? Number(formData.get('location_id')) : null;
    const quantity = Number(formData.get('quantity'));
    const unit = formData.get('unit') as string;
    const min_stock = formData.get('min_stock') ? Number(formData.get('min_stock')) : null;
    const expiry_date = (formData.get('expiry_date') as string) || null;
    const notes = (formData.get('notes') as string) || null;

    if (!name || !unit || !category_id) {
      toast.error('Please fill in required fields');
      return;
    }

    if (editingItem) {
      updateItem(editingItem.item_id, {
        name, brand, category_id, location_id, quantity, unit, min_stock, expiry_date, notes,
      });
      toast.success(`Updated "${name}"`);
    } else {
      addItem({
        name, brand, category_id, location_id, quantity, unit, min_stock, expiry_date, notes, barcode: null,
      });
      toast.success(`Added "${name}"`);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    const item = items.find((i) => i.item_id === id);
    deleteItem(id);
    toast.success(`Deleted "${item?.name}"`);
    setDeleteConfirm(null);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="tracking-tight">Inventory</h1>
          <p className="text-muted-foreground text-[0.875rem] mt-1">
            {filteredItems.length} items{searchQuery || selectedCategoryFilter !== null ? ' (filtered)' : ''}
          </p>
        </div>
        <Button onClick={openAddDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items or brands..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select
          value={selectedCategoryFilter?.toString() ?? 'all'}
          onValueChange={(v) => { setCategoryFilter(v === 'all' ? null : Number(v)); setPage(0); }}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.category_id} value={cat.category_id.toString()}>
                {cat.category_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[0.8rem]">Item</TableHead>
                  <TableHead className="text-[0.8rem] hidden md:table-cell">Brand</TableHead>
                  <TableHead className="text-[0.8rem]">Category</TableHead>
                  <TableHead className="text-[0.8rem] hidden lg:table-cell">Location</TableHead>
                  <TableHead className="text-[0.8rem] text-right">Qty</TableHead>
                  <TableHead className="text-[0.8rem] text-right hidden sm:table-cell">Min</TableHead>
                  <TableHead className="text-[0.8rem] text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-muted-foreground text-[0.875rem]">No items found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedItems.map((item) => {
                    const isLow = item.min_stock !== null && item.quantity <= item.min_stock;
                    return (
                      <TableRow key={item.item_id} className={isLow ? 'bg-amber-50/30' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-[0.875rem]">{item.name}</span>
                            {isLow && (
                              <Badge variant="destructive" className="text-[0.65rem] px-1.5 py-0">
                                Low
                              </Badge>
                            )}
                          </div>
                          <span className="text-[0.75rem] text-muted-foreground md:hidden">
                            {item.brand}
                          </span>
                        </TableCell>
                        <TableCell className="text-[0.85rem] text-muted-foreground hidden md:table-cell">
                          {item.brand || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[0.75rem]">
                            {getCategoryName(item.category_id)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {item.location_id ? (
                            <span className="text-[0.8rem]">{getLocationName(item.location_id)}</span>
                          ) : (
                            <span className="text-[0.8rem] text-muted-foreground flex items-center gap-1">
                              <MapPinOff className="w-3 h-3" /> Unassigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-[0.875rem]">
                          {item.quantity} <span className="text-muted-foreground text-[0.75rem]">{item.unit}</span>
                        </TableCell>
                        <TableCell className="text-right text-[0.8rem] text-muted-foreground hidden sm:table-cell">
                          {item.min_stock ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(item)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm(item.item_id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[0.8rem] text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filteredItems.length)} of {filteredItems.length}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" defaultValue={editingItem?.name ?? ''} required />
              </div>
              <div>
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" name="brand" defaultValue={editingItem?.brand ?? ''} />
              </div>
              <div>
                <Label htmlFor="category_id">Category *</Label>
                <select
                  id="category_id"
                  name="category_id"
                  defaultValue={editingItem?.category_id ?? ''}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-input-background px-3 py-1 text-[0.875rem] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select...</option>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={editingItem?.quantity ?? 1}
                  required
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit *</Label>
                <select
                  id="unit"
                  name="unit"
                  defaultValue={editingItem?.unit ?? 'count'}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-input-background px-3 py-1 text-[0.875rem] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="min_stock">Min Stock</Label>
                <Input
                  id="min_stock"
                  name="min_stock"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={editingItem?.min_stock ?? ''}
                />
              </div>
              <div>
                <Label htmlFor="location_id">Location</Label>
                <select
                  id="location_id"
                  name="location_id"
                  defaultValue={editingItem?.location_id ?? ''}
                  className="flex h-9 w-full rounded-md border border-input bg-input-background px-3 py-1 text-[0.875rem] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Unassigned</option>
                  {locations
                    .filter((l) => l.unit_type !== 'zone')
                    .sort((a, b) => a.display_name.localeCompare(b.display_name))
                    .map((loc) => (
                      <option key={loc.location_id} value={loc.location_id}>
                        {loc.display_name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  name="expiry_date"
                  type="date"
                  defaultValue={editingItem?.expiry_date ?? ''}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" defaultValue={editingItem?.notes ?? ''} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingItem ? 'Save Changes' : 'Add Item'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
          </DialogHeader>
          <p className="text-[0.875rem] text-muted-foreground">
            Are you sure you want to delete "{items.find((i) => i.item_id === deleteConfirm)?.name}"?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}