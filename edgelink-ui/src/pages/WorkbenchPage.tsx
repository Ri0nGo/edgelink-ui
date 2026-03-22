import {
  AlertOutlined,
  AreaChartOutlined,
  DashboardOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import { Card, Col, Progress, Row, Space, Statistic, Tag, Typography } from 'antd'

const statItems = [
  {
    title: '在线设备',
    value: 1085,
    suffix: '台',
    icon: <DashboardOutlined />,
    trend: '今日新增 +23',
  },
  {
    title: '离线告警',
    value: 3,
    suffix: '条',
    icon: <AlertOutlined />,
    trend: '需立即处理',
  },
  {
    title: '数据完整率',
    value: 98,
    suffix: '%',
    icon: <AreaChartOutlined />,
    trend: '较昨日 +0.3%',
  },
  {
    title: '今日消息量',
    value: 4.2,
    suffix: 'M',
    icon: <MessageOutlined />,
    trend: '较昨日 +12%',
  },
]

const alerts = [
  { level: 'error', message: '设备 DEV-2024-142 连接超时', meta: '14:10:32 · 智能电表-M12' },
  { level: 'error', message: '设备 DEV-2024-401 断线 5 小时', meta: '09:15:44 · 压力传感器-P02' },
  { level: 'warning', message: '仓储温湿度超阈值告警', meta: '13:48:01 · DEV-2024-001' },
  { level: 'default', message: '固件升级完成，版本 v3.1.2', meta: '12:00:00 · 边缘网关-G03' },
] as const

export function WorkbenchPage() {
  return (
    <section className="workbench-page">
      <div>
        <Typography.Title level={3} className="page-title">
          工作台
        </Typography.Title>
        <Typography.Text type="secondary">实时概览 EdgeLink IoT 平台运行态势</Typography.Text>
      </div>

      <Row gutter={[12, 12]}>
        {statItems.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.title}>
            <Card className="wb-stat-card" bordered={false}>
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                <Space className="wb-stat-head">
                  <span className="wb-stat-icon">{item.icon}</span>
                  <Typography.Text>{item.title}</Typography.Text>
                </Space>
                <Statistic value={item.value} suffix={item.suffix} valueStyle={{ fontSize: 30 }} />
                <Typography.Text type="secondary" className="wb-stat-trend">
                  {item.trend}
                </Typography.Text>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} xl={12}>
          <Card title="消息吞吐量" extra={<Tag color="green">实时</Tag>} className="wb-panel-card">
            <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 6 }}>
              4,823 <Typography.Text type="secondary">msg/s</Typography.Text>
            </Typography.Title>
            <Typography.Text type="success">较昨日均值 +8.3%</Typography.Text>
            <Progress percent={78} showInfo={false} strokeColor="#2563eb" style={{ marginTop: 18 }} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="设备类型分布" className="wb-panel-card">
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <div className="wb-dist-row">
                <span>传感器</span>
                <Tag color="blue">42%</Tag>
              </div>
              <div className="wb-dist-row">
                <span>网关设备</span>
                <Tag color="cyan">28%</Tag>
              </div>
              <div className="wb-dist-row">
                <span>控制器</span>
                <Tag color="gold">18%</Tag>
              </div>
              <div className="wb-dist-row">
                <span>其他</span>
                <Tag>12%</Tag>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={24}>
          <Card title="近期告警" className="wb-panel-card">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {alerts.map((alert) => (
                <div className="wb-alert-item" key={`${alert.message}-${alert.meta}`}>
                  <Tag color={alert.level === 'default' ? 'default' : alert.level}>
                    {alert.level === 'error' ? '严重' : alert.level === 'warning' ? '警告' : '通知'}
                  </Tag>
                  <div>
                    <Typography.Text>{alert.message}</Typography.Text>
                    <div className="wb-alert-meta">{alert.meta}</div>
                  </div>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </section>
  )
}
