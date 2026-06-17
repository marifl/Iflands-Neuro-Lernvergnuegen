import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadScenes, sceneIndexForLocation, type LoadedScene } from './scenes'
import { SceneSchema } from './types'

const scene = (id: string, order: number, overrides: Record<string, unknown> = {}) => ({
  id,
  section: '11.4',
  author: 'ifland',
  order,
  title: id,
  brain: { regions: ['acc-cingulum'], camera: 'medial-midline' },
  overlay: { kind: 'prose', position: 'right', size: 'md' },
  companion: { summary: 'x', sources: [] },
  ...overrides,
})

const configNode = (sceneId: string, camera: Record<string, unknown> = { shot: 'lateral-left', fit: 'bounds', margin: 2, fov: 35 }) => ({
  label_de: sceneId,
  camera,
  overlay: { scene: sceneId },
  scopes: {},
})

const configWith = (steps: string[], configurations: Record<string, unknown>) => ({
  preset: 'kapitel11',
  presets: { kapitel11: { label_de: 'Kapitel 11', scopes: {} } },
  configurations,
  presentation: {},
  learning: {
    'kapitel11-pfad': {
      label_de: 'Lernpfad Kapitel 11',
      steps,
    },
  },
})

function mockFetch(routes: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (!(url in routes)) return new Response('', { status: 404 })
    return new Response(JSON.stringify(routes[url]), { status: 200 })
  }))
}

const valid = scene('p3a', 40, {
  figure: '11-15(1)',
  title: 'P3a',
  overlay: {
    kind: 'erp',
    position: 'right',
    size: 'md',
    data: { x: 'ms', series: [{ label: 'No-go', points: [[1, 0], [2, -1]] }], markers: [] },
  },
})

const catalog = {
  version: '1',
  space_note: '',
  axes: [{ id: 'cyto', label_de: '', sub_de: '' }],
  atlases: [{
    id: 'julich',
    axis: 'cyto',
    label_de: '',
    groups: [{
      id: 'frontal',
      label_de: '',
      areas: [{
        id: 'julich:area-45:l',
        label_de: '',
        side: 'L',
        hosts: ['inferior-frontal-gyrus'],
        taro_present: true,
        lobe: 'frontal',
        refs: { canonical_lut: { layer: 'julich', label_id: 2, hemi: 'L' }, carve: [] },
        context: {},
        provenance: { source: 'julich', affine_det: null, backfill: false },
      }],
    }],
  }],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SceneSchema', () => {
  it('akzeptiert eine valide Szene', () => {
    expect(SceneSchema.parse(valid).id).toBe('p3a')
  })
  it('lehnt unbekannten overlay.kind laut ab', () => {
    expect(() => SceneSchema.parse({ ...valid, overlay: { ...valid.overlay, kind: 'xxx' } })).toThrow()
  })
})

