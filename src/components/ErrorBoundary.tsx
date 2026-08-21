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
        <div className="flex min-h-screen w-full flex-col items-center justify-center p-6 bg-canvas text-fg">
          <div className="card flex max-w-md flex-col items-center gap-4 p-8 text-center shadow-xl border border-line">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-break/15 text-break">
              <AlertTriangle size={28} />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-fg">Etwas ist schiefgelaufen</h2>
              <p className="text-sm text-muted">
                Ein unerwarteter Fehler ist aufgetreten. Deine bisherigen Daten sind sicher in deiner lokalen Datenbank gespeichert.
              </p>
            </div>
            {this.state.error?.message && (
              <pre className="max-h-32 w-full overflow-auto rounded-lg bg-surface p-3 text-left font-mono text-xs text-muted border border-line/60">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="btn-primary mt-2 flex items-center gap-2 px-5 py-2.5"
            >
              <RotateCcw size={16} />
              <span>App neu laden</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
