import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from './safeLocalStorage'

describe('safeLocalStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('liest, schreibt und entfernt Werte wenn localStorage verfuegbar ist', () => {
    expect(setLocalStorageItem('ed-theme', 'light')).toBe(true)
    expect(getLocalStorageItem('ed-theme')).toBe('light')

    expect(removeLocalStorageItem('ed-theme')).toBe(true)
    expect(getLocalStorageItem('ed-theme')).toBeNull()
  })

  it('degradiert ohne Throw wenn localStorage blockiert ist', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(getLocalStorageItem('ed-theme')).toBeNull()
    expect(setLocalStorageItem('ed-theme', 'light')).toBe(false)
    expect(removeLocalStorageItem('ed-theme')).toBe(false)
  })
})
