import {
  Navigate,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router'
import { ConsoleLayout } from '../layouts/ConsoleLayout'
import { DevicePage } from '../pages/DevicePage'
import { ProductPage } from '../pages/ProductPage'
import { ThingModelPage } from '../pages/ThingModelPage'
import { WorkbenchPage } from '../pages/WorkbenchPage'

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<ConsoleLayout />}>
      <Route index element={<WorkbenchPage />} />
      <Route path="thingmode" element={<ThingModelPage />} />
      <Route path="device" element={<DevicePage />} />
      <Route path="product" element={<ProductPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>,
  ),
)

export function AppRouter() {
  return <RouterProvider router={router} />
}
