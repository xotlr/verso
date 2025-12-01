"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface RotatingTextProps {
  words: string[]
  interval?: number
  className?: string
}

export function RotatingText({
  words,
  interval = 3000,
  className
}: RotatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true)

      // After exit animation, change word and trigger enter animation
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length)
        setIsAnimating(false)
      }, 300)
    }, interval)

    return () => clearInterval(timer)
  }, [words.length, interval])

  return (
    <span className={cn("relative inline-block", className)}>
      <span
        className={cn(
          "inline-block transition-all duration-300 ease-out",
          isAnimating
            ? "opacity-0 translate-y-2 blur-[2px]"
            : "opacity-100 translate-y-0 blur-0"
        )}
      >
        {words[currentIndex]}
      </span>
    </span>
  )
}
