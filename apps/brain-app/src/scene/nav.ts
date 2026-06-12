export const nextIndex = (i: number, count: number): number => Math.min(i + 1, count - 1)
export const prevIndex = (i: number): number => Math.max(i - 1, 0)
