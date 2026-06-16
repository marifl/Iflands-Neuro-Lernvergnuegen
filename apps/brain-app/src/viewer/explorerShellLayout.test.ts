import { describe, expect, it } from 'vitest'
import { MOBILE_LEARN_VIEWPORT_FLEX, shouldRenderInlineSidebar, shouldRenderMobileTreeDrawer, viewportFlex } from './explorerShellLayout'

describe('explorerShellLayout', () => {
  it('rendert den Explorer-Tree auf schmalen Viewports nur als Drawer', () => {
    expect(shouldRenderInlineSidebar({ appMode: 'explore', isAtlas: false, isNarrow: true })).toBe(false)
    expect(shouldRenderMobileTreeDrawer({ appMode: 'explore', isAtlas: false, isNarrow: true, mobileTreeOpen: true })).toBe(true)
    expect(shouldRenderMobileTreeDrawer({ appMode: 'explore', isAtlas: false, isNarrow: true, mobileTreeOpen: false })).toBe(false)
  })

  it('behaelt Inline-Sidebars fuer Desktop und Lernmodus', () => {
    expect(shouldRenderInlineSidebar({ appMode: 'explore', isAtlas: false, isNarrow: false })).toBe(true)
    expect(shouldRenderInlineSidebar({ appMode: 'learn', isAtlas: false, isNarrow: true })).toBe(true)
  })

  it('gibt dem mobilen Explorer die volle Viewport-Flaeche', () => {
    expect(viewportFlex({ appMode: 'explore', isAtlas: false, isNarrow: true })).toBe(1)
    expect(viewportFlex({ appMode: 'learn', isAtlas: false, isNarrow: true })).toBe(MOBILE_LEARN_VIEWPORT_FLEX)
    expect(viewportFlex({ appMode: 'atlas', isAtlas: true, isNarrow: true })).toBe(1)
  })
})
