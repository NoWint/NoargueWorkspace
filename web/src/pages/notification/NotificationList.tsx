import React, { useEffect, useState } from 'react';
import { Card, List, Button, message, Popconfirm, Empty, Spin, Tag, Space } from 'antd';
import { BellOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { notifyApi } from '@/services/modules/notifyApi';
import type { NotifyItem } from '@/services/api/types';

const NotificationList: React.FC = () => {
  const [list, setList] = useState<NotifyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await notifyApi.getList();
      setList(res.list || []);
    } catch {
      message.error('获取通知列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const handleCancel = async (id: number) => {
    try {
      await notifyApi.cancel(id);
      message.success('通知已撤销');
      setList(prev => prev.filter(n => n.id !== id));
    } catch {
      message.error('撤销通知失败');
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <Card title={<><BellOutlined /> 我的通知</>}>
        {list.length === 0 ? (
          <Empty description="暂无通知" />
        ) : (
          <List
            dataSource={list}
            renderItem={item => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="cancel"
                    title="确定撤销此通知？"
                    onConfirm={() => handleCancel(item.id)}
                  >
                    <Button type="link" danger icon={<CloseCircleOutlined />}>撤销</Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{item.todoText || `待办 #${item.todoId}`}</span>
                      <Tag>{item.date || '每天'} {item.notifyTime}</Tag>
                    </Space>
                  }
                  description={item.message}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default NotificationList;
