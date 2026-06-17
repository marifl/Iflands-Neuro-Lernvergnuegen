import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type BrainPerformanceGateSnapshot = {
  active: true
  frameCount: number
  firstFrameAt: number | null
  lastFrameMs: number
  avgFrameMs: number
  maxFrameMs: number
  visibleMeshes: number
  namedVisibleMeshes: number
  renderer: {
    calls: number
    triangles: number
    points: number
    lines: number
    geometries: number
    textures: number
  }
  canvas: {
    width: number
    height: number
    clientWidth: number
    clientHeight: number
  }
  pick: {
    count: number
    lastLatencyMs: number | null
    maxLatencyMs: number
    lastHit: boolean | null
  }
}

type BrainPerformanceGateWindow = Window & {
  __brainPerformanceGate?: BrainPerformanceGateSnapshot
  __brainPerformanceGateReset?: () => void
  __brainPerformanceGateRecordPick?: (latencyMs: number, hit: boolean) => void
}

export function performanceGateEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('perf') === '1'
}

export default function PerformanceGateProbe() {
  const firstFrameAt = useRef<number | null>(null)
  const lastFrameAt = useRef<number | null>(null)
  const frameCount = useRef(0)
  const totalFrameMs = useRef(0)
  const maxFrameMs = useRef(0)
  const pickCount = useRef(0)
  const lastPickLatencyMs = useRef<number | null>(null)
  const maxPickLatencyMs = useRef(0)
  const lastPickHit = useRef<boolean | null>(null)

  const reset = () => {
    firstFrameAt.current = null
    lastFrameAt.current = null
    frameCount.current = 0
    totalFrameMs.current = 0
    maxFrameMs.current = 0
    pickCount.current = 0
    lastPickLatencyMs.current = null
    maxPickLatencyMs.current = 0
    lastPickHit.current = null
  }

  useEffect(() => {
    const globals = window as BrainPerformanceGateWindow
    globals.__brainPerformanceGateReset = reset
    globals.__brainPerformanceGateRecordPick = (latencyMs, hit) => {
      pickCount.current += 1
      lastPickLatencyMs.current = latencyMs
      maxPickLatencyMs.current = Math.max(maxPickLatencyMs.current, latencyMs)
      lastPickHit.current = hit
    }
    return () => {
      delete globals.__brainPerformanceGate
      delete globals.__brainPerformanceGateReset
      delete globals.__brainPerformanceGateRecordPick
    }
  }, [])

  useFrame(({ gl, scene }) => {
    const now = performance.now()
    const previousFrameAt = lastFrameAt.current
    const frameMs = previousFrameAt === null ? 0 : now - previousFrameAt
    if (firstFrameAt.current === null) firstFrameAt.current = now
    if (previousFrameAt !== null) {
      totalFrameMs.current += frameMs
      maxFrameMs.current = Math.max(maxFrameMs.current, frameMs)
    }
    lastFrameAt.current = now
    frameCount.current += 1

    let visibleMeshes = 0
    let namedVisibleMeshes = 0
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!mesh.isMesh || !mesh.visible) return
      visibleMeshes += 1
      if (mesh.name) namedVisibleMeshes += 1
    })

    const measuredFrames = Math.max(0, frameCount.current - 1)
    const canvas = gl.domElement
    ;(window as BrainPerformanceGateWindow).__brainPerformanceGate = {
      active: true,
      frameCount: frameCount.current,
      firstFrameAt: firstFrameAt.current,
      lastFrameMs: frameMs,
      avgFrameMs: measuredFrames === 0 ? 0 : totalFrameMs.current / measuredFrames,
      maxFrameMs: maxFrameMs.current,
      visibleMeshes,
      namedVisibleMeshes,
      renderer: {
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        points: gl.info.render.points,
        lines: gl.info.render.lines,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
      },
      canvas: {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
      },
      pick: {
        count: pickCount.current,
        lastLatencyMs: lastPickLatencyMs.current,
        maxLatencyMs: maxPickLatencyMs.current,
        lastHit: lastPickHit.current,
      },
    }
  })

  return null
}
