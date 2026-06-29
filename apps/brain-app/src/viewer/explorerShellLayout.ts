import type { AppMode } from './viewerStore'

export const MOBILE_LEARN_VIEWPORT_FLEX = '0 0 clamp(330px, 56%, 460px)'
export type ResponsiveShellMode = 'desktop-split' | 'portrait-drawer' | 'landscape-rail'

const SIDE_PANEL_LINE = '1.5px solid var(--line)'

export function responsiveShellMode(input: {
  isNarrow: boolean
  isTouchLandscape: boolean
}): ResponsiveShellMode {
  if (input.isTouchLandscape) return 'landscape-rail'
  return input.isNarrow ? 'portrait-drawer' : 'desktop-split'
}

export function shellFlexDirection(shellMode: ResponsiveShellMode): 'column' | 'row' {
  return shellMode === 'portrait-drawer' ? 'column' : 'row'
}

export function shouldRenderInlineSidebar(input: {
  appMode: AppMode
  isAtlas: boolean
  shellMode: ResponsiveShellMode
  caseStudyActive?: boolean
}): boolean {
  if (input.isAtlas) return false
  // Der Strukturfokus-Baum wandert auf Portrait in den Drawer; die Fall-Surface (Phineas)
  // rendert dagegen inline wie der Lernschritt, weil sie kein Baum ist.
  return input.shellMode !== 'portrait-drawer' || input.appMode !== 'explore' || Boolean(input.caseStudyActive)
}

export function shouldRenderMobileTreeDrawer(input: {
  appMode: AppMode
  isAtlas: boolean
  shellMode: ResponsiveShellMode
  mobileTreeOpen: boolean
  caseStudyActive?: boolean
}): boolean {
  return !input.isAtlas && !input.caseStudyActive && input.shellMode === 'portrait-drawer' && input.appMode === 'explore' && input.mobileTreeOpen
}

export function viewportFlex(input: {
  appMode: AppMode
  isAtlas: boolean
  shellMode: ResponsiveShellMode
  caseStudyActive?: boolean
}): number | string {
  if (input.shellMode !== 'portrait-drawer' || input.isAtlas) return 1
  // Phineas teilt sich Buehne + Panel wie der Lernschritt; nur der reine Strukturfokus nimmt voll.
  return input.appMode === 'explore' && !input.caseStudyActive ? 1 : MOBILE_LEARN_VIEWPORT_FLEX
}

export function sidePanelFlex(shellMode: ResponsiveShellMode): string {
  return shellMode === 'portrait-drawer' ? '1 1 auto' : 'none'
}

export function sidePanelWidth(input: {
  shellMode: ResponsiveShellMode
  desktopWidth: number
}): string | number {
  if (input.shellMode === 'portrait-drawer') return '100%'
  if (input.shellMode === 'landscape-rail') return `min(44vw, ${input.desktopWidth}px)`
  return input.desktopWidth
}

export function sidePanelBorder(input: {
  shellMode: ResponsiveShellMode
}): { borderLeft?: string; borderTop?: string } {
  return input.shellMode === 'portrait-drawer'
    ? { borderTop: SIDE_PANEL_LINE }
    : { borderLeft: SIDE_PANEL_LINE }
}
