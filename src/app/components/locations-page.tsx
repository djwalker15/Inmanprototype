import { useState } from 'react';
import { useStore } from '../data/store';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  ChevronRight,
  ChevronDown,
  MapPin,
  Warehouse,
  Package,
  FolderOpen,
  ArrowLeft,
} from 'lucide-react';
import type { Location } from '../data/mock-data';

const TYPE_ICONS: Record<string, string> = {
  zone: '🏠',
  section: '📦',
  cabinet: '🗄️',
  drawer: '🗃️',
  shelf: '📚',
  compartment: '🧊',
};

const TYPE_COLORS: Record<string, string> = {
  zone: 'bg-indigo-100 text-indigo-700',
  section: 'bg-violet-100 text-violet-700',
  cabinet: 'bg-emerald-100 text-emerald-700',
  drawer: 'bg-amber-100 text-amber-700',
  shelf: 'bg-sky-100 text-sky-700',
  compartment: 'bg-rose-100 text-rose-700',
};

export function LocationsPage() {
  const locations = useStore((s) => s.locations);
  const items = useStore((s) => s.items);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const zones = locations.filter((l) => l.parent_id === null);
  const getChildren = (parentId: number) => locations.filter((l) => l.parent_id === parentId);
  const getItemCount = (locationId: number): number => {
    const directCount = items.filter((i) => i.location_id === locationId).length;
    const childLocations = getChildren(locationId);
    const childCount = childLocations.reduce((sum, child) => sum + getItemCount(child.location_id), 0);
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

  const expandAll = () => {
    setExpandedIds(new Set(locations.map((l) => l.location_id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const renderLocation = (loc: Location, depth: number = 0) => {
    const children = getChildren(loc.location_id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(loc.location_id);
    const itemCount = getItemCount(loc.location_id);

    return (
      <div key={loc.location_id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${
            selectedLocation?.location_id === loc.location_id ? 'bg-accent' : ''
          }`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => setSelectedLocation(loc)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(loc.location_id);
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
          <span className="text-[1rem]">{TYPE_ICONS[loc.unit_type]}</span>
          <span className="text-[0.875rem] flex-1">{loc.display_name}</span>
          <Badge variant="outline" className={`text-[0.7rem] px-1.5 py-0 ${TYPE_COLORS[loc.unit_type]}`}>
            {loc.unit_type}
          </Badge>
          {itemCount > 0 && (
            <Badge variant="secondary" className="text-[0.7rem] px-1.5 py-0">
              {itemCount} items
            </Badge>
          )}
        </div>
        {isExpanded && hasChildren && (
          <div>{children.map((child) => renderLocation(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  const locationItems = selectedLocation
    ? items.filter((i) => i.location_id === selectedLocation.location_id)
    : [];
  const getCategoryName = useStore((s) => s.getCategoryName);

  // Build breadcrumb path
  const getBreadcrumb = (loc: Location): Location[] => {
    const path: Location[] = [loc];
    let current = loc;
    while (current.parent_id !== null) {
      const parent = locations.find((l) => l.location_id === current.parent_id);
      if (parent) {
        path.unshift(parent);
        current = parent;
      } else break;
    }
    return path;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="tracking-tight">Locations</h1>
          <p className="text-muted-foreground text-[0.875rem] mt-1">
            {locations.length} storage locations across 5 zones
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Tree view */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[0.95rem] flex items-center gap-2">
                <Warehouse className="w-4 h-4" />
                Kitchen Layout
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {zones.map((zone) => renderLocation(zone))}
            </CardContent>
          </Card>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6">
            {selectedLocation ? (
              <>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-[1.5rem]">{TYPE_ICONS[selectedLocation.unit_type]}</span>
                    <div className="flex-1">
                      <CardTitle className="text-[1rem]">{selectedLocation.display_name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge className={`text-[0.7rem] ${TYPE_COLORS[selectedLocation.unit_type]}`}>
                          {selectedLocation.unit_type}
                        </Badge>
                        <span className="text-[0.75rem] text-muted-foreground">
                          ID: {selectedLocation.location_id}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Breadcrumb */}
                  <div className="flex flex-wrap items-center gap-1 text-[0.75rem] text-muted-foreground">
                    {getBreadcrumb(selectedLocation).map((loc, idx, arr) => (
                      <span key={loc.location_id} className="flex items-center gap-1">
                        <button
                          className="hover:text-foreground transition-colors"
                          onClick={() => setSelectedLocation(loc)}
                        >
                          {loc.display_name}
                        </button>
                        {idx < arr.length - 1 && <ChevronRight className="w-3 h-3" />}
                      </span>
                    ))}
                  </div>

                  {/* Properties */}
                  <div className="space-y-2">
                    <DetailRow label="Area" value={selectedLocation.area} />
                    {selectedLocation.position && <DetailRow label="Position" value={selectedLocation.position} />}
                    {selectedLocation.sub_position && <DetailRow label="Sub-position" value={selectedLocation.sub_position} />}
                    {selectedLocation.notes && <DetailRow label="Notes" value={selectedLocation.notes} />}
                    {selectedLocation.parent_id !== null && (
                      <DetailRow
                        label="Parent"
                        value={locations.find((l) => l.location_id === selectedLocation.parent_id)?.display_name ?? '—'}
                      />
                    )}
                  </div>

                  {/* Children */}
                  {getChildren(selectedLocation.location_id).length > 0 && (
                    <div>
                      <p className="text-[0.8rem] text-muted-foreground mb-2 flex items-center gap-1">
                        <FolderOpen className="w-3.5 h-3.5" />
                        Children ({getChildren(selectedLocation.location_id).length})
                      </p>
                      <div className="space-y-1">
                        {getChildren(selectedLocation.location_id).map((child) => (
                          <button
                            key={child.location_id}
                            onClick={() => setSelectedLocation(child)}
                            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md hover:bg-accent text-left text-[0.85rem] transition-colors"
                          >
                            <span>{TYPE_ICONS[child.unit_type]}</span>
                            {child.display_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Items at this location */}
                  <div>
                    <p className="text-[0.8rem] text-muted-foreground mb-2 flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      Items Here ({locationItems.length})
                    </p>
                    {locationItems.length === 0 ? (
                      <p className="text-[0.8rem] text-muted-foreground/60 italic">No items assigned to this location</p>
                    ) : (
                      <div className="space-y-1">
                        {locationItems.map((item) => (
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
                <MapPin className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground text-[0.875rem]">Select a location to view details</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
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
