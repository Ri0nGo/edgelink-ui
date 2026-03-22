export type ThingModelItem = {
  id: number
  name: string
  identifier: string
  description: string
  propertyCount: number
  createdAt: string
  icon?: string
}

export type ThingModelProperty = {
  id: number
  key: string
  name: string
  type: number
  dataType: number
  unit: string
  sourceType: number
  expression: string
}

export type ThingModelListParams = {
  pageNum: number
  pageSize: number
  keyword?: string
}

export type ThingModelListResult = {
  list: ThingModelItem[]
  total: number
}

export type ThingModelUpsertPayload = {
  id?: number
  name: string
  identifier: string
  description?: string
  icon?: string
  funcTypes?: Array<{
    id?: number
    name: string
    key: string
    type: number
    dataType: number
    unit: string
  }>
}
