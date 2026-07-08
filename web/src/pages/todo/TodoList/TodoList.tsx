/**
 * TodoList - 待办列表页（首页）
 *
 * 功能：
 * - 顶部统计概览：总待办数、已完成、未完成、完成率
 * - 三栏视图：全部待办 / 我的组合 / 共享组合
 * - 进入页面自动调用 fetchTodos()
 */

import React, { useEffect } from 'react';
import {
  Card,
  Statistic,
  Progress,
  Row,
  Col,
} from 'antd';
import {
  UnorderedListOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useTodoStore } from '@/stores/todoStore';
import { useComboStore } from '@/stores/comboStore';
import { useTagStore } from '@/stores/tagStore';
import { useDeviceType } from '@/hooks/useMediaQuery';
import HomeTabs from './HomeTabs';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton/LoadingSkeleton';
import styles from './TodoList.module.css';

/**
 * 待办列表页面组件
 *
 * 首页核心组件，展示待办事项的统计概览和三栏视图。
 */
const TodoList: React.FC = () => {
  const { isMobile } = useDeviceType();

  // Store 数据
  const todos = useTodoStore((s) => s.todos);
  const isLoading = useTodoStore((s) => s.isLoading);
  const fetchTodos = useTodoStore((s) => s.fetchTodos);
  const fetchCombos = useComboStore((s) => s.fetchCombos);
  const fetchAllTags = useTagStore((s) => s.fetchAllTags);

  // 初始化数据
  useEffect(() => {
    fetchTodos().catch(console.error);
    fetchCombos().catch(console.error);
    fetchAllTags().catch(console.error);
  }, [fetchTodos, fetchCombos, fetchAllTags]);

  // 统计数据
  const all = todos.length;
  const completed = todos.filter((t) => t.completed !== false && t.completed !== 0).length;
  const uncompleted = all - completed;
  const completionRate = all > 0 ? Math.round((completed / all) * 100) : 0;

  // 加载状态
  if (isLoading && todos.length === 0) {
    return (
      <div className={styles.pageContainer}>
        <LoadingSkeleton type="todo" count={6} />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* ========== 顶部统计概览 ========== */}
      <Row gutter={[16, 16]} className={styles.statsSection}>
        <Col xs={12} sm={6}>
          <Card size="small" className={styles.statCard}>
            <Statistic
              title="总待办"
              value={all}
              prefix={<UnorderedListOutlined />}
              valueStyle={{ color: '#00b26a', fontSize: isMobile ? 20 : 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className={styles.statCard}>
            <Statistic
              title="已完成"
              value={completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: isMobile ? 20 : 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className={styles.statCard}>
            <Statistic
              title="未完成"
              value={uncompleted}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14', fontSize: isMobile ? 20 : 24 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small" className={styles.statCard}>
            <div className={styles.progressWrapper}>
              <span className={styles.progressLabel}>完成率</span>
              <Progress
                percent={completionRate}
                strokeColor="#00b26a"
                size={isMobile ? 'default' : 'small'}
                format={(percent) => `${percent}%`}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* ========== 三栏视图 ========== */}
      <HomeTabs />
    </div>
  );
};

export default TodoList;
