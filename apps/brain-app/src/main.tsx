import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app.css'
import AppErrorBoundary from './AppErrorBoundary'
import { getLocalStorageItem } from './safeLocalStorage'
import BodyParts3DViewer from './viewer/BodyParts3DViewer'
import { APP_MODES, useViewerStore, type AppMode } from './viewer/viewerStore'

// Theme vor dem ersten Paint anwenden (kein Flash). Default: dunkel (kein Attribut).
if (getLocalStorageItem('ed-theme') === 'light') {
  document.documentElement.dataset.theme = 'light'
}

// Start-Grundmodus aus Deep-Link: ?mode=<learn|explore|phineas> setzt den Modus direkt;
// ?mode=atlas ist DEBUG-ONLY (kanonischer fsaverage-Modus, nicht im Launcher/Modus-Flyout) — nur
// ueber diesen Deep-Link erreichbar. Ein ?scene=<id>-Link impliziert den Lern-Modus;
// ein ?config=<id>-Link oeffnet die Explorer-Shell ohne Launcher. Sonst ModeLauncher.
{
  const params = new URLSearchParams(window.location.search)
  const mode = params.get('mode')
  if (mode && APP_MODES.includes(mode as AppMode)) {
    useViewerStore.getState().setAppMode(mode as AppMode)
  } else if (params.has('scene')) {
    useViewerStore.getState().setAppMode('learn')
  } else if (params.has('config')) {
    useViewerStore.getState().setAppMode('explore')
  }
}

const root = document.getElementById('root')!
createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <BodyParts3DViewer />
    </AppErrorBoundary>
  </StrictMode>,
)
