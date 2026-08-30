import { create } from 'zustand'

type Theme = 'dark' | 'light'
export type Accent = 'amber' | 'clarity' | 'focus' | 'ember'

interface ThemeState {
  theme: Theme
  accent: Accent
  initialized: boolean
  initialize: () => void
  toggle: () => void
  setTheme: (t: Theme) => void
  setAccent: (a: Accent) => void
}

const STORAGE_KEY = 'examhelper-theme'
const ACCENT_STORAGE_KEY = 'examhelper-accent'

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  accent: 'amber',
  initialized: false,

  initialize: () => {
    if (get().initialized) return

    const VALID_ACCENTS: Set<string> = new Set(['amber', 'clarity', 'focus', 'ember'])

    let saved: Theme | null = null
    let rawAccent: string | null = null
    try {
      saved = localStorage.getItem(STORAGE_KEY) as Theme | null
      rawAccent = localStorage.getItem(ACCENT_STORAGE_KEY)
    } catch {}

    const preferred: Theme =
      saved ??
      (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark')

    // Validate stored accent — old values (teal/cyan/magenta/red) fall back to 'amber'
    const preferredAccent: Accent =
      rawAccent !== null && VALID_ACCENTS.has(rawAccent)
        ? (rawAccent as Accent)
        : 'amber'

    applyThemeClass(preferred)
    applyAccentClass(preferredAccent)
    set({ theme: preferred, accent: preferredAccent, initialized: true })
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

  setAccent: (a: Accent) => {
    applyAccentClass(a)
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, a)
    } catch {}
    set({ accent: a })
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

function applyAccentClass(accent: Accent) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  
  // Remove existing accent classes
  root.classList.forEach(cls => {
    if (cls.startsWith('accent-')) {
      root.classList.remove(cls)
    }
  })

  if (accent !== 'amber') {
    root.classList.add(`accent-${accent}`)
  }
}
