import { ref, onMounted, onUnmounted } from 'vue'

interface UseResizableOptions {
  storageKey: string
  defaultWidth: number
  minWidth?: number
  maxWidth?: number
}

export function useResizable(options: UseResizableOptions) {
  const { storageKey, defaultWidth, minWidth = 120, maxWidth = 500 } = options

  const width = ref(defaultWidth)
  const isResizing = ref(false)
  const handleRef = ref<HTMLElement | null>(null)

  let startX = 0
  let startWidth = 0

  function loadWidth() {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const w = parseInt(saved, 10)
        if (w >= minWidth && w <= maxWidth) {
          width.value = w
        }
      }
    } catch {}
  }

  function onHandleMouseDown(e: MouseEvent) {
    e.preventDefault()
    startX = e.clientX
    startWidth = width.value
    isResizing.value = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function onMouseMove(e: MouseEvent) {
    if (!isResizing.value) return
    const delta = e.clientX - startX
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta))
    width.value = newWidth
  }

  function onMouseUp() {
    if (!isResizing.value) return
    isResizing.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    try {
      localStorage.setItem(storageKey, String(width.value))
    } catch {}
  }

  onMounted(() => {
    loadWidth()
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  })

  onUnmounted(() => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  })

  return {
    width,
    isResizing,
    handleRef,
    onHandleMouseDown,
  }
}
