import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Html } from '@react-three/drei'
import { ShellStateBlock } from './ShellStatePrimitives'

type CanvasState = 'loading' | 'empty' | 'error'

export function CanvasStatePanel({
  state,
  title,
  detail,
}: {
  state: CanvasState
  title: string
  detail: string
}) {
  return (
    <div style={{ width: 280, maxWidth: 'calc(100vw - 32px)' }}>
      <ShellStateBlock state={state} title={title} detail={detail} />
    </div>
  )
}

export function CanvasStateHtml({
  state,
  title,
  detail,
}: {
  state: CanvasState
  title: string
  detail: string
}) {
  return (
    <Html center style={{ pointerEvents: 'none' }}>
      <CanvasStatePanel state={state} title={title} detail={detail} />
    </Html>
  )
}

type CanvasContentErrorBoundaryProps = {
  children: ReactNode
  resetKey: string
  renderFallback?: (error: Error) => ReactNode
}

type CanvasContentErrorBoundaryState = {
  error: Error | null
}

export class CanvasContentErrorBoundary extends Component<
  CanvasContentErrorBoundaryProps,
  CanvasContentErrorBoundaryState
> {
  state: CanvasContentErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): CanvasContentErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('CanvasContentErrorBoundary', error, info.componentStack)
  }

  componentDidUpdate(previousProps: CanvasContentErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.renderFallback) return this.props.renderFallback(this.state.error)
    return (
      <CanvasStateHtml
        state="error"
        title="3D-Ansicht nicht ladbar"
        detail={this.state.error.message || 'Der aktuelle 3D-Layer hat einen Fehler gemeldet.'}
      />
    )
  }
}
