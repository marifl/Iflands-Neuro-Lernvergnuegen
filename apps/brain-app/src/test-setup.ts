import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

const createImageData: CanvasRenderingContext2D['createImageData'] = (
  widthOrImageData: number | ImageData,
  height?: number,
) => {
  const width = typeof widthOrImageData === 'number' ? widthOrImageData : widthOrImageData.width
  const resolvedHeight = typeof widthOrImageData === 'number' ? (height ?? 0) : widthOrImageData.height
  return {
    width,
    height: resolvedHeight,
    data: new Uint8ClampedArray(width * resolvedHeight * 4),
    colorSpace: 'srgb',
  } as ImageData
}

const canvas2dContext = {
  strokeStyle: '',
  lineWidth: 1,
  createImageData,
  putImageData: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
} as unknown as Partial<CanvasRenderingContext2D>

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn((contextId: string) => (contextId === '2d' ? canvas2dContext : null)),
})

// jsdom kennt window.matchMedia nicht; useMediaQuery braucht es. Default: kein Treffer
// (breite Viewports), damit Komponenten ihr Desktop-Layout rendern.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }) as unknown as MediaQueryList,
})
