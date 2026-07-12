export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(d: Date | string | number): string {
  const date = typeof d === 'object' ? d : new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr(): string {
  return formatDate(new Date())
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}
