import {
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  useLocation,
} from 'react-router'
import { Suspense, lazy, type ReactElement } from 'react'
import { ConsoleLayout } from '../layouts/ConsoleLayout'
import { isAuthenticated } from '../services/authService'

const WorkbenchPage = lazy(() => import('../pages/WorkbenchPage').then((module) => ({ default: module.WorkbenchPage })))
const ThingModelPage = lazy(() => import('../pages/ThingModelPage').then((module) => ({ default: module.ThingModelPage })))
const DevicePage = lazy(() => import('../pages/DevicePage').then((module) => ({ default: module.DevicePage })))
const ProductPage = lazy(() => import('../pages/ProductPage').then((module) => ({ default: module.ProductPage })))
const LoginPage = lazy(() => import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const OAuthCallbackPage = lazy(() =>
  import('../pages/OAuthCallbackPage').then((module) => ({ default: module.OAuthCallbackPage })),
)

function LazyPage({ children }: { children: ReactElement }) {
  return <Suspense fallback={<div style={{ padding: 16 }}>页面加载中...</div>}>{children}</Suspense>
}

function ProtectedRoute() {
  const location = useLocation()
  if (!isAuthenticated()) {
    const redirect = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />
  }
  return <Outlet />
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route
        path="login"
        element={
          <LazyPage>
            <LoginPage />
          </LazyPage>
        }
      />
      <Route
        path="oauth/callback"
        element={
          <LazyPage>
            <OAuthCallbackPage />
          </LazyPage>
        }
      />
      <Route element={<ProtectedRoute />}>
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
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </>,
  ),
)

export function AppRouter() {
  return <RouterProvider router={router} />
}
