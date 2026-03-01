import { useState, useMemo } from 'react';
import { useStore } from '../data/store';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  ChevronRight,
  ChevronDown,
  Box,
  Warehouse,
  Package,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Space, SpaceUnitType } from '../data/types';

const TYPE_ICONS: Record<string, string> = {
  premises: '🏠',
  area: '🏡',
  zone: '📍',
  section: '📦',
  container: '🗄️',
  shelf: '📚',
};

const TYPE_COLORS: Record<string, string> = {
  premises: 'bg-slate-100 text-slate-700',
  area: 'bg-indigo-100 text-indigo-700',
  zone: 'bg-violet-100 text-violet-700',
  section: 'bg-emerald-100 text-emerald-700',
  container: 'bg-amber-100 text-amber-700',
  shelf: 'bg-sky-100 text-sky-700',
};

const UNIT_TYPES: SpaceUnitType[] = ['premises', 'area', 'zone', 'section', 'container', 'shelf'];

const TYPE_DESCRIPTIONS: Record<SpaceUnitType, string> = {
  premises: 'Whole property',
  area: 'Major area',
  zone: 'Logical zone',
  section: 'Sub-area',
  container: 'Storage unit',
  shelf: 'Individual shelf',
};

// Build indented tree, excluding a space and its descendants (for parent dropdown)
function buildSpaceTree(
  spaces: Space[],
  parentId: number | null = null,
  depth: number = 0,
  excludeIds: Set<number> = new Set()
): { space: Space; depth: number }[] {
  const result: { space: Space; depth: number }[] = [];
  const children = spaces
    .filter(s => s.parent_id === parentId && !excludeIds.has(s.space_id))
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const child of children) {
    result.push({ space: child, depth });
    result.push(...buildSpaceTree(spaces, child.space_id, depth + 1, excludeIds));
  }
  return result;
}

function getDescendantIds(id: number, spaces: Space[]): Set<number> {
  const result = new Set<number>([id]);
  const children = spaces.filter(s => s.parent_id === id);
  for (const child of children) {
    for (const did of getDescendantIds(child.space_id, spaces)) {
      result.add(did);
    }
  }
  return result;
}

