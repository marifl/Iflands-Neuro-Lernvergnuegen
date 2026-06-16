// Schicht-2-Store (localStorage) fuer die Atlas-Config. Schreibt die SP3-LocalOverrides, die
// loadLocalOverrides() liest. KEINE stillen Defaults — korruptes JSON wirft beim Laden (SP3).
import { create } from 'zustand'
import { setLocalStorageItem } from '../../safeLocalStorage'
import { loadLocalOverrides, type LocalOverrides, type ScopeMap } from './atlasConfig'

export const LS_KEY = 'atlas-config-overrides'

function persist(o: LocalOverrides): void {
  setLocalStorageItem(LS_KEY, JSON.stringify(o))
}

interface AtlasConfigStore extends LocalOverrides {
  /** Zyklus absent -> true -> false -> absent (3-State-Tree-Checkbox). */
  toggleScope: (key: string) => void
  setScope: (key: string, val: boolean) => void
  clearScope: (key: string) => void
  setPreset: (preset: string | null) => void
  setConfiguration: (configuration: string | null) => void
  reset: () => void
}

/** Persistiert den aktuellen Override-State und gibt das LocalOverrides-Objekt zurueck. */
function snapshot(s: LocalOverrides): LocalOverrides {
  const o: LocalOverrides = { preset: s.preset, configuration: s.configuration, scopes: s.scopes }
  persist(o)
  return o
}

export const useAtlasConfigStore = create<AtlasConfigStore>((set) => ({
  ...loadLocalOverrides(),

  toggleScope: (key) => set((s) => {
    const scopes: ScopeMap = { ...s.scopes }
    if (!(key in scopes)) scopes[key] = true
    else if (scopes[key]) scopes[key] = false
    else delete scopes[key]
    const next = { ...s, scopes }
    snapshot(next)
    return { scopes }
  }),

  setScope: (key, val) => set((s) => {
    const scopes: ScopeMap = { ...s.scopes, [key]: val }
    snapshot({ ...s, scopes })
    return { scopes }
  }),

  clearScope: (key) => set((s) => {
    const scopes: ScopeMap = { ...s.scopes }
    delete scopes[key]
    snapshot({ ...s, scopes })
    return { scopes }
  }),

  setPreset: (preset) => set((s) => {
    snapshot({ ...s, preset })
    return { preset }
  }),

  setConfiguration: (configuration) => set((s) => {
    snapshot({ ...s, configuration })
    return { configuration }
  }),

  reset: () => set(() => {
    const next: LocalOverrides = { preset: null, configuration: null, scopes: {} }
    persist(next)
    return next
  }),
}))
