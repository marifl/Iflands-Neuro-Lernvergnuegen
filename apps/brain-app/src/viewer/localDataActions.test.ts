import { beforeEach, describe, expect, it } from 'vitest'
import { useAtlasConfigStore, LS_KEY as ATLAS_CONFIG_OVERRIDES_STORAGE_KEY } from './atlas/atlasConfigStore'
import {
  clearLocalBrainAppData,
  importViewerSnapshotFile,
  summarizeStudentProgress,
  THEME_STORAGE_KEY,
} from './localDataActions'
import { SETTINGS_STORAGE_KEY, useSettingsStore } from './settingsStore'
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
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    localStorage.setItem('unrelated-key', 'bleibt')
    document.documentElement.dataset.theme = 'light'

    clearLocalBrainAppData()

    expect(useSettingsStore.getState().dataAccount.role).toBe('student')
    expect(useStudentProgressStore.getState().progress).toBeNull()
    expect(useAtlasConfigStore.getState().preset).toBeNull()
    expect(useAtlasConfigStore.getState().scopes).toEqual({})
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(ATLAS_CONFIG_OVERRIDES_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem('unrelated-key')).toBe('bleibt')
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })
})
