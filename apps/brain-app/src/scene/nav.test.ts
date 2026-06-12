import { describe, it, expect } from 'vitest'
import { nextIndex, prevIndex } from './nav'

describe('nav', () => {
  it('clamped am Ende', () => {
    expect(nextIndex(6, 7)).toBe(6)
  })
  it('clamped am Anfang', () => {
    expect(prevIndex(0)).toBe(0)
  })
  it('geht vor/zurueck', () => {
    expect(nextIndex(0, 7)).toBe(1)
    expect(prevIndex(3)).toBe(2)
  })
})
