const DEFAULT_LERP_PER_FRAME_AT_60HZ = 0.18

export function frameTransitionAlpha(delta: number, lerpPerFrameAt60Hz = DEFAULT_LERP_PER_FRAME_AT_60HZ): number {
  if (delta <= 0) return 0
  return 1 - Math.pow(1 - lerpPerFrameAt60Hz, delta * 60)
}

export function approachTransitionValue(current: number, target: number, delta: number, epsilon = 0.01): number {
  const next = current + (target - current) * frameTransitionAlpha(delta)
  return Math.abs(next - target) <= epsilon ? target : next
}
