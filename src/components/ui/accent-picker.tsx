'use client'

import { useThemeStore, type Accent } from '@/stores/themeStore'
import { cn } from '@/utils/cn'
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'

const ACCENTS: { name: Accent; color: string }[] = [
  { name: 'amber', color: 'hsl(38 92% 55%)' },
  { name: 'teal', color: 'hsl(172 70% 45%)' },
  { name: 'cyan', color: 'hsl(189 85% 50%)' },
  { name: 'magenta', color: 'hsl(320 75% 55%)' },
  { name: 'red', color: 'hsl(355 78% 55%)' },
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
            aria-label={`Set accent color to ${a.name}`}
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
          aria-label={`Set accent color to ${a.name}`}
        >
          {accent === a.name && <Check className="h-3 w-3 text-white drop-shadow-md" />}
        </button>
      ))}
    </div>
  )
}
