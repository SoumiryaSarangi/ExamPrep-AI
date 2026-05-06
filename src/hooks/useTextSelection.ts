'use client'

import { useEffect, useState, useCallback } from 'react'

interface SelectionData {
  text: string
  x: number
  y: number
  visible: boolean
}

export function useTextSelection(containerRef: React.RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<SelectionData>({
    text: '', x: 0, y: 0, visible: false
  })

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelection(prev => ({ ...prev, visible: false }))
      return
    }

    const anchor = sel.anchorNode
    if (!containerRef.current || !containerRef.current.contains(anchor)) {
      setSelection(prev => ({ ...prev, visible: false }))
      return
    }

    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    setSelection({
      text: sel.toString().trim(),
      x: rect.left + rect.width / 2,
      y: rect.top,
      visible: true,
    })
  }, [containerRef])

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [handleSelectionChange])

  const dismiss = useCallback(() => {
    setSelection(prev => ({ ...prev, visible: false }))
    window.getSelection()?.removeAllRanges()
  }, [])

  return { ...selection, dismiss }
}
