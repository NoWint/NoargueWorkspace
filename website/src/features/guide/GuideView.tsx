import { useState } from 'react'
import { Card, Eyebrow } from '@/design/primitives'
import {
  PlusIcon,
  ListIcon,
  CheckIcon,
  StarIcon,
} from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './GuideView.module.css'

interface GuideSection {
  id: string
  title: string
  eyebrow: string
  icon: 'basic' | 'combo' | 'checkin' | 'community'
  summary: string
  items: { head: string; body: string }[]
}

const SECTIONS: GuideSection[] = [
  {
    id: 'basic',
    title: '基本操作',
    eyebrow: 'BASIC',
    icon: 'basic',
    summary: '待办的创建、编辑、完成与删除',
    items: [
      {
        head: '创建待办',
        body: '在首页点击右下角的加号按钮，填写待办内容、日期、时间。可选添加备注、位置、标签和所属组合。',
      },
      {
        head: '编辑与完成',
        body: '点击待办可进入详情页编辑。点击待办前的圆圈可标记完成或取消完成。完成的待办会显示完成状态。',
      },
      {
        head: '删除与恢复',
        body: '删除待办后会进入回收站，保留 30 天。在「更多 - 回收站」中可恢复或永久删除。',
      },
      {
        head: '收藏与搜索',
        body: '点击待办的星标可收藏重要事项，在收藏页快速查看。使用顶部搜索可按关键词查找待办。',
      },
    ],
  },
  {
    id: 'combo',
    title: '组合协作',
    eyebrow: 'COLLAB',
    icon: 'combo',
    summary: '组合归档、共享组合与多人协作',
    items: [
      {
        head: '创建组合',
        body: '在「组合」Tab 点击新建，设置名称、颜色、图标。组合相当于文件夹，可将待办归类管理。',
      },
      {
        head: '共享组合',
        body: '编辑组合时开启「共享组合」开关，生成邀请码或二维码。他人可通过邀请码或扫码加入。',
      },
      {
        head: '权限管理',
        body: '超管(owner)拥有最高权限；管理(admin)可创建待办、管理成员；成员(member)只能查看和完成分配的待办。',
      },
      {
        head: '待办分配',
        body: '在共享组合中创建待办时可选择「全员完成」或「指定成员」。超管/管理可设置某些成员免完成。',
      },
    ],
  },
  {
    id: 'checkin',
    title: '签到打卡',
    eyebrow: 'CHECK-IN',
    icon: 'checkin',
    summary: '每日完成待办，保持连续打卡',
    items: [
      {
        head: '连续打卡',
        body: '每天至少完成一个待办即可保持打卡连续。统计页会展示你的连续天数和完成率。',
      },
      {
        head: '日历视图',
        body: '日历页以月视图展示每日待办，有待办的日期会显示标记。点击日期可查看当天详情。',
      },
      {
        head: '数据统计',
        body: '统计页提供完成趋势、标签分布、组合分布等图表，支持按周、月、年切换查看范围。',
      },
      {
        head: '待办提醒',
        body: '为待办设置通知后，会在指定时间通过订阅消息提醒你，避免遗漏重要事项。',
      },
    ],
  },
  {
    id: 'community',
    title: '社区与数据',
    eyebrow: 'COMMUNITY',
    icon: 'community',
    summary: '数据管理、每日激励与致谢',
    items: [
      {
        head: '数据导入导出',
        body: '在「更多 - 数据管理」中可导出待办数据为文件备份，也可从备份文件导入恢复。',
      },
      {
        head: '云同步',
        body: '登录后数据会自动云同步，支持多设备。采用增量同步技术，冲突时自动解决。',
      },
      {
        head: '每日激励',
        body: '「更多 - 每日激励」提供每日励志语录，为你注入前行的动力。',
      },
      {
        head: '致谢名单',
        body: '「更多 - 致谢」展示项目贡献者，感谢每一位为时光绿径付出的人。',
      },
    ],
  },
]

function SectionIcon({ name }: { name: GuideSection['icon'] }) {
  switch (name) {
    case 'basic':
      return <PlusIcon />
    case 'combo':
      return <ListIcon />
    case 'checkin':
      return <CheckIcon />
    case 'community':
      return <StarIcon />
    default:
      return <PlusIcon />
  }
}

export function GuideView() {
  const [open, setOpen] = useState<string>('basic')

  const toggle = (id: string) => {
    setOpen((prev) => (prev === id ? '' : id))
  }

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <CheckIcon />
            </div>
            <div>
              <Eyebrow>GUIDE</Eyebrow>
              <h1 className={styles.title}>
                使用 <span className={styles.song}>指南</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>{SECTIONS.length} 个章节</span>
            <span className={styles.sep}>·</span>
            <span>点击展开查看详情</span>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className={styles.sections}>
        {SECTIONS.map((section) => {
          const isOpen = open === section.id
          return (
            <Card key={section.id}>
              <button
                type="button"
                className={styles.sectionHead}
                onClick={() => toggle(section.id)}
              >
                <div className={styles.sectionHeadL}>
                  <div className={styles.hdIc}>
                    <SectionIcon name={section.icon} />
                  </div>
                  <div>
                    <Eyebrow>{section.eyebrow}</Eyebrow>
                    <h3 className={styles.sectionTitle}>
                      {section.title}
                    </h3>
                    <div className={styles.sectionSummary}>
                      {section.summary}
                    </div>
                  </div>
                </div>
                <span className={cn(styles.chevron, isOpen && styles.chevronOpen)}>
                  ↓
                </span>
              </button>

              {isOpen && (
                <div className={styles.sectionBody}>
                  {section.items.map((item, idx) => (
                    <div key={idx} className={styles.guideItem}>
                      <div className={styles.guideIdx}>{String(idx + 1).padStart(2, '0')}</div>
                      <div className={styles.guideMain}>
                        <div className={styles.guideHead}>{item.head}</div>
                        <div className={styles.guideBody}>{item.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
