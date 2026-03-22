import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LineChartOutlined,
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
  TableOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Spin,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { getInstanceByDom, graphic, init, use, type EChartsType } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import dayjs from 'dayjs'
import zhCNPicker from 'antd/es/date-picker/locale/zh_CN'
import type { FormInstance } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  createDevice,
  deleteDevice,
  fetchDeviceDetail,
  fetchDeviceList,
  fetchDeviceTimeseriesBatch,
  updateDevice,
} from '../services/deviceService'
import { fetchProductDetail, fetchProductList } from '../services/productService'
import type { DeviceDetail, DeviceItem, DeviceProperty } from '../types/device'
import type { ProductItem } from '../types/product'

use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const PAGE_SIZE = 10

type DeviceFormValue = {
  name: string
  key: string
  productId: number
  description?: string
}

type HistoryPropertyRef = {
  id: number
  key: string
  name: string
}

type HistorySeries = {
  propertyId: number
  key: string
  name: string
  rows: Array<{ timestamp: number; value: string | number | boolean }>
}

type HistoryTableRow = {
  rowKey: string
  timestamp: number
  [key: string]: string | number | boolean
}

const HISTORY_RANGE_SECONDS: Record<string, number> = {
  '1h': 60 * 60,
  '6h': 6 * 60 * 60,
  '12h': 12 * 60 * 60,
  '24h': 24 * 60 * 60,
  '3d': 3 * 24 * 60 * 60,
  '7d': 7 * 24 * 60 * 60,
}

function getStatusTag(status: DeviceItem['status']) {
  if (status === 'online') {
    return <Tag color="green">在线</Tag>
  }
  if (status === 'idle') {
    return <Tag color="gold">空闲</Tag>
  }
  return <Tag color="red">离线</Tag>
}

function renderPropertyValue(property: DeviceProperty): string {
  if (property.value === undefined || property.value === null || property.value === '' || property.value === '--') {
    return '--'
  }

  if (property.dataType === 1) {
    const boolValue =
      property.value === true ||
      property.value === 1 ||
      String(property.value).toLowerCase() === 'true'
    return boolValue ? 'true' : 'false'
  }
  return String(property.value)
}

function getStoreModeText(mode: string): string {
  const map: Record<string, string> = {
    full: '全量存储',
    change: '变化存储',
    minute: '整点存储',
    hour: '小时聚合',
  }
  return map[mode] ?? mode
}

