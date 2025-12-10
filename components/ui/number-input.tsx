"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
  id?: string
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onChange,
      min = 0,
      max = Infinity,
      step = 1,
      disabled = false,
      className,
      id,
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Use forwarded ref or internal ref
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

    const handleDecrement = () => {
      const newValue = Math.max(min, value - step)
      onChange(newValue)
    }

    const handleIncrement = () => {
      const newValue = Math.min(max, value + step)
      onChange(newValue)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseInt(e.target.value, 10)
      if (!isNaN(newValue)) {
        onChange(Math.min(max, Math.max(min, newValue)))
      } else if (e.target.value === "") {
        onChange(min)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault()
        handleIncrement()
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        handleDecrement()
      }
    }

    const canDecrement = value > min
    const canIncrement = value < max

    const buttonBaseClass = cn(
      "flex items-center justify-center w-9 h-full",
      "text-muted-foreground transition-all duration-150",
      "hover:bg-accent/60 hover:text-foreground",
      "active:scale-90 active:bg-accent",
      "focus:outline-none"
    )

    const disabledButtonClass = "opacity-20 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground active:scale-100"

    return (
      <div
        className={cn(
          "flex items-center h-10 rounded-lg border-2 border-border/60 bg-muted/50 overflow-hidden",
          "transition-all duration-200",
          "focus-within:ring-[1.5px] focus-within:ring-ring/15 focus-within:border-ring/60 focus-within:bg-muted/45",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        {/* Decrement button */}
        <button
          type="button"
          className={cn(
            buttonBaseClass,
            "rounded-l-md border-r border-border/40",
            !canDecrement && disabledButtonClass
          )}
          onClick={handleDecrement}
          disabled={disabled || !canDecrement}
          tabIndex={-1}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        {/* Input */}
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            "flex-1 h-full bg-transparent text-center text-sm font-medium",
            "focus:outline-none",
            "min-w-[40px]",
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          )}
        />

        {/* Increment button */}
        <button
          type="button"
          className={cn(
            buttonBaseClass,
            "rounded-r-md border-l border-border/40",
            !canIncrement && disabledButtonClass
          )}
          onClick={handleIncrement}
          disabled={disabled || !canIncrement}
          tabIndex={-1}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }
)

NumberInput.displayName = "NumberInput"

export { NumberInput }
