import { Outlet, NavLink, useLocation } from 'react-router';
import {
  LayoutDashboard,
  Package,
  MapPin,
  Tags,
  AlertTriangle,
  Menu,
  X,
  ChefHat,
} from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../data/store';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Toaster } from 'sonner';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/locations', label: 'Locations', icon: MapPin },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/low-stock', label: 'Low Stock', icon: AlertTriangle },
];

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const lowStockCount = useStore((s) => s.getLowStockItems().length);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar — Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
            <ChefHat className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-[1.125rem] tracking-tight">InMan</h1>
            <p className="text-[0.7rem] text-muted-foreground leading-none mt-0.5">Kitchen Inventory</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`
              }
            >
              <item.icon className="w-[1.125rem] h-[1.125rem]" />
              <span className="text-[0.875rem]">{item.label}</span>
              {item.to === '/low-stock' && lowStockCount > 0 && (
                <Badge variant="destructive" className="ml-auto text-[0.7rem] px-1.5 py-0">
                  {lowStockCount}
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-border">
          <p className="text-[0.7rem] text-muted-foreground">Phase 1 — Spreadsheet Prototype</p>
          <p className="text-[0.65rem] text-muted-foreground/60 mt-0.5">165 items cataloged</p>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <ChefHat className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-[1rem] tracking-tight">InMan</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </header>

        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div className="md:hidden absolute inset-0 z-50 bg-background/95 pt-16 px-4">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {item.to === '/low-stock' && lowStockCount > 0 && (
                    <Badge variant="destructive" className="ml-auto">{lowStockCount}</Badge>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}