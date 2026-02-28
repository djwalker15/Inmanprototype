import { useMemo } from 'react';
import { useStore } from '../data/store';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { AlertTriangle, Plus, Minus, Check } from 'lucide-react';
import { toast } from 'sonner';

export function LowStockPage() {
  const items = useStore((s) => s.items);
  const categories = useStore((s) => s.categories);
  const updateItemQuantity = useStore((s) => s.updateItemQuantity);

  const getCategoryName = (id: number) =>
    categories.find(c => c.category_id === id)?.category_name ?? 'Unknown';

  const lowStockItems = useMemo(() =>
    items
      .filter((i) => i.min_stock !== null && i.quantity <= i.min_stock)
      .sort((a, b) => {
        const aRatio = a.quantity / (a.min_stock || 1);
        const bRatio = b.quantity / (b.min_stock || 1);
        return aRatio - bRatio;
      }),
    [items]
  );

  const criticalItems = lowStockItems.filter((i) => i.quantity === 0);
  const warningItems = lowStockItems.filter((i) => i.quantity > 0);

  const incrementQuantity = async (id: number, current: number) => {
    try {
      await updateItemQuantity(id, current + 1);
      toast.success('Quantity updated');
    } catch {
      toast.error('Failed to update quantity');
    }
  };

  const decrementQuantity = async (id: number, current: number) => {
    if (current > 0) {
      try {
        await updateItemQuantity(id, current - 1);
        toast.success('Quantity updated');
      } catch {
        toast.error('Failed to update quantity');
      }
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="tracking-tight flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          Low Stock
        </h1>
        <p className="text-muted-foreground text-[0.875rem] mt-1">
          {lowStockItems.length} items at or below restock threshold
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-amber-200">
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-[2rem] tracking-tight text-amber-600">{lowStockItems.length}</p>
            <p className="text-[0.8rem] text-muted-foreground">Total Low Stock</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-[2rem] tracking-tight text-red-600">{criticalItems.length}</p>
            <p className="text-[0.8rem] text-muted-foreground">Out of Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-[2rem] tracking-tight text-emerald-600">{warningItems.length}</p>
            <p className="text-[0.8rem] text-muted-foreground">Low but Available</p>
          </CardContent>
        </Card>
      </div>

      {lowStockItems.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Check className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
            <p className="text-[1.1rem]">All stocked up!</p>
            <p className="text-muted-foreground text-[0.875rem] mt-1">
              No items are currently below their minimum stock levels.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[0.8rem]">Status</TableHead>
                    <TableHead className="text-[0.8rem]">Item</TableHead>
                    <TableHead className="text-[0.8rem] hidden md:table-cell">Category</TableHead>
                    <TableHead className="text-[0.8rem] text-center">Current</TableHead>
                    <TableHead className="text-[0.8rem] text-center">Minimum</TableHead>
                    <TableHead className="text-[0.8rem] text-center">Adjust</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.map((item) => {
                    const isCritical = item.quantity === 0;
                    return (
                      <TableRow key={item.item_id} className={isCritical ? 'bg-red-50/40' : 'bg-amber-50/30'}>
                        <TableCell>
                          <Badge
                            variant={isCritical ? 'destructive' : 'outline'}
                            className="text-[0.7rem]"
                          >
                            {isCritical ? 'Out' : 'Low'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="text-[0.875rem]">{item.name}</span>
                            {item.brand && (
                              <span className="text-[0.75rem] text-muted-foreground block">{item.brand}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary" className="text-[0.75rem]">
                            {getCategoryName(item.category_id)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-[0.95rem] ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
                            {item.quantity}
                          </span>
                          <span className="text-[0.75rem] text-muted-foreground ml-1">{item.unit}</span>
                        </TableCell>
                        <TableCell className="text-center text-[0.85rem] text-muted-foreground">
                          {item.min_stock} {item.unit}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => decrementQuantity(item.item_id, item.quantity)}
                              disabled={item.quantity === 0}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-[0.875rem]">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => incrementQuantity(item.item_id, item.quantity)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
