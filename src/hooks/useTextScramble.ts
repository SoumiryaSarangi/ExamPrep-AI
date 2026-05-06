'use client'

import { useState, useEffect, useRef } from 'react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'

export function useTextScramble(
  targetText: string,
  options?: { speed?: number; active?: boolean }
) {
  const { speed = 30, active = true } = options || {}
  const [displayText, setDisplayText] = useState(targetText)

  useEffect(() => {
    if (!active) { setDisplayText(targetText); return }

    let iteration = 0
    const interval = setInterval(() => {
      setDisplayText(
        targetText
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' '
            if (i < iteration) return targetText[i]
            return CHARS[Math.floor(Math.random() * CHARS.length)]
          })
          .join('')
      )

      if (iteration >= targetText.length) clearInterval(interval)
      iteration += 1 / 3
    }, speed)

    return () => clearInterval(interval)
  }, [targetText, speed, active])

  return displayText
}
