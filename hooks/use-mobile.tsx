import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Hook to detect mobile viewport.
 * Returns false during SSR and initial hydration to prevent hydration mismatch.
 * After mount, returns actual mobile state.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)
  const [mounted, setMounted] = React.useState<boolean>(false)

  React.useEffect(() => {
    setMounted(true)
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Always return false during SSR to match initial client render
  return mounted ? isMobile : false
}

/**
 * Hook to check if the component has mounted (hydration complete).
 * Useful for conditionally rendering client-only components.
 */
export function useMounted() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return mounted
}
