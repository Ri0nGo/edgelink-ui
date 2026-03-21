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
    key: 'thingmode',
    label: '物模型管理',
    path: '/thingmode',
    icon: <DeploymentUnitOutlined />,
    title: '物模型管理',
  },
  {
    key: 'product',
    label: '产品管理',
    path: '/product',
    icon: <TagOutlined />,
    title: '产品管理',
  },
  {
    key: 'device',
    label: '设备管理',
    path: '/device',
    icon: <DesktopOutlined />,
    title: '设备管理',
  },
]
