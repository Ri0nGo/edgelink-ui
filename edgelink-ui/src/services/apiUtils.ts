type AnyRecord = Record<string, unknown>

export function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function extractPayload<T = unknown>(json: unknown): T {
  if (!isRecord(json)) {
    return json as T
  }

  if ('data' in json) {
    return json.data as T
  }

  if ('result' in json) {
    return json.result as T
  }

  return json as T
}

export function normalizeDate(input: unknown): string {
  if (input === undefined || input === null || input === '') {
    return '--'
  }

  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    return input.slice(0, 10)
  }

  const timestamp = Number(input)
  if (!Number.isNaN(timestamp)) {
    const date = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000)
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10)
    }
  }

  return String(input)
}

export function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value)
  return Number.isNaN(num) ? fallback : num
}

export function extractListPayload<T>(payload: unknown): { list: T[]; total: number } {
  if (Array.isArray(payload)) {
    return { list: payload as T[], total: payload.length }
  }

  if (isRecord(payload)) {
    const nestedData = isRecord(payload.data) ? payload.data : undefined
    const listCandidate =
      (Array.isArray(payload.list) && payload.list) ||
      (Array.isArray(payload.items) && payload.items) ||
      (Array.isArray(payload.rows) && payload.rows) ||
      (Array.isArray(payload.records) && payload.records) ||
      (Array.isArray(payload.data) && payload.data) ||
      (Array.isArray(nestedData?.list) && nestedData.list) ||
      (Array.isArray(nestedData?.rows) && nestedData.rows) ||
      (Array.isArray(nestedData?.records) && nestedData.records) ||
      (Array.isArray(nestedData?.data) && nestedData.data) ||
      []

    const totalCandidate =
      payload.total ??
      payload.count ??
      payload.total_count ??
      nestedData?.total ??
      nestedData?.count ??
      nestedData?.total_count ??
      listCandidate.length
    return {
      list: listCandidate as T[],
      total: toNumber(totalCandidate, listCandidate.length),
    }
  }

  return { list: [], total: 0 }
}

export async function requestJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  const json = (await response.json()) as unknown

  if (isRecord(json) && 'code' in json) {
    const code = toNumber(json.code, Number.NaN)
    if (!Number.isNaN(code) && code !== 0) {
      const message = typeof json.msg === 'string' && json.msg.trim() ? json.msg : '接口请求失败'
      throw new Error(message)
    }
  }

  return json
}
