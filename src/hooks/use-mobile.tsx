import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Guard against SSR or missing API
    if (typeof window === 'undefined' || !window.matchMedia) {
      setIsMobile(false)
      return
    }

    try {
      const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
      const onChange = () => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
      }

      // Feature detection: prefer addEventListener, fallback to legacy addListener
      if (mql.addEventListener) {
        mql.addEventListener("change", onChange)
      } else if ((mql as any).addListener) {
        // Legacy API for older browsers (Safari < 14, older Android WebView)
        (mql as any).addListener(onChange)
      }

      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

      return () => {
        if (mql.removeEventListener) {
          mql.removeEventListener("change", onChange)
        } else if ((mql as any).removeListener) {
          (mql as any).removeListener(onChange)
        }
      }
    } catch (e) {
      console.error('[useIsMobile] Error setting up media query listener:', e)
      setIsMobile(false)
    }
  }, [])

  return !!isMobile
}
