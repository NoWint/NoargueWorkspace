import { ref, watch } from 'vue'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'timegreen-theme'

// Read localStorage or system preference
function getPreferredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const currentTheme = ref<Theme>(getPreferredTheme())

// Apply to HTML
function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

// Listen for system theme changes
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only follow system preference if user hasn't manually set it
    if (!localStorage.getItem(STORAGE_KEY)) {
      currentTheme.value = e.matches ? 'dark' : 'light'
    }
  })
}

// Initial apply
applyTheme(currentTheme.value)

export function useTheme() {
  function toggle() {
    currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light'
  }

  function setTheme(theme: Theme) {
    currentTheme.value = theme
  }

  // Auto-persist and apply on change
  watch(currentTheme, (val) => {
    localStorage.setItem(STORAGE_KEY, val)
    applyTheme(val)
  })

  return {
    theme: currentTheme,
    isDark: () => currentTheme.value === 'dark',
    toggle,
    setTheme,
  }
}
