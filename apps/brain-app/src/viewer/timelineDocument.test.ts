import { describe, expect, it } from 'vitest'
import {
  TIMELINE_DOCUMENT_SCHEMA_VERSION,
  parseTimelineDocument,
  toTimelineDocumentJson,
  type TimelineDocument,
} from './timelineDocument'

const lectureTimeline: TimelineDocument = {
  schemaVersion: TIMELINE_DOCUMENT_SCHEMA_VERSION,
  timelineId: 'vcpt-p3a-authoring-demo',
  title: 'VCPT und P3a Device-Sequenz',
  source: 'Kapitel 11 Vortrag',
  restore: {
    stepId: 'p3a-device-step',
    keyframeId: 'p3a-device-highlight',
    route: {
      configName: 'vcpt-p3a',
      sceneId: 'vcpt-erp',
      step: 2,
    },
  },
  steps: [
    {
      stepId: 'p3a-device-step',
      order: 1,
      durationMs: 6000,
      keyframes: [
        {
          keyframeId: 'p3a-device-highlight',
          atMs: 0,
          channels: {
            camera: {
              view: 'left-lateral',
              pose: {
                position: [1, 2, 3],
                target: [0, 0, 0],
                fov: 38,
              },
            },
            overlay: {
              sceneId: 'vcpt-erp',
              configName: 'vcpt-p3a',
              title: 'P3a bei Novelty Detection',
              body: 'Fronto-zentrale Aufmerksamkeitssignale als Device-Kontext.',
            },
            labels: [
              {
                labelId: 'fz-label',
                targetRef: { targetKind: 'eeg-site', collectionId: 'device-eeg-10-20', eegSite: 'Fz' },
                text: 'Fz',
                visible: true,
              },
            ],
            annotations: [
              {
                annotationId: 'acc-note',
                targetRef: {
                  targetKind: 'ontology-node',
                  collectionId: 'taro',
                  ontologyNodeId: 'left-anterior-cingulate-gyrus',
                },
                label: 'ACC',
                body: 'Konfliktmonitoring als P3a-Kontext.',
                visible: true,
              },
            ],
            contexts: [
              {
                contextId: 'ctx:vcpt-p3a',
                collectionId: 'case-vcpt-erp',
                active: true,
              },
            ],
            collections: [
              {
                collectionId: 'device-eeg-10-20',
                visible: true,
              },
            ],
            objects: [
              {
                targetRef: {
                  targetKind: 'asset-instance',
                  collectionId: 'device-eeg-10-20',
                  instanceId: 'eeg-cap-01',
                },
                visible: true,
                transform: {
                  position: [0, 1.2, 0],
                  rotation: [0, 0, 0],
                  scale: [0.8, 0.8, 0.8],
                },
              },
            ],
            animation: [
              {
                bindingId: 'p3a-pulse',
                clipId: 'clip:p3a-pulse',
                targetRef: {
                  targetKind: 'asset-part',
                  collectionId: 'device-eeg-10-20',
                  instanceId: 'eeg-cap-01',
                  partId: 'electrode-fz',
                },
                action: 'play',
                timeMs: 1200,
                loop: false,
              },
            ],
          },
        },
      ],
    },
  ],
}

