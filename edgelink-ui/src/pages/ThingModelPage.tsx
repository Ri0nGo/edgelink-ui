import {
  DeploymentUnitOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { Button, Input, Pagination, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { fetchThingModelList } from '../services/thingModelService'
import type { ThingModelItem } from '../types/thingModel'

const PAGE_SIZE = 10

const iconTone = ['blue', 'green', 'orange', 'red', 'purple'] as const

export function ThingModelPage() {
  const [keywordInput, setKeywordInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [pageNum, setPageNum] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<ThingModelItem[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadList() {
      setLoading(true)
      try {
        const result = await fetchThingModelList({
          pageNum,
          pageSize: PAGE_SIZE,
          keyword: searchKeyword,
        })

        if (!cancelled) {
          setDataSource(result.list)
          setTotal(result.total)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadList()
    return () => {
      cancelled = true
    }
  }, [pageNum, searchKeyword])

  const columns = useMemo<ColumnsType<ThingModelItem>>(
    () => [
      {
        title: '模型名称',
        dataIndex: 'name',
        key: 'name',
        width: 280,
        render: (_value, record, index) => (
          <Space size={12}>
            <span className={`thing-model-icon tone-${iconTone[index % iconTone.length]}`}>
              <DeploymentUnitOutlined />
            </span>
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
        render: (identifier: string) => (
          <Tag className="thing-model-id-tag" bordered={false}>
            {identifier}
          </Tag>
        ),
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        width: 280,
        ellipsis: true,
      },
      {
        title: '属性数',
        dataIndex: 'propertyCount',
        key: 'propertyCount',
        width: 110,
        render: (value: number) => <span className="property-count-pill">{value}</span>,
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
        width: 200,
        render: (_value, record) => (
          <Space size={8}>
            <Button
              size="small"
              className="thing-action-btn"
              onClick={() => console.log('thing-model detail', record)}
            >
              详情
            </Button>
            <Button
              size="small"
              className="thing-action-btn"
              onClick={() => console.log('thing-model edit', record)}
            >
              编辑
            </Button>
            <Button
              size="small"
              className="thing-action-btn thing-action-btn-danger"
              onClick={() => console.log('thing-model delete', record)}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [],
  )

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
          onPressEnter={() => {
            setPageNum(1)
            setSearchKeyword(keywordInput.trim())
          }}
        />
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          className="thing-add-btn"
          onClick={() => console.log('add thing model')}
        >
          添加物模型
        </Button>
      </div>

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
    </section>
  )
}
