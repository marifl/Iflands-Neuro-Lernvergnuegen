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
const NARROW_QUERY = '(max-width: 900px)'
export const useIsNarrow = (): boolean => useMediaQuery(NARROW_QUERY)

/** Kompakte Touch-Steuerung: Phone-Portrait plus iPhone-Landscape, aber nicht Maus-Desktop. */
const PHONE_QUERY = '(max-width: 600px), ((pointer: coarse) and (orientation: landscape) and (max-width: 1100px))'
export const useIsPhone = (): boolean => useMediaQuery(PHONE_QUERY)

/** Touch-Landscape: wenig Höhe, aber genug Breite für Split-Layout mit größerer Ontologie. */
const TOUCH_LANDSCAPE_QUERY = '(pointer: coarse) and (orientation: landscape) and (max-width: 1100px)'
export const useIsTouchLandscape = (): boolean => useMediaQuery(TOUCH_LANDSCAPE_QUERY)
