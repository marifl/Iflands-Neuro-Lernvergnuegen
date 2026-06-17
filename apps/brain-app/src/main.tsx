import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app.css'
import AppErrorBoundary from './AppErrorBoundary'
import { getLocalStorageItem } from './safeLocalStorage'
import BodyParts3DViewer from './viewer/BodyParts3DViewer'
import { loadSettings } from './viewer/settingsStore'
import { startupAppModeFromSettings } from './viewer/settingsRuntime'
import { useViewerStore } from './viewer/viewerStore'

// Theme vor dem ersten Paint anwenden (kein Flash). Default: dunkel (kein Attribut).
if (getLocalStorageItem('ed-theme') === 'light') {
  document.documentElement.dataset.theme = 'light'
}

function isStandaloneDisplayMode() {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function applyDisplayModeDataset() {
  document.documentElement.dataset.displayMode = isStandaloneDisplayMode() ? 'standalone' : 'browser'
}

applyDisplayModeDataset()
window.matchMedia('(display-mode: standalone)').addEventListener('change', applyDisplayModeDataset)

// Deep-Link bleibt vorrangig. Settings greifen nur beim normalen App-Start ohne Inhalts-Route.
{
  const mode = startupAppModeFromSettings(window.location.search, loadSettings())
  if (mode) useViewerStore.getState().setAppMode(mode)
}

const root = document.getElementById('root')!
createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <BodyParts3DViewer />
    </AppErrorBoundary>
  </StrictMode>,
)
