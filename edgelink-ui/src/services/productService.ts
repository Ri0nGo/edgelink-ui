import { extractListPayload, extractPayload, normalizeDate, requestJson, toNumber } from './apiUtils'
import type { ProductItem, ProductListParams, ProductUpsertPayload } from '../types/product'

type RawProduct = Record<string, unknown>

const FALLBACK_PRODUCTS: ProductItem[] = [
  {
    id: 1,
    name: '仓储温湿度传感器',
    identifier: 'prod_warehouse_th',
    thingModelId: 1,
    modelName: '温湿度传感器模型',
    protocol: 'mqtt',
    description: '设备接入产品',
    createdAt: '2024-01-12',
  },
  {
    id: 2,
    name: '工业智能电表',
    identifier: 'prod_smart_meter_v1',
    thingModelId: 3,
    modelName: '智能电表模型',
    protocol: 'modbus',
    description: '设备接入产品',
    createdAt: '2024-03-05',
  },
]

function normalizeProduct(item: RawProduct, index: number): ProductItem {
  const id = toNumber(item.id ?? index + 1, index + 1)
  const thingModel = (item.thing_model ?? {}) as Record<string, unknown>
  const model = (item.model ?? {}) as Record<string, unknown>

  return {
    id,
    name: String(item.name ?? `未命名产品-${id}`),
    identifier: String(item.identifier ?? item.key ?? `product_${id}`),
    thingModelId: toNumber(item.model_id ?? item.modelId ?? item.thing_model_id ?? item.thingModelId),
    modelName: String(
      item.model_name ??
        item.thing_model_name ??
        thingModel.name ??
        model.name ??
        '--',
    ),
    protocol: String(item.protocol ?? 'mqtt').toLowerCase(),
    description: String(item.description ?? item.desc ?? '设备接入产品'),
    createdAt: normalizeDate(item.created_at ?? item.create_time ?? item.createdAt),
  }
}

export async function fetchProductList(params: ProductListParams): Promise<{ list: ProductItem[]; total: number }> {
  const query = new URLSearchParams({
    page_num: String(params.pageNum),
    page_size: String(params.pageSize),
  })

  if (params.keyword) {
    query.set('search', params.keyword)
  }

  if (params.protocol) {
    query.set('protocol', params.protocol)
  }

  try {
    const json = await requestJson(`/api/edgelink/product/list?${query.toString()}`)
    const payload = extractPayload(json)
    const { list, total } = extractListPayload<RawProduct>(payload)
    return {
      list: list.map(normalizeProduct),
      total,
    }
  } catch {
    const keyword = params.keyword?.trim().toLowerCase()
    const protocol = params.protocol?.toLowerCase()
    const filtered = FALLBACK_PRODUCTS.filter((item) => {
      const byKeyword =
        !keyword ||
        item.name.toLowerCase().includes(keyword) ||
        item.identifier.toLowerCase().includes(keyword)
      const byProtocol = !protocol || item.protocol === protocol
      return byKeyword && byProtocol
    })
    const start = (params.pageNum - 1) * params.pageSize
    return {
      list: filtered.slice(start, start + params.pageSize),
      total: filtered.length,
    }
  }
}

export async function createProduct(payload: ProductUpsertPayload): Promise<void> {
  await requestJson('/api/edgelink/product/create', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      identifier: payload.identifier,
      model_id: payload.modelId,
      protocol: payload.protocol,
      description: payload.description,
    }),
  })
}

export async function updateProduct(payload: ProductUpsertPayload): Promise<void> {
  await requestJson('/api/edgelink/product/update', {
    method: 'POST',
    body: JSON.stringify({
      id: payload.id,
      name: payload.name,
      identifier: payload.identifier,
      model_id: payload.modelId,
      protocol: payload.protocol,
      description: payload.description,
    }),
  })
}

export async function deleteProduct(id: number): Promise<void> {
  await requestJson('/api/edgelink/product/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export async function fetchProductDetail(id: number): Promise<ProductItem> {
  const json = await requestJson(`/api/edgelink/product/${id}`)
  const payload = extractPayload<RawProduct>(json)
  return normalizeProduct(payload, 0)
}
