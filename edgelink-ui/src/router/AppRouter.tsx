import {
  Navigate,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router'
import { Suspense, lazy, type ReactElement } from 'react'
import { ConsoleLayout } from '../layouts/ConsoleLayout'

const WorkbenchPage = lazy(() => import('../pages/WorkbenchPage').then((module) => ({ default: module.WorkbenchPage })))
const ThingModelPage = lazy(() => import('../pages/ThingModelPage').then((module) => ({ default: module.ThingModelPage })))
const DevicePage = lazy(() => import('../pages/DevicePage').then((module) => ({ default: module.DevicePage })))
const ProductPage = lazy(() => import('../pages/ProductPage').then((module) => ({ default: module.ProductPage })))

function LazyPage({ children }: { children: ReactElement }) {
  return <Suspense fallback={<div style={{ padding: 16 }}>页面加载中...</div>}>{children}</Suspense>
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<ConsoleLayout />}>
      <Route
        index
        element={
          <LazyPage>
            <WorkbenchPage />
          </LazyPage>
        }
      />
      <Route
        path="tsl"
        element={
          <LazyPage>
            <ThingModelPage />
          </LazyPage>
        }
      />
      <Route
        path="devices"
        element={
          <LazyPage>
            <DevicePage />
          </LazyPage>
        }
      />
      <Route
        path="products"
        element={
          <LazyPage>
            <ProductPage />
          </LazyPage>
        }
      />
      <Route path="thingmode" element={<Navigate to="/tsl" replace />} />
      <Route path="device" element={<Navigate to="/devices" replace />} />
      <Route path="product" element={<Navigate to="/products" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>,
  ),
)

export function AppRouter() {
  return <RouterProvider router={router} />
}
