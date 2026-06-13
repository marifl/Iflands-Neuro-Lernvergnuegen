import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app.css'
import BodyParts3DViewer from './viewer/BodyParts3DViewer'
import { useViewerStore } from './viewer/viewerStore'

// Theme vor dem ersten Paint anwenden (kein Flash). Default: dunkel (kein Attribut).
if (localStorage.getItem('ed-theme') === 'light') {
  document.documentElement.dataset.theme = 'light'
}

// Start-Grundmodus aus ?mode=explore; sonst die Lern-Experience (Default).
if (new URLSearchParams(window.location.search).get('mode') === 'explore') {
  useViewerStore.getState().setAppMode('explore')
}

const root = document.getElementById('root')!
createRoot(root).render(
  <StrictMode>
    <BodyParts3DViewer />
  </StrictMode>,
)
