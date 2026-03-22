import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DeploymentUnitOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  createThingModel,
  deleteThingModelProp,
  createThingModelProp,
  deleteThingModel,
  fetchThingModelList,
  fetchThingModelProps,
  updateThingModelProp,
  updateThingModel,
} from '../services/thingModelService'
import type { ThingModelItem, ThingModelProperty } from '../types/thingModel'

const PAGE_SIZE = 10

const iconTone = ['blue', 'green', 'orange', 'red', 'purple'] as const

const modelIcons: Array<{ key: string }> = [
  { key: 'sensor' },
  { key: 'gateway' },
  { key: 'meter' },
  { key: 'chip' },
  { key: 'alarm' },
  { key: 'light' },
  { key: 'switch' },
  { key: 'camera' },
  { key: 'network' },
  { key: 'api' },
]

const modelIconSvgMap: Record<string, string> = {
  sensor:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="4" width="10" height="16" rx="2"/><circle cx="12" cy="9" r="1.4"/><path d="M10 14h4"/><path d="M10 17h4"/></svg>',
  gateway:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 10h8"/><path d="M8 14h5"/></svg>',
  meter:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 12l4-3"/><path d="M8 17h8"/></svg>',
  chip:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/></svg>',
  alarm:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l9 16H3L12 3z"/><path d="M12 9v4"/><circle cx="12" cy="16" r="1"/></svg>',
  light:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.8 10.6c.7.6 1.4 1.5 1.6 2.4h4.4c.2-.9.9-1.8 1.6-2.4A6 6 0 0 0 12 3z"/></svg>',
  switch:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="7" width="19" height="10" rx="5"/><circle cx="8.5" cy="12" r="3.2"/><path d="M14.5 10.2h4"/><path d="M14.5 13.8h2.4"/></svg>',
  camera:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5h3l1.4-2h7.2l1.4 2H20a1.8 1.8 0 0 1 1.8 1.8v7.2A1.8 1.8 0 0 1 20 19.3H4a1.8 1.8 0 0 1-1.8-1.8v-7.2A1.8 1.8 0 0 1 4 8.5z"/><circle cx="12" cy="13.2" r="3.6"/><circle cx="18.2" cy="10.6" r=".7" fill="currentColor" stroke="none"/></svg>',
  network:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 9.5A13 13 0 0 1 20.5 9.5"/><path d="M6.8 12.9a8.2 8.2 0 0 1 10.4 0"/><path d="M10.1 16.2a3.4 3.4 0 0 1 3.8 0"/><circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none"/></svg>',
  api:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 8.2l-3 3 3 3"/><path d="M16.5 8.2l3 3-3 3"/><path d="M13.8 6.8l-3.6 8.8"/><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="3"/></svg>',
}

const colorOptions = [
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#475569',
  '#65a30d',
  '#0d9488',
]

type ThingModelFormValue = {
  name: string
  identifier: string
  description?: string
}

type ThingModelPropFormValue = {
  name: string
  key: string
  dataType: number
  unit?: string
  sourceType: number
  expression?: string
}

type WizardTabKey = 'props' | 'funcs' | 'events'

type DraftCapability = {
  uid: string
  key: string
  name: string
  dataType: number
  unit: string
  source: 'raw' | 'formula'
  expression: string
}

const initialProps: DraftCapability[] = []

const initialFuncs: DraftCapability[] = []

const initialEvents: DraftCapability[] = []

function dataTypeLabel(value: number) {
  if (value === 1) {
    return 'bool'
  }
  if (value === 2) {
    return 'int'
  }
  return 'float'
}

function applySvgColor(svg: string, color: string): string {
  const trimmed = svg.trim()
  if (!trimmed.startsWith('<svg')) {
    return svg
  }

  const withColorToken = trimmed.replace(/currentColor/g, color)

  if (/\sstyle\s*=/.test(withColorToken)) {
    return withColorToken
  }

  return withColorToken.replace('<svg', `<svg style="color:${color}"`)
}

function renderPresetIconSvg(iconKey: string, color: string) {
  return (
    <span
      className="thing-model-svg-icon"
      dangerouslySetInnerHTML={{
        __html: applySvgColor(modelIconSvgMap[iconKey] ?? modelIconSvgMap.sensor, color),
      }}
    />
  )
}

const ICON_IDLE_COLOR = '#9aa5be'