export function SpacesPage() {
  const spaces = useStore((s) => s.spaces);
  const items = useStore((s) => s.items);
  const addSpace = useStore((s) => s.addSpace);
  const updateSpace = useStore((s) => s.updateSpace);
  const deleteSpace = useStore((s) => s.deleteSpace);
  const getCategoryName = useStore((s) => s.getCategoryName);

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);

  // CRUD dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Space | null>(null);
  const [saving, setSaving] = useState(false);

  const rootSpaces = useMemo(() => spaces.filter(s => s.parent_id === null), [spaces]);
  const getChildren = (parentId: number) => spaces.filter(s => s.parent_id === parentId);

  const getItemCount = (spaceId: number): number => {
    const directCount = items.filter(i => i.space_id === spaceId).length;
    const childSpaces = getChildren(spaceId);
    const childCount = childSpaces.reduce((sum, child) => sum + getItemCount(child.space_id), 0);
    return directCount + childCount;
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(spaces.map(s => s.space_id)));
  const collapseAll = () => setExpandedIds(new Set());

  // ── Form handling ──
  const openAddForm = (parentId?: number | null) => {
    setEditingSpace(null);
    setFormOpen(true);
  };

  const openEditForm = (space: Space) => {
    setEditingSpace(space);
    setFormOpen(true);
  };

  const handleSave = async (formData: FormData) => {
    const name = formData.get('name') as string;
    const unit_type = formData.get('unit_type') as SpaceUnitType;
    const parent_id = formData.get('parent_id') ? Number(formData.get('parent_id')) : null;
    const notes = (formData.get('notes') as string) || null;

    if (!name || !unit_type) {
      toast.error('Name and type are required');
      return;
    }

    setSaving(true);
    try {
      if (editingSpace) {
        await updateSpace(editingSpace.space_id, { name, unit_type, parent_id, notes });
        toast.success(`Updated "${name}"`);
        // Refresh selected space if it was the one we edited
        if (selectedSpace?.space_id === editingSpace.space_id) {
          setSelectedSpace({ ...editingSpace, name, unit_type, parent_id, notes });
        }
      } else {
        await addSpace({ name, unit_type, parent_id, notes });
        toast.success(`Created "${name}"`);
      }
      setFormOpen(false);
    } catch {
      toast.error('Failed to save space');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (space: Space, mode: 'promote' | 'cascade') => {
    setSaving(true);
    try {
      await deleteSpace(space.space_id, mode);
      toast.success(`Deleted "${space.name}"`);
      if (selectedSpace?.space_id === space.space_id) {
        setSelectedSpace(null);
      }
    } catch {
      toast.error('Failed to delete space');
    } finally {
      setSaving(false);
      setDeleteConfirm(null);
    }
  };

  // Exclude self + descendants when editing parent dropdown
  const parentExcludeIds = useMemo(() => {
    if (!editingSpace) return new Set<number>();
    return getDescendantIds(editingSpace.space_id, spaces);
  }, [editingSpace, spaces]);

  const parentTree = useMemo(
    () => buildSpaceTree(spaces, null, 0, parentExcludeIds),
    [spaces, parentExcludeIds]
  );

  // ── Tree rendering ──
  const renderSpace = (space: Space, depth: number = 0) => {
    const children = getChildren(space.space_id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(space.space_id);
    const itemCount = getItemCount(space.space_id);

    return (
      <div key={space.space_id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${
            selectedSpace?.space_id === space.space_id ? 'bg-accent' : ''
          }`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => setSelectedSpace(space)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(space.space_id);
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <span className="text-[1rem]">{TYPE_ICONS[space.unit_type]}</span>
          <span className="text-[0.875rem] flex-1">{space.name}</span>
          <Badge variant="outline" className={`text-[0.7rem] px-1.5 py-0 ${TYPE_COLORS[space.unit_type]}`}>
            {space.unit_type}
          </Badge>
          {itemCount > 0 && (
            <Badge variant="secondary" className="text-[0.7rem] px-1.5 py-0">
              {itemCount} items
            </Badge>
          )}
        </div>
        {isExpanded && hasChildren && (
          <div>{children.map((child) => renderSpace(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  const spaceItems = selectedSpace
    ? items.filter(i => i.space_id === selectedSpace.space_id)
    : [];

  // Build breadcrumb path
  const getBreadcrumb = (space: Space): Space[] => {
    const path: Space[] = [space];
    let current = space;
    while (current.parent_id !== null) {
      const parent = spaces.find(s => s.space_id === current.parent_id);
      if (parent) {
        path.unshift(parent);
        current = parent;
      } else break;
    }
    return path;
  };

  const hasChildrenForDelete = deleteConfirm ? getChildren(deleteConfirm.space_id).length > 0 : false;

  // Count spaces per type for the hierarchy bar
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of UNIT_TYPES) counts[t] = 0;
    for (const s of spaces) counts[s.unit_type] = (counts[s.unit_type] || 0) + 1;
    return counts;
  }, [spaces]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="tracking-tight">Spaces</h1>
          <p className="text-muted-foreground text-[0.875rem] mt-1">
            {spaces.length} storage spaces in your hierarchy
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
          <Button size="sm" onClick={() => openAddForm()} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add Space
          </Button>
        </div>
      </div>

      {/* Hierarchy chain — always visible */}
      <Card className="border-dashed">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[0.75rem] font-medium text-muted-foreground uppercase tracking-wider">Type Hierarchy</span>
          </div>
          <div className="flex flex-wrap items-stretch gap-0">
            {UNIT_TYPES.map((type, idx) => {
              const isActive = selectedSpace?.unit_type === type;
              return (
                <div key={type} className="flex items-stretch">
                  <div
                    className={`
                      flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all min-w-[5.5rem]
                      ${isActive
                        ? `ring-2 ring-offset-1 ring-current ${TYPE_COLORS[type]} shadow-sm`
                        : 'hover:bg-muted/50'
                      }
                    `}
                  >
                    <span className="text-[1.1rem] leading-none">{TYPE_ICONS[type]}</span>
                    <span className={`text-[0.75rem] font-semibold mt-1 capitalize ${isActive ? '' : 'text-foreground'}`}>
                      {type}
                    </span>
                    <span className="text-[0.65rem] text-muted-foreground leading-tight mt-0.5">
                      {TYPE_DESCRIPTIONS[type]}
                    </span>
                    <Badge
                      variant={isActive ? 'default' : 'secondary'}
                      className="text-[0.6rem] px-1.5 py-0 mt-1 h-4"
                    >
                      {typeCounts[type]}
                    </Badge>
                  </div>
                  {idx < UNIT_TYPES.length - 1 && (
                    <div className="flex items-center px-1">
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Tree view */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[0.95rem] flex items-center gap-2">
                <Warehouse className="w-4 h-4" />
                Space Hierarchy
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {rootSpaces.map((space) => renderSpace(space))}
            </CardContent>
          </Card>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6">
            {selectedSpace ? (
              <>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-[1.5rem]">{TYPE_ICONS[selectedSpace.unit_type]}</span>
                    <div className="flex-1">
                      <CardTitle className="text-[1rem]">{selectedSpace.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge className={`text-[0.7rem] ${TYPE_COLORS[selectedSpace.unit_type]}`}>
                          {selectedSpace.unit_type}
                        </Badge>
                        <span className="text-[0.75rem] text-muted-foreground">
                          ID: {selectedSpace.space_id}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(selectedSpace)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(selectedSpace)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Breadcrumb */}
                  <div className="flex flex-wrap items-center gap-1 text-[0.75rem] text-muted-foreground">
                    {getBreadcrumb(selectedSpace).map((s, idx, arr) => (
                      <span key={s.space_id} className="flex items-center gap-1">
                        <button
                          className="hover:text-foreground transition-colors"
                          onClick={() => setSelectedSpace(s)}
                        >
                          {s.name}
                        </button>
                        {idx < arr.length - 1 && <ChevronRight className="w-3 h-3" />}
                      </span>
                    ))}
                  </div>

                  {/* Properties */}
                  <div className="space-y-2">
                    {selectedSpace.notes && <DetailRow label="Notes" value={selectedSpace.notes} />}
                    {selectedSpace.parent_id !== null && (
                      <DetailRow
                        label="Parent"
                        value={spaces.find(s => s.space_id === selectedSpace.parent_id)?.name ?? '—'}
                      />
                    )}
                  </div>

                  {/* Children */}
                  {getChildren(selectedSpace.space_id).length > 0 && (
                    <div>
                      <p className="text-[0.8rem] text-muted-foreground mb-2 flex items-center gap-1">
                        <FolderOpen className="w-3.5 h-3.5" />
                        Children ({getChildren(selectedSpace.space_id).length})
                      </p>
                      <div className="space-y-1">
                        {getChildren(selectedSpace.space_id).map((child) => (
                          <button
                            key={child.space_id}
                            onClick={() => setSelectedSpace(child)}
                            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md hover:bg-accent text-left text-[0.85rem] transition-colors"
                          >
                            <span>{TYPE_ICONS[child.unit_type]}</span>
                            {child.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Items at this space */}
                  <div>
                    <p className="text-[0.8rem] text-muted-foreground mb-2 flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      Items Here ({spaceItems.length})
                    </p>
                    {spaceItems.length === 0 ? (
                      <p className="text-[0.8rem] text-muted-foreground/60 italic">No items assigned to this space</p>
                    ) : (
                      <div className="space-y-1">
                        {spaceItems.map((item) => (
                          <div key={item.item_id} className="flex items-center justify-between px-3 py-1.5 rounded-md bg-muted/50">
                            <span className="text-[0.85rem]">{item.name}</span>
                            <span className="text-[0.75rem] text-muted-foreground">{item.quantity} {item.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="py-16 text-center">
                <Box className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground text-[0.875rem]">Select a space to view details</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Add/Edit Space Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSpace ? 'Edit Space' : 'Add New Space'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" defaultValue={editingSpace?.name ?? ''} required placeholder="e.g. Cabinet 1, Shelf 3" />
              </div>
              <div>
                <Label htmlFor="unit_type">Type *</Label>
                <select
                  id="unit_type"
                  name="unit_type"
                  defaultValue={editingSpace?.unit_type ?? 'container'}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-input-background px-3 py-1 text-[0.875rem] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {UNIT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="parent_id">Parent Space</Label>
                <select
                  id="parent_id"
                  name="parent_id"
                  defaultValue={editingSpace?.parent_id ?? ''}
                  className="flex h-9 w-full rounded-md border border-input bg-input-background px-3 py-1 text-[0.875rem] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">None (root)</option>
                  {parentTree.map(({ space, depth }) => (
                    <option key={space.space_id} value={space.space_id}>
                      {'\u00A0'.repeat(depth * 3)}{space.name} ({space.unit_type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" defaultValue={editingSpace?.notes ?? ''} placeholder="Optional notes" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingSpace ? 'Save Changes' : 'Create Space'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Space</DialogTitle>
          </DialogHeader>
          <p className="text-[0.875rem] text-muted-foreground">
            Delete "{deleteConfirm?.name}"?
            {hasChildrenForDelete && ' This space has children.'}
          </p>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">
              Cancel
            </Button>
            {hasChildrenForDelete ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => deleteConfirm && handleDelete(deleteConfirm, 'promote')}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? 'Deleting...' : 'Delete & Promote Children'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteConfirm && handleDelete(deleteConfirm, 'cascade')}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? 'Deleting...' : 'Delete All'}
                </Button>
              </>
            ) : (
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && handleDelete(deleteConfirm, 'promote')}
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[0.8rem] text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-[0.85rem]">{value}</span>
    </div>
  );
}