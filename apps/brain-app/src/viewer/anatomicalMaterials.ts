import * as THREE from 'three'
import {
  ANATOMICAL_MATERIAL_COLORS,
  FUNCTION_COLORS,
  LATERALITY_COLORS,
  type FunctionalSystem,
  type AnatomicalMaterialRole,
} from './atlasColorSystem'

type ContextColorMode = 'anatomical' | 'function' | 'laterality' | 'region' | 'preset'
type ContextSide = 'left' | 'right' | 'midline'

interface AnatomicalMaterialProfile {
  color: string
  roughness: number
  metalness: number
  bumpScale: number
  textureRepeat: number
}

interface AnatomicalMaterialOptions extends THREE.MeshStandardMaterialParameters {
  enableBumpMap?: boolean
}

const PROFILES: Record<AnatomicalMaterialRole, AnatomicalMaterialProfile> = {
  'brain-cortex': profile('brain-cortex', 0.76, 0, 0.18, 5),
  'subcortical-gray': profile('subcortical-gray', 0.8, 0, 0.12, 4),
  'white-matter': profile('white-matter', 0.72, 0, 0.08, 5),
  cerebellum: profile('cerebellum', 0.78, 0, 0.16, 6),
  brainstem: profile('brainstem', 0.82, 0, 0.11, 4),
  meninges: profile('meninges', 0.68, 0, 0.05, 7),
  csf: profile('csf', 0.38, 0, 0.03, 3),
  bone: profile('bone', 0.88, 0, 0.1, 10),
  cartilage: profile('cartilage', 0.7, 0, 0.04, 6),
  tooth: profile('tooth', 0.55, 0, 0.03, 8),
  muscle: profile('muscle', 0.74, 0, 0.14, 8),
  ligament: profile('ligament', 0.82, 0, 0.08, 9),
  artery: profile('artery', 0.58, 0, 0.06, 7),
  vein: profile('vein', 0.62, 0, 0.05, 7),
  nerve: profile('nerve', 0.7, 0, 0.06, 8),
  gland: profile('gland', 0.76, 0, 0.1, 6),
  eye: profile('eye', 0.34, 0, 0.02, 5),
  airway: profile('airway', 0.72, 0, 0.08, 6),
  'context-soft-tissue': profile('context-soft-tissue', 0.82, 0, 0.08, 7),
  iron: profile('iron', 0.5, 0.65, 0.015, 3),
}

const textureCache = new Map<string, THREE.CanvasTexture | null>()

function profile(
  role: AnatomicalMaterialRole,
  roughness: number,
  metalness: number,
  bumpScale: number,
  textureRepeat: number,
): AnatomicalMaterialProfile {
  return {
    color: ANATOMICAL_MATERIAL_COLORS[role],
    roughness,
    metalness,
    bumpScale,
    textureRepeat,
  }
}

function roleSeed(role: string): number {
  let hash = 2166136261
  for (let i = 0; i < role.length; i++) {
    hash ^= role.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function noiseTexture(role: AnatomicalMaterialRole): THREE.CanvasTexture | null {
  if (textureCache.has(role)) return textureCache.get(role) ?? null
  if (typeof document === 'undefined') {
    textureCache.set(role, null)
    return null
  }
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    textureCache.set(role, null)
    return null
  }
  const seed = roleSeed(role)
  const image = ctx.createImageData(canvas.width, canvas.height)
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4
      const wave =
        Math.sin((x + (seed & 15)) * 0.31) +
        Math.cos((y + ((seed >> 4) & 15)) * 0.27) +
        Math.sin((x + y + ((seed >> 8) & 31)) * 0.13)
      const value = Math.max(0, Math.min(255, 128 + wave * 24 + ((x * 17 + y * 31 + seed) % 19) - 9))
      image.data[i] = value
      image.data[i + 1] = value
      image.data[i + 2] = value
      image.data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.needsUpdate = true
  textureCache.set(role, texture)
  return texture
}

export function contextAnatomicalMaterialRole(id: string): AnatomicalMaterialRole {
  if (/artery/i.test(id)) return 'artery'
  if (/vein|sinus|venous/i.test(id)) return 'vein'
  if (/nerve|ganglion/i.test(id)) return 'nerve'
  if (/tooth|teeth|dental|gingiva/i.test(id)) return 'tooth'
  if (/bone|maxilla|mandible|zygomatic|frontal|parietal|occipital|sphenoid|ethmoid|vomer|palatine|lacrimal|nasal/i.test(id)) return 'bone'
  if (/cartilage/i.test(id)) return 'cartilage'
  if (/muscle|masseter|temporalis|constrictor|pharyngeus|levator|depressor|rectus|oblique/i.test(id)) return 'muscle'
  if (/ligament|tendon/i.test(id)) return 'ligament'
  if (/gland|hypophysis|pituitary/i.test(id)) return 'gland'
  if (/eye|retina|lens|lacrimal-gland/i.test(id)) return 'eye'
  if (/airway|pharynx|pharyngeal|nasal|oral|lip|tongue/i.test(id)) return 'airway'
  return 'context-soft-tissue'
}

export function contextSide(id: string): ContextSide {
  if (/^(left|left-)|-of-left-|left-/i.test(id)) return 'left'
  if (/^(right|right-)|-of-right-|right-/i.test(id)) return 'right'
  return 'midline'
}

export function contextFunctionSystem(role: AnatomicalMaterialRole): FunctionalSystem {
  if (role === 'artery' || role === 'vein') return 'vascular'
  if (role === 'nerve') return 'cranial-nerve'
  if (role === 'bone' || role === 'cartilage' || role === 'tooth') return 'skeletal-support'
  if (role === 'muscle' || role === 'ligament' || role === 'context-soft-tissue') return 'musculoskeletal'
  if (role === 'eye') return 'sensory-organ'
  if (role === 'airway') return 'airway-oral'
  if (role === 'gland') return 'endocrine'
  return 'other'
}

export function contextColorForMode(id: string, mode: ContextColorMode): string {
  const role = contextAnatomicalMaterialRole(id)
  if (mode === 'function') return FUNCTION_COLORS[contextFunctionSystem(role)]
  if (mode === 'laterality') return LATERALITY_COLORS[contextSide(id)]
  return ANATOMICAL_MATERIAL_COLORS[role]
}

export function createAnatomicalMaterial(
  role: AnatomicalMaterialRole,
  options: AnatomicalMaterialOptions = {},
): THREE.MeshStandardMaterial {
  const { enableBumpMap = false, ...materialOptions } = options
  const p = PROFILES[role]
  const bumpMap = enableBumpMap ? noiseTexture(role) : null
  if (bumpMap) bumpMap.repeat.set(p.textureRepeat, p.textureRepeat)
  const parameters: THREE.MeshStandardMaterialParameters = {
    color: p.color,
    roughness: p.roughness,
    metalness: p.metalness,
    bumpScale: bumpMap ? p.bumpScale : 0,
    ...materialOptions,
  }
  if (bumpMap) parameters.bumpMap = bumpMap
  return new THREE.MeshStandardMaterial(parameters)
}
