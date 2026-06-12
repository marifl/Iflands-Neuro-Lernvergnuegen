import { z } from 'zod'

export const OverlayKind = z.enum(['erp', 'topography', 'flowchart', 'table', 'image', 'prose'])

export const SceneSchema = z.object({
  id: z.string(),
  figure: z.string().optional(),
  section: z.string(),
  author: z.string(),
  order: z.number(),
  title: z.string(),
  brain: z.object({
    regions: z.array(z.string()),
    camera: z.string(),
  }),
  overlay: z.object({
    kind: OverlayKind,
    position: z.enum(['left', 'right', 'center', 'bottom']).default('right'),
    size: z.enum(['sm', 'md', 'lg']).default('md'),
    data: z.record(z.unknown()).optional(),
    fallbackImage: z.string().optional(),
  }),
  companion: z.object({
    summary: z.string(),
    sources: z.array(z.object({ key: z.string(), note: z.string().optional() })).default([]),
  }),
})

export type Scene = z.infer<typeof SceneSchema>
