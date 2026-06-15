import { describe, it, expect } from 'vitest'
import { parse } from 'smol-toml'
import { toTomlConfiguration } from './configExport'

describe('toTomlConfiguration', () => {
  const block = toTomlConfiguration('mein-set', {
    scopes: { 'area:julich:area-44:l': true, 'axis:cyto': false },
    view: { surface: 'pial', subcortex: false, carve_on_taro: 'julich' },
    camera: { target: 'julich:area-44:l' },
  })

  it('Roundtrip: re-parse ergibt die erwartete Struktur', () => {
    const parsed = parse(block) as any
    const cfg = parsed.configurations['mein-set']
    expect(cfg.label_de).toBe('mein-set')
    expect(cfg.scopes['area:julich:area-44:l']).toBe(true)
    expect(cfg.scopes['axis:cyto']).toBe(false)
    expect(cfg.view.surface).toBe('pial')
    expect(cfg.view.carve_on_taro).toBe('julich')
    expect(cfg.camera.target).toBe('julich:area-44:l')
  })

  it('laesst view/camera weg wenn leer', () => {
    const b = toTomlConfiguration('x', { scopes: { 'area:dkt:parsopercularis:l': true }, view: {}, camera: {} })
    const parsed = parse(b) as any
    expect(parsed.configurations['x'].view).toBeUndefined()
    expect(parsed.configurations['x'].camera).toBeUndefined()
    expect(parsed.configurations['x'].scopes['area:dkt:parsopercularis:l']).toBe(true)
  })
})