describe('loadScenes', () => {
  it('laedt Szenen in Config-Sequenzreihenfolge statt nach order', async () => {
    mockFetch({
      '/assets/atlas-canonical/atlas-config.json': configWith(
        ['vcpt', 'p3a-konfliktmonitoring'],
        {
          vcpt: configNode('vcpt'),
          'p3a-konfliktmonitoring': configNode('p3a-konfliktmonitoring'),
        },
      ),
      '/scenes/vcpt.json': scene('vcpt', 50),
      '/scenes/p3a-konfliktmonitoring.json': scene('p3a-konfliktmonitoring', 10),
    })

    await expect(loadScenes()).resolves.toMatchObject([
      {
        id: 'vcpt',
        configName: 'vcpt',
        configCamera: { shot: 'lateral-left', fit: 'bounds', margin: 2, fov: 35 },
        sequence: { kind: 'learning', name: 'kapitel11-pfad', label: 'Lernpfad Kapitel 11', stepIndex: 0, stepCount: 2 },
      },
      {
        id: 'p3a-konfliktmonitoring',
        configName: 'p3a-konfliktmonitoring',
        configCamera: { shot: 'lateral-left', fit: 'bounds', margin: 2, fov: 35 },
        sequence: { kind: 'learning', name: 'kapitel11-pfad', label: 'Lernpfad Kapitel 11', stepIndex: 1, stepCount: 2 },
      },
    ])
  })

  it('loest camera.target fuer fit=target in Scene-Konfigurationen auf Host-Meshes', async () => {
    mockFetch({
      '/assets/atlas-canonical/atlas-config.json': configWith(
        ['p3a-konfliktmonitoring'],
        {
          'p3a-konfliktmonitoring': configNode('p3a-konfliktmonitoring', {
            target: 'julich:area-45:l',
            shot: 'lateral-left',
            fit: 'target',
            margin: 1.4,
          }),
        },
      ),
      '/assets/atlas-canonical/atlas-ontology.json': catalog,
      '/scenes/p3a-konfliktmonitoring.json': scene('p3a-konfliktmonitoring', 10),
    })

    await expect(loadScenes()).resolves.toMatchObject([
      {
        id: 'p3a-konfliktmonitoring',
        configName: 'p3a-konfliktmonitoring',
        configCamera: { target: 'julich:area-45:l', shot: 'lateral-left', fit: 'target', margin: 1.4 },
        configCameraTargetMeshes: ['left-inferior-frontal-gyrus'],
      },
    ])
  })

  it('wirft laut, wenn ein Sequenz-Step keine Configuration ist', async () => {
    mockFetch({
      '/assets/atlas-canonical/atlas-config.json': configWith(['fehlt'], {}),
    })

    await expect(loadScenes()).rejects.toThrow('Sequenz-Step "fehlt" nicht als Configuration definiert')
  })

  it('wirft laut, wenn ein Sequenz-Step keine Scene-Zuordnung hat', async () => {
    mockFetch({
      '/assets/atlas-canonical/atlas-config.json': configWith(
        ['vcpt'],
        { vcpt: { label_de: 'VCPT', scopes: {} } },
      ),
    })

    await expect(loadScenes()).rejects.toThrow('Sequenz-Step "vcpt" hat kein overlay.scene')
  })

  it('laedt Presentation-Sequenzen als first-class Scene-Quelle', async () => {
    mockFetch({
      '/assets/atlas-canonical/atlas-config.json': {
        ...configWith([], {
          vcpt: configNode('vcpt'),
        }),
        presentation: { 'kapitel11-vorlesung': { label_de: 'Vorlesung', steps: ['vcpt'] } },
      },
      '/scenes/vcpt.json': scene('vcpt', 10),
    })

    await expect(loadScenes({
      sequenceKind: 'presentation',
      sequenceName: 'kapitel11-vorlesung',
    })).resolves.toMatchObject([
      {
        id: 'vcpt',
        configName: 'vcpt',
        sequence: { kind: 'presentation', name: 'kapitel11-vorlesung', label: 'Vorlesung', stepIndex: 0, stepCount: 1 },
      },
    ])
  })

  it('wirft laut bei doppelten Sequenz-Steps', async () => {
    mockFetch({
      '/assets/atlas-canonical/atlas-config.json': configWith(
        ['vcpt', 'vcpt'],
        { vcpt: configNode('vcpt') },
      ),
    })

    await expect(loadScenes()).rejects.toThrow('Sequenz enthaelt doppelten Step "vcpt"')
  })

  it('erlaubt wiederverwendete Scene-Zuordnungen fuer eindeutige Config-Steps', async () => {
    mockFetch({
      '/assets/atlas-canonical/atlas-config.json': configWith(
        ['vcpt-a', 'vcpt-b'],
        {
          'vcpt-a': configNode('vcpt'),
          'vcpt-b': configNode('vcpt'),
        },
      ),
      '/scenes/vcpt.json': scene('vcpt', 10),
    })

    await expect(loadScenes()).resolves.toMatchObject([
      { id: 'vcpt', configName: 'vcpt-a' },
      { id: 'vcpt', configName: 'vcpt-b' },
    ])
  })

  it('wirft laut, wenn die Scene-Datei eine andere id enthaelt', async () => {
    mockFetch({
      '/assets/atlas-canonical/atlas-config.json': configWith(
        ['vcpt'],
        { vcpt: configNode('vcpt') },
      ),
      '/scenes/vcpt.json': scene('andere-id', 10),
    })

    await expect(loadScenes()).rejects.toThrow('vcpt.json enthaelt id "andere-id"')
  })
})

describe('sceneIndexForLocation', () => {
  const loaded = (id: string, order: number, configName = id): LoadedScene => ({
    ...SceneSchema.parse(scene(id, order)),
    configName,
    configCameraTargetMeshes: [],
    sequence: {
      kind: 'learning',
      name: 'kapitel11-pfad',
      label: 'Lernpfad Kapitel 11',
      stepIndex: order,
      stepCount: 3,
    },
  })
  const scenes = [
    loaded('vcpt', 50),
    loaded('p3a-konfliktmonitoring', 10),
  ]

  it('akzeptiert konsistente config/scene Deep-Links', () => {
    expect(
      sceneIndexForLocation(scenes, {
        configName: 'vcpt',
        sceneId: 'vcpt',
        step: 0,
      }),
    ).toBe(0)
  })

  it('nutzt configName zur Disambiguierung wiederverwendeter Scene-IDs', () => {
    const duplicateSceneId = [
      loaded('vcpt', 50, 'vcpt-a'),
      loaded('vcpt', 50, 'vcpt-b'),
    ]

    expect(
      sceneIndexForLocation(duplicateSceneId, {
        configName: 'vcpt-b',
        sceneId: 'vcpt',
        step: 0,
      }),
    ).toBe(1)
  })

  it('wirft laut bei config/scene-Mismatch', () => {
    expect(() =>
      sceneIndexForLocation(scenes, {
        configName: 'vcpt',
        sceneId: 'p3a-konfliktmonitoring',
        step: 0,
      }),
    ).toThrow('URL-Config "vcpt" verweist auf Scene "vcpt", URL-Scene "p3a-konfliktmonitoring" passt nicht')
  })

  it('laesst reine scene- und config-Deep-Links unveraendert zu', () => {
    expect(sceneIndexForLocation(scenes, { configName: null, sceneId: 'p3a-konfliktmonitoring', step: 0 })).toBe(1)
    expect(sceneIndexForLocation(scenes, { configName: 'p3a-konfliktmonitoring', sceneId: null, step: 0 })).toBe(1)
  })
})
