export type DeviceStatus = 'online' | 'offline' | 'idle'

export type DeviceAddress = {
  desc: string
  address: string
}

export type DeviceProperty = {
  id: number
  propertyId: number
  key: string
  name: string
  dataType: number
  unit: string
  value: number | string | boolean
  persistent: boolean
  storeMode: string
}

export type DeviceItem = {
  id: number
  name: string
  key: string
  productId: number
  productName: string
  description: string
  createdAt: string
  updatedAt: string
  status: DeviceStatus
}

export type DeviceDetail = DeviceItem & {
  properties: DeviceProperty[]
  uplink: DeviceAddress[]
  downlink: DeviceAddress[]
}

export type DeviceListParams = {
  pageNum: number
  pageSize: number
  keyword?: string
}

export type DeviceUpsertPayload = {
  id?: number
  name: string
  key: string
  productId: number
  description?: string
}

export type DeviceTimeseriesPoint = {
  timestamp: number
  value: string | number | boolean
}
