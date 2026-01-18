"use client"

import { useState, useEffect } from "react"
import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  // Use local state synced with document class to avoid next-themes dependency
  // This prevents potential conflicts with the app's custom ThemeProvider
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")

  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains("dark")
      setTheme(isDark ? "dark" : "light")
    }

    updateTheme()

    // Watch for theme class changes
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheck className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-success/50 [&>[data-icon]]:text-success",
          error: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-destructive/50 [&>[data-icon]]:text-destructive",
          warning: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-warning/50 [&>[data-icon]]:text-warning",
          info: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-info/50 [&>[data-icon]]:text-info",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
