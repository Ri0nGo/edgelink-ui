import { extractPayload, isRecord, requestJson, toNumber } from './apiUtils'

const TOKEN_STORAGE_KEY = 'edgelink.oauth.token'
const USER_STORAGE_KEY = 'edgelink.oauth.user'
const STATE_STORAGE_KEY = 'edgelink.oauth.state'
const REDIRECT_STORAGE_KEY = 'edgelink.oauth.redirect'

export type OAuthInfo = {
  enabled: boolean
  authUrl: string
  clientId: string
  redirectUri: string
  responseType: string
  scope: string
}

export type OAuthToken = {
  accessToken: string
  refreshToken: string
  openid: string
  scope: string
  expiresIn: number
  expiresAt: number
}

export type OAuthUser = {
  openid: string
  username: string
  displayName: string
  status: number
  roles: string[]
}

function readJson<T>(key: string): T | undefined {
  const raw = window.localStorage.getItem(key)
  if (!raw) {
    return undefined
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    window.localStorage.removeItem(key)
    return undefined
  }
}

function normalizeOAuthInfo(payload: unknown): OAuthInfo {
  const item = isRecord(payload) ? payload : {}
  return {
    enabled: Boolean(item.enabled),
    authUrl: String(item.auth_url ?? ''),
    clientId: String(item.client_id ?? ''),
    redirectUri: String(item.redirect_uri ?? ''),
    responseType: String(item.response_type ?? ''),
    scope: String(item.scope ?? ''),
  }
}

function normalizeOAuthToken(payload: unknown): OAuthToken {
  const item = isRecord(payload) ? payload : {}
  const expiresIn = toNumber(item.expires_in, 0)
  return {
    accessToken: String(item.access_token ?? ''),
    refreshToken: String(item.refresh_token ?? ''),
    openid: String(item.openid ?? ''),
    scope: String(item.scope ?? ''),
    expiresIn,
    expiresAt: Date.now() + Math.max(expiresIn - 60, 0) * 1000,
  }
}

function normalizeOAuthUser(payload: unknown): OAuthUser {
  const item = isRecord(payload) ? payload : {}
  return {
    openid: String(item.openid ?? ''),
    username: String(item.username ?? ''),
    displayName: String(item.display_name ?? ''),
    status: toNumber(item.status, 0),
    roles: Array.isArray(item.roles) ? item.roles.map(String) : [],
  }
}

export function createOAuthState(): string {
  const bytes = new Uint8Array(16)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function saveOAuthState(state: string): void {
  window.sessionStorage.setItem(STATE_STORAGE_KEY, state)
}

export function getSavedOAuthState(): string {
  return window.sessionStorage.getItem(STATE_STORAGE_KEY) ?? ''
}

export function clearOAuthState(): void {
  window.sessionStorage.removeItem(STATE_STORAGE_KEY)
}

export function saveLoginRedirect(path: string): void {
  window.sessionStorage.setItem(REDIRECT_STORAGE_KEY, path)
}

export function consumeLoginRedirect(): string {
  const target = window.sessionStorage.getItem(REDIRECT_STORAGE_KEY) || '/'
  window.sessionStorage.removeItem(REDIRECT_STORAGE_KEY)
  return target.startsWith('/') && !target.startsWith('//') ? target : '/'
}

export function getStoredToken(): OAuthToken | undefined {
  const token = readJson<OAuthToken>(TOKEN_STORAGE_KEY)
  if (!token?.accessToken) {
    return undefined
  }
  if (token.expiresAt > 0 && Date.now() >= token.expiresAt) {
    clearAuth()
    return undefined
  }
  return token
}

export function isAuthenticated(): boolean {
  return Boolean(getStoredToken())
}

export function getStoredUser(): OAuthUser | undefined {
  return readJson<OAuthUser>(USER_STORAGE_KEY)
}

export function saveAuth(token: OAuthToken, user?: OAuthUser): void {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token))
  if (user) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  }
}

export function clearAuth(): void {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  window.localStorage.removeItem(USER_STORAGE_KEY)
}

export async function fetchOAuthInfo(state: string): Promise<OAuthInfo> {
  const json = await requestJson(`/api/edgelink/oauth/info?state=${encodeURIComponent(state)}`)
  return normalizeOAuthInfo(extractPayload(json))
}

export async function exchangeOAuthCode(code: string): Promise<OAuthToken> {
  const json = await requestJson('/api/edgelink/oauth/token', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  return normalizeOAuthToken(extractPayload(json))
}

export async function fetchOAuthUser(accessToken: string): Promise<OAuthUser> {
  const json = await requestJson(`/api/edgelink/oauth/userinfo?access_token=${encodeURIComponent(accessToken)}`)
  return normalizeOAuthUser(extractPayload(json))
}
