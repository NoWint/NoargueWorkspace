/**
 * HomeTabs - 首页三栏视图组件
 *
 * Tab 1: "全部待办" — 个人待办列表（不含组合内的待办）
 * Tab 2: "我的组合" — 个人组合及其待办分组展示
 * Tab 3: "共享组合" — 已加入的共享组合列表
 *
 * 每个 Tab 的头部 "+" 按钮根据当前 Tab 导航到不同页面：
 * - 全部待办 → /todo/add
 * - 我的组合 → /combos/new
 * - 共享组合 → /collab/join
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Tabs, Button, Tag, Radio, Space } from 'antd';
import {
  PlusOutlined,
  FilterOutlined,
  ClearOutlined,
  FolderOpenOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTodoStore } from '@/stores/todoStore';
import { useComboStore } from '@/stores/comboStore';
import { useTagStore } from '@/stores/tagStore';
import { useDeviceType } from '@/hooks/useMediaQuery';
import TodoCard from '@/components/business/TodoCard/TodoCard';
import TodoListItem from '@/components/business/TodoListItem/TodoListItem';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton/LoadingSkeleton';
import { getTagColorById } from '@/styles/themes/tagColors';
import type { Todo } from '@/types/todo';
import styles from './TodoList.module.css';

/** Tab 配置 */
const TABS = [
  { key: 'todos', label: '全部待办' },
  { key: 'myCombos', label: '我的组合' },
  { key: 'sharedCombos', label: '共享组合' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/** 优先级筛选选项 */
const PRIORITY_OPTIONS = [
  { label: '全部', value: '' },
  { label: 'P1', value: 'p1' },
  { label: 'P2', value: 'p2' },
  { label: 'P3', value: 'p3' },
  { label: 'P4', value: 'p4' },
];

/**
 * 首页三栏视图组件
 */
const HomeTabs: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useDeviceType();

  // ========== Store 数据 ==========
  const todos = useTodoStore((s) => s.todos);
  const filteredTodos = useTodoStore((s) => s.filteredTodos);
  const isLoading = useTodoStore((s) => s.isLoading);
  const toggleComplete = useTodoStore((s) => s.toggleComplete);
  const toggleStar = useTodoStore((s) => s.toggleStar);
  const deleteTodo = useTodoStore((s) => s.deleteTodo);

  const combos = useComboStore((s) => s.combos);
  const sharedCombos = useComboStore((s) => s.sharedCombos);
  const fetchSharedCombos = useComboStore((s) => s.fetchSharedCombos);

  const allTags = useTagStore((s) => [...s.systemTags, ...s.userTags]);

  // ========== 本地状态 ==========
  const [activeTab, setActiveTab] = useState<TabKey>('todos');
  const [showFilter, setShowFilter] = useState(false);
  const [activeStatus, setActiveStatus] = useState<'all' | 'completed' | 'uncompleted'>('all');
  const [activePriority, setActivePriority] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [untaggedOnly, setUntaggedOnly] = useState(false);
  const [sharedCombosLoading, setSharedCombosLoading] = useState(false);

  // ========== 共享组合懒加载 ==========
  useEffect(() => {
    if (activeTab === 'sharedCombos') {
      setSharedCombosLoading(true);
      fetchSharedCombos()
        .catch(console.error)
        .finally(() => setSharedCombosLoading(false));
    }
  }, [activeTab, fetchSharedCombos]);

  // ========== 客户端筛选逻辑（仅过滤无组合的待办） ==========
  const displayTodos = useMemo(() => {
    let result = filteredTodos.filter((t) => t.comboId == null);

    if (activeStatus === 'completed') {
      result = result.filter((t) => t.completed !== false && t.completed !== 0);
    } else if (activeStatus === 'uncompleted') {
      result = result.filter((t) => t.completed === false || t.completed === 0);
    }

    if (activePriority) {
      result = result.filter((t) => t.priority === activePriority);
    }

    if (selectedTagIds.length > 0) {
      result = result.filter((t) => {
        if (!t.tags || t.tags.length === 0) return false;
        return selectedTagIds.every((id) => t.tags.includes(id));
      });
    }

    if (untaggedOnly) {
      result = result.filter((t) => !t.tags || t.tags.length === 0);
    }

    return result;
  }, [filteredTodos, activeStatus, activePriority, selectedTagIds, untaggedOnly]);

  // ========== 个人组合分组 ==========
  const comboGroups = useMemo(() => {
    return combos.map((combo) => ({
      combo,
      items: todos.filter((t) => Number(t.comboId) === combo.id),
    }));
  }, [combos, todos]);

  // ========== 回调处理 ==========
  const hasActiveFilters = activeStatus !== 'all' || activePriority !== '' || selectedTagIds.length > 0 || untaggedOnly;

  const clearFilters = useCallback(() => {
    setActiveStatus('all');
    setActivePriority('');
    setSelectedTagIds([]);
    setUntaggedOnly(false);
  }, []);

  const handleToggleTag = useCallback((tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const handleToggleComplete = useCallback(
    (id: string) => {
      toggleComplete(id).catch(console.error);
    },
    [toggleComplete]
  );

  const handleStarToggle = useCallback(
    (id: string) => {
      toggleStar(id).catch(console.error);
    },
    [toggleStar]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteTodo(id).catch(console.error);
    },
    [deleteTodo]
  );

  const handleEdit = useCallback(
    (todo: Todo) => {
      navigate(`/todo/${todo.id}/edit`);
    },
    [navigate]
  );

  // ========== FAB 按钮 ==========
  const fabButton = useMemo(() => {
    let path = '/todo/add';
    if (activeTab === 'myCombos') path = '/combos/new';
    else if (activeTab === 'sharedCombos') path = '/collab/join';

    return (
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => navigate(path)}
        style={{ backgroundColor: '#00b26a' }}
      >
        添加
      </Button>
    );
  }, [activeTab, navigate]);

  // ========== Tab 1: 全部待办 ==========
  const renderTodosTab = () => {
    if (isLoading && todos.length === 0) {
      return <LoadingSkeleton type="todo" count={4} />;
    }

    return (
      <div>
        {/* 筛选切换按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Button
            size="small"
            icon={<FilterOutlined />}
            onClick={() => setShowFilter((v) => !v)}
            type={showFilter ? 'primary' : 'default'}
          >
            {showFilter ? '收起筛选' : '筛选'}
          </Button>
          {hasActiveFilters && (
            <Button size="small" icon={<ClearOutlined />} onClick={clearFilters}>
              清除筛选
            </Button>
          )}
        </div>

        {/* 筛选面板 */}
        {showFilter && (
          <div
            style={{
              padding: 16,
              marginBottom: 16,
              background: 'var(--bg-secondary, #fafafa)',
              borderRadius: 8,
              border: '1px solid var(--border-color, #f0f0f0)',
            }}
          >
            {/* 状态筛选 */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 6, fontWeight: 500 }}>状态</div>
              <Radio.Group
                value={activeStatus}
                onChange={(e) => setActiveStatus(e.target.value)}
                size="small"
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="all">全部</Radio.Button>
                <Radio.Button value="uncompleted">未完成</Radio.Button>
                <Radio.Button value="completed">已完成</Radio.Button>
              </Radio.Group>
            </div>

            {/* 优先级筛选 */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 6, fontWeight: 500 }}>优先级</div>
              <Radio.Group
                value={activePriority}
                onChange={(e) => setActivePriority(e.target.value)}
                size="small"
                optionType="button"
                buttonStyle="solid"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <Radio.Button key={opt.value} value={opt.value}>
                    {opt.label}
                  </Radio.Button>
                ))}
              </Radio.Group>
            </div>

            {/* 标签筛选 */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 6, fontWeight: 500 }}>标签</div>
              <Space wrap size={[4, 4]}>
                {allTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  const tagColor = getTagColorById(tag.id);
                  return (
                    <Tag
                      key={tag.id}
                      color={isSelected ? tagColor.color : undefined}
                      style={{
                        cursor: 'pointer',
                        borderColor: isSelected ? tagColor.color : tagColor.borderColor,
                        background: isSelected ? tagColor.color : tagColor.bgColor,
                        color: isSelected ? '#fff' : tagColor.color,
                        fontSize: 12,
                      }}
                      onClick={() => handleToggleTag(tag.id)}
                    >
                      {tag.name}
                    </Tag>
                  );
                })}
                <Tag
                  style={{
                    cursor: 'pointer',
                    borderStyle: 'dashed',
                    borderColor: untaggedOnly ? '#00b26a' : '#d9d9d9',
                    background: untaggedOnly ? 'rgba(0, 178, 106, 0.08)' : undefined,
                    color: untaggedOnly ? '#00b26a' : '#666',
                    fontSize: 12,
                  }}
                  onClick={() => setUntaggedOnly((v) => !v)}
                >
                  无标签
                </Tag>
              </Space>
            </div>
          </div>
        )}

        {/* 待办列表 */}
        {displayTodos.length === 0 ? (
          <EmptyState
            description={hasActiveFilters ? '没有符合条件的待办事项' : '暂无待办事项'}
            action={
              !hasActiveFilters ? (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/todo/add')}
                  style={{ backgroundColor: '#00b26a' }}
                >
                  创建第一个待办
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {!isMobile ? (
              <div className={styles.todoGrid}>
                {displayTodos.map((todo) => (
                  <div
                    key={todo.id}
                    onClick={() => navigate(`/todo/${todo.id}`)}
                    className={styles.gridItem}
                  >
                    <TodoCard
                      todo={todo}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggle={handleToggleComplete}
                      onStarToggle={handleStarToggle}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.mobileList}>
                {displayTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className={styles.mobileItem}
                    onClick={() => navigate(`/todo/${todo.id}`)}
                  >
                    <TodoListItem
                      todo={todo}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggle={handleToggleComplete}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ========== Tab 2: 我的组合 ==========
  const renderMyCombosTab = () => {
    if (isLoading && combos.length === 0) {
      return <LoadingSkeleton type="todo" count={3} />;
    }

    if (combos.length === 0) {
      return (
        <EmptyState
          description="暂无组合"
          action={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/combos/new')}
              style={{ backgroundColor: '#00b26a' }}
            >
              创建组合
            </Button>
          }
        />
      );
    }

    return (
      <div>
        {comboGroups.map(({ combo, items }) => (
          <div key={combo.id} className={styles.comboSection} style={{ marginBottom: 24 }}>
            {/* 组合头部 */}
            <div className={styles.comboSectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Space>
                <FolderOpenOutlined style={{ color: combo.color || '#00b26a' }} />
                <span style={{ fontWeight: 600, fontSize: 15 }}>{combo.name}</span>
                <Tag style={{ fontSize: 11 }}>{items.length} 项</Tag>
              </Space>
              <Button type="link" size="small" onClick={() => navigate(`/combos/${combo.id}`)}>
                查看详情
              </Button>
            </div>

            {/* 组合内的待办 */}
            {items.length === 0 ? (
              <div style={{ padding: '12px 0', color: '#999', fontSize: 13, textAlign: 'center' }}>
                该组合暂无待办事项
              </div>
            ) : (
              <>
                {!isMobile ? (
                  <div className={styles.todoGrid}>
                    {items.map((todo) => (
                      <div
                        key={todo.id}
                        onClick={() => navigate(`/todo/${todo.id}`)}
                        className={styles.gridItem}
                      >
                        <TodoCard
                          todo={todo}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onToggle={handleToggleComplete}
                          onStarToggle={handleStarToggle}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.mobileList}>
                    {items.map((todo) => (
                      <div
                        key={todo.id}
                        className={styles.mobileItem}
                        onClick={() => navigate(`/todo/${todo.id}`)}
                      >
                        <TodoListItem
                          todo={todo}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onToggle={handleToggleComplete}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ========== Tab 3: 共享组合 ==========
  const renderSharedCombosTab = () => {
    if (sharedCombosLoading) {
      return <LoadingSkeleton type="todo" count={3} />;
    }

    if (sharedCombos.length === 0) {
      return (
        <EmptyState
          description="暂无共享组合"
          action={
            <Button
              type="primary"
              icon={<TeamOutlined />}
              onClick={() => navigate('/collab/join')}
              style={{ backgroundColor: '#00b26a' }}
            >
              加入共享组合
            </Button>
          }
        />
      );
    }

    return (
      <div>
        {sharedCombos.map((combo) => (
          <div
            key={combo.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              marginBottom: 8,
              borderRadius: 8,
              border: '1px solid var(--border-color, #f0f0f0)',
              background: 'var(--card-bg, #fff)',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s',
            }}
            onClick={() => navigate(`/combos/${combo.id}`)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <Space>
              <TeamOutlined style={{ color: combo.color || '#00b26a', fontSize: 18 }} />
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{combo.name}</div>
                {combo.share_code && (
                  <div style={{ fontSize: 12, color: '#999' }}>邀请码: {combo.share_code}</div>
                )}
              </div>
            </Space>
            <Button type="link" size="small">
              查看详情
            </Button>
          </div>
        ))}
      </div>
    );
  };

  // ========== 主渲染 ==========
  return (
    <div className={styles.homeTabs}>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        items={TABS.map((tab) => ({
          key: tab.key,
          label: tab.label,
          children: (
            <div>
              {tab.key === 'todos' && renderTodosTab()}
              {tab.key === 'myCombos' && renderMyCombosTab()}
              {tab.key === 'sharedCombos' && renderSharedCombosTab()}
            </div>
          ),
        }))}
        tabBarExtraContent={fabButton}
        size="small"
      />
    </div>
  );
};

export default HomeTabs;
