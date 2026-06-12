// Alle Positionen und Targets in MNI152 RAS mm (Invariante I-1).
// RAS-Konvention: X=Right(+), Y=Anterior(+), Z=Superior(+).
// Three-Welt ist Y-up; getPresetWorld() transformiert beim Lesen via rasToWorld().
// Der oeffentliche Katalog liefert nur kanonische, namespaced IDs; Legacy-IDs
// werden beim Lesen ueber normalizePresetId() auf diese IDs abgebildet.

import { rasToWorld, Vec3 } from "./coords";

export type { Vec3 };

export type CameraFamily = "shot" | "focus" | "review";

export interface CameraPreset {
  position: Vec3; // RAS mm
  target: Vec3;   // RAS mm
  fov: number;    // Grad
}

export interface CameraCatalogEntry extends CameraPreset {
  family: CameraFamily;
  label?: string;
  description?: string;
  intendedRegion?: string;
  tags?: string[];
}

const CATALOG: Record<string, CameraCatalogEntry> = {
  "shot:lateral-left": {
    family: "shot",
    position: [-360, 150, 150],
    target: [0, 0, 0],
    fov: 42,
    label: "Lateral links",
  },
  "shot:lateral-right": {
    family: "shot",
    position: [360, 150, 150],
    target: [0, 0, 0],
    fov: 42,
    label: "Lateral rechts",
  },
  "shot:medial-left": {
    family: "shot",
    position: [80, 0, 10],
    target: [0, 0, 10],
    fov: 42,
    label: "Medial links",
  },
  "shot:medial-right": {
    family: "shot",
    position: [-80, 0, 10],
    target: [0, 0, 10],
    fov: 42,
    label: "Medial rechts",
  },
  "shot:anterior": {
    family: "shot",
    position: [0, 360, 30],
    target: [0, 0, 10],
    fov: 42,
    label: "Anterior",
  },
  "shot:posterior": {
    family: "shot",
    position: [0, -360, 30],
    target: [0, 0, 10],
    fov: 42,
    label: "Posterior",
  },
  "shot:superior": {
    family: "shot",
    position: [0, 30, 360],
    target: [0, -10, 0],
    fov: 42,
    label: "Superior",
  },
  "shot:inferior": {
    family: "shot",
    position: [0, 30, -360],
    target: [0, -10, 0],
    fov: 42,
    label: "Inferior",
  },
  "focus:pfc-hero": {
    family: "focus",
    position: [-220, 240, 150],
    target: [30, 40, 15],
    fov: 38,
    label: "PFC Hero",
    intendedRegion: "pfc",
  },
  "focus:bg-hero": {
    family: "focus",
    position: [200, 150, 100],
    target: [0, 0, -10],
    fov: 38,
    label: "Basalganglien Hero",
    intendedRegion: "basal-ganglia",
  },
  "focus:broca": {
    family: "focus",
    position: [-260, 180, 120],
    target: [-54, 14, 8],
    fov: 34,
    label: "Broca",
    intendedRegion: "broca",
  },
  "focus:wernicke": {
    family: "focus",
    position: [260, -220, 120],
    target: [54, -54, 10],
    fov: 34,
    label: "Wernicke",
    intendedRegion: "wernicke",
  },
  "focus:amygdala": {
    family: "focus",
    position: [220, 120, -130],
    target: [30, -4, -20],
    fov: 34,
    label: "Amygdala",
    intendedRegion: "amygdala",
  },
  "focus:precuneus": {
    family: "focus",
    position: [-40, -250, 220],
    target: [-8, -62, 50],
    fov: 34,
    label: "Precuneus",
    intendedRegion: "precuneus",
  },
  "focus:vmpfc": {
    family: "focus",
    position: [0, 220, -120],
    target: [0, 48, -12],
    fov: 34,
    label: "vmPFC",
    intendedRegion: "vmpfc",
  },
  "review:cranial-top": {
    family: "review",
    position: [0, 0, 390],
    target: [0, 0, 0],
    fov: 40,
    label: "Cranial Top",
  },
  "review:left-frontal-oblique": {
    family: "review",
    position: [-320, 220, 180],
    target: [0, 10, 5],
    fov: 40,
    label: "Links frontal schraeg",
  },
  "review:right-parietal-oblique": {
    family: "review",
    position: [300, -220, 170],
    target: [0, -15, 20],
    fov: 40,
    label: "Rechts parietal schraeg",
  },
  "review:occipital-oblique": {
    family: "review",
    position: [0, -320, 150],
    target: [0, -40, 20],
    fov: 40,
    label: "Occipital schraeg",
  },
};

const LEGACY_ALIASES: Record<string, string> = {
  "lateral-left-45": "shot:lateral-left",
  "lateral-right-45": "shot:lateral-right",
  "medial-left": "shot:medial-left",
  "medial-right": "shot:medial-right",
  "anterior": "shot:anterior",
  "posterior": "shot:posterior",
  "superior": "shot:superior",
  "inferior": "shot:inferior",
  "hero-pfc": "focus:pfc-hero",
  "hero-bg": "focus:bg-hero",
};

export function listPresets(): string[] {
  return Object.keys(CATALOG);
}

export function normalizePresetId(id: string): string {
  const trimmed = id.trim();
  if (CATALOG[trimmed]) return trimmed;
  const alias = LEGACY_ALIASES[trimmed];
  if (alias) return alias;
  throw new Error(`unknown camera preset: ${id}`);
}

export function normalizePresetIds(ids: string[]): string[] {
  return [...new Set(ids.map(normalizePresetId))];
}

export function getPreset(id: string): CameraCatalogEntry {
  return CATALOG[normalizePresetId(id)];
}

export function getPresetWorld(id: string): CameraCatalogEntry {
  const p = getPreset(id);
  return {
    ...p,
    position: rasToWorld(p.position),
    target: rasToWorld(p.target),
  };
}
