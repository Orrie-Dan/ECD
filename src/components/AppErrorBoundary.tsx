import { Component, type ErrorInfo, type ReactNode } from 'react'
import { common } from '@/locales/rw/common'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

/**
 * Top-level render error boundary — prevents a blank white screen on unexpected throws.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[AppErrorBoundary]', error, info.componentStack)
    }
  }

  private handleReload = () => {
    this.setState({ hasError: false })
    window.location.assign(import.meta.env.BASE_URL)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div
            className="max-w-md w-full rounded-xl border border-border bg-surface p-6 text-center shadow-card"
            role="alert"
          >
            <h1 className="text-subheading text-text font-semibold">{common.error}</h1>
            <p className="text-body text-text-secondary mt-2">{common.live.unavailableDesc}</p>
            <button
              type="button"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-body font-semibold text-white hover:opacity-90"
              onClick={this.handleReload}
            >
              {common.reset}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
