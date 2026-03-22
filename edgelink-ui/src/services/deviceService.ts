import { extractListPayload, extractPayload, isRecord, normalizeDate, requestJson, toNumber } from './apiUtils'
import type {
  DeviceDetail,
  DeviceItem,
  DeviceListParams,
  DeviceTimeseriesPoint,
  DeviceUpsertPayload,
} from '../types/device'

type RawDevice = Record<string, unknown>

function normalizeDateTime(input: unknown): string {
  if (input === undefined || input === null || input === '') {
    return '--'
  }

  if (typeof input === 'string') {
    const matched = input.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}:\d{2})/)
    if (matched) {
      return `${matched[1]} ${matched[2]}`
    }
  }

  const timestamp = Number(input)
  if (!Number.isNaN(timestamp)) {
    const date = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000)
    if (!Number.isNaN(date.getTime())) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }
  }

  return String(input)
}

const FALLBACK_DEVICE_DETAIL: DeviceDetail = {
  id: 1,
  key: 'dev_warehouse_th_001',
  name: '仓储温湿度-A01',
  productId: 101,
  productName: '温湿度传感器',
  description: '仓储区温湿度一体传感器',
  createdAt: '2024-01-12',
  updatedAt: '2024-06-01',
  status: 'online',
  uplink: [
    {
      desc: '上传设备数据至MQTT',
      address: '/sys/TH-Sensor/esp32c3-dht11-001/uplink/data',
    },
  ],
  downlink: [
    {
      desc: '下发事件至设备',
      address: '/sys/TH-Sensor/esp32c3-dht11-001/downlink/event',
    },
  ],
  properties: [
    {
      id: 1,
      propertyId: 1,
      key: 'temperature',
      name: '温度',
      dataType: 3,
      unit: '℃',
      value: 25.6,
      persistent: true,
      storeMode: 'minute',
    },
    {
      id: 2,
      propertyId: 2,
      key: 'humidity',
      name: '湿度',
      dataType: 3,
      unit: '%',
      value: 60.2,
      persistent: true,
      storeMode: 'minute',
    },
  ],
}

function normalizeStatus(value: unknown): DeviceItem['status'] {
  const text = String(value ?? '').toLowerCase()
  if (text === 'online' || text.includes('on') || text === '1') {
    return 'online'
  }
  if (text === 'offline' || text === 'unknown' || text === '0') {
    return 'offline'
  }
  if (text.includes('idle') || text.includes('sleep')) {
    return 'idle'
  }
  return 'offline'
}

function normalizeDevice(item: RawDevice, index: number): DeviceItem {
  const id = toNumber(item.id ?? index + 1, index + 1)
  const updatedAt = normalizeDateTime(item.status_updated_time)
  return {
    id,
    name: String(item.name ?? item.device_name ?? `未命名设备-${id}`),
    key: String(item.key ?? item.device_key ?? item.identifier ?? `device_${id}`),
    productId: toNumber(item.product_id ?? item.productId),
    productName: String(item.product_name ?? item.productName ?? '--'),
    description: String(item.description ?? item.desc ?? '--'),
    createdAt: normalizeDate(item.created_at ?? item.create_time ?? item.createdAt),
    updatedAt: updatedAt === '--' ? '-' : updatedAt,
    status: normalizeStatus(item.status),
  }
}

function normalizeDetail(raw: RawDevice): DeviceDetail {
  const item = normalizeDevice(raw, 0)
  const propsCandidate = Array.isArray(raw.properties)
    ? raw.properties
    : Array.isArray(raw.props)
      ? raw.props
      : []

  const properties = propsCandidate.map((prop, index) => {
    const itemProp = prop as Record<string, unknown>
    const id = toNumber(itemProp.id ?? index + 1, index + 1)
    const propertyId = toNumber(itemProp.property_id ?? itemProp.propertyId ?? id, id)
    return {
      id,
      propertyId,
      key: String(itemProp.key ?? `p_${index + 1}`),
      name: String(itemProp.name ?? `属性-${index + 1}`),
      dataType: toNumber(itemProp.data_type ?? itemProp.dataType, 3),
      unit: String(itemProp.unit ?? ''),
      value: (itemProp.value ?? '--') as string | number | boolean,
      persistent: Boolean(itemProp.persistent ?? true),
      storeMode: String(itemProp.store_mode ?? itemProp.storeMode ?? 'minute'),
    }
  })

  const address = (raw.address ?? {}) as Record<string, unknown>
  const normalizeAddress = (value: unknown) =>
    (Array.isArray(value) ? value : []).map((addressItem) => {
      const entry = addressItem as Record<string, unknown>
      return {
        desc: String(entry.desc ?? entry.name ?? '地址描述'),
        address: String(entry.address ?? entry.path ?? '--'),
      }
    })

  return {
    ...item,
    properties,
    uplink: normalizeAddress(address.uplink),
    downlink: normalizeAddress(address.downlink),
  }
}

