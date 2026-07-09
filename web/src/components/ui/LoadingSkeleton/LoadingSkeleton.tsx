/**
 * LoadingSkeleton - 骨架屏加载组件
 *
 * 功能：
 * - 根据 type 显示不同形状的骨架屏
 * - todo: 模拟待办卡片形状（复选框 + 文本行）
 * - combo: 模拟组合卡片形状
 * - chart: 模拟图表区域
 * - detail: 模拟详情页布局
 * - shimmer 动画效果
 * - count 控制显示数量
 */

import React, { memo } from 'react';
import styles from './LoadingSkeleton.module.css';

export interface LoadingSkeletonProps {
  /** 骨架屏类型 */
  type?: 'todo' | 'combo' | 'chart' | 'detail' | 'stats';
  /** 显示数量，默认 3 */
  count?: number;
}

/**
 * 骨架屏加载组件
 *
 * 根据不同业务场景渲染对应形状的骨架屏，
 * 配合 shimmer 动画提供良好的加载体验。
 */
const LoadingSkeleton: React.FC<LoadingSkeletonProps> = memo(({
  type = 'todo',
  count = 3,
}) => {
  const renderItems = (): React.ReactNode[] => {
    const items: React.ReactNode[] = [];

    for (let i = 0; i < count; i++) {
      items.push(
        <div key={i} className={`${styles.skeletonItem} ${styles[type]}`}>
          {type === 'todo' && renderTodoSkeleton()}
          {type === 'combo' && renderComboSkeleton()}
          {type === 'chart' && renderChartSkeleton()}
          {type === 'detail' && renderDetailSkeleton()}
        </div>
      );
    }

    return items;
  };

  return (
    <div className={styles.wrapper} aria-label="加载中，请稍候" role="status">
      {renderItems()}
    </div>
  );
});

// ==================== 各类型骨架屏渲染函数 ====================

/** 待办卡片骨架屏 */
function renderTodoSkeleton(): React.ReactNode {
  return (
    <>
      {/* 复选框 + 内容区 */}
      <div className={styles.todoLayout}>
        <div className={styles.checkboxShimmer} />

        <div className={styles.todoContent}>
          {/* 标题行 */}
          <div className={styles.textLineLong} />

          {/* 元信息行 */}
          <div className={styles.metaRow}>
            <div className={styles.textShort} />
            <div className={styles.textShort} />
          </div>

          {/* 标签行 */}
          <div className={styles.tagsRow}>
            <div className={styles.tagPill} />
            <div className={styles.tagPill} />
            <div className={styles.tagPillSmall} />
          </div>
        </div>
      </div>
    </>
  );
}

/** 组合卡片骨架屏 */
function renderComboSkeleton(): React.ReactNode {
  return (
    <>
      <div className={styles.comboColorBar} />
      <div className={styles.comboContent}>
        <div className={styles.comboHeader}>
          <div className={styles.comboIconShimmer} />
          <div className={styles.comboNameShimmer} />
        </div>
        <div className={styles.comboFooter}>
          <div className={styles.badgeShimmer} />
          <div className={styles.labelShimmer} />
        </div>
      </div>
    </>
  );
}

/** 图表区域骨架屏 */
function renderChartSkeleton(): React.ReactNode {
  return (
    <div className={styles.chartArea}>
      {/* 图表标题 */}
      <div className={styles.chartTitle} />

      {/* Y轴 + 图表主体 */}
      <div className={styles.chartBody}>
        <div className={styles.yAxis} />
        <div className={styles.chartGrid}>
          {/* 柱状模拟 */}
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className={styles.barColumn}
              style={{ height: `${40 + Math.random() * 50}%` }}
            />
          ))}
        </div>
      </div>

      {/* X轴标签 */}
      <div className={styles.xAxisLabels}>
        {[...Array(7)].map((_, i) => (
          <div key={i} className={styles.xLabel} />
        ))}
      </div>
    </div>
  );
}

/** 详情页骨架屏 */
function renderDetailSkeleton(): React.ReactNode {
  return (
    <div className={styles.detailArea}>
      {/* 大标题 */}
      <div className={styles.detailTitle} />

      {/* 元信息行 */}
      <div className={styles.detailMetaRow}>
        <div className={styles.metaChip} />
        <div className={styles.metaChip} />
        <div className={styles.metaChip} />
      </div>

      {/* 分隔线 */}
      <div className={styles.detailDivider} />

      {/* 正文段落 */}
      <div className={styles.detailParagraph}>
        <div className={styles.textLineFull} />
        <div className={styles.textLineFull} />
        <div className={styles.textLineMedium} />
      </div>

      {/* 底部操作栏 */}
      <div className={styles.detailActions}>
        <div className={styles.btnShimmer} />
        <div className={styles.btnShimmer} />
        <div className={styles.btnShimmerLong} />
      </div>
    </div>
  );
}

LoadingSkeleton.displayName = 'LoadingSkeleton';

export default LoadingSkeleton;
