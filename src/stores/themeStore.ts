import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  initialized: boolean
  initialize: () => void
  toggle: () => void
  setTheme: (t: Theme) => void
}

const STORAGE_KEY = 'examhelper-theme'

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  initialized: false,

  initialize: () => {
    if (get().initialized) return

    let saved: Theme | null = null
    try {
      saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    } catch {}

    const preferred: Theme =
      saved ??
      (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark')

    applyThemeClass(preferred)
    set({ theme: preferred, initialized: true })
  },

  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    applyThemeClass(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
    set({ theme: next })
  },

  setTheme: (t: Theme) => {
    applyThemeClass(t)
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {}
    set({ theme: t })
  },
}))

function applyThemeClass(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'light') {
    root.classList.add('light')
  } else {
    root.classList.remove('light')
  }
}
