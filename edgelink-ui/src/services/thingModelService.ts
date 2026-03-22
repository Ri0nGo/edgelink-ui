import type {
  ThingModelItem,
  ThingModelListParams,
  ThingModelListResult,
  ThingModelProperty,
  ThingModelUpsertPayload,
} from '../types/thingModel'
import {
  extractListPayload,
  extractPayload,
  normalizeDate,
  requestJson,
  toNumber,
} from './apiUtils'

type RawThingModel = {
  id?: number | string
  model_id?: number | string
  thing_model_id?: number | string
  name?: string
  model_name?: string
  identifier?: string
  key?: string
  icon?: string
  icon_svg?: string
  description?: string
  desc?: string
  prop_count?: number | string
  property_count?: number | string
  attribute_count?: number | string
  created_time?: string | number
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

function normalizeItem(item: RawThingModel, index: number): ThingModelItem {
  const rawId = item.id ?? item.model_id ?? item.thing_model_id ?? index + 1
  const id = toNumber(rawId, index + 1)
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
    propertyCount: toNumber(propertyCountRaw),
    createdAt: normalizeDate(
      item.created_time ?? item.created_at ?? item.create_time ?? item.createdAt ?? item.ctime,
    ),
    icon: item.icon_svg ?? item.icon,
  }
}

function normalizeProp(item: Record<string, unknown>, index: number): ThingModelProperty {
  return {
    id: toNumber(item.id ?? index + 1, index + 1),
    key: String(item.key ?? `prop_${index + 1}`),
    name: String(item.name ?? `属性-${index + 1}`),
    type: toNumber(item.type, 1),
    dataType: toNumber(item.data_type ?? item.dataType, 3),
    unit: String(item.unit ?? ''),
    sourceType: toNumber(item.source_type ?? item.sourceType, 1),
    expression: String(item.expression ?? item.formula ?? item.formula_expr ?? ''),
  }
}

export async function fetchThingModelList(
  params: ThingModelListParams,
): Promise<ThingModelListResult> {
  const query = new URLSearchParams({
    page_num: String(params.pageNum),
    page_size: String(params.pageSize),
  })

  if (params.keyword) {
    query.set('search', params.keyword)
  }

  try {
    const json = await requestJson(`/api/edgelink/thing_model/list?${query.toString()}`)
    const payload = extractPayload(json)

    const { list, total } = extractListPayload<RawThingModel>(payload)
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

export async function createThingModel(payload: ThingModelUpsertPayload): Promise<void> {
  await requestJson('/api/edgelink/thing_model/create', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      identifier: payload.identifier,
      description: payload.description,
      icon: payload.icon,
      func_types: payload.funcTypes,
    }),
  })
}

export async function updateThingModel(payload: ThingModelUpsertPayload): Promise<void> {
  await requestJson('/api/edgelink/thing_model/update', {
    method: 'POST',
    body: JSON.stringify({
      id: payload.id,
      name: payload.name,
      identifier: payload.identifier,
      description: payload.description,
      icon: payload.icon,
      func_types: payload.funcTypes,
    }),
  })
}

export async function deleteThingModel(id: number): Promise<void> {
  await requestJson('/api/edgelink/thing_model/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export async function fetchThingModelProps(modelId: number): Promise<ThingModelProperty[]> {
  const query = new URLSearchParams({ model_id: String(modelId), page_num: '1', page_size: '200' })

  try {
    const json = await requestJson(`/api/edgelink/thing_model/prop/list?${query.toString()}`)
    const payload = extractPayload(json)
    const { list } = extractListPayload<Record<string, unknown>>(payload)
    return list.map(normalizeProp)
  } catch {
    return [
      {
        id: 1,
        key: 'temperature',
        name: '温度',
        type: 1,
        dataType: 3,
        unit: '℃',
        sourceType: 1,
        expression: '',
      },
      {
        id: 2,
        key: 'humidity',
        name: '湿度',
        type: 1,
        dataType: 3,
        unit: '%',
        sourceType: 1,
        expression: '',
      },
    ]
  }
}

export async function createThingModelProp(payload: {
  modelId: number
  name: string
  key: string
  type: number
  dataType: number
  unit?: string
  sourceType?: number
  expression?: string
}): Promise<void> {
  await requestJson('/api/edgelink/thing_model/prop/create', {
    method: 'POST',
    body: JSON.stringify({
      model_id: payload.modelId,
      name: payload.name,
      key: payload.key,
      type: payload.type,
      data_type: payload.dataType,
      unit: payload.unit,
      source_type: payload.sourceType,
      expression: payload.expression,
    }),
  })
}

export async function updateThingModelProp(payload: {
  id: number
  modelId: number
  name: string
  key: string
  type: number
  dataType: number
  unit?: string
  sourceType?: number
  expression?: string
}): Promise<void> {
  await requestJson('/api/edgelink/thing_model/prop/update', {
    method: 'POST',
    body: JSON.stringify({
      id: payload.id,
      model_id: payload.modelId,
      name: payload.name,
      key: payload.key,
      type: payload.type,
      data_type: payload.dataType,
      unit: payload.unit,
      source_type: payload.sourceType,
      expression: payload.expression,
    }),
  })
}

export async function deleteThingModelProp(id: number): Promise<void> {
  await requestJson('/api/edgelink/thing_model/prop/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export async function fetchThingModelDetail(modelId: number): Promise<ThingModelItem> {
  const json = await requestJson(`/api/edgelink/thing_model/${modelId}`)
  const payload = extractPayload<RawThingModel>(json)
  return normalizeItem(payload, 0)
}
