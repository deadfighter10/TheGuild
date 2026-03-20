import { Component } from "react"
import { errorTracker } from "@/lib/error-tracking"
import type { ReactNode, ErrorInfo } from "react"

type Props = {
  readonly children: ReactNode
  readonly fallback?: ReactNode
}

type State = {
  readonly hasError: boolean
  readonly error: Error | null
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
    console.error("ErrorBoundary caught:", error, errorInfo)
    errorTracker.captureException(error, {
      route: window.location.pathname,
      action: "ErrorBoundary",
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-[60vh] flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="w-14 h-14 mx-auto mb-6 rounded-xl bg-red-400/10 border border-red-400/20 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-red-400">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="font-display text-2xl text-white mb-3">Something went wrong</h2>
            <p className="text-white/40 text-sm leading-relaxed mb-6">
              An unexpected error occurred. Try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 text-sm font-medium rounded-lg bg-white/10 text-white hover:bg-white/15 border border-white/10 transition-colors"
            >
              Refresh page
            </button>
            {this.state.error && (
              <p className="mt-6 font-mono text-xs text-white/20 break-all">
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
