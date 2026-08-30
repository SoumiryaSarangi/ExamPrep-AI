'use client'

import { useThemeStore, type Accent } from '@/stores/themeStore'
import { cn } from '@/utils/cn'
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'

const ACCENTS: { name: Accent; label: string; color: string }[] = [
  { name: 'amber',   label: 'Lamplight', color: 'hsl(38 92% 55%)' },
  { name: 'clarity', label: 'Clarity',   color: 'hsl(188 78% 48%)' },
  { name: 'focus',   label: 'Focus',     color: 'hsl(255 70% 62%)' },
  { name: 'ember',   label: 'Ember',     color: 'hsl(346 62% 56%)' },
]

export function AccentPicker({ collapsed, className }: { collapsed?: boolean; className?: string }) {
  const { accent, setAccent } = useThemeStore()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  if (collapsed) {
    return (
      <div className={cn("flex flex-col gap-2 items-center", className)}>
        {ACCENTS.map((a) => (
          <button
            key={a.name}
            onClick={() => setAccent(a.name)}
            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-110 active:scale-95"
            style={{ backgroundColor: a.color }}
            aria-label={`${a.label} accent color`}
            title={a.label}
          >
            {accent === a.name && <Check className="h-3 w-3 text-white drop-shadow-md" />}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {ACCENTS.map((a) => (
        <button
          key={a.name}
          onClick={() => setAccent(a.name)}
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-110 active:scale-95"
          style={{ backgroundColor: a.color }}
          aria-label={`${a.label} accent color`}
          title={a.label}
        >
          {accent === a.name && <Check className="h-3 w-3 text-white drop-shadow-md" />}
        </button>
      ))}
    </div>
  )
}
