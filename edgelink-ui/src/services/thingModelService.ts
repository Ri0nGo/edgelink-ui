import type {
  ThingModelItem,
  ThingModelListParams,
  ThingModelListResult,
} from '../types/thingModel'

type RawThingModel = {
  id?: number | string
  model_id?: number | string
  name?: string
  model_name?: string
  identifier?: string
  key?: string
  description?: string
  desc?: string
  prop_count?: number | string
  property_count?: number | string
  attribute_count?: number | string
  created_at?: string | number
  create_time?: string | number
  createdAt?: string | number
  ctime?: string | number
  func_types?: Array<unknown>
}

const FALLBACK_THING_MODELS: ThingModelItem[] = [
  {
    id: 1,
    name: '温湿度传感器模型',
    identifier: 'thm_temperature_humidity',
    description: '温湿度一体传感器数据模型',
    propertyCount: 6,
    createdAt: '2024-01-10',
  },
  {
    id: 2,
    name: 'CO2 环境监测模型',
    identifier: 'thm_co2_monitor',
    description: '室内空气质量监测模型',
    propertyCount: 4,
    createdAt: '2024-02-15',
  },
  {
    id: 3,
    name: '智能电表模型',
    identifier: 'thm_smart_meter',
    description: '电力计量与功率监测模型',
    propertyCount: 5,
    createdAt: '2024-03-01',
  },
  {
    id: 4,
    name: '工业压力传感器模型',
    identifier: 'thm_pressure_sensor',
    description: '工业级压力与温补监测模型',
    propertyCount: 3,
    createdAt: '2024-03-20',
  },
  {
    id: 5,
    name: '楼宇控制器模型',
    identifier: 'thm_building_ctrl',
    description: '楼宇自控设备属性与状态模型',
    propertyCount: 7,
    createdAt: '2024-04-05',
  },
]

function normalizeDate(input: string | number | undefined): string {
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

function normalizeItem(item: RawThingModel, index: number): ThingModelItem {
  const rawId = item.id ?? item.model_id ?? index + 1
  const id = Number(rawId) || index + 1
  const propertyCountRaw =
    item.prop_count ??
    item.property_count ??
    item.attribute_count ??
    item.func_types?.length ??
    0

  return {
    id,
    name: item.name ?? item.model_name ?? `未命名模型-${id}`,
    identifier: item.identifier ?? item.key ?? `model_${id}`,
    description: item.description ?? item.desc ?? '--',
    propertyCount: Number(propertyCountRaw) || 0,
    createdAt: normalizeDate(
      item.created_at ?? item.create_time ?? item.createdAt ?? item.ctime,
    ),
  }
}

function extractListPayload(payload: unknown): { list: RawThingModel[]; total: number } {
  if (Array.isArray(payload)) {
    return { list: payload as RawThingModel[], total: payload.length }
  }

  if (payload && typeof payload === 'object') {
    const data = payload as Record<string, unknown>
    const list =
      (Array.isArray(data.list) && data.list) ||
      (Array.isArray(data.items) && data.items) ||
      (Array.isArray(data.rows) && data.rows) ||
      []
    const totalRaw = data.total ?? data.count ?? data.total_count ?? list.length
    return { list: list as RawThingModel[], total: Number(totalRaw) || list.length }
  }

  return { list: [], total: 0 }
}

export async function fetchThingModelList(
  params: ThingModelListParams,
): Promise<ThingModelListResult> {
  const query = new URLSearchParams({
    page_num: String(params.pageNum),
    page_size: String(params.pageSize),
  })

  if (params.keyword) {
    query.set('keyword', params.keyword)
  }

  try {
    const response = await fetch(`/api/edgelink/thing_model/list?${query.toString()}`)
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }

    const json = (await response.json()) as Record<string, unknown>
    const payload =
      (json.data as Record<string, unknown> | undefined) ??
      (json.result as Record<string, unknown> | undefined) ??
      json

    const { list, total } = extractListPayload(payload)
    const normalizedList = list.map(normalizeItem)

    return {
      list: normalizedList,
      total,
    }
  } catch (error) {
    console.warn('fetchThingModelList fallback to mock data', error)
    const keyword = params.keyword?.trim().toLowerCase()
    const filteredList = keyword
      ? FALLBACK_THING_MODELS.filter(
          (item) =>
            item.name.toLowerCase().includes(keyword) ||
            item.identifier.toLowerCase().includes(keyword),
        )
      : FALLBACK_THING_MODELS

    const start = (params.pageNum - 1) * params.pageSize
    const pagedList = filteredList.slice(start, start + params.pageSize)
    return { list: pagedList, total: filteredList.length }
  }
}
