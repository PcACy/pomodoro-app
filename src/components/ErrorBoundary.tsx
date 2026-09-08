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
        <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center p-6 bg-canvas text-fg dot-grid-subtle">
          <div className="card flex max-w-md flex-col items-center gap-4 p-8 text-center border border-line-strong bg-surface">
            <div className="flex h-12 w-12 items-center justify-center rounded-card border border-accent/30 bg-accent/10 text-accent">
              <AlertTriangle size={24} />
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-fg">System Interrupt</h2>
              <p className="font-mono text-xs text-muted leading-relaxed">
                Ein unerwarteter Fehler ist aufgetreten. Deine bisherigen Daten sind sicher in deiner lokalen Datenbank gespeichert.
              </p>
            </div>
            {this.state.error?.message && (
              <pre className="max-h-32 w-full overflow-auto rounded-lg bg-canvas p-3 text-left font-mono text-xs text-muted border border-line">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="btn-primary mt-2 flex items-center gap-2 rounded-full px-5 py-2 font-mono text-xs uppercase tracking-wider"
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
