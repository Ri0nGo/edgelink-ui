import { LoginOutlined, StarOutlined } from '@ant-design/icons'
import { Alert, Button, Typography } from 'antd'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import {
  createOAuthState,
  fetchOAuthInfo,
  isAuthenticated,
  saveLoginRedirect,
  saveOAuthState,
} from '../services/authService'

export function LoginPage() {
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (isAuthenticated()) {
    return <Navigate to="/" replace />
  }

  const startOAuthLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const state = createOAuthState()
      saveOAuthState(state)
      saveLoginRedirect(new URLSearchParams(location.search).get('redirect') || '/')
      const info = await fetchOAuthInfo(state)
      if (!info.enabled) {
        throw new Error('OAuth2 登录未启用')
      }
      if (!info.authUrl) {
        throw new Error('后端未返回 OAuth2 授权地址')
      }
      window.location.assign(info.authUrl)
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand-block login-card-brand">
          <div className="brand-icon login-brand-icon" aria-hidden="true">
            <StarOutlined />
          </div>
          <div className="brand-copy">
            <Typography.Text className="brand-title">EdgeLink</Typography.Text>
            <Typography.Text className="brand-subtitle">IoT Management Platform</Typography.Text>
          </div>
        </div>
        <Typography.Paragraph className="login-card-desc">
          EdgeLink 是面向 IoT 设备接入、物模型管理与产品运维的轻量化控制台，帮助快速完成边缘设备数据管理。
        </Typography.Paragraph>
        <Typography.Paragraph className="login-card-desc login-card-auth-desc">
          使用企业 IAM 账号一键登录，授权成功后自动回到系统。
        </Typography.Paragraph>
        {error ? <Alert type="error" showIcon message={error} className="login-alert" /> : null}
        <Button
          type="primary"
          size="large"
          block
          loading={loading}
          icon={<LoginOutlined />}
          className="login-submit-btn"
          onClick={startOAuthLogin}
        >
          一键 OAuth2 登录
        </Button>
      </section>
    </main>
  )
}
