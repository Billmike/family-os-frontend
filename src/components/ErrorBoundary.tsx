import { Component, type ErrorInfo, type ReactNode } from 'react'
import { PrimaryButton, t } from '../ui'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        role="alert"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
          background: t.bg,
          fontFamily: 'var(--ds-font)',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600, color: t.text, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: t.textSec, margin: 0, maxWidth: 320, lineHeight: 1.5 }}>
          The app hit an unexpected error. Reload to continue.
        </p>
        <PrimaryButton onClick={this.handleReload}>Reload</PrimaryButton>
      </div>
    )
  }
}

export function CycleExpensesLoadError({ onRetry }: { onRetry: () => void }) {
  const handleRetry = () => {
    onRetry()
  }

  return (
    <div
      role="alert"
      style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderTop: `1px solid ${t.border}`,
      }}
    >
      <p style={{ fontSize: 14, color: t.textSec, margin: 0 }}>
        Couldn't load this cycle's expenses
      </p>
      <button
        type="button"
        onClick={handleRetry}
        aria-label="Retry loading expenses"
        style={{
          padding: '6px 12px',
          background: t.primary,
          color: t.onPrimary,
          border: 'none',
          borderRadius: 'var(--ds-radius-md)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'var(--ds-font)',
          flexShrink: 0,
        }}
      >
        Retry
      </button>
    </div>
  )
}