export async function fetchDeviceList(params: DeviceListParams): Promise<{ list: DeviceItem[]; total: number }> {
  const query = new URLSearchParams({
    page_num: String(params.pageNum),
    page_size: String(params.pageSize),
  })

  if (params.keyword) {
    query.set('search', params.keyword)
  }

  try {
    const json = await requestJson(`/api/edgelink/device/list?${query.toString()}`)
    const payload = extractPayload(json)
    const { list, total } = extractListPayload<RawDevice>(payload)
    return {
      list: list.map(normalizeDevice),
      total,
    }
  } catch {
    return {
      list: [FALLBACK_DEVICE_DETAIL],
      total: 1,
    }
  }
}

export async function fetchDeviceDetail(id: number): Promise<DeviceDetail> {
  try {
    const json = await requestJson(`/api/edgelink/device/${id}`)
    const payload = extractPayload<RawDevice>(json)
    return normalizeDetail(payload)
  } catch {
    return FALLBACK_DEVICE_DETAIL
  }
}

export async function createDevice(payload: DeviceUpsertPayload): Promise<void> {
  await requestJson('/api/edgelink/device/create', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      key: payload.key,
      product_id: payload.productId,
      description: payload.description,
    }),
  })
}

export async function updateDevice(payload: DeviceUpsertPayload): Promise<void> {
  await requestJson('/api/edgelink/device/update', {
    method: 'POST',
    body: JSON.stringify({
      id: payload.id,
      name: payload.name,
      key: payload.key,
      product_id: payload.productId,
      description: payload.description,
    }),
  })
}

export async function deleteDevice(id: number): Promise<void> {
  await requestJson('/api/edgelink/device/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export async function fetchDeviceTimeseries(
  deviceId: number,
  propertyId: number,
  options?: {
    rangeSeconds?: number
    endTimestamp?: number
    beginTimestamp?: number
  },
): Promise<DeviceTimeseriesPoint[]> {
  const result = await fetchDeviceTimeseriesBatch(deviceId, [propertyId], options)
  return result[propertyId] ?? []
}

export async function fetchDeviceTimeseriesBatch(
  deviceId: number,
  propertyIds: number[],
  options?: {
    rangeSeconds?: number
    endTimestamp?: number
    beginTimestamp?: number
  },
): Promise<Record<number, DeviceTimeseriesPoint[]>> {
  const uniquePropertyIds = Array.from(new Set(propertyIds)).filter((id) => id > 0)
  if (uniquePropertyIds.length === 0) {
    return {}
  }

  const end = options?.endTimestamp ?? Math.floor(Date.now() / 1000)
  const begin = options?.beginTimestamp ?? end - (options?.rangeSeconds ?? 24 * 60 * 60)
  const body: Record<string, unknown> = {
    begin,
    end,
    device_ids: [deviceId],
    property_ids: uniquePropertyIds,
  }

  try {
    const json = await requestJson('/api/edgelink/data/timeseries', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const payload = extractPayload(json)

    if (isRecord(payload)) {
      const mappedResult: Record<number, DeviceTimeseriesPoint[]> = {}

      Object.entries(payload).forEach(([key, rawPoints]) => {
        if (!Array.isArray(rawPoints)) {
          return
        }

        const keyMatch = key.match(/^(\d+):(\d+)$/)
        if (!keyMatch) {
          return
        }

        const propertyIdFromKey = toNumber(keyMatch[2], 0)
        if (!uniquePropertyIds.includes(propertyIdFromKey)) {
          return
        }

        const points = rawPoints
          .map((point) => {
            if (!Array.isArray(point) || point.length < 2) {
              return undefined
            }
            return {
              timestamp: toNumber(point[0]),
              value: (point[1] ?? '--') as string | number | boolean,
            }
          })
          .filter((item): item is DeviceTimeseriesPoint => {
            if (!item) {
              return false
            }
            return item.timestamp > 0
          })
          .sort((a, b) => a.timestamp - b.timestamp)

        mappedResult[propertyIdFromKey] = points
      })

      if (Object.keys(mappedResult).length > 0) {
        uniquePropertyIds.forEach((id) => {
          if (!mappedResult[id]) {
            mappedResult[id] = []
          }
        })
        return mappedResult
      }
    }

    const { list } = extractListPayload<Record<string, unknown>>(payload)
    const fallbackList = list.map((point, index) => ({
      timestamp: toNumber(point.ts ?? point.time ?? end - index * 60),
      value: (point.value ?? '--') as string | number | boolean,
    }))
    return {
      [uniquePropertyIds[0]]: fallbackList,
    }
  } catch {
    const fallback: Record<number, DeviceTimeseriesPoint[]> = {}
    uniquePropertyIds.forEach((id, offset) => {
      fallback[id] = Array.from({ length: 12 }, (_, index) => ({
        timestamp: end - index * 300,
        value: Number((25 + Math.sin(index + offset) * 2).toFixed(1)),
      }))
    })
    return fallback
  }
}