describe('TimelineDocument contract', () => {
  it('roundtript einen lecture-nahen Timeline-Vertrag mit allen Channels', () => {
    const parsed = parseTimelineDocument(lectureTimeline)
    const json = toTimelineDocumentJson(parsed)

    expect(parseTimelineDocument(JSON.parse(json))).toEqual(parsed)
    expect(JSON.parse(json)).toEqual(lectureTimeline)
    expect(parsed.restore).toEqual({
      stepId: 'p3a-device-step',
      keyframeId: 'p3a-device-highlight',
      route: { configName: 'vcpt-p3a', sceneId: 'vcpt-erp', step: 2 },
    })
  })

  it('erhaelt SequenceTargetRefs und Objekt-Transforms exakt', () => {
    const keyframe = parseTimelineDocument(lectureTimeline).steps[0].keyframes[0]

    expect(keyframe.channels.labels?.[0].targetRef).toEqual({
      targetKind: 'eeg-site',
      collectionId: 'device-eeg-10-20',
      eegSite: 'Fz',
    })
    expect(keyframe.channels.objects?.[0].transform).toEqual({
      position: [0, 1.2, 0],
      rotation: [0, 0, 0],
      scale: [0.8, 0.8, 0.8],
    })
    expect(keyframe.channels.animation?.[0].targetRef).toEqual({
      targetKind: 'asset-part',
      collectionId: 'device-eeg-10-20',
      instanceId: 'eeg-cap-01',
      partId: 'electrode-fz',
    })
  })

  it('laesst optionale Channels weg, ohne stille Defaults einzufuegen', () => {
    const parsed = parseTimelineDocument({
      schemaVersion: TIMELINE_DOCUMENT_SCHEMA_VERSION,
      timelineId: 'minimal-sequence',
      restore: {
        stepId: 'intro',
        keyframeId: 'intro-start',
      },
      steps: [
        {
          stepId: 'intro',
          order: 0,
          durationMs: 1000,
          keyframes: [
            {
              keyframeId: 'intro-start',
              atMs: 0,
              channels: {},
            },
          ],
        },
      ],
    })

    expect(parsed.title).toBeUndefined()
    expect(parsed.source).toBeUndefined()
    expect(parsed.restore.route).toBeUndefined()
    expect(parsed.steps[0].keyframes[0].channels.camera).toBeUndefined()
    expect(parsed.steps[0].keyframes[0].channels.objects).toBeUndefined()
  })

  it('lehnt ungueltige Versionen, Zeiten, IDs und Restore-Ziele laut ab', () => {
    expect(() => parseTimelineDocument({ ...lectureTimeline, schemaVersion: 999 })).toThrow(/schemaVersion/)
    expect(() => parseTimelineDocument({ ...lectureTimeline, timelineId: '' })).toThrow(/timelineId/)
    expect(() => parseTimelineDocument({
      ...lectureTimeline,
      steps: [{ ...lectureTimeline.steps[0], durationMs: Number.NaN }],
    })).toThrow(/durationMs/)
    expect(() => parseTimelineDocument({
      ...lectureTimeline,
      steps: [{
        ...lectureTimeline.steps[0],
        keyframes: [{ ...lectureTimeline.steps[0].keyframes[0], atMs: 7000 }],
      }],
    })).toThrow(/durationMs/)
    expect(() => parseTimelineDocument({
      ...lectureTimeline,
      restore: { stepId: 'ghost-step', keyframeId: 'p3a-device-highlight' },
    })).toThrow(/restore.stepId/)
    expect(() => parseTimelineDocument({
      ...lectureTimeline,
      steps: [lectureTimeline.steps[0], { ...lectureTimeline.steps[0] }],
    })).toThrow(/doppelte ID/)
  })

  it('lehnt ungueltige Channel-Ziele und Player-State-Werte laut ab', () => {
    expect(() => parseTimelineDocument({
      ...lectureTimeline,
      steps: [{
        ...lectureTimeline.steps[0],
        keyframes: [{
          ...lectureTimeline.steps[0].keyframes[0],
          channels: {
            labels: [{
              labelId: 'bad-eeg-site',
              targetRef: { targetKind: 'eeg-site', collectionId: 'device-eeg-10-20', eegSite: 'Unknown' },
              text: 'Unknown',
              visible: true,
            }],
          },
        }],
      }],
    })).toThrow(/eegSite/)

    expect(() => parseTimelineDocument({
      ...lectureTimeline,
      steps: [{
        ...lectureTimeline.steps[0],
        keyframes: [{
          ...lectureTimeline.steps[0].keyframes[0],
          channels: {
            animation: [{
              bindingId: 'bad-action',
              clipId: 'clip:p3a-pulse',
              action: 'rewind',
            }],
          },
        }],
      }],
    })).toThrow(/action/)
  })
})
