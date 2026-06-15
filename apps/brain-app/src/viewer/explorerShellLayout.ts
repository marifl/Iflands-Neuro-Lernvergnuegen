import type { AppMode } from './viewerStore'

export function shouldRenderInlineSidebar(input: {
  appMode: AppMode
  isAtlas: boolean
  isNarrow: boolean
}): boolean {
  if (input.isAtlas) return false
  return !input.isNarrow || input.appMode !== 'explore'
}

export function shouldRenderMobileTreeDrawer(input: {
  appMode: AppMode
  isAtlas: boolean
  isNarrow: boolean
  mobileTreeOpen: boolean
}): boolean {
  return !input.isAtlas && input.isNarrow && input.appMode === 'explore' && input.mobileTreeOpen
}

export function viewportFlex(input: {
  appMode: AppMode
  isAtlas: boolean
  isNarrow: boolean
}): number | string {
  if (!input.isNarrow || input.isAtlas) return 1
  return input.appMode === 'explore' ? 1 : '0 0 42%'
}
