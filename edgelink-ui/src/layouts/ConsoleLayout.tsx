import {
  BellOutlined,
  DownOutlined,
  SettingOutlined,
  StarOutlined,
} from '@ant-design/icons'
import { Avatar, Badge, Button, Layout, Menu, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { menuRoutes } from '../router/menu'

const { Header, Sider, Content } = Layout

export function ConsoleLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const target = menuRoutes.find((item) => item.key === key)
    if (target) {
      navigate(target.path)
    }
  }

  const selectedKey = useMemo(() => {
    const matched = menuRoutes.find((item) => item.path === location.pathname)
    return matched?.key ?? 'workbench'
  }, [location.pathname])

  return (
    <Layout className="console-shell">
      <Header className="console-header">
        <div className="brand-block">
          <div className="brand-icon" aria-hidden="true">
            <StarOutlined />
          </div>
          <div className="brand-copy">
            <Typography.Text className="brand-title">EdgeLink</Typography.Text>
            <Typography.Text className="brand-subtitle">
              IoT Management Platform
            </Typography.Text>
          </div>
        </div>

        <Space size={12} className="header-actions">
          <Badge dot>
            <Button type="text" className="action-btn" icon={<BellOutlined />} />
          </Badge>
          <Button type="text" className="action-btn" icon={<SettingOutlined />} />
          <Space size={8} className="user-block">
            <Avatar size={32} className="user-avatar">
              AD
            </Avatar>
            <Typography.Text className="user-name">管理员</Typography.Text>
            <DownOutlined className="user-arrow" />
          </Space>
        </Space>
      </Header>

      <Sider width={206} className="console-sider">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuRoutes.map((route) => ({
            key: route.key,
            icon: route.icon,
            label: route.label,
          }))}
          onClick={handleMenuClick}
        />
      </Sider>

      <Content className="console-content">
        <Outlet />
      </Content>
    </Layout>
  )
}
