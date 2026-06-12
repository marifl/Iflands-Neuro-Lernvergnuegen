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
