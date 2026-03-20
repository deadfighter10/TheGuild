import { Component } from "react"
import type { ReactNode, ErrorInfo } from "react"

type Props = {
  readonly children: ReactNode
  readonly fallback?: ReactNode
}

type State = {
  readonly hasError: boolean
  readonly error: Error | null
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("RouteErrorBoundary caught:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-[40vh] flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-amber-400">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="font-display text-xl text-white mb-2">Something went wrong on this page</h2>
            <p className="text-white/40 text-sm leading-relaxed mb-4">
              This page encountered an error. Other parts of the app still work.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-white/10 text-white hover:bg-white/15 border border-white/10 transition-colors"
            >
              Go back
            </button>
            {this.state.error && (
              <p className="mt-4 font-mono text-xs text-white/20 break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
