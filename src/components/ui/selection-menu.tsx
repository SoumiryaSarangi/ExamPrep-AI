'use client'

import { Sparkles, LayoutGrid, FileText } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SelectionMenuProps {
  x: number
  y: number
  visible: boolean
  onExplain: () => void
  onFlashcard: () => void
  onSummarize: () => void
}

export function SelectionMenu({
  x, y, visible,
  onExplain, onFlashcard, onSummarize,
}: SelectionMenuProps) {
  if (!visible) return null

  return (
    <div
      className={cn(
        'fixed z-50 flex items-center gap-1 p-1.5 rounded-xl glass-card',
        'shadow-lg shadow-black/20 animate-fade-in-scale',
        'transform -translate-x-1/2 -translate-y-full'
      )}
      style={{ left: x, top: y - 10 }}
    >
      <button
        onClick={onExplain}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                   hover:bg-primary/15 text-foreground transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Explain
      </button>
      <div className="w-px h-4 bg-border" />
      <button
        onClick={onFlashcard}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                   hover:bg-[hsl(var(--accent-purple))]/15 text-foreground transition-colors"
      >
        <LayoutGrid className="h-3.5 w-3.5 text-[hsl(var(--accent-purple))]" />
        Flashcard
      </button>
      <div className="w-px h-4 bg-border" />
      <button
        onClick={onSummarize}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                   hover:bg-[hsl(var(--accent-blue))]/15 text-foreground transition-colors"
      >
        <FileText className="h-3.5 w-3.5 text-[hsl(var(--accent-blue))]" />
        Summarize
      </button>
    </div>
  )
}
