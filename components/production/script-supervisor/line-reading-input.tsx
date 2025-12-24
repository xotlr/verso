"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"

interface LineReadingInputProps {
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function LineReadingInput({
  value,
  onChange,
  placeholder = 'e.g., "emphasized last word"',
  disabled = false,
  className,
}: LineReadingInputProps) {
  const [localValue, setLocalValue] = useState(value || "")
  const debouncedValue = useDebounce(localValue, 500)

  // Sync external changes
  useEffect(() => {
    setLocalValue(value || "")
  }, [value])

  // Save on debounced change
  useEffect(() => {
    const trimmed = debouncedValue.trim()
    const newValue = trimmed || null
    if (newValue !== value) {
      onChange(newValue)
    }
  }, [debouncedValue, value, onChange])

  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-xs text-muted-foreground">Line Reading</label>
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-8 text-sm"
      />
    </div>
  )
}

interface QuickLineReadingProps {
  value: string | null
  className?: string
}

export function QuickLineReading({ value, className }: QuickLineReadingProps) {
  if (!value) return null

  return (
    <span
      className={cn(
        "text-xs text-muted-foreground italic truncate max-w-[200px]",
        className
      )}
      title={value}
    >
      &ldquo;{value}&rdquo;
    </span>
  )
}
