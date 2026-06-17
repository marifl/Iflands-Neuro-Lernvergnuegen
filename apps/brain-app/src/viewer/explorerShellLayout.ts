import type { AppMode } from './viewerStore'

export const MOBILE_LEARN_VIEWPORT_FLEX = '0 0 clamp(330px, 56%, 460px)'

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
  return input.appMode === 'explore' ? 1 : MOBILE_LEARN_VIEWPORT_FLEX
}
