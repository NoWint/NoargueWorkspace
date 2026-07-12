import { useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { useTagStore } from '@/stores/tags'
import { Card, Eyebrow, Stat } from '@/design/primitives'
import { ChartIcon, TagIcon, ListIcon, ClockIcon } from '@/design/icons'
import { cn, formatDate } from '@/lib/utils'
import styles from './StatsView.module.css'

type Range = 'week' | 'month' | 'year'
const RANGE_LABELS: Record<Range, string> = {
  week: '本周',
  month: '本月',
  year: '全年',
}

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

// Dark theme chart constants
const AXIS_LABEL = '#6b6b6b'
const SPLIT_LINE = '#1a1a1a'
const SERIES = '#01796f'
const FG = '#fafafa'

function rangeDays(range: Range): number {
  if (range === 'week') return 7
  if (range === 'month') return 30
  return 365
}

/** Build list of last N date strings (YYYY-MM-DD), oldest first. */
function lastDates(n: number): string[] {
  const out: string[] = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const cur = new Date(d)
    cur.setDate(d.getDate() - i)
    out.push(formatDate(cur))
  }
  return out
}

function useChart<T>(option: echarts.EChartsCoreOption, deps: T[]) {
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    chartRef.current = echarts.init(el, null, { renderer: 'canvas' })
    chartRef.current.setOption(option)

    const onResize = () => chartRef.current?.resize()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      chartRef.current?.dispose()
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ref
}

