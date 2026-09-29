import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught uncaught error:', error, errorInfo)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="dot-grid-subtle flex min-h-[100dvh] w-full flex-col items-center justify-center bg-canvas p-6 text-fg">
          <div className="panel flex max-w-md flex-col items-center gap-5 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-control border border-accent/30 bg-accent-subtle text-accent">
              <AlertTriangle size={22} />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="label text-fg">System Interrupt</h2>
              <p className="text-xs leading-relaxed text-muted">
                Ein unerwarteter Fehler ist aufgetreten. Deine bisherigen Daten sind sicher in
                deiner lokalen Datenbank gespeichert.
              </p>
            </div>
            {this.state.error?.message ? (
              <pre className="max-h-32 w-full overflow-auto rounded-control border border-line bg-track p-3 text-left font-mono text-xs text-muted">
                {this.state.error.message}
              </pre>
            ) : null}
            <button
              type="button"
              onClick={this.handleReload}
              className="btn-primary mt-1 h-11 !px-5"
            >
              <RotateCcw size={14} />
              <span>App neu laden</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
