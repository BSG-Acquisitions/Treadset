import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Guard against SSR or missing API
    if (typeof window === 'undefined' || !window.matchMedia) {
      setPrefersReducedMotion(false);
      return;
    }

    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const handler = (event: MediaQueryListEvent) => {
        setPrefersReducedMotion(event.matches);
      };

      // Feature detection: prefer addEventListener, fallback to legacy addListener
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handler);
      } else if ((mediaQuery as any).addListener) {
        // Legacy API for older browsers (Safari < 14, older Android WebView)
        (mediaQuery as any).addListener(handler);
      }

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handler);
        } else if ((mediaQuery as any).removeListener) {
          (mediaQuery as any).removeListener(handler);
        }
      };
    } catch (e) {
      console.error('[useReducedMotion] Error setting up media query listener:', e);
      setPrefersReducedMotion(false);
    }
  }, []);

  return prefersReducedMotion;
}
