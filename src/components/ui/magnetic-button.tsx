'use client'

import { useRef, useCallback } from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/utils/cn'

interface MagneticButtonProps extends ButtonProps {
  intensity?: number
}

export function MagneticButton({
  intensity = 8,
  className,
  children,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    ref.current.style.transform =
      `translate(${x * (intensity / rect.width * 2)}px, ${y * (intensity / rect.height * 2)}px)`
  }, [intensity])

  const handleMouseLeave = useCallback(() => {
    if (!ref.current) return
    ref.current.style.transform = 'translate(0, 0)'
  }, [])

  return (
    <Button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn('transition-transform duration-200 ease-out', className)}
      {...props}
    >
      {children}
    </Button>
  )
}
