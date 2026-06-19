export const ATLAS_COLOR_SYSTEM_VERSION = 2

export const ATLAS_VIEWER_COLORS = {
  brainBase: '#cdbfb6',
  anatomical: '#d7b8a8',
  selection: '#f26b1f',
  hover: '#ffd2a8',
  emissiveOff: '#000000',
  bone: '#e9e1d2',
  context: '#b8a894',
  rod: '#2f281f',
  presetDim: '#3a3631',
  atlasContext: '#8d8779',
  atlasGap: '#7c7a73',
  rawJulich: '#39d3c4',
  rawDkt: '#e879c8',
} as const

export type AnatomicalMaterialRole =
  | 'brain-cortex'
  | 'subcortical-gray'
  | 'white-matter'
  | 'cerebellum'
  | 'brainstem'
  | 'meninges'
  | 'csf'
  | 'bone'
  | 'cartilage'
  | 'tooth'
  | 'muscle'
  | 'ligament'
  | 'artery'
  | 'vein'
  | 'nerve'
  | 'gland'
  | 'eye'
  | 'airway'
  | 'context-soft-tissue'
  | 'iron'

export type FunctionalSystem =
  | 'executive-control'
  | 'language-control'
  | 'sensorimotor'
  | 'frontoparietal-attention'
  | 'limbic-memory'
  | 'basal-ganglia-loop'
  | 'salience-cingulo-opercular'
  | 'visual'
  | 'auditory'
  | 'thalamic-relay'
  | 'brainstem-autonomic'
  | 'cerebellar-coordination'
  | 'white-matter-communication'
  | 'csf-ventricular'
  | 'vascular'
  | 'cranial-nerve'
  | 'meningeal-protection'
  | 'skeletal-support'
  | 'musculoskeletal'
  | 'sensory-organ'
  | 'airway-oral'
  | 'endocrine'
  | 'other'

export const ANATOMICAL_MATERIAL_COLORS: Record<AnatomicalMaterialRole, string> = {
  'brain-cortex': '#d7b8a8',
  'subcortical-gray': '#b69a8e',
  'white-matter': '#eadfca',
  cerebellum: '#c9b3a6',
  brainstem: '#b99383',
  meninges: '#d6c5ae',
  csf: '#9fc7d8',
  bone: '#e6dcc8',
  cartilage: '#d9ded5',
  tooth: '#f0eadc',
  muscle: '#b86c5d',
  ligament: '#c7b99e',
  artery: '#c45646',
  vein: '#526f9f',
  nerve: '#d8c36a',
  gland: '#bf8f9d',
  eye: '#dbe7ee',
  airway: '#c69b86',
  'context-soft-tissue': '#a8917c',
  iron: '#5a554b',
}

export const CUT_AXIS_COLORS = {
  sagittal: 0xff5a4f,
  coronal: 0x77c85b,
  axial: 0x35a6ff,
} as const

export const PRESET_HUE_SATURATION = 0.46
export const PRESET_HUE_LIGHTNESS = 0.52
export const PRESET_COLOR_EMISSIVE_INTENSITY = 0.22
export const ATLAS_PARCEL_SATURATION = 0.52
export const ATLAS_PARCEL_LIGHTNESS = 0.56

export const FUNCTION_COLORS: Record<FunctionalSystem, string> = {
  'executive-control': '#bd6f45',
  'language-control': '#c4864f',
  sensorimotor: '#826da2',
  'frontoparietal-attention': '#5f86b2',
  'limbic-memory': '#b45d70',
  'basal-ganglia-loop': '#5f8f84',
  'salience-cingulo-opercular': '#a19a54',
  visual: '#6f9f69',
  auditory: '#8f73a6',
  'thalamic-relay': '#8b8e5f',
  'brainstem-autonomic': '#9c7868',
  'cerebellar-coordination': '#7d9c9c',
  'white-matter-communication': '#b6ab8d',
  'csf-ventricular': '#6fa5b9',
  vascular: '#a95f5b',
  'cranial-nerve': '#bcae55',
  'meningeal-protection': '#a89a7a',
  'skeletal-support': '#a99d87',
  musculoskeletal: '#a8685f',
  'sensory-organ': '#6f9aa8',
  'airway-oral': '#b58672',
  endocrine: '#ad7488',
  other: '#7d756c',
}

export const LATERALITY_COLORS = {
  left: '#6f86a6',
  right: '#c2724a',
  midline: '#9a9a92',
} as const

export const REGION_COLORS: Record<string, string> = {
  telencephalon: '#bd704a',
  diencephalon: '#8f8b56',
  brainstem: '#9b7566',
  'cerebellum-grp': '#769996',
  ventricles: '#6ca8bb',
  commissures: '#b5aa8c',
  'meninges-grp': '#a89878',
  vasculature: '#ad625c',
  'cranial-nerves': '#bdae56',
  'visual-pathway': '#6d9d69',
}

export const COLOR_ROLE_VALUES = [
  'cognition',
  'emotion',
  'motivation',
  'lesion',
  'working-memory',
  'posterior-storage',
  'abstract-control',
  'context-control',
  'selection-control',
  'response-control',
  'conflict-monitoring',
  'affective-control',
  'frontoparietal-control',
  'motor-planning',
  'task-activation',
] as const

export type ColorRole = typeof COLOR_ROLE_VALUES[number]
