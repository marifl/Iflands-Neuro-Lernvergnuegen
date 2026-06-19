import { Component, type ErrorInfo, type ReactNode } from 'react'
import { removeLocalStorageItem } from './safeLocalStorage'
import { LOCAL_BRAIN_APP_STORAGE_KEYS } from './localAppStorageKeys'

interface AppErrorBoundaryState {
  error: Error | null
}

export default class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('AppErrorBoundary', error, info.componentStack)
  }

  private reload = () => {
    window.location.reload()
  }

  private resetLocalState = () => {
    for (const key of LOCAL_BRAIN_APP_STORAGE_KEYS) removeLocalStorageItem(key)
    window.history.replaceState(null, '', window.location.pathname)
    this.setState({ error: null })
  }

  render() {
    const error = this.state.error
    if (!error) return this.props.children

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          background: 'var(--app-bg)',
          color: 'var(--ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          boxSizing: 'border-box',
        }}
      >
        <div className="ed-frame ed-panel" style={{ maxWidth: 620, width: '100%', padding: 24 }}>
          <div className="eyebrow">Startfehler</div>
          <h1
            style={{
              fontFamily: 'var(--ed-display)',
              fontSize: 22,
              lineHeight: 1.15,
              margin: '8px 0 10px',
            }}
          >
            Die App konnte nicht starten
          </h1>
          <p style={{ fontFamily: 'var(--ed-mono)', fontSize: 12, lineHeight: 1.55, margin: 0, color: 'var(--g700)' }}>
            {error.message}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
            <button type="button" className="ed-btn" onClick={this.reload}>
              Neu laden
            </button>
            <button type="button" className="ed-btn" onClick={this.resetLocalState}>
              Lokale Einstellungen zurücksetzen
            </button>
          </div>
        </div>
      </div>
    )
  }
}
