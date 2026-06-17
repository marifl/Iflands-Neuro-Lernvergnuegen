import { removeLocalStorageItem } from '../safeLocalStorage'
import { useAtlasConfigStore, LS_KEY as ATLAS_CONFIG_OVERRIDES_STORAGE_KEY } from './atlas/atlasConfigStore'
import { SETTINGS_STORAGE_KEY, useSettingsStore } from './settingsStore'
import {
  studentCompletionRatio,
  useStudentProgressStore,
  type StudentProgressState,
} from './studentProgress'
import { exportViewerStateSnapshotJson, importViewerStateSnapshotJson } from './viewerStateSnapshot'

export const THEME_STORAGE_KEY = 'ed-theme'

export function readSnapshotFile(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Snapshot-Datei konnte nicht gelesen werden'))
    reader.readAsText(file)
  })
}

export function downloadViewerSnapshot(now = new Date()): string {
  const filename = `brain-app-unterricht-${now.toISOString().replace(/[:.]/g, '-')}.json`
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('Snapshot-Export wird von dieser Umgebung nicht unterstuetzt')
  }
  const blob = new Blob([exportViewerStateSnapshotJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
  return filename
}

export async function importViewerSnapshotFile(file: File): Promise<void> {
  importViewerStateSnapshotJson(await readSnapshotFile(file))
}

export function summarizeStudentProgress(progress: StudentProgressState | null): string {
  if (!progress) return 'Kein Lernfortschritt gespeichert'
  const total = progress.steps.length
  if (total === 0) return '0/0 Schritte im Lernpfad'
  const checked = Math.round(studentCompletionRatio(progress) * total)
  const seen = progress.steps.filter((step) => step.status !== 'not-started').length
  return `${checked}/${total} Checks abgeschlossen, ${seen}/${total} Schritte gesehen`
}

export function clearLocalBrainAppData(): void {
  useSettingsStore.getState().resetSettings()
  useStudentProgressStore.getState().resetStudentProgress()
  useAtlasConfigStore.getState().reset()
  removeLocalStorageItem(ATLAS_CONFIG_OVERRIDES_STORAGE_KEY)
  removeLocalStorageItem(SETTINGS_STORAGE_KEY)
  removeLocalStorageItem(THEME_STORAGE_KEY)
  if (typeof document !== 'undefined') delete document.documentElement.dataset.theme
}
