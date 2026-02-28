import { createBrowserRouter } from 'react-router';
import { Layout } from './components/layout';
import { DashboardPage } from './components/dashboard-page';
import { InventoryPage } from './components/inventory-page';
import { SpacesPage } from './components/spaces-page';
import { CategoriesPage } from './components/categories-page';
import { LowStockPage } from './components/low-stock-page';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: DashboardPage },
      { path: 'inventory', Component: InventoryPage },
      { path: 'spaces', Component: SpacesPage },
      { path: 'categories', Component: CategoriesPage },
      { path: 'low-stock', Component: LowStockPage },
    ],
  },
]);
