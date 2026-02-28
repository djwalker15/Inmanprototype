import { useStore } from '../data/store';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tags, Package } from 'lucide-react';

const CATEGORY_COLORS = [
  'bg-red-50 border-red-200',
  'bg-orange-50 border-orange-200',
  'bg-amber-50 border-amber-200',
  'bg-yellow-50 border-yellow-200',
  'bg-lime-50 border-lime-200',
  'bg-emerald-50 border-emerald-200',
  'bg-teal-50 border-teal-200',
  'bg-cyan-50 border-cyan-200',
  'bg-blue-50 border-blue-200',
  'bg-indigo-50 border-indigo-200',
  'bg-violet-50 border-violet-200',
  'bg-purple-50 border-purple-200',
];

export function CategoriesPage() {
  const categories = useStore((s) => s.categories);
  const items = useStore((s) => s.items);
  const totalItems = items.length;

  const categoryStats = categories.map((cat, idx) => {
    const catItems = items.filter((i) => i.category_id === cat.category_id);
    const lowStock = catItems.filter((i) => i.min_stock !== null && i.quantity <= i.min_stock);
    const totalQty = catItems.reduce((sum, i) => sum + i.quantity, 0);
    return {
      ...cat,
      itemCount: catItems.length,
      lowStockCount: lowStock.length,
      totalQuantity: totalQty,
      percentage: ((catItems.length / totalItems) * 100).toFixed(1),
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    };
  }).sort((a, b) => b.itemCount - a.itemCount);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="tracking-tight">Categories</h1>
        <p className="text-muted-foreground text-[0.875rem] mt-1">
          {categories.length} categories organizing {totalItems} items
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {categoryStats.map((cat) => (
          <Card key={cat.category_id} className={`${cat.color} border`}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tags className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-[0.95rem]">{cat.category_name}</h3>
                </div>
                <Badge variant="secondary" className="text-[0.75rem]">
                  {cat.percentage}%
                </Badge>
              </div>

              {cat.description && (
                <p className="text-[0.8rem] text-muted-foreground mb-3 leading-relaxed">
                  {cat.description}
                </p>
              )}

              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[0.85rem]">{cat.itemCount} items</span>
                </div>
                <span className="text-[0.8rem] text-muted-foreground">
                  {cat.totalQuantity} total units
                </span>
              </div>

              <Progress value={Number(cat.percentage)} className="h-1.5" />

              {cat.lowStockCount > 0 && (
                <div className="mt-3 flex items-center gap-1.5">
                  <Badge variant="destructive" className="text-[0.7rem] px-1.5 py-0">
                    {cat.lowStockCount} low stock
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