export function StatsView() {
  const { todos, fetchTodos, loading } = useTodoStore()
  const { combos, fetchCombos } = useComboStore()
  const { systemTags, userTags, fetchTags } = useTagStore()
  const [range, setRange] = useState<Range>('week')

  useEffect(() => {
    fetchTodos()
    fetchCombos()
    fetchTags()
  }, [fetchTodos, fetchCombos, fetchTags])

  const activeTodos = useMemo(
    () => todos.filter((t) => !t.isDeleted),
    [todos],
  )

  // ---- Aggregate stats (over selected range) ----
  const stats = useMemo(() => {
    const days = rangeDays(range)
    const dates = new Set(lastDates(days))
    const inRange = activeTodos.filter((t) => !t.setDate || dates.has(t.setDate))
    const total = inRange.length
    const completed = inRange.filter((t) => t.completed).length
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0

    // Streak: consecutive days (ending today or yesterday) with a completed todo
    const completedDates = new Set(
      activeTodos.filter((t) => t.completed && t.setDate).map((t) => t.setDate!),
    )
    let streak = 0
    const d = new Date()
    if (!completedDates.has(formatDate(d))) d.setDate(d.getDate() - 1)
    while (completedDates.has(formatDate(d))) {
      streak++
      d.setDate(d.getDate() - 1)
    }
    return { total, completed, rate, streak }
  }, [activeTodos, range])

  // Sparkline data: last 30 days (for top stats)
  const sparkData = useMemo(() => {
    const days: string[] = []
    const d = new Date()
    for (let i = 29; i >= 0; i--) {
      const cur = new Date(d)
      cur.setDate(d.getDate() - i)
      days.push(formatDate(cur))
    }
    const dailyCompleted = days.map((date) =>
      activeTodos.filter((t) => t.setDate === date && t.completed).length,
    )
    const dailyRate = days.map((date) => {
      const dayTodos = activeTodos.filter((t) => t.setDate === date)
      if (dayTodos.length === 0) return 0
      return Math.round(
        (dayTodos.filter((t) => t.completed).length / dayTodos.length) * 100,
      )
    })
    const dailyTotal = days.map((date) =>
      activeTodos.filter((t) => t.setDate === date).length,
    )
    return { dailyCompleted, dailyRate, dailyTotal }
  }, [activeTodos])

  // ---- 1. Completion trend (line) ----
  const trendOption = useMemo(() => {
    const days = rangeDays(range)
    const dates = lastDates(days)
    const counts = dates.map(
      (date) =>
        activeTodos.filter((t) => t.completed && t.setDate === date).length,
    )
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 36, right: 16, top: 16, bottom: 28 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          color: AXIS_LABEL,
          fontSize: 10,
          interval: range === 'year' ? 29 : 'auto',
          formatter: (val: string) => val.slice(5),
        },
        axisLine: { lineStyle: { color: SPLIT_LINE } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: AXIS_LABEL, fontSize: 10 },
        splitLine: { lineStyle: { color: SPLIT_LINE } },
        axisLine: { show: false },
      },
      series: [
        {
          name: '已完成',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          data: counts,
          itemStyle: { color: SERIES },
          lineStyle: { color: SERIES, width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(1,121,111,0.28)' },
              { offset: 1, color: 'rgba(1,121,111,0)' },
            ]),
          },
        },
      ],
    } as echarts.EChartsCoreOption
  }, [activeTodos, range])

  // ---- 2. Tag distribution (doughnut) ----
  const tagOption = useMemo(() => {
    const allTags = [...systemTags, ...userTags]
    const data = allTags
      .map((t) => ({
        name: t.name,
        value: activeTodos.filter((todo) => todo.tags?.includes(t.id)).length,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
    const palette = [
      '#01796f', '#26a69a', '#4a9eff', '#eab308',
      '#62d178', '#9c6ade', '#ff6467', '#a1a1a1',
    ]
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        right: 0,
        top: 'center',
        textStyle: { color: AXIS_LABEL, fontSize: 10 },
        itemWidth: 8,
        itemHeight: 8,
      },
      series: [
        {
          type: 'pie',
          radius: ['42%', '68%'],
          center: ['38%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: '#141414', borderWidth: 2 },
          label: { show: false },
          labelLine: { show: false },
          data:
            data.length > 0
              ? data.map((d, i) => ({
                  ...d,
                  itemStyle: { color: palette[i % palette.length] },
                }))
              : [{ name: '无数据', value: 1, itemStyle: { color: '#1a1a1a' } }],
        },
      ],
    } as echarts.EChartsCoreOption
  }, [activeTodos, systemTags, userTags])

  // ---- 3. Combo distribution (bar) ----
  const comboOption = useMemo(() => {
    const data = combos
      .map((c) => ({
        name: c.name,
        value: activeTodos.filter((t) => t.comboId === c.id).length,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 36, right: 16, top: 16, bottom: 28 },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.name),
        axisLabel: { color: AXIS_LABEL, fontSize: 10, interval: 0, rotate: data.length > 6 ? 30 : 0 },
        axisLine: { lineStyle: { color: SPLIT_LINE } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: AXIS_LABEL, fontSize: 10 },
        splitLine: { lineStyle: { color: SPLIT_LINE } },
        axisLine: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: data.map((d) => d.value),
          barMaxWidth: 24,
          itemStyle: { color: SERIES },
        },
      ],
    } as echarts.EChartsCoreOption
  }, [activeTodos, combos])

  // ---- 4. Weekly completion (bar by weekday) ----
  const weeklyOption = useMemo(() => {
    // Aggregate all-time completion by weekday (Mon=0..Sun=6)
    const buckets = [0, 0, 0, 0, 0, 0, 0]
    activeTodos.forEach((t) => {
      if (t.completed && t.setDate) {
        const day = new Date(t.setDate).getDay()
        buckets[(day + 6) % 7]++
      }
    })
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 36, right: 16, top: 16, bottom: 28 },
      xAxis: {
        type: 'category',
        data: WEEKDAYS,
        axisLabel: { color: AXIS_LABEL, fontSize: 10 },
        axisLine: { lineStyle: { color: SPLIT_LINE } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: AXIS_LABEL, fontSize: 10 },
        splitLine: { lineStyle: { color: SPLIT_LINE } },
        axisLine: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: buckets.map((v, i) => ({
            value: v,
            itemStyle: { color: i === new Date().getDay() - 1 || (i === 6 && new Date().getDay() === 0) ? FG : SERIES },
          })),
          barMaxWidth: 28,
        },
      ],
    } as echarts.EChartsCoreOption
  }, [activeTodos])

  const trendRef = useChart(trendOption, [trendOption])
  const tagRef = useChart(tagOption, [tagOption])
  const comboRef = useChart(comboOption, [comboOption])
  const weeklyRef = useChart(weeklyOption, [weeklyOption])

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <ChartIcon />
            </div>
            <div>
              <Eyebrow>STATS</Eyebrow>
              <h1 className={styles.title}>
                数据 <span className={styles.song}>洞察</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>连续打卡 {stats.streak} 天</span>
            <span className={styles.sep}>·</span>
            <span>完成率 {stats.rate}%</span>
          </div>
        </div>
        <div className={styles.segWrap}>
          <div className={styles.seg}>
            {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                className={cn(styles.pill, range === r && styles.pillAct)}
                onClick={() => setRange(r)}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <Stat
          label="总待办"
          value={stats.total}
          delta="所选范围"
          spark={sparkData.dailyTotal}
        />
        <Stat
          label="已完成"
          value={stats.completed}
          accent
          delta={<span className={styles.deltaUp}>已完成</span>}
          spark={sparkData.dailyCompleted}
        />
        <Stat
          label="完成率"
          value={<>{stats.rate}<span className={styles.pctSign}>%</span></>}
          delta="目标 80%"
          spark={sparkData.dailyRate}
        />
        <Stat label="连续天数" value={stats.streak} accent delta="连续打卡" />
      </div>

      {/* Charts grid */}
      <div className={styles.grid}>
        {/* Completion trend */}
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <ChartIcon />
              </div>
              <div>
                <Eyebrow>TREND</Eyebrow>
                <h3 className={styles.cardTitle}>
                  完成 <span className={styles.song}>趋势</span>
                </h3>
              </div>
            </div>
          </div>
          <div ref={trendRef} className={styles.chartBox} />
          <div className={styles.cardFoot}>
            <span className={styles.footText}>
              {RANGE_LABELS[range]} · {rangeDays(range)} 天
            </span>
          </div>
        </Card>

        {/* Tag distribution */}
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <TagIcon />
              </div>
              <div>
                <Eyebrow>TAGS</Eyebrow>
                <h3 className={styles.cardTitle}>
                  标签 <span className={styles.song}>分布</span>
                </h3>
              </div>
            </div>
          </div>
          <div ref={tagRef} className={styles.chartBox} />
          <div className={styles.cardFoot}>
            <span className={styles.footText}>按待办数量统计</span>
          </div>
        </Card>

        {/* Combo distribution */}
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <ListIcon />
              </div>
              <div>
                <Eyebrow>COMBOS</Eyebrow>
                <h3 className={styles.cardTitle}>
                  组合 <span className={styles.song}>分布</span>
                </h3>
              </div>
            </div>
          </div>
          <div ref={comboRef} className={styles.chartBox} />
          <div className={styles.cardFoot}>
            <span className={styles.footText}>Top {Math.min(combos.length, 10)} 组合</span>
          </div>
        </Card>

        {/* Weekly completion */}
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <ClockIcon />
              </div>
              <div>
                <Eyebrow>WEEKLY</Eyebrow>
                <h3 className={styles.cardTitle}>
                  周分布 <span className={styles.song}>热力</span>
                </h3>
              </div>
            </div>
          </div>
          <div ref={weeklyRef} className={styles.chartBox} />
          <div className={styles.cardFoot}>
            <span className={styles.footText}>按星期聚合 · 全部历史</span>
          </div>
        </Card>
      </div>

      {loading && activeTodos.length === 0 && (
        <div className={styles.chartEmpty}>加载中...</div>
      )}
    </div>
  )
}