function toNumericValue(value: string | number | boolean): number | undefined {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

const hourOnlyDisabledTime = () => ({
  disabledMinutes: () => Array.from({ length: 59 }, (_, index) => index + 1),
  disabledSeconds: () => Array.from({ length: 59 }, (_, index) => index + 1),
})

const disableFutureDate = (current: Dayjs) => current.isAfter(dayjs(), 'day')

const hourOnlyDisabledTimeNoFuture = (current?: Dayjs) => {
  const now = dayjs()
  const base = hourOnlyDisabledTime()

  if (!current || !current.isSame(now, 'day')) {
    return {
      ...base,
      disabledHours: () => [],
    }
  }

  const currentHour = now.hour()
  return {
    ...base,
    disabledHours: () => Array.from({ length: 23 - currentHour }, (_, index) => currentHour + 1 + index),
  }
}

export function DevicePage() {
  const { message } = App.useApp()
  const [form] = Form.useForm<DeviceFormValue>()
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [pageNum, setPageNum] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [list, setList] = useState<DeviceItem[]>([])
  const [editing, setEditing] = useState<DeviceItem>()
  const [modalOpen, setModalOpen] = useState(false)
  const [detail, setDetail] = useState<DeviceDetail>()
  const [detailLoading, setDetailLoading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyTitle, setHistoryTitle] = useState('属性历史数据')
  const [historyRange, setHistoryRange] = useState('24h')
  const [historyStartAt, setHistoryStartAt] = useState<Dayjs | null>(dayjs().subtract(24, 'hour').startOf('hour'))
  const [historyEndAt, setHistoryEndAt] = useState<Dayjs | null>(dayjs())
  const [historyProperty, setHistoryProperty] = useState<HistoryPropertyRef>()
  const [historyCompareOpen, setHistoryCompareOpen] = useState(false)
  const [historyCompareIds, setHistoryCompareIds] = useState<number[]>([])
  const [historyCompareDraftIds, setHistoryCompareDraftIds] = useState<number[]>([])
  const [historySeries, setHistorySeries] = useState<HistorySeries[]>([])
  const [historyViewMode, setHistoryViewMode] = useState<'chart' | 'table'>('chart')
  const [tableVisibleCount, setTableVisibleCount] = useState(120)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyModalReady, setHistoryModalReady] = useState(false)
  const [editingProductName, setEditingProductName] = useState('')
  const [productOptions, setProductOptions] = useState<ProductItem[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const historyChartRef = useRef<HTMLDivElement | null>(null)
  const historyChartInstanceRef = useRef<EChartsType | null>(null)
  const listPollingInFlightRef = useRef(false)
  const detailPollingInFlightRef = useRef(false)

  const ensureProductOptions = useCallback(async () => {
    if (productOptions.length > 0 || productsLoading) {
      return
    }

    setProductsLoading(true)
    try {
      const result = await fetchProductList({ pageNum: 1, pageSize: 200 })
      setProductOptions(result.list)
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setProductsLoading(false)
    }
  }, [message, productOptions.length, productsLoading])

  const prepareEditDevice = useCallback(async (record: DeviceItem) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      key: record.key,
      productId: record.productId,
      description: record.description,
    })
    setEditingProductName(record.productName || '--')
    setModalOpen(true)

    try {
      const product = await fetchProductDetail(record.productId)
      setEditingProductName(product.name)
    } catch {
      setEditingProductName(record.productName || '--')
    }
  }, [form])

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!silent) {
      setLoading(true)
    }
    try {
      const result = await fetchDeviceList({ pageNum, pageSize: PAGE_SIZE, keyword })
      setList(result.list)
      setTotal(result.total)
    } catch (error) {
      if (!silent) {
        message.error((error as Error).message)
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [keyword, message, pageNum])

  useEffect(() => {
    if (detail) {
      return
    }

    void loadData()
    const timer = window.setInterval(() => {
      if (document.hidden || listPollingInFlightRef.current) {
        return
      }
      listPollingInFlightRef.current = true
      void loadData({ silent: true }).finally(() => {
        listPollingInFlightRef.current = false
      })
    }, 10000)

    return () => {
      window.clearInterval(timer)
    }
  }, [detail, loadData])

  useEffect(() => {
    if (!detail?.id) {
      return
    }

    const detailId = detail.id
    const timer = window.setInterval(() => {
      if (document.hidden || detailPollingInFlightRef.current) {
        return
      }
      detailPollingInFlightRef.current = true
      void fetchDeviceDetail(detailId)
        .then((result) => {
          setDetail((prev) => {
            if (!prev || prev.id !== detailId) {
              return prev
            }
            return result
          })
        })
        .catch(() => {
          // keep current detail view
        })
        .finally(() => {
          detailPollingInFlightRef.current = false
        })
    }, 8000)

    return () => {
      window.clearInterval(timer)
    }
  }, [detail?.id])

  const refreshList = useCallback(() => {
    if (pageNum === 1) {
      void loadData()
      return
    }
    setPageNum(1)
  }, [loadData, pageNum])

  const applySearch = useCallback(() => {
    const nextKeyword = keywordInput.trim()
    if (nextKeyword === keyword) {
      refreshList()
      return
    }
    setKeyword(nextKeyword)
    setPageNum(1)
  }, [keywordInput, keyword, refreshList])

  const openDeviceDetail = useCallback(async (record: DeviceItem) => {
    setDetailLoading(true)
    setDetail({
      ...record,
      properties: [],
      uplink: [],
      downlink: [],
    })

    try {
      const result = await fetchDeviceDetail(record.id)
      setDetail(result)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const columns = useMemo<ColumnsType<DeviceItem>>(
    () => [
      {
        title: '设备名称',
        dataIndex: 'name',
        key: 'name',
        width: 220,
        render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
      },
      {
        title: '设备 Key',
        dataIndex: 'key',
        key: 'key',
        width: 220,
        render: (value: string) => <Tag className="thing-model-id-tag">{value}</Tag>,
      },
      {
        title: '产品',
        dataIndex: 'productName',
        key: 'productName',
        width: 190,
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        width: 220,
        ellipsis: true,
      },
      {
        title: '最近更新时间',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 210,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 110,
        render: (value: DeviceItem['status']) => getStatusTag(value),
      },
      {
        title: '操作',
        key: 'actions',
        width: 220,
        render: (_value, record) => (
          <Space size={6}>
            <Button
              size="small"
              className="thing-action-btn"
              icon={<EyeOutlined />}
              onClick={() => void openDeviceDetail(record)}
            >
              详情
            </Button>
            <Button
              size="small"
              className="thing-action-btn"
              icon={<EditOutlined />}
              onClick={() => prepareEditDevice(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确认删除该设备吗？"
              okText="删除"
              cancelText="取消"
              onConfirm={async () => {
                try {
                  await deleteDevice(record.id)
                  message.success('删除成功')
                  refreshList()
                } catch (error) {
                  message.error((error as Error).message)
                }
              }}
            >
              <Button size="small" className="thing-action-btn thing-action-btn-danger" icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [message, openDeviceDetail, prepareEditDevice, refreshList],
  )

  const fetchHistorySeriesByIds = useCallback(
    async (propertyIds: number[], range: string, startAt: Dayjs | null, endAt: Dayjs | null) => {
      if (!detail || propertyIds.length === 0) {
        return [] as HistorySeries[]
      }

      const effectiveEnd = endAt ?? dayjs()
      const effectiveStart =
        startAt ?? effectiveEnd.subtract(HISTORY_RANGE_SECONDS[range] ?? HISTORY_RANGE_SECONDS['24h'], 'second')

      const seriesMap = await fetchDeviceTimeseriesBatch(detail.id, propertyIds, {
        beginTimestamp: effectiveStart.unix(),
        endTimestamp: effectiveEnd.unix(),
      })

      const refs = detail.properties
        .filter((item) => propertyIds.includes(item.propertyId))
        .map((item) => ({ id: item.propertyId, key: item.key, name: item.name }))

      return refs.map((ref) => ({
        propertyId: ref.id,
        key: ref.key,
        name: ref.name,
        rows: seriesMap[ref.id] ?? [],
      }))
    },
    [detail],
  )

  const loadPropertyHistory = useCallback(
    async (property: DeviceProperty) => {
      if (!detail) {
        return
      }

      const defaultEndAt = dayjs()
      const defaultStartAt = defaultEndAt.subtract(24, 'hour').startOf('hour')
      setHistoryOpen(true)
      setHistoryTitle(`${property.name} - 历史数据`)
      setHistoryRange('24h')
      setHistoryStartAt(defaultStartAt)
      setHistoryEndAt(defaultEndAt)
      setHistoryViewMode('chart')
      setHistoryCompareIds([property.propertyId])

      const propertyRef = { id: property.propertyId, key: property.key, name: property.name }
      setHistoryProperty(propertyRef)

      setHistoryLoading(true)
      try {
        let rows = (await fetchHistorySeriesByIds([propertyRef.id], '24h', defaultStartAt, defaultEndAt))[0]?.rows ?? []

        if (rows.length === 0) {
          const fallbackStart = defaultEndAt.subtract(7, 'day').startOf('hour')
          rows = (await fetchHistorySeriesByIds([propertyRef.id], '7d', fallbackStart, defaultEndAt))[0]?.rows ?? []
          if (rows.length > 0) {
            setHistoryRange('7d')
            setHistoryStartAt(fallbackStart)
          }
        }

        setHistorySeries([
          {
            propertyId: propertyRef.id,
            key: propertyRef.key,
            name: propertyRef.name,
            rows,
          },
        ])
        setTableVisibleCount(120)
      } finally {
        setHistoryLoading(false)
      }
    },
    [detail, fetchHistorySeriesByIds],
  )

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const selectedIds = historyCompareIds.length > 0 ? historyCompareIds : historyProperty ? [historyProperty.id] : []
      const series = await fetchHistorySeriesByIds(selectedIds, historyRange, historyStartAt, historyEndAt)
      setHistorySeries(series)
      setTableVisibleCount(120)
    } finally {
      setHistoryLoading(false)
    }
  }, [fetchHistorySeriesByIds, historyCompareIds, historyEndAt, historyProperty, historyRange, historyStartAt])

  const applyCompareSelection = useCallback(async () => {
    if (historyCompareDraftIds.length === 0) {
      message.warning('请至少选择一个属性')
      return
    }

    setHistoryLoading(true)
    try {
      const series = await fetchHistorySeriesByIds(historyCompareDraftIds, historyRange, historyStartAt, historyEndAt)
      setHistoryCompareIds(historyCompareDraftIds)
      setHistorySeries(series)
      setTableVisibleCount(120)
      setHistoryCompareOpen(false)
    } finally {
      setHistoryLoading(false)
    }
  }, [
    fetchHistorySeriesByIds,
    historyCompareDraftIds,
    historyEndAt,
    historyRange,
    historyStartAt,
    message,
  ])

  const historyTableRows = useMemo<HistoryTableRow[]>(() => {
    const map = new Map<number, HistoryTableRow>()

    historySeries.forEach((series) => {
      const field = `prop_${series.propertyId}`
      series.rows.forEach((point) => {
        const exists = map.get(point.timestamp) ?? {
          rowKey: String(point.timestamp),
          timestamp: point.timestamp,
        }
        exists[field] = point.value
        map.set(point.timestamp, exists)
      })
    })

    return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp)
  }, [historySeries])

  const historyTableColumns = useMemo<ColumnsType<HistoryTableRow>>(
    () => [
      {
        title: '时间',
        dataIndex: 'timestamp',
        key: 'timestamp',
        width: 210,
        render: (value: number) => new Date(value * 1000).toLocaleString(),
      },
      ...historySeries.map((series) => ({
        title: series.name,
        dataIndex: `prop_${series.propertyId}`,
        key: `prop_${series.propertyId}`,
        render: (value: string | number | boolean | undefined) => value ?? '--',
      })),
    ],
    [historySeries],
  )

  const visibleHistoryTableRows = useMemo(
    () => historyTableRows.slice(0, tableVisibleCount),
    [historyTableRows, tableVisibleCount],
  )

  useEffect(() => {
    if (historyOpen) {
      return
    }

    if (historyChartInstanceRef.current) {
      historyChartInstanceRef.current.dispose()
      historyChartInstanceRef.current = null
    }

    setHistorySeries([])
    setHistoryCompareIds([])
    setHistoryCompareDraftIds([])
    setHistoryProperty(undefined)
    setTableVisibleCount(120)
  }, [historyOpen])

  useEffect(() => {
    if (!historyOpen || !historyModalReady || historyViewMode !== 'chart' || !historyChartRef.current) {
      return
    }

    const chart = getInstanceByDom(historyChartRef.current) ?? init(historyChartRef.current)
    historyChartInstanceRef.current = chart
    const palette = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626', '#0891b2']
    const mappedSeries = historySeries
      .map((seriesItem, index) => {
        const points = seriesItem.rows
          .map((item) => {
            const value = toNumericValue(item.value)
            if (value === undefined) {
              return undefined
            }
            return [item.timestamp * 1000, value] as [number, number]
          })
          .filter((item): item is [number, number] => Boolean(item))

        return {
          name: seriesItem.name,
          type: 'line' as const,
          smooth: true,
          showSymbol: false,
          data: points,
          lineStyle: { color: palette[index % palette.length], width: 2.2 },
          areaStyle:
            index === 0
              ? {
                  color: new graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(37,99,235,0.18)' },
                    { offset: 1, color: 'rgba(37,99,235,0)' },
                  ]),
                }
              : undefined,
        }
      })
      .filter((item) => item.data.length > 0)

    chart.setOption({
      animationDuration: 450,
      grid: { left: 38, right: 20, top: 20, bottom: 38 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f172a',
        borderWidth: 0,
        textStyle: { color: '#fff' },
        formatter: (params: Array<{ data: [number, number]; seriesName: string; marker: string }>) => {
          const first = params[0]
          if (!first) {
            return '--'
          }
          const time = new Date(first.data[0]).toLocaleString()
          const lines = params
            .filter((item) => Array.isArray(item.data) && item.data.length >= 2)
            .map((item) => `${item.marker}${item.seriesName}: ${item.data[1]}`)
          return [time, ...lines].join('<br/>')
        },
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#dbe3f2' } },
        axisLabel: { color: '#8ea0c0', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#edf1f8' } },
        axisLabel: { color: '#8ea0c0', fontSize: 11 },
      },
      legend: {
        top: 0,
        right: 10,
        textStyle: { color: '#6b7a96', fontSize: 12 },
      },
      series: mappedSeries,
      graphic:
        mappedSeries.length === 0
          ? {
              type: 'text',
              left: 'center',
              top: 'middle',
              style: {
                text: '当前时间范围暂无可绘制数据',
                fill: '#9aa5be',
                fontSize: 13,
              },
            }
          : undefined,
    }, { notMerge: true, replaceMerge: ['series', 'legend'] })

    const raf = window.requestAnimationFrame(() => {
      chart.resize()
      window.requestAnimationFrame(() => chart.resize())
    })
    const timer = window.setTimeout(() => chart.resize(), 280)
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [historyModalReady, historyOpen, historySeries, historyViewMode])

  useEffect(() => {
    if (historyViewMode === 'chart') {
      return
    }

    if (historyChartInstanceRef.current) {
      historyChartInstanceRef.current.dispose()
      historyChartInstanceRef.current = null
    }
  }, [historyViewMode])

  if (detail) {
    return (
      <section className="thing-model-page">
        <div className="thing-table-card">
          <div className="card-hdr">
            <div className="card-hdr-left">
              <button type="button" className="icon-btn" onClick={() => setDetail(undefined)} aria-label="返回">
                <ArrowLeftOutlined />
              </button>
              <span className="card-title">设备信息</span>
            </div>
            <div className="card-hdr-right">
              <span className="card-meta">最近更新：{detail.updatedAt}</span>
              <button type="button" className="thing-action-btn detail-edit-btn" onClick={() => prepareEditDevice(detail)}>
                <EditOutlined />
                编辑
              </button>
            </div>
          </div>

          <div className="device-detail-header">
            <div className="device-detail-left">
              <div className="device-icon-large">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="device-info">
                <div className="device-name">{detail.name}</div>
                <div className="device-meta">
                  <span className="thing-model-id-tag">{detail.key}</span>
                  {getStatusTag(detail.status)}
                  <div className="device-meta-right">
                    <span className="device-meta-text">
                      最近更新时间：<b>{detail.updatedAt || '-'}</b>
                    </span>
                    <span className="device-meta-text">
                      所属产品：<b>{detail.productName || '-'}</b>
                    </span>
                  </div>
                </div>
                <div className="device-desc">{detail.description || '--'}</div>
                {detailLoading ? <div className="cell-sub-text">详情加载中...</div> : null}
              </div>
            </div>
          </div>

          <div className="device-address-section">
            <div className="section-header">
              <span className="section-title">通信地址</span>
              <span className="section-count">共 {detail.uplink.length + detail.downlink.length} 条地址</span>
            </div>
            <div className="address-grid">
              {detail.uplink.map((item) => (
                <div className="address-card uplink" key={`up-${item.address}`}>
                  <div className="address-header">
                    <span className="address-type">上行</span>
                    <div className="address-icon">
                      <LineChartOutlined />
                    </div>
                  </div>
                  <div className="address-desc">{item.desc}</div>
                  <div className="address-label">地址路径</div>
                  <div className="address-value">{item.address}</div>
                </div>
              ))}
              {detail.downlink.map((item) => (
                <div className="address-card downlink" key={`down-${item.address}`}>
                  <div className="address-header">
                    <span className="address-type">下行</span>
                    <div className="address-icon">
                      <SyncOutlined />
                    </div>
                  </div>
                  <div className="address-desc">{item.desc}</div>
                  <div className="address-label">地址路径</div>
                  <div className="address-value">{item.address}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="device-properties-section">
          <div className="section-header">
            <span className="section-title">设备属性</span>
            <span className="section-count">共 {detail.properties.length} 项</span>
          </div>
          <div className="properties-grid">
            {detail.properties.map((property) => {
              const dtype = property.dataType === 1 ? 'bool' : property.dataType === 2 ? 'int' : 'float'
              return (
                <div className={`property-card type-${dtype}`} key={property.id}>
                  <div className="property-header">
                    <div className="property-info">
                      <div className="property-name">{property.name}</div>
                      <div className="property-key">{property.key}</div>
                    </div>
                    <span className={`property-type-tag ptype-${dtype}`}>{dtype}</span>
                  </div>

                  <div className="property-value">
                    {renderPropertyValue(property)}
                    <span className="property-unit">{property.unit ? ` ${property.unit}` : ''}</span>
                  </div>

                  <div className="property-meta">
                    <div className="property-meta-item">{getStoreModeText(property.storeMode)}</div>
                    <div className="property-meta-item">{property.persistent ? '存历史' : '不存历史'}</div>
                  </div>

                  <div className="property-actions">
                    <button type="button" className="property-btn primary" onClick={() => void loadPropertyHistory(property)}>
                      查看历史
                    </button>
                    <button type="button" className="property-btn" onClick={() => void refreshHistory()}>
                      刷新
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <Modal
          open={historyOpen}
          title={historyTitle}
          footer={null}
          width={1200}
          destroyOnClose
          onCancel={() => setHistoryOpen(false)}
          afterOpenChange={(open) => {
            setHistoryModalReady(open)
            if (!open) {
              return
            }

            window.setTimeout(() => {
              historyChartInstanceRef.current?.resize()
            }, 180)
          }}
        >
          <div className="history-filters">
            <div className="form-row">
              <div style={{ display: 'flex', gap: 8 }}>
                <Select
                  value={historyRange}
                  onChange={async (value) => {
                    const endAt = historyEndAt ?? dayjs()
                    const startAt = endAt
                      .subtract(HISTORY_RANGE_SECONDS[value] ?? HISTORY_RANGE_SECONDS['24h'], 'second')
                      .startOf('hour')
                    setHistoryRange(value)
                    setHistoryStartAt(startAt)
                    setHistoryLoading(true)
                    try {
                      const selectedIds = historyCompareIds.length > 0 ? historyCompareIds : historyProperty ? [historyProperty.id] : []
                      const series = await fetchHistorySeriesByIds(selectedIds, value, startAt, endAt)
                      setHistorySeries(series)
                      setTableVisibleCount(120)
                    } finally {
                      setHistoryLoading(false)
                    }
                  }}
                  style={{ minWidth: 180 }}
                  options={[
                    { value: '1h', label: '最近 1 小时' },
                    { value: '6h', label: '最近 6 小时' },
                    { value: '12h', label: '最近 12 小时' },
                    { value: '24h', label: '最近 24 小时' },
                    { value: '3d', label: '最近 3 天' },
                    { value: '7d', label: '最近 7 天' },
                  ]}
                />
                <DatePicker
                  placeholder="开始时间"
                  value={historyStartAt}
                  allowClear={false}
                  needConfirm
                  locale={zhCNPicker}
                  showTime={{ format: 'HH' }}
                  format="YYYY-MM-DD HH:00"
                  style={{ width: 180 }}
                  disabledDate={disableFutureDate}
                  disabledTime={hourOnlyDisabledTimeNoFuture}
                  onChange={async (value) => {
                    const nextStart = (value ?? dayjs().subtract(24, 'hour')).startOf('hour')
                    const nextEnd = (historyEndAt ?? dayjs()).startOf('hour')
                    if (nextStart.isAfter(nextEnd)) {
                      message.warning('开始时间不能晚于结束时间')
                      return
                    }

                    setHistoryStartAt(nextStart)
                    setHistoryLoading(true)
                    try {
                      const selectedIds = historyCompareIds.length > 0 ? historyCompareIds : historyProperty ? [historyProperty.id] : []
                      const series = await fetchHistorySeriesByIds(selectedIds, historyRange, nextStart, nextEnd)
                      setHistorySeries(series)
                      setTableVisibleCount(120)
                    } finally {
                      setHistoryLoading(false)
                    }
                  }}
                />
                <DatePicker
                  placeholder="结束时间"
                  value={historyEndAt}
                  allowClear={false}
                  needConfirm
                  locale={zhCNPicker}
                  showTime={{ format: 'HH' }}
                  format="YYYY-MM-DD HH:00"
                  style={{ width: 180 }}
                  disabledDate={disableFutureDate}
                  disabledTime={hourOnlyDisabledTimeNoFuture}
                  onChange={async (value) => {
                    const nextEnd = (value ?? dayjs()).startOf('hour')
                    const nextStart = (historyStartAt ?? nextEnd.subtract(24, 'hour')).startOf('hour')
                    if (nextStart.isAfter(nextEnd)) {
                      message.warning('结束时间不能早于开始时间')
                      return
                    }

                    setHistoryEndAt(nextEnd)
                    setHistoryLoading(true)
                    try {
                      const selectedIds = historyCompareIds.length > 0 ? historyCompareIds : historyProperty ? [historyProperty.id] : []
                      const series = await fetchHistorySeriesByIds(selectedIds, historyRange, nextStart, nextEnd)
                      setHistorySeries(series)
                      setTableVisibleCount(120)
                    } finally {
                      setHistoryLoading(false)
                    }
                  }}
                />
                <div className="history-view-toggle">
                  <button
                    type="button"
                    className={historyViewMode === 'chart' ? 'active' : ''}
                    onClick={() => setHistoryViewMode('chart')}
                  >
                    <LineChartOutlined />
                    曲线
                  </button>
                  <button
                    type="button"
                    className={historyViewMode === 'table' ? 'active' : ''}
                    onClick={() => setHistoryViewMode('table')}
                  >
                    <TableOutlined />
                    表格
                  </button>
                </div>
                <Button
                  type="text"
                  className="history-refresh-btn"
                  icon={<SyncOutlined />}
                  loading={historyLoading}
                  onClick={() => void refreshHistory()}
                />
                <Button
                  className="history-compare-btn"
                  onClick={() => {
                    setHistoryCompareDraftIds(
                      historyCompareIds.length > 0
                        ? historyCompareIds
                        : historyProperty
                          ? [historyProperty.id]
                          : [],
                    )
                    setHistoryCompareOpen(true)
                  }}
                >
                  对比
                </Button>
              </div>
            </div>
          </div>

          <div className="history-chart">
            <div className="history-chart-real">
              {historyViewMode === 'chart' ? (
                <>
                  <Spin spinning={historyLoading} tip="加载历史曲线中...">
                    <div ref={historyChartRef} className="history-echarts" />
                  </Spin>
                </>
              ) : (
                <div
                  className="history-table-scroll"
                  onScroll={(event) => {
                    const target = event.currentTarget
                    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 24
                    if (nearBottom && visibleHistoryTableRows.length < historyTableRows.length) {
                      setTableVisibleCount((prev) => prev + 120)
                    }
                  }}
                >
                  <Table
                    rowKey="rowKey"
                    size="small"
                    pagination={false}
                    loading={historyLoading}
                    dataSource={visibleHistoryTableRows}
                    columns={historyTableColumns}
                    scroll={{ x: 720 }}
                  />
                </div>
              )}
            </div>
          </div>
        </Modal>

        <Modal
          open={historyCompareOpen}
          title="对比属性"
          width={560}
          onCancel={() => setHistoryCompareOpen(false)}
          footer={null}
        >
          <div className="history-compare-row">
            <Select
              mode="multiple"
              className="history-compare-select"
              style={{ flex: 1 }}
              value={historyCompareDraftIds}
              placeholder="请选择要对比的属性"
              placement="bottomLeft"
              maxTagCount="responsive"
              optionFilterProp="label"
              showSearch
              getPopupContainer={(triggerNode) => triggerNode.parentElement ?? document.body}
              options={
                detail?.properties.map((item) => ({
                  label: item.name,
                  value: item.propertyId,
                })) ?? []
              }
              onChange={(values) => setHistoryCompareDraftIds(values)}
            />
            <Button type="primary" loading={historyLoading} onClick={() => void applyCompareSelection()}>
              确定
            </Button>
          </div>
        </Modal>

        <Modal
          open={modalOpen}
          title={editing ? '编辑设备' : '添加设备'}
          onCancel={() => setModalOpen(false)}
          onOk={() => form.submit()}
          okText={editing ? '保存' : '确认添加'}
          cancelText="取消"
        >
          <DeviceForm
            form={form}
            editingProductName={editingProductName}
            isEditing={Boolean(editing)}
            productOptions={productOptions}
            productsLoading={productsLoading}
            ensureProductOptions={ensureProductOptions}
            onSubmit={async (values) => {
              try {
                if (editing) {
                  await updateDevice({ ...values, id: editing.id })
                  message.success('设备更新成功')
                } else {
                  await createDevice(values)
                  message.success('设备创建成功')
                }

                setModalOpen(false)
                refreshList()
                if (detail) {
                  setDetail(await fetchDeviceDetail(detail.id))
                }
              } catch (error) {
                message.error((error as Error).message)
              }
            }}
          />
        </Modal>
      </section>
    )
  }

  return (
    <section className="thing-model-page">
      <div className="thing-toolbar">
        <Input
          allowClear
          value={keywordInput}
          className="thing-search-input"
          prefix={<SearchOutlined />}
          placeholder="搜索设备 ID 或名称..."
          onChange={(event: ChangeEvent<HTMLInputElement>) => setKeywordInput(event.target.value)}
          onPressEnter={applySearch}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="thing-add-btn"
          onClick={() => {
            setEditing(undefined)
            form.resetFields()
            setEditingProductName('')
            setModalOpen(true)
            void ensureProductOptions()
          }}
        >
          添加设备
        </Button>
      </div>

      <div className="thing-table-card">
        <Table<DeviceItem>
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={false}
          scroll={{ x: 1280 }}
          className="thing-model-table"
        />
        <div className="thing-table-footer">
          <Typography.Text className="thing-table-total">共 {total} 台设备</Typography.Text>
          <Pagination
            current={pageNum}
            total={total}
            pageSize={PAGE_SIZE}
            showSizeChanger={false}
            onChange={(page) => setPageNum(page)}
          />
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? '编辑设备' : '添加设备'}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? '保存' : '确认添加'}
        cancelText="取消"
      >
          <DeviceForm
            form={form}
            editingProductName={editingProductName}
            isEditing={Boolean(editing)}
            productOptions={productOptions}
            productsLoading={productsLoading}
            ensureProductOptions={ensureProductOptions}
            onSubmit={async (values) => {
            try {
              if (editing) {
                await updateDevice({ ...values, id: editing.id })
                message.success('设备更新成功')
              } else {
                await createDevice(values)
                message.success('设备创建成功')
              }

              setModalOpen(false)
              refreshList()
            } catch (error) {
              message.error((error as Error).message)
            }
          }}
        />
      </Modal>
    </section>
  )
}

type DeviceFormProps = {
  form: FormInstance<DeviceFormValue>
  editingProductName: string
  isEditing: boolean
  productOptions: ProductItem[]
  productsLoading: boolean
  ensureProductOptions: () => Promise<void>
  onSubmit: (values: DeviceFormValue) => Promise<void>
}

function DeviceForm({
  form,
  editingProductName,
  isEditing,
  productOptions,
  productsLoading,
  ensureProductOptions,
  onSubmit,
}: DeviceFormProps) {
  return (
    <Form<DeviceFormValue> form={form} layout="vertical" onFinish={onSubmit}>
      <Form.Item label="设备名称" name="name" rules={[{ required: true, message: '请输入设备名称' }]}>
        <Input placeholder="请输入设备名称" />
      </Form.Item>
      <Form.Item
        label="设备标识符"
        name="key"
        rules={[
          { required: true, message: '请输入设备标识符' },
          { pattern: /^[a-zA-Z0-9_-]+$/, message: '仅支持字母、数字、下划线和中划线' },
        ]}
      >
        <Input placeholder="如：dev_warehouse_th_001" />
      </Form.Item>
      {isEditing ? (
        <Form.Item label="所属产品" name="productId" rules={[{ required: true, message: '请输入所属产品 ID' }]}>
          <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="请输入产品 ID" />
        </Form.Item>
      ) : (
        <Form.Item label="所属产品" name="productId" rules={[{ required: true, message: '请选择所属产品' }]}>
          <Select
            loading={productsLoading}
            showSearch
            placeholder="请选择所属产品"
            optionFilterProp="label"
            options={productOptions.map((item) => ({
              label: `${item.name} (${item.identifier})`,
              value: item.id,
            }))}
            onDropdownVisibleChange={(open) => {
              if (open) {
                void ensureProductOptions()
              }
            }}
          />
        </Form.Item>
      )}
      {isEditing ? (
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: -8, marginBottom: 12 }}>
          所属产品：{editingProductName || '--'}
        </Typography.Text>
      ) : null}
      <Form.Item label="备注" name="description">
        <Input.TextArea rows={3} placeholder="可选：设备位置、用途等" />
      </Form.Item>
    </Form>
  )
}
