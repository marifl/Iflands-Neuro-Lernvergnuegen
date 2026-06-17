import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const appCss = readFileSync(join(here, '../app.css'), 'utf8')

describe('V2 shell theme contract', () => {
  it('deckt Header, Dock, Drawer/Panel, Buttons, Fokus und Cut-Controls mit semantischen Tokens ab', () => {
    for (const token of [
      '--shell-header-bg',
      '--shell-header-border',
      '--shell-dock-bg',
      '--shell-dock-border',
      '--shell-drawer-bg',
      '--shell-panel-bg',
      '--shell-panel-border',
      '--shell-button-bg',
      '--shell-button-hover-bg',
      '--shell-button-active-bg',
      '--shell-button-disabled-bg',
      '--shell-button-disabled-text',
      '--shell-focus-ring',
      '--shell-cut-sagittal',
      '--shell-cut-coronal',
      '--shell-cut-axial',
    ]) {
      expect(appCss).toContain(`${token}:`)
    }
  })

  it('verdrahtet semantische Shell-Tokens in den zentralen Chrome-Klassen', () => {
    expect(appCss).toContain('.ed-head')
    expect(appCss).toContain('background: var(--shell-header-bg)')
    expect(appCss).toContain('.ed-foot')
    expect(appCss).toContain('background: var(--shell-dock-bg)')
    expect(appCss).toContain('.ed-panel')
    expect(appCss).toContain('background: var(--shell-panel-bg)')
    expect(appCss).toContain('.ed-btn:focus-visible')
    expect(appCss).toContain('outline: 2px solid var(--shell-focus-ring)')
    expect(appCss).toContain('.cut-plane-frame-tab')
    expect(appCss).toContain('var(--shell-cut-axis-color')
  })
})
