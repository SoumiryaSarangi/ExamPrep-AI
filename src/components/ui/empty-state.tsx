import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  actionHref?: string
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-6 animate-fade-in',
      className
    )}>
      {/* Dashed ring + floating icon */}
      <div className="relative mb-6">
        <div className="h-24 w-24 rounded-3xl border-2 border-dashed border-primary/25 flex items-center justify-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center animate-float">
            <Icon className="h-7 w-7 text-primary/60" />
          </div>
        </div>
        {/* Subtle orbiting dot */}
        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary/30 animate-glow-pulse" />
      </div>

      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm text-center max-w-xs mb-6 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button onClick={onAction} className="gap-2">
          <Icon className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