function renderThingModelIcon(iconSvg: string | undefined, toneClass: string) {
  if (iconSvg?.trim().startsWith('<svg')) {
    return (
      <span className={`thing-model-icon ${toneClass}`}>
        <span className="thing-model-svg-icon" dangerouslySetInnerHTML={{ __html: iconSvg }} />
      </span>
    )
  }

  return (
    <span className={`thing-model-icon ${toneClass}`}>
      <DeploymentUnitOutlined />
    </span>
  )
}

export function ThingModelPage() {
  const { message } = App.useApp()
  const [editForm] = Form.useForm<ThingModelFormValue>()
  const [keywordInput, setKeywordInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [pageNum, setPageNum] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<ThingModelItem[]>([])
  const [currentItem, setCurrentItem] = useState<ThingModelItem>()
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [props, setProps] = useState<ThingModelProperty[]>([])
  const [detailAddTab, setDetailAddTab] = useState<'props' | 'funcs' | 'events' | null>(null)
  const [detailEditingId, setDetailEditingId] = useState<number | null>(null)
  const [detailInlineAdd, setDetailInlineAdd] = useState<ThingModelPropFormValue>({
    name: '',
    key: '',
    dataType: 3,
    unit: '',
    sourceType: 1,
    expression: '',
  })
  const [detailAddLoading, setDetailAddLoading] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardTab, setWizardTab] = useState<WizardTabKey>('props')
  const [draftName, setDraftName] = useState('')
  const [draftIdentifier, setDraftIdentifier] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [selectedIcon, setSelectedIcon] = useState(modelIcons[0].key)
  const [selectedColor, setSelectedColor] = useState(colorOptions[0])
  const [uploadedIcon, setUploadedIcon] = useState<string>()
  const [draftProps, setDraftProps] = useState<DraftCapability[]>(initialProps)
  const [draftFuncs, setDraftFuncs] = useState<DraftCapability[]>(initialFuncs)
  const [draftEvents, setDraftEvents] = useState<DraftCapability[]>(initialEvents)
  const [submittingAdd, setSubmittingAdd] = useState(false)
  const [editSelectedIcon, setEditSelectedIcon] = useState(modelIcons[0].key)
  const [editSelectedColor, setEditSelectedColor] = useState(colorOptions[0])
  const [editUploadedIcon, setEditUploadedIcon] = useState<string>()

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchThingModelList({
        pageNum,
        pageSize: PAGE_SIZE,
        keyword: searchKeyword,
      })

      setDataSource(result.list)
      setTotal(result.total)
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [message, pageNum, searchKeyword])

  useEffect(() => {
    loadList()
  }, [loadList])

  const refreshList = useCallback(() => {
    if (pageNum === 1) {
      void loadList()
      return
    }
    setPageNum(1)
  }, [loadList, pageNum])

  const applySearch = useCallback(() => {
    const nextKeyword = keywordInput.trim()
    if (nextKeyword === searchKeyword) {
      refreshList()
      return
    }
    setPageNum(1)
    setSearchKeyword(nextKeyword)
  }, [keywordInput, refreshList, searchKeyword])

  const columns: ColumnsType<ThingModelItem> = [
      {
        title: '模型名称',
        dataIndex: 'name',
        key: 'name',
        width: 280,
        render: (_value, record, index) => (
          <Space size={12}>
            {renderThingModelIcon(record.icon, `tone-${iconTone[index % iconTone.length]}`)}
            <Typography.Text strong className="thing-model-name">
              {record.name}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: '标识符',
        dataIndex: 'identifier',
        key: 'identifier',
        width: 290,
        render: (identifier: string) => <Tag className="thing-model-id-tag">{identifier}</Tag>,
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        width: 280,
        ellipsis: true,
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 140,
      },
      {
        title: '操作',
        key: 'actions',
        width: 220,
        render: (_value, record) => (
          <Space size={8}>
            <Button
              size="small"
              className="thing-action-btn"
              icon={<EyeOutlined />}
              onClick={async () => {
                setCurrentItem(record)
                setDetailOpen(true)
                setProps(await fetchThingModelProps(record.id))
              }}
            >
              详情
            </Button>
            <Button
              size="small"
              className="thing-action-btn"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确认删除该物模型吗？"
              okText="删除"
              cancelText="取消"
              onConfirm={async () => {
                try {
                  await deleteThingModel(record.id)
                  message.success('物模型删除成功')
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
  ]

  const detailProps = useMemo(() => props.filter((item) => item.type === 1), [props])
  const detailFuncs = useMemo(() => props.filter((item) => item.type === 2), [props])
  const detailEvents = useMemo(() => props.filter((item) => item.type === 3), [props])

  const typeMap: Record<'props' | 'funcs' | 'events', number> = {
    props: 1,
    funcs: 2,
    events: 3,
  }

  const typeLabelMap: Record<'props' | 'funcs' | 'events', string> = {
    props: '属性',
    funcs: '功能',
    events: '事件',
  }

  function openDetailAdd(tab: 'props' | 'funcs' | 'events') {
    setDetailAddTab(tab)
    setDetailEditingId(null)
    setDetailInlineAdd({
      name: '',
      key: '',
      dataType: 3,
      unit: '',
      sourceType: 1,
      expression: '',
    })
  }

  function openDetailEdit(tab: 'props' | 'funcs' | 'events', item: ThingModelProperty) {
    setDetailAddTab(tab)
    setDetailEditingId(item.id)
    setDetailInlineAdd({
      name: item.name,
      key: item.key,
      dataType: item.dataType,
      unit: item.unit,
      sourceType: item.sourceType,
      expression: item.expression,
    })
  }

  function cancelDetailAdd() {
    setDetailInlineAdd({
      name: '',
      key: '',
      dataType: 3,
      unit: '',
      sourceType: 1,
      expression: '',
    })
    setDetailEditingId(null)
    setDetailAddTab(null)
  }

  async function submitDetailAdd() {
    if (!currentItem || !detailAddTab) {
      return
    }

    if (!detailInlineAdd.name.trim()) {
      message.warning('请输入名称')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(detailInlineAdd.key.trim())) {
      message.warning('Key 仅支持字母、数字和下划线')
      return
    }

    setDetailAddLoading(true)
    try {
      if (detailEditingId) {
        await updateThingModelProp({
          id: detailEditingId,
          modelId: currentItem.id,
          name: detailInlineAdd.name.trim(),
          key: detailInlineAdd.key.trim(),
          type: typeMap[detailAddTab],
          dataType: detailInlineAdd.dataType,
          unit: detailInlineAdd.unit?.trim(),
          sourceType: detailInlineAdd.sourceType,
          expression: detailInlineAdd.expression?.trim(),
        })
        message.success(`${typeLabelMap[detailAddTab]}更新成功`)
      } else {
        await createThingModelProp({
          modelId: currentItem.id,
          name: detailInlineAdd.name.trim(),
          key: detailInlineAdd.key.trim(),
          type: typeMap[detailAddTab],
          dataType: detailInlineAdd.dataType,
          unit: detailInlineAdd.unit?.trim(),
          sourceType: detailInlineAdd.sourceType,
          expression: detailInlineAdd.expression?.trim(),
        })
        message.success(`${typeLabelMap[detailAddTab]}创建成功`)
      }
      cancelDetailAdd()
      setProps(await fetchThingModelProps(currentItem.id))
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setDetailAddLoading(false)
    }
  }

  async function removeDetailProp(id: number) {
    if (!currentItem) {
      return
    }

    try {
      await deleteThingModelProp(id)
      message.success('删除成功')
      setProps(await fetchThingModelProps(currentItem.id))
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  function renderDetailTable(data: ThingModelProperty[], tab: 'props' | 'funcs' | 'events') {
    const isAdding = detailAddTab === tab && detailEditingId === null
    const isEditing = detailAddTab === tab && detailEditingId !== null
    const draftRow: ThingModelProperty = {
      id: -1,
      key: '__draft__',
      name: '',
      type: typeMap[tab],
      dataType: detailInlineAdd.dataType,
      unit: detailInlineAdd.unit ?? '',
      sourceType: detailInlineAdd.sourceType,
      expression: detailInlineAdd.expression ?? '',
    }
    const tableData = isAdding
      ? [...data, draftRow]
      : isEditing
        ? data.map((item) => (item.id === detailEditingId ? { ...item, ...draftRow, id: item.id } : item))
        : data

    const isDraftRow = (record: ThingModelProperty) => isAdding && record.id === -1
    const isEditingRow = (record: ThingModelProperty) => isEditing && record.id === detailEditingId
    const isInputRow = (record: ThingModelProperty) => isDraftRow(record) || isEditingRow(record)
    const tableColumns: ColumnsType<ThingModelProperty> = [
      {
        title: 'Key',
        dataIndex: 'key',
        key: 'key',
        render: (value: string, record) =>
          isInputRow(record) ? (
            <Input
              size="small"
              placeholder="请输入 key"
              value={detailInlineAdd.key}
              onChange={(event) => setDetailInlineAdd((prev) => ({ ...prev, key: event.target.value }))}
            />
          ) : (
            <Tag className="thing-model-id-tag">{value}</Tag>
          ),
      },
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        render: (value: string, record) =>
          isInputRow(record) ? (
            <Input
              size="small"
              placeholder="请输入名称"
              value={detailInlineAdd.name}
              onChange={(event) => setDetailInlineAdd((prev) => ({ ...prev, name: event.target.value }))}
            />
          ) : (
            value
          ),
      },
      {
        title: '数据类型',
        dataIndex: 'dataType',
        key: 'dataType',
        render: (value: number, record) =>
          isInputRow(record) ? (
            <Select
              size="small"
              value={detailInlineAdd.dataType}
              options={[
                { label: 'bool', value: 1 },
                { label: 'int', value: 2 },
                { label: 'float', value: 3 },
              ]}
              onChange={(nextValue) => setDetailInlineAdd((prev) => ({ ...prev, dataType: nextValue }))}
            />
          ) : (
            <Tag className={`dtype-tag dtype-${dataTypeLabel(value)}`}>{dataTypeLabel(value)}</Tag>
          ),
      },
      {
        title: '单位',
        dataIndex: 'unit',
        key: 'unit',
        render: (value: string, record) =>
          isInputRow(record) ? (
            <Input
              size="small"
              placeholder="单位(可选)"
              value={detailInlineAdd.unit}
              onChange={(event) => setDetailInlineAdd((prev) => ({ ...prev, unit: event.target.value }))}
            />
          ) : (
            value || '--'
          ),
      },
      {
        title: '来源',
        dataIndex: 'sourceType',
        key: 'sourceType',
        render: (value: number, record) => {
          if (isInputRow(record)) {
            return (
              <Select
                size="small"
                value={detailInlineAdd.sourceType}
                options={[
                  { label: 'raw', value: 1 },
                  { label: 'formula', value: 2 },
                ]}
                onChange={(nextValue) => setDetailInlineAdd((prev) => ({ ...prev, sourceType: nextValue }))}
              />
            )
          }
          const sourceText = value === 2 ? 'formula' : 'raw'
          return <Tag className={`source-tag src-${sourceText}`}>{sourceText}</Tag>
        },
      },
      {
        title: '表达式',
        dataIndex: 'expression',
        key: 'expression',
        render: (value: string, record) =>
          isInputRow(record) ? (
            <Input
              size="small"
              placeholder="来源为 formula 时可填写"
              disabled={detailInlineAdd.sourceType !== 2}
              value={detailInlineAdd.expression}
              onChange={(event) => setDetailInlineAdd((prev) => ({ ...prev, expression: event.target.value }))}
            />
          ) : record.sourceType === 2 ? (
            <span className="expr-text">{value || '--'}</span>
          ) : (
            '--'
          ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 160,
        render: (_value, record) =>
          isInputRow(record) ? (
            <Space size={6}>
              <Button type="primary" size="small" loading={detailAddLoading} onClick={() => void submitDetailAdd()}>
                保存
              </Button>
              <Button size="small" onClick={cancelDetailAdd}>
                取消
              </Button>
            </Space>
          ) : (
            <Space size={6}>
              <Button size="small" onClick={() => openDetailEdit(tab, record)}>
                编辑
              </Button>
              <Popconfirm title="确认删除该项吗？" onConfirm={() => void removeDetailProp(record.id)}>
                <Button size="small" danger>
                  删除
                </Button>
              </Popconfirm>
            </Space>
          ),
      },
    ]

    return (
      <div className="model-detail-table-wrap">
        <Table
          rowKey="id"
          size="small"
          dataSource={tableData}
          columns={tableColumns}
          pagination={false}
        />
        {isAdding ? null : (
          <button type="button" className="wizard-add-row" onClick={() => openDetailAdd(tab)}>
            <PlusOutlined />
          </button>
        )}
      </div>
    )
  }

  function resetEditIconPicker() {
    setEditSelectedIcon(modelIcons[0].key)
    setEditSelectedColor(colorOptions[0])
    setEditUploadedIcon(undefined)
  }

  function openEditModal(record: ThingModelItem) {
    setCurrentItem(record)
    editForm.setFieldsValue({
      name: record.name,
      identifier: record.identifier,
      description: record.description,
    })
    resetEditIconPicker()
    setEditOpen(true)
  }

  function resetAddWizard() {
    setWizardStep(1)
    setWizardTab('props')
    setDraftName('')
    setDraftIdentifier('')
    setDraftDescription('')
    setSelectedIcon(modelIcons[0].key)
    setSelectedColor(colorOptions[0])
    setUploadedIcon(undefined)
    setDraftProps(initialProps)
    setDraftFuncs(initialFuncs)
    setDraftEvents(initialEvents)
  }

  function getDraftList(tab: WizardTabKey) {
    if (tab === 'props') {
      return draftProps
    }
    if (tab === 'funcs') {
      return draftFuncs
    }
    return draftEvents
  }

  function updateDraftList(tab: WizardTabKey, list: DraftCapability[]) {
    if (tab === 'props') {
      setDraftProps(list)
      return
    }
    if (tab === 'funcs') {
      setDraftFuncs(list)
      return
    }
    setDraftEvents(list)
  }

  function addDraftRow(tab: WizardTabKey) {
    const list = getDraftList(tab)
    updateDraftList(tab, [
      ...list,
      {
        uid: `${tab}-${Date.now()}`,
        key: '',
        name: '',
        dataType: 3,
        unit: '',
        source: 'raw',
        expression: '',
      },
    ])
  }

  function updateDraftRow(tab: WizardTabKey, uid: string, patch: Partial<DraftCapability>) {
    const list = getDraftList(tab)
    updateDraftList(
      tab,
      list.map((item) => (item.uid === uid ? { ...item, ...patch } : item)),
    )
  }

  function removeDraftRow(tab: WizardTabKey, uid: string) {
    const list = getDraftList(tab)
    updateDraftList(
      tab,
      list.filter((item) => item.uid !== uid),
    )
  }

  function renderDraftTable(tab: WizardTabKey) {
    const rows = getDraftList(tab)

    return (
      <div className="wizard-table-wrap">
        <table className="wizard-inline-table">
          <colgroup>
            <col className="col-key" />
            <col className="col-name" />
            <col className="col-type" />
            <col className="col-unit" />
            <col className="col-source" />
            <col className="col-expression" />
            <col className="col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th>Key</th>
              <th>名称</th>
              <th>数据类型</th>
              <th>单位</th>
              <th>来源</th>
              <th>表达式</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.uid}>
                <td>
                  <Input
                    size="small"
                    value={row.key}
                    placeholder="key"
                    onChange={(event) => updateDraftRow(tab, row.uid, { key: event.target.value })}
                  />
                </td>
                <td>
                  <Input
                    size="small"
                    value={row.name}
                    placeholder="名称"
                    onChange={(event) => updateDraftRow(tab, row.uid, { name: event.target.value })}
                  />
                </td>
                <td>
                  <Select
                    size="small"
                    value={row.dataType}
                    options={[
                      { label: 'bool', value: 1 },
                      { label: 'int', value: 2 },
                      { label: 'float', value: 3 },
                    ]}
                    onChange={(value) => updateDraftRow(tab, row.uid, { dataType: value })}
                  />
                </td>
                <td>
                  <Input
                    size="small"
                    value={row.unit}
                    placeholder="单位"
                    onChange={(event) => updateDraftRow(tab, row.uid, { unit: event.target.value })}
                  />
                </td>
                <td>
                  <Select
                    size="small"
                    value={row.source}
                    options={[
                      { label: 'raw', value: 'raw' },
                      { label: 'formula', value: 'formula' },
                    ]}
                    onChange={(value) => updateDraftRow(tab, row.uid, { source: value })}
                  />
                </td>
                <td>
                  <Input
                    size="small"
                    value={row.expression}
                    disabled={row.source === 'raw'}
                    placeholder="temperature * 1.8 + 32"
                    onChange={(event) => updateDraftRow(tab, row.uid, { expression: event.target.value })}
                  />
                </td>
                <td>
                  <Button
                    danger
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => removeDraftRow(tab, row.uid)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="wizard-add-row" onClick={() => addDraftRow(tab)}>
          <PlusOutlined />
        </button>
      </div>
    )
  }

  async function submitAddModel() {
    if (!draftName.trim()) {
      message.warning('请输入模型名称')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(draftIdentifier.trim())) {
      message.warning('模型标识符只能包含字母、数字和下划线')
      return
    }

    const selectedSvgIcon = modelIconSvgMap[selectedIcon] ?? modelIconSvgMap.sensor
    const uploadedSvg = uploadedIcon?.trim()
    const rawIconSvg = uploadedSvg && uploadedSvg.startsWith('<svg') ? uploadedSvg : selectedSvgIcon
    const iconSvg = applySvgColor(rawIconSvg, selectedColor)

    const mapByType = (list: DraftCapability[], type: number) =>
      list
        .filter((item) => item.key.trim() && item.name.trim())
        .map((item) => ({
          name: item.name.trim(),
          key: item.key.trim(),
          type,
          dataType: item.dataType,
          unit: item.unit.trim(),
        }))

    const funcTypes = [
      ...mapByType(draftProps, 1),
      ...mapByType(draftFuncs, 2),
      ...mapByType(draftEvents, 3),
    ]

    setSubmittingAdd(true)
    try {
      await createThingModel({
        name: draftName.trim(),
        identifier: draftIdentifier.trim(),
        description: draftDescription.trim(),
        icon: iconSvg,
        funcTypes,
      })
      message.success('物模型创建成功')
      setAddOpen(false)
      resetAddWizard()
      refreshList()
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setSubmittingAdd(false)
    }
  }

  return (
    <section className="thing-model-page">
      <div className="thing-toolbar">
        <Input
          allowClear
          value={keywordInput}
          className="thing-search-input"
          prefix={<SearchOutlined />}
          placeholder="搜索物模型名称或标识符..."
          onChange={(event: ChangeEvent<HTMLInputElement>) => setKeywordInput(event.target.value)}
          onPressEnter={applySearch}
        />
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          className="thing-add-btn"
          onClick={() => {
            resetAddWizard()
            setAddOpen(true)
          }}
        >
          添加物模型
        </Button>
      </div>

      {detailOpen && currentItem ? (
        <>
          <div className="thing-table-card">
            <div className="card-hdr model-detail-header">
              <Space>
                <Button
                  icon={<ArrowLeftOutlined />}
                  className="thing-action-btn"
                  onClick={() => setDetailOpen(false)}
                >
                  返回
                </Button>
                <Typography.Text strong>物模型信息</Typography.Text>
              </Space>
              <Space>
                <Typography.Text type="secondary">最近更新：{currentItem.createdAt}</Typography.Text>
                <Button
                  className="thing-action-btn"
                  icon={<EditOutlined />}
                  onClick={() => openEditModal(currentItem)}
                >
                  编辑
                </Button>
              </Space>
            </div>
            <div className="model-detail-top">
              <div className="model-detail-icon-wrap">
                <div className="model-detail-icon">
                  {currentItem.icon?.trim().startsWith('<svg') ? (
                    <span className="thing-model-detail-svg" dangerouslySetInnerHTML={{ __html: currentItem.icon }} />
                  ) : (
                    <DeploymentUnitOutlined />
                  )}
                </div>
              </div>
              <div className="model-detail-main">
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {currentItem.name}
                </Typography.Title>
                <Space style={{ marginTop: 8 }}>
                  <Tag className="thing-model-id-tag">{currentItem.identifier}</Tag>
                  <Tag className="proto-tag proto-mqtt">MQTT</Tag>
                </Space>
                <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 10 }}>
                  {currentItem.description || '暂无描述'}
                </Typography.Paragraph>
                <Typography.Text className="model-detail-created">创建时间：{currentItem.createdAt}</Typography.Text>
              </div>
            </div>
          </div>

          <div className="thing-table-card">
            <div className="card-hdr model-detail-header">
              <Typography.Text strong>物模型能力</Typography.Text>
              <Typography.Text type="secondary">共 {props.length} 项</Typography.Text>
            </div>
            <Tabs
              className="model-detail-tabs"
              items={[
                {
                  key: 'props',
                  label: `属性 (${detailProps.length})`,
                  children: renderDetailTable(detailProps, 'props'),
                },
                {
                  key: 'funcs',
                  label: `功能 (${detailFuncs.length})`,
                  children: renderDetailTable(detailFuncs, 'funcs'),
                },
                {
                  key: 'events',
                  label: `事件 (${detailEvents.length})`,
                  children: renderDetailTable(detailEvents, 'events'),
                },
              ]}
            />
          </div>
        </>
      ) : (
        <div className="thing-table-card">
          <Table
            rowKey={(record: ThingModelItem) => record.id}
            dataSource={dataSource}
            columns={columns}
            loading={loading}
            pagination={false}
            scroll={{ x: 1300 }}
            className="thing-model-table"
          />

          <div className="thing-table-footer">
            <Typography.Text className="thing-table-total">共 {total} 个物模型</Typography.Text>
            <Pagination
              current={pageNum}
              pageSize={PAGE_SIZE}
              total={total}
              showSizeChanger={false}
              onChange={(page: number) => setPageNum(page)}
            />
          </div>
        </div>
      )}

      <Modal
        open={editOpen}
        title="编辑物模型"
        width={920}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form<ThingModelFormValue>
          form={editForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!currentItem) {
              return
            }
            try {
              const editUploadedSvg = editUploadedIcon?.trim()
              const editSelectedSvg = modelIconSvgMap[editSelectedIcon] ?? modelIconSvgMap.sensor
              const editRawSvg =
                editUploadedSvg && editUploadedSvg.startsWith('<svg')
                  ? editUploadedSvg
                  : editSelectedSvg
              const editIconSvg = applySvgColor(editRawSvg, editSelectedColor)

              await updateThingModel({
                ...values,
                id: currentItem.id,
                icon: editIconSvg,
              })
              message.success('物模型更新成功')
              setCurrentItem({ ...currentItem, ...values })
              setEditOpen(false)
              refreshList()
            } catch (error) {
              message.error((error as Error).message)
            }
          }}
        >
          <div className="form-row two-col">
            <Form.Item label="模型名称" name="name" rules={[{ required: true, message: '请输入模型名称' }]}>
              <Input placeholder="请输入模型名称" />
            </Form.Item>
            <Form.Item
              label="模型标识符"
              name="identifier"
              rules={[
                { required: true, message: '请输入模型标识符' },
                { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线' },
              ]}
            >
              <Input placeholder="如：thm_temperature_sensor" />
            </Form.Item>
          </div>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} placeholder="可选：模型用途与说明" />
          </Form.Item>
          <Form.Item label="图标">
            <div className="wizard-icon-row">
              <label className="wizard-upload-box">
                <input
                  type="file"
                  accept="image/*,.svg"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) {
                      return
                    }

                    const reader = new FileReader()
                    reader.onload = () => {
                      setEditUploadedIcon(String(reader.result ?? ''))
                    }
                    if (file.type === 'image/svg+xml') {
                      reader.readAsText(file)
                    } else {
                      reader.readAsDataURL(file)
                    }
                  }}
                />
                <div
                  className="wizard-upload-preview"
                  style={{ color: editSelectedColor, borderColor: editSelectedColor }}
                >
                  {editUploadedIcon ? (
                    editUploadedIcon.startsWith('data:image') ? (
                      <img src={editUploadedIcon} alt="icon" />
                    ) : (
                      <span
                        className="thing-model-svg-icon"
                        dangerouslySetInnerHTML={{ __html: applySvgColor(editUploadedIcon, editSelectedColor) }}
                      />
                    )
                  ) : (
                    renderPresetIconSvg(editSelectedIcon, editSelectedColor)
                  )}
                </div>
                <b>上传图标</b>
                <span>支持 SVG/PNG/JPG</span>
              </label>

              <div className="wizard-icon-grid">
                {modelIcons.map((item) => (
                  <button
                    type="button"
                    key={`edit-${item.key}`}
                    className={`wizard-icon-option ${editSelectedIcon === item.key ? 'selected' : ''}`}
                    style={{ color: editSelectedIcon === item.key ? editSelectedColor : undefined }}
                    onClick={() => {
                      setEditSelectedIcon(item.key)
                      setEditUploadedIcon(undefined)
                    }}
                  >
                    {renderPresetIconSvg(
                      item.key,
                      editSelectedIcon === item.key ? editSelectedColor : ICON_IDLE_COLOR,
                    )}
                  </button>
                ))}
              </div>

              <div className="wizard-color-grid">
                {colorOptions.map((color) => (
                  <button
                    type="button"
                    key={`edit-color-${color}`}
                    className={`wizard-color-option ${editSelectedColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className="form-hint">用于列表展示，支持上传或选择预设图标与颜色</div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={addOpen}
        title="添加物模型"
        width={960}
        destroyOnClose
        onCancel={() => setAddOpen(false)}
        footer={null}
      >
        <div className="model-wizard-wrap">
          <div className="model-wizard-steps">
            <button
              type="button"
              className={`wizard-step-item ${wizardStep === 1 ? 'active' : ''} ${wizardStep > 1 ? 'done' : ''}`}
              onClick={() => setWizardStep(1)}
            >
              <span>1</span>
              <b>配置基础信息</b>
            </button>
            <button
              type="button"
              className={`wizard-step-item ${wizardStep === 2 ? 'active' : ''}`}
              onClick={() => setWizardStep(2)}
            >
              <span>2</span>
              <b>配置功能(属性/功能/事件)</b>
            </button>
          </div>

          {wizardStep === 1 && (
            <div className="model-step-panel">
              <div className="form-row two-col">
                <div>
                  <label className="form-label">模型名称 *</label>
                  <Input
                    value={draftName}
                    placeholder="请输入模型名称"
                    onChange={(event) => setDraftName(event.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">模型标识符 *</label>
                  <Input
                    value={draftIdentifier}
                    placeholder="如：thm_temperature_sensor"
                    onChange={(event) => setDraftIdentifier(event.target.value)}
                  />
                  <div className="form-hint">对应 thing_model.identifier；只能包含字母、数字和下划线</div>
                </div>
              </div>

              <div>
                <label className="form-label">描述</label>
                <Input.TextArea
                  rows={2}
                  value={draftDescription}
                  placeholder="对应 thing_model.description（可选）"
                  onChange={(event) => setDraftDescription(event.target.value)}
                />
              </div>

              <div>
                <label className="form-label">图标</label>
                <div className="wizard-icon-row">
                  <label className="wizard-upload-box">
                    <input
                      type="file"
                      accept="image/*,.svg"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (!file) {
                          return
                        }

                        const reader = new FileReader()
                        reader.onload = () => {
                          setUploadedIcon(String(reader.result ?? ''))
                        }
                        if (file.type === 'image/svg+xml') {
                          reader.readAsText(file)
                        } else {
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                    <div className="wizard-upload-preview" style={{ color: selectedColor, borderColor: selectedColor }}>
                      {uploadedIcon ? (
                        uploadedIcon.startsWith('data:image') ? (
                          <img src={uploadedIcon} alt="icon" />
                        ) : (
                          <span
                            className="thing-model-svg-icon"
                            dangerouslySetInnerHTML={{ __html: applySvgColor(uploadedIcon, selectedColor) }}
                          />
                        )
                      ) : (
                        renderPresetIconSvg(selectedIcon, selectedColor)
                      )}
                    </div>
                    <b>上传图标</b>
                    <span>支持 SVG/PNG/JPG</span>
                  </label>

                  <div className="wizard-icon-grid">
                    {modelIcons.map((item) => (
                      <button
                        type="button"
                        key={item.key}
                        className={`wizard-icon-option ${selectedIcon === item.key ? 'selected' : ''}`}
                        style={{ color: selectedIcon === item.key ? selectedColor : undefined }}
                        onClick={() => {
                          setSelectedIcon(item.key)
                          setUploadedIcon(undefined)
                        }}
                      >
                        {renderPresetIconSvg(
                          item.key,
                          selectedIcon === item.key ? selectedColor : ICON_IDLE_COLOR,
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="wizard-color-grid">
                    {colorOptions.map((color) => (
                      <button
                        type="button"
                        key={color}
                        className={`wizard-color-option ${selectedColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setSelectedColor(color)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="model-step-panel">
              <div className="wizard-tab-bar">
                <button
                  type="button"
                  className={wizardTab === 'props' ? 'active' : ''}
                  onClick={() => setWizardTab('props')}
                >
                  属性 <span>{draftProps.length}</span>
                </button>
                <button
                  type="button"
                  className={wizardTab === 'funcs' ? 'active' : ''}
                  onClick={() => setWizardTab('funcs')}
                >
                  功能 <span>{draftFuncs.length}</span>
                </button>
                <button
                  type="button"
                  className={wizardTab === 'events' ? 'active' : ''}
                  onClick={() => setWizardTab('events')}
                >
                  事件 <span>{draftEvents.length}</span>
                </button>
              </div>

              {wizardTab === 'props' && renderDraftTable('props')}
              {wizardTab === 'funcs' && renderDraftTable('funcs')}
              {wizardTab === 'events' && renderDraftTable('events')}
            </div>
          )}
        </div>

        <div className="model-wizard-footer">
          {wizardStep === 1 ? (
            <>
              <Button onClick={() => setAddOpen(false)}>取消</Button>
              <Button
                type="primary"
                onClick={() => {
                  if (!draftName.trim()) {
                    message.warning('请先填写模型名称')
                    return
                  }
                  if (!/^[a-zA-Z0-9_]+$/.test(draftIdentifier.trim())) {
                    message.warning('模型标识符格式不正确')
                    return
                  }
                  setWizardStep(2)
                }}
              >
                下一步
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setWizardStep(1)}>上一步</Button>
              <Button type="primary" loading={submittingAdd} onClick={submitAddModel}>
                确认添加
              </Button>
            </>
          )}
        </div>
      </Modal>
    </section>
  )
}
