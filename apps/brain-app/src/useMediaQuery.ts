import { useEffect, useState } from 'react'

/** Reaktiver Media-Query-Treffer. Synchron initialisiert (kein Flash), reagiert auf Resize. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/** Schmale Viewports (Mobile + kleine Tablets): Stack statt Split. */
export const NARROW_QUERY = '(max-width: 900px)'
export const useIsNarrow = (): boolean => useMediaQuery(NARROW_QUERY)

/** Phone-Viewports: kompaktere Steuerleiste (gleich breite Boxen statt Spacer-Layout). */
export const PHONE_QUERY = '(max-width: 600px)'
export const useIsPhone = (): boolean => useMediaQuery(PHONE_QUERY)
