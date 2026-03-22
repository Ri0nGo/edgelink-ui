import {
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  EditOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { fetchThingModelList } from '../services/thingModelService'
import {
  createProduct,
  deleteProduct,
  fetchProductDetail,
  fetchProductList,
  updateProduct,
} from '../services/productService'
import type { ProductItem } from '../types/product'
import type { ThingModelItem } from '../types/thingModel'

const PAGE_SIZE = 10

const protocolOptions = [
  { label: 'MQTT', value: 'mqtt' },
]

type ProductFormValues = {
  name: string
  identifier: string
  modelId: number
  protocol: string
  description?: string
}

export function ProductPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm<ProductFormValues>()
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [protocolFilter, setProtocolFilter] = useState<string>()
  const [pageNum, setPageNum] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [list, setList] = useState<ProductItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [currentItem, setCurrentItem] = useState<ProductItem>()
  const [editingModelName, setEditingModelName] = useState('')
  const [modelOptions, setModelOptions] = useState<ThingModelItem[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchProductList({
        pageNum,
        pageSize: PAGE_SIZE,
        keyword,
        protocol: protocolFilter,
      })
      setList(result.list)
      setTotal(result.total)
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [keyword, message, pageNum, protocolFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const refreshList = useCallback(() => {
    if (pageNum === 1) {
      void loadData()
      return
    }
    setPageNum(1)
  }, [loadData, pageNum])

  const ensureModelOptions = useCallback(async () => {
    if (modelOptions.length > 0 || modelsLoading) {
      return
    }

    setModelsLoading(true)
    try {
      const result = await fetchThingModelList({ pageNum: 1, pageSize: 200 })
      setModelOptions(result.list)
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setModelsLoading(false)
    }
  }, [message, modelOptions.length, modelsLoading])

  const applySearch = useCallback(() => {
    const nextKeyword = keywordInput.trim()
    if (nextKeyword === keyword) {
      refreshList()
      return
    }
    setPageNum(1)
    setKeyword(nextKeyword)
  }, [keywordInput, keyword, refreshList])

  const columns = useMemo<ColumnsType<ProductItem>>(
    () => [
      {
        title: '产品名称',
        key: 'name',
        width: 260,
        render: (_value, record) => (
          <Space>
            <span className="thing-model-icon tone-blue">
              <SettingOutlined />
            </span>
            <div>
              <Typography.Text strong>{record.name}</Typography.Text>
              <div className="cell-sub-text">{record.description}</div>
            </div>
          </Space>
        ),
      },
      {
        title: '唯一标识符',
        dataIndex: 'identifier',
        key: 'identifier',
        width: 220,
        render: (value: string) => <Tag className="thing-model-id-tag">{value}</Tag>,
      },
      {
        title: '物模型',
        dataIndex: 'modelName',
        key: 'modelName',
        width: 220,
      },
      {
        title: '通信协议',
        dataIndex: 'protocol',
        key: 'protocol',
        width: 140,
        render: (value: string) => <Tag className={`proto-tag proto-${value}`}>{value.toUpperCase()}</Tag>,
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
          <Space size={6}>
            <Button
              size="small"
              className="thing-action-btn"
              icon={<EyeOutlined />}
              onClick={() => {
                setCurrentItem(record)
                setViewOpen(true)
              }}
            >
              查看
            </Button>
            <Button
              size="small"
              className="thing-action-btn"
              icon={<EditOutlined />}
              onClick={async () => {
                let modelId = record.thingModelId
                let modelName = record.modelName || '--'

                if (!modelId) {
                  try {
                    const detail = await fetchProductDetail(record.id)
                    modelId = detail.thingModelId
                    modelName = detail.modelName || modelName
                  } catch {
                    modelId = record.thingModelId
                  }
                }
                setCurrentItem(record)
                form.setFieldsValue({
                  name: record.name,
                  identifier: record.identifier,
                  modelId,
                  protocol: record.protocol,
                  description: record.description,
                })
                setEditingModelName(modelName)
                setModalOpen(true)
              }}
            >
              编辑
            </Button>
            <Popconfirm
              title="确认删除该产品吗？"
              okText="删除"
              cancelText="取消"
              onConfirm={async () => {
                try {
                  await deleteProduct(record.id)
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
    [form, message, refreshList],
  )

  return (
    <section className="thing-model-page">
      <div className="thing-toolbar">
        <Space wrap>
          <Input
            allowClear
            value={keywordInput}
            className="thing-search-input"
            prefix={<SearchOutlined />}
            placeholder="搜索产品名称或标识符..."
            onChange={(event: ChangeEvent<HTMLInputElement>) => setKeywordInput(event.target.value)}
            onPressEnter={applySearch}
          />
          <Select
            allowClear
            placeholder="全部协议"
            options={protocolOptions}
            style={{ width: 140 }}
            value={protocolFilter}
            onChange={(value) => {
              setProtocolFilter(value)
              setPageNum(1)
            }}
          />
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="thing-add-btn"
          onClick={() => {
            setCurrentItem(undefined)
            form.resetFields()
            setEditingModelName('')
            setModalOpen(true)
            void ensureModelOptions()
          }}
        >
          添加产品
        </Button>
      </div>

      <div className="thing-table-card">
        <Table<ProductItem>
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={false}
          scroll={{ x: 1280 }}
          className="thing-model-table"
        />
        <div className="thing-table-footer">
          <Typography.Text className="thing-table-total">共 {total} 个产品</Typography.Text>
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
        title={currentItem ? '编辑产品' : '添加产品'}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={currentItem ? '保存' : '确认添加'}
        cancelText="取消"
      >
        <Form<ProductFormValues>
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            try {
              if (currentItem) {
                await updateProduct({ ...values, id: currentItem.id })
                message.success('产品更新成功')
              } else {
                await createProduct(values)
                message.success('产品创建成功')
              }

              setModalOpen(false)
              refreshList()
            } catch (error) {
              message.error((error as Error).message)
            }
          }}
        >
          <Form.Item label="产品名称" name="name" rules={[{ required: true, message: '请输入产品名称' }]}>
            <Input placeholder="请输入产品名称" />
          </Form.Item>
          <Form.Item
            label="唯一标识符"
            name="identifier"
            rules={[
              { required: true, message: '请输入唯一标识符' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: '只能包含字母、数字和中下划线' },
            ]}
          >
            <Input placeholder="如：prod_temperature_sensor" />
          </Form.Item>
          {currentItem ? (
            <>
              <Form.Item label="物模型">
                <Input value={editingModelName || '--'} readOnly disabled />
              </Form.Item>
              <Form.Item name="modelId" hidden>
                <InputNumber />
              </Form.Item>
            </>
          ) : (
            <Form.Item label="物模型" name="modelId" rules={[{ required: true, message: '请选择物模型' }]}>
              <Select
                loading={modelsLoading}
                showSearch
                placeholder="请选择物模型"
                optionFilterProp="label"
                options={modelOptions.map((item) => ({
                  label: `${item.name} (${item.identifier})`,
                  value: item.id,
                }))}
                onDropdownVisibleChange={(open) => {
                  if (open) {
                    void ensureModelOptions()
                  }
                }}
              />
            </Form.Item>
          )}
          <Form.Item label="通信协议" name="protocol" rules={[{ required: true, message: '请选择通信协议' }]}>
            <Select options={protocolOptions} placeholder="请选择协议" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="设备接入产品描述" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={viewOpen}
        title="查看产品"
        footer={null}
        onCancel={() => setViewOpen(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div className="detail-row">
            <span>产品名称</span>
            <b>{currentItem?.name}</b>
          </div>
          <div className="detail-row">
            <span>唯一标识符</span>
            <Tag className="thing-model-id-tag">{currentItem?.identifier}</Tag>
          </div>
          <div className="detail-row">
            <span>物模型</span>
            <b>{currentItem?.modelName}</b>
          </div>
          <div className="detail-row">
            <span>通信协议</span>
            <Tag className={`proto-tag proto-${currentItem?.protocol ?? 'mqtt'}`}>
              {currentItem?.protocol?.toUpperCase() ?? '--'}
            </Tag>
          </div>
          <div className="detail-row">
            <span>创建时间</span>
            <b>{currentItem?.createdAt}</b>
          </div>
        </Space>
      </Modal>
    </section>
  )
}
