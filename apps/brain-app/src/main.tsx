import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app.css'
import BodyParts3DViewer from './viewer/BodyParts3DViewer'
import SceneStage from './scene/SceneStage'

// Theme vor dem ersten Paint anwenden (kein Flash). Default: dunkel (kein Attribut).
if (localStorage.getItem('ed-theme') === 'light') {
  document.documentElement.dataset.theme = 'light'
}

// Explorer-Modus via ?mode=explore; sonst die Lern-Experience (Default).
// SceneStage rendert den Viewer intern bereits -> im Default-Pfad NICHT zusaetzlich mounten.
const explore = new URLSearchParams(window.location.search).get('mode') === 'explore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {explore ? <BodyParts3DViewer /> : <SceneStage />}
  </StrictMode>,
)
