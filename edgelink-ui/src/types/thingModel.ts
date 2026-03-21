export type ThingModelItem = {
  id: number
  name: string
  identifier: string
  description: string
  propertyCount: number
  createdAt: string
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
