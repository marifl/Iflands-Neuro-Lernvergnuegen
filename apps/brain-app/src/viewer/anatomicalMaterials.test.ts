import { DoubleSide, MeshStandardMaterial } from 'three'
import {
  contextColorForMode,
  contextFunctionSystem,
  createAnatomicalMaterial,
  contextAnatomicalMaterialRole,
  contextSide,
} from './anatomicalMaterials'
import { ANATOMICAL_MATERIAL_COLORS, FUNCTION_COLORS, LATERALITY_COLORS } from './atlasColorSystem'

describe('anatomicalMaterials', () => {
  it('klassifiziert Kontext-Meshes in anatomische Materialrollen', () => {
    expect(contextAnatomicalMaterialRole('right-anterior-parietal-artery')).toBe('artery')
    expect(contextAnatomicalMaterialRole('right-superficial-temporal-vein')).toBe('vein')
    expect(contextAnatomicalMaterialRole('left-optic-nerve')).toBe('nerve')
    expect(contextAnatomicalMaterialRole('right-parietal-bone')).toBe('bone')
    expect(contextAnatomicalMaterialRole('left-superior-pharyngeal-constrictor')).toBe('muscle')
    expect(contextAnatomicalMaterialRole('lip')).toBe('airway')
  })

  it('liefert globale Modusfarben fuer Kontextobjekte', () => {
    expect(contextSide('left-optic-nerve')).toBe('left')
    expect(contextSide('dental-branch-of-right-inferior-alveolar-artery')).toBe('right')
    expect(contextFunctionSystem('artery')).toBe('vascular')
    expect(contextFunctionSystem('bone')).toBe('skeletal-support')
    expect(contextColorForMode('left-optic-nerve', 'laterality')).toBe(LATERALITY_COLORS.left)
    expect(contextColorForMode('right-parietal-bone', 'function')).toBe(FUNCTION_COLORS['skeletal-support'])
    expect(contextColorForMode('right-parietal-bone', 'anatomical')).toBe(ANATOMICAL_MATERIAL_COLORS.bone)
  })

  it('erzeugt wiederverwendbare MeshStandardMaterial-Profile fuer lifelike Anatomie', () => {
    const material = createAnatomicalMaterial('brain-cortex', { enableBumpMap: true, side: DoubleSide })

    expect(material).toBeInstanceOf(MeshStandardMaterial)
    expect(material.color.getHexString()).toBe(ANATOMICAL_MATERIAL_COLORS['brain-cortex'].slice(1))
    expect(material.roughness).toBeGreaterThan(0.7)
    expect(material.metalness).toBe(0)
    expect(material.bumpMap).not.toBeNull()
    expect(material.bumpScale).toBeGreaterThan(0)
    expect(material.side).toBe(DoubleSide)
  })

  it('deaktiviert UV-abhaengige Bumpmaps ohne explizite UV-Freigabe', () => {
    const material = createAnatomicalMaterial('brain-cortex')

    expect(material.bumpMap).toBeNull()
    expect(material.bumpScale).toBe(0)
  })
})
