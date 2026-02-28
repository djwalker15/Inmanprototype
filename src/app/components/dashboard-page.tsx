import { useStore } from '../data/store';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Package,
  MapPin,
  Tags,
  AlertTriangle,
  MapPinOff,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#818cf8', '#4f46e5', '#7c3aed', '#9333ea',
  '#a855f7', '#d946ef', '#e879f9', '#f0abfc',
];

export function DashboardPage() {
  const items = useStore((s) => s.items);
  const categories = useStore((s) => s.categories);
  const locations = useStore((s) => s.locations);

  const lowStock = useMemo(
    () => items.filter(i => i.min_stock !== null && i.quantity <= i.min_stock),
    [items]
  );
  const unassigned = useMemo(
    () => items.filter(i => i.location_id === null),
    [items]
  );

  const categoryData = categories.map((cat) => {
    const count = items.filter((i) => i.category_id === cat.category_id).length;
    return { name: cat.category_name, count };
  }).sort((a, b) => b.count - a.count);

  const zoneData = locations
    .filter((l) => l.unit_type === 'zone')
    .map((zone) => {
      const childIds = getDescendantIds(zone.location_id, locations);
      const count = items.filter((i) => i.location_id !== null && childIds.includes(i.location_id)).length;
      return { name: zone.display_name, count };
    });

  const assignedCount = items.filter((i) => i.location_id !== null).length;
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-[0.875rem] mt-1">
          Kitchen inventory overview — {items.length} items cataloged
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title="Total Items"
          value={items.length}
          subtitle={`${totalQuantity} total units`}
          icon={<Package className="w-4 h-4" />}
          color="text-indigo-600"
          bg="bg-indigo-50"
        />
        <StatCard
          title="Categories"
          value={categories.length}
          subtitle="Active categories"
          icon={<Tags className="w-4 h-4" />}
          color="text-violet-600"
          bg="bg-violet-50"
        />
        <StatCard
          title="Locations"
          value={locations.length}
          subtitle="Storage spots mapped"
          icon={<MapPin className="w-4 h-4" />}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          title="Low Stock"
          value={lowStock.length}
          subtitle="Need restocking"
          icon={<AlertTriangle className="w-4 h-4" />}
          color="text-amber-600"
          bg="bg-amber-50"
          alert={lowStock.length > 0}
        />
      </div>

      {/* Assignment progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPinOff className="w-4 h-4 text-muted-foreground" />
              <span className="text-[0.875rem] text-muted-foreground">Location Assignment Progress</span>
            </div>
            <span className="text-[0.875rem]">
              {assignedCount} / {items.length} assigned
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all"
              style={{ width: `${(assignedCount / items.length) * 100}%` }}
            />
          </div>
          <p className="text-[0.75rem] text-muted-foreground mt-2">
            {unassigned.length} items still need shelf assignments after being returned from pantry consolidation
          </p>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[0.95rem] flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Items by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[0.95rem] flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Items by Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              {assignedCount === 0 ? (
                <div className="text-center text-muted-foreground">
                  <MapPinOff className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-[0.875rem]">No items assigned to locations yet</p>
                  <p className="text-[0.75rem] mt-1">Assign items to see zone distribution</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={zoneData.filter(z => z.count > 0)}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, count }) => `${name} (${count})`}
                    >
                      {zoneData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent low stock alerts */}
      {lowStock.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[0.95rem] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStock.slice(0, 8).map((item) => (
                <div
                  key={item.item_id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-50/50 border border-amber-100"
                >
                  <div>
                    <span className="text-[0.875rem]">{item.name}</span>
                    {item.brand && (
                      <span className="text-[0.75rem] text-muted-foreground ml-2">{item.brand}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[0.75rem]">
                      {item.quantity} {item.unit}
                    </Badge>
                    <span className="text-[0.7rem] text-muted-foreground">
                      min: {item.min_stock}
                    </span>
                  </div>
                </div>
              ))}
              {lowStock.length > 8 && (
                <p className="text-[0.75rem] text-muted-foreground text-center pt-1">
                  +{lowStock.length - 8} more items
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  bg,
  alert,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? 'border-amber-200' : ''}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[0.8rem] text-muted-foreground">{title}</span>
          <div className={`p-1.5 rounded-md ${bg} ${color}`}>{icon}</div>
        </div>
        <p className="text-[1.75rem] tracking-tight">{value}</p>
        <p className="text-[0.75rem] text-muted-foreground mt-0.5">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// Helper: get all descendant location IDs
function getDescendantIds(parentId: number, allLocations: { location_id: number; parent_id: number | null }[]): number[] {
  const ids = [parentId];
  const children = allLocations.filter((l) => l.parent_id === parentId);
  for (const child of children) {
    ids.push(...getDescendantIds(child.location_id, allLocations));
  }
  return ids;
}