import {
  AppstoreOutlined,
  DesktopOutlined,
  TagOutlined,
  DeploymentUnitOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'

export type MenuRoute = {
  key: string
  label: string
  path: string
  icon: ReactNode
  title: string
}

export const menuRoutes: MenuRoute[] = [
  {
    key: 'workbench',
    label: '工作台',
    path: '/',
    icon: <AppstoreOutlined />,
    title: '工作台',
  },
  {
    key: 'tsl',
    label: '物模型管理',
    path: '/tsl',
    icon: <DeploymentUnitOutlined />,
    title: '物模型管理',
  },
  {
    key: 'products',
    label: '产品管理',
    path: '/products',
    icon: <TagOutlined />,
    title: '产品管理',
  },
  {
    key: 'devices',
    label: '设备管理',
    path: '/devices',
    icon: <DesktopOutlined />,
    title: '设备管理',
  },
]
