export type ProductItem = {
  id: number
  name: string
  identifier: string
  thingModelId: number
  modelName: string
  protocol: string
  description: string
  createdAt: string
}

export type ProductListParams = {
  pageNum: number
  pageSize: number
  keyword?: string
  protocol?: string
}

export type ProductUpsertPayload = {
  id?: number
  name: string
  identifier: string
  modelId: number
  protocol: string
  description?: string
}
