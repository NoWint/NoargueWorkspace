/**
 * 顶部导航栏组件
 *
 * 固定顶部的应用头部，包含：
 * - 左侧：折叠/展开按钮（仅桌面端）+ Logo/应用名称
 * - 中间：搜索框（移动端隐藏或缩小）
 * - 右侧：主题切换 + 用户头像/登录按钮
 *
 * 响应式设计：
 * - 桌面端：高度 64px，显示完整内容
 * - 移动端：高度 56px，简化显示
 */

import React, { memo, useCallback } from 'react';
import { Input, Button, Avatar, Dropdown, Drawer } from 'antd';
import type { MenuProps } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  HomeOutlined,
  CalendarOutlined,
  BarChartOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { useDeviceType } from '@/hooks/useMediaQuery';
import { useAuth } from '@/hooks/useAuth';
import ThemeToggle from '@/components/ui/ThemeToggle/ThemeToggle';
import styles from './Header.module.css';

/**
 * 顶部导航栏组件
 */
const Header: React.FC = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { isMobile } = useDeviceType();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  /**
   * 判断指定路径是否为当前激活的菜单项
   */
  const isActivePath = useCallback(
    (path: string): boolean => {
      if (path === '/') {
        return location.pathname === '/';
      }
      return location.pathname.startsWith(path);
    },
    [location.pathname]
  );

  /**
   * 处理搜索
   */
  const handleSearch = useCallback(
    (value: string) => {
      if (value.trim()) {
        navigate(`/search?q=${encodeURIComponent(value.trim())}`);
      }
    },
    [navigate]
  );

  /**
   * 跳转到登录页
   */
  const handleLogin = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  /**
   * 用户下拉菜单配置
   */
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/user-center'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: logout,
    },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        {/* 折叠/展开按钮 - 桌面端控制侧边栏，移动端打开抽屉菜单 */}
        <button
          className={styles.collapseButton}
          onClick={() => {
            if (isMobile) {
              setMobileMenuOpen(true);
            } else {
              toggleSidebar();
            }
          }}
          aria-label={isMobile ? '打开菜单' : (sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏')}
          type="button"
        >
          {isMobile ? <MenuUnfoldOutlined /> : (sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
        </button>

        {/* Logo 和应用名称 */}
        <div className={styles.brand} onClick={() => navigate('/')}>
          <span className={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="2" />
              <path d="M9 14L12 17L19 10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className={styles.brandText}>时光绿径待办</span>
        </div>
      </div>

      {/* 中间搜索框 */}
      <div className={styles.headerCenter}>
        <Input.Search
          placeholder="搜索待办事项..."
          allowClear
          onSearch={handleSearch}
          className={styles.searchBox}
          prefix={<SearchOutlined className={styles.searchIcon} />}
        />
      </div>

      {/* 右侧操作区 */}
      <div className={styles.headerRight}>
        {/* 主题切换 */}
        <ThemeToggle />

        {/* 用户区域 */}
        {isAuthenticated && user ? (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <div className={styles.userAvatarWrapper}>
              <Avatar
                size={isMobile ? 32 : 36}
                src={user.avatar}
                icon={<UserOutlined />}
                className={styles.avatar}
              />
            </div>
          </Dropdown>
        ) : (
          <Button type="primary" size={isMobile ? 'small' : 'middle'} onClick={handleLogin} className={styles.loginButton}>
            登录
          </Button>
        )}
      </div>

      {/* 移动端抽屉菜单 */}
      <Drawer
        title={null}
        placement="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        width={260}
        styles={{ body: { padding: 0 } }}
        className={styles.drawerBody}
      >
        <div className={styles.menuContainer}>
          {[
            { key: 'home', icon: <HomeOutlined />, label: '首页', path: '/' },
            { key: 'calendar', icon: <CalendarOutlined />, label: '日历', path: '/calendar' },
            { key: 'stats', icon: <BarChartOutlined />, label: '统计', path: '/stats' },
            { key: 'user-center', icon: <UserOutlined />, label: '我的', path: '/user-center' },
            { key: 'divider1', type: 'divider' as const },
            { key: 'combos', icon: <AppstoreOutlined />, label: '组合管理', path: '/combos' },
            { key: 'tags', icon: <SettingOutlined />, label: '标签管理', path: '/tags' },
          ].map((item) =>
            'type' in item ? (
              <div key={item.key} className={styles.menuDivider} />
            ) : (
              <div
                key={item.key}
                className={`${styles.menuItem} ${isActivePath(item.path) ? styles.menuItemActive : ''}`}
                onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
              >
                <span className={styles.menuItemIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            )
          )}
        </div>
      </Drawer>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
