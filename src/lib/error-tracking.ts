type ErrorContext = {
  readonly userId?: string
  readonly route?: string
  readonly action?: string
}

type ErrorTracker = {
  readonly captureException: (error: unknown, context?: ErrorContext) => void
  readonly captureMessage: (message: string, context?: ErrorContext) => void
}

function createConsoleTracker(): ErrorTracker {
  return {
    captureException(error: unknown, context?: ErrorContext) {
      console.error("[ErrorTracking]", error, context)
    },
    captureMessage(message: string, context?: ErrorContext) {
      console.warn("[ErrorTracking]", message, context)
    },
  }
}

export const errorTracker: ErrorTracker = createConsoleTracker()

export function setupGlobalErrorHandlers(): void {
  window.addEventListener("error", (event) => {
    errorTracker.captureException(event.error, {
      route: window.location.pathname,
    })
  })

  window.addEventListener("unhandledrejection", (event) => {
    errorTracker.captureException(event.reason, {
      route: window.location.pathname,
    })
  })
}
