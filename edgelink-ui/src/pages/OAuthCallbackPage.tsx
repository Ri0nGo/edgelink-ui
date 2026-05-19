import { LoadingOutlined } from '@ant-design/icons'
import { Alert, App, Spin, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  clearAuth,
  clearOAuthState,
  consumeLoginRedirect,
  exchangeOAuthCode,
  fetchOAuthUser,
  getSavedOAuthState,
  saveAuth,
} from '../services/authService'

export function OAuthCallbackPage() {
  const { message } = App.useApp()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const handleCallback = async () => {
      const code = searchParams.get('code') ?? ''
      const state = searchParams.get('state') ?? ''
      const savedState = getSavedOAuthState()

      try {
        if (!code) {
          throw new Error('OAuth2 回调缺少 code')
        }
        if (!state || !savedState || state !== savedState) {
          throw new Error('OAuth2 state 校验失败，请重新登录')
        }

        const token = await exchangeOAuthCode(code)
        if (!token.accessToken) {
          throw new Error('OAuth2 token 为空')
        }
        const user = await fetchOAuthUser(token.accessToken)
        saveAuth(token, user)
        clearOAuthState()
        if (!cancelled) {
          navigate(consumeLoginRedirect(), { replace: true })
        }
      } catch (err) {
        const errorMessage = (err as Error).message
        clearAuth()
        clearOAuthState()
        if (!cancelled) {
          message.error('登录失败')
          setError(errorMessage)
          window.setTimeout(() => {
            navigate('/login', { replace: true })
          }, 1200)
        }
      }
    }

    void handleCallback()
    return () => {
      cancelled = true
    }
  }, [message, navigate, searchParams])

  return (
    <main className="login-page oauth-callback-page">
      <section className="login-card oauth-callback-card">
        {error ? (
          <>
            <Typography.Title level={2}>登录失败</Typography.Title>
            <Alert type="error" showIcon message={error} className="login-alert" />
            <button type="button" className="oauth-callback-link" onClick={() => navigate('/login', { replace: true })}>
              返回登录页
            </button>
          </>
        ) : (
          <>
            <Spin indicator={<LoadingOutlined spin />} size="large" />
            <Typography.Title level={2}>正在完成登录</Typography.Title>
            <Typography.Paragraph className="login-card-desc">请稍候，正在校验授权信息...</Typography.Paragraph>
          </>
        )}
      </section>
    </main>
  )
}
