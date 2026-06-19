import { beforeEach, describe, expect, it } from 'vitest'
import { LOCAL_BRAIN_APP_STORAGE_KEYS } from '../localAppStorageKeys'
import { useAtlasConfigStore, LS_KEY as ATLAS_CONFIG_OVERRIDES_STORAGE_KEY } from './atlas/atlasConfigStore'
import {
  clearLocalBrainAppData,
  importViewerSnapshotFile,
  summarizeStudentProgress,
  THEME_STORAGE_KEY,
} from './localDataActions'
import { SETTINGS_STORAGE_KEY, useSettingsStore } from './settingsStore'
import { LAST_APP_MODE_STORAGE_KEY } from './settingsRuntime'
import {
  AUTHORING_COMMAND_HISTORY_STORAGE_KEY,
  AUTHORING_SNAPSHOT_STORAGE_KEY,
  AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
  useAuthoringSnapshotStore,
} from './authoringSnapshotStore'
import {
  createStudentProgressState,
  recordStudentCheck,
  useStudentProgressStore,
} from './studentProgress'
import { exportViewerStateSnapshotJson } from './viewerStateSnapshot'

function checkedProgress() {
  return recordStudentCheck(
    createStudentProgressState('kapitel11-pfad', [
      {
        configName: 'wcst-frontoparietal',
        sceneId: 'wcst-frontoparietal',
        title: 'WCST',
      },
    ]),
    'wcst-frontoparietal',
    'wcst-sort-rule',
    'passed',
    '2026-06-17T19:00:00.000Z',
  )
}

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  useSettingsStore.getState().resetSettings()
  useStudentProgressStore.getState().resetStudentProgress()
  useAtlasConfigStore.getState().reset()
  useAuthoringSnapshotStore.getState().resetAuthoringSnapshotState()
})

describe('localDataActions', () => {
  it('fasst Lernfortschritt kompakt zusammen', () => {
    expect(summarizeStudentProgress(null)).toBe('Kein Lernfortschritt gespeichert')
    expect(summarizeStudentProgress(checkedProgress())).toBe('1/1 Checks abgeschlossen, 1/1 Schritte gesehen')
  })

  it('importiert Unterrichts-Snapshots aus Dateien', async () => {
    const progress = checkedProgress()
    useStudentProgressStore.getState().setStudentProgress(progress)
    const snapshotJson = exportViewerStateSnapshotJson()
    useStudentProgressStore.getState().resetStudentProgress()

    await importViewerSnapshotFile(new File([snapshotJson], 'snapshot.json', { type: 'application/json' }))

    expect(useStudentProgressStore.getState().progress).toEqual(progress)
  })

  it('leert nur bekannte lokale App-Daten', () => {
    useSettingsStore.getState().updateCategory('dataAccount', { role: 'dozent' })
    useStudentProgressStore.getState().setStudentProgress(checkedProgress())
    useAtlasConfigStore.getState().setPreset('voll')
    useAuthoringSnapshotStore.getState().setAuthoringSnapshotState({
      schemaVersion: AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
      registryContext: { collectionIds: ['device-eeg-10-20'], bonusContextIds: [] },
      authoringScenes: [],
      timelines: [],
    })
    localStorage.setItem(LAST_APP_MODE_STORAGE_KEY, 'phineas')
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    for (const key of LOCAL_BRAIN_APP_STORAGE_KEYS) {
      if (!localStorage.getItem(key)) localStorage.setItem(key, 'stale')
    }
    localStorage.setItem('unrelated-key', 'bleibt')
    document.documentElement.dataset.theme = 'light'
    document.documentElement.dataset.contrast = 'high'
    document.documentElement.dataset.fontSize = 'large'
    document.documentElement.dataset.readableFont = 'true'
    document.documentElement.dataset.focusRings = 'off'
    document.documentElement.dataset.motion = 'reduce'
    document.documentElement.dataset.quietMode = 'true'

    clearLocalBrainAppData()

    expect(useSettingsStore.getState().dataAccount.role).toBe('student')
    expect(useStudentProgressStore.getState().progress).toBeNull()
    expect(useAtlasConfigStore.getState().preset).toBeNull()
    expect(useAtlasConfigStore.getState().scopes).toEqual({})
    expect(useAuthoringSnapshotStore.getState().authoring).toBeNull()
    expect(LOCAL_BRAIN_APP_STORAGE_KEYS).toEqual([
      ATLAS_CONFIG_OVERRIDES_STORAGE_KEY,
      AUTHORING_COMMAND_HISTORY_STORAGE_KEY,
      AUTHORING_SNAPSHOT_STORAGE_KEY,
      LAST_APP_MODE_STORAGE_KEY,
      SETTINGS_STORAGE_KEY,
      THEME_STORAGE_KEY,
    ])
    for (const key of LOCAL_BRAIN_APP_STORAGE_KEYS) expect(localStorage.getItem(key)).toBeNull()
    expect(localStorage.getItem('unrelated-key')).toBe('bleibt')
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(document.documentElement.dataset.contrast).toBeUndefined()
    expect(document.documentElement.dataset.fontSize).toBeUndefined()
    expect(document.documentElement.dataset.readableFont).toBeUndefined()
    expect(document.documentElement.dataset.focusRings).toBeUndefined()
    expect(document.documentElement.dataset.motion).toBeUndefined()
    expect(document.documentElement.dataset.quietMode).toBeUndefined()
  })
})
