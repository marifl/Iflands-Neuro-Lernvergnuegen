import { describe, expect, it } from 'vitest'
import {
  MOBILE_LEARN_VIEWPORT_FLEX,
  responsiveShellMode,
  shellFlexDirection,
  shouldRenderInlineSidebar,
  shouldRenderMobileTreeDrawer,
  sidePanelBorder,
  sidePanelFlex,
  sidePanelWidth,
  viewportFlex,
} from './explorerShellLayout'

describe('explorerShellLayout', () => {
  it('benennt den Responsive-Vertrag fuer Desktop, Portrait und Touch-Landscape', () => {
    expect(responsiveShellMode({ isNarrow: false, isTouchLandscape: false })).toBe('desktop-split')
    expect(responsiveShellMode({ isNarrow: true, isTouchLandscape: false })).toBe('portrait-drawer')
    expect(responsiveShellMode({ isNarrow: true, isTouchLandscape: true })).toBe('landscape-rail')
    expect(responsiveShellMode({ isNarrow: false, isTouchLandscape: true })).toBe('landscape-rail')
  })

  it('rendert den Explorer-Tree auf schmalen Viewports nur als Drawer', () => {
    const shellMode = 'portrait-drawer'
    expect(shouldRenderInlineSidebar({ appMode: 'explore', isAtlas: false, shellMode })).toBe(false)
    expect(shouldRenderMobileTreeDrawer({ appMode: 'explore', isAtlas: false, shellMode, mobileTreeOpen: true })).toBe(true)
    expect(shouldRenderMobileTreeDrawer({ appMode: 'explore', isAtlas: false, shellMode, mobileTreeOpen: false })).toBe(false)
  })

  it('behaelt Inline-Sidebars fuer Desktop, Landscape-Rail und Lernmodus', () => {
    expect(shouldRenderInlineSidebar({ appMode: 'explore', isAtlas: false, shellMode: 'desktop-split' })).toBe(true)
    expect(shouldRenderInlineSidebar({ appMode: 'explore', isAtlas: false, shellMode: 'landscape-rail' })).toBe(true)
    expect(shouldRenderInlineSidebar({ appMode: 'learn', isAtlas: false, shellMode: 'portrait-drawer' })).toBe(true)
  })

  it('gibt dem mobilen Portrait-Explorer die volle Viewport-Flaeche', () => {
    expect(viewportFlex({ appMode: 'explore', isAtlas: false, shellMode: 'portrait-drawer' })).toBe(1)
    expect(viewportFlex({ appMode: 'learn', isAtlas: false, shellMode: 'portrait-drawer' })).toBe(MOBILE_LEARN_VIEWPORT_FLEX)
    expect(viewportFlex({ appMode: 'atlas', isAtlas: true, shellMode: 'portrait-drawer' })).toBe(1)
    expect(viewportFlex({ appMode: 'learn', isAtlas: false, shellMode: 'landscape-rail' })).toBe(1)
  })

  it('setzt Split-Achse und Panel-Rahmen aus demselben Vertrag', () => {
    expect(shellFlexDirection('portrait-drawer')).toBe('column')
    expect(shellFlexDirection('desktop-split')).toBe('row')
    expect(shellFlexDirection('landscape-rail')).toBe('row')
    expect(sidePanelFlex('portrait-drawer')).toBe('1 1 auto')
    expect(sidePanelFlex('landscape-rail')).toBe('none')
    expect(sidePanelWidth({ shellMode: 'portrait-drawer', desktopWidth: 460 })).toBe('100%')
    expect(sidePanelWidth({ shellMode: 'desktop-split', desktopWidth: 460 })).toBe(460)
    expect(sidePanelWidth({ shellMode: 'landscape-rail', desktopWidth: 460 })).toBe('min(44vw, 460px)')
    expect(sidePanelBorder({ shellMode: 'portrait-drawer' })).toEqual({ borderTop: '1.5px solid var(--line)' })
    expect(sidePanelBorder({ shellMode: 'landscape-rail' })).toEqual({ borderLeft: '1.5px solid var(--line)' })
  })
})
