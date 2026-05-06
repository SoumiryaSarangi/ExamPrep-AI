'use client'

import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

interface ThemeToggleProps {
  collapsed?: boolean
  className?: string
}

export function ThemeToggle({ collapsed = false, className }: ThemeToggleProps) {
  const { theme, toggle } = useThemeStore()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={cn(
        'relative h-9 w-9 rounded-full overflow-hidden transition-all duration-300',
        'hover:bg-primary/10 hover:text-primary',
        className,
      )}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Sun
        className={cn(
          'h-[18px] w-[18px] absolute transition-all duration-350',
          theme === 'dark'
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0',
        )}
      />
      <Moon
        className={cn(
          'h-[18px] w-[18px] absolute transition-all duration-350',
          theme === 'light'
            ? 'rotate-0 scale-100 opacity-100'
            : 'rotate-90 scale-0 opacity-0',
        )}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
