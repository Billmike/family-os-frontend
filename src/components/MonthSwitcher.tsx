import { ChevronLeft, ChevronRight, List } from 'lucide-react'
import { t, r } from '../ui'

interface Props {
  title: string
  subtitle?: string
  canGoPrev: boolean
  canGoNext: boolean
  onPrev: () => void
  onNext: () => void
  prevAriaLabel?: string
  nextAriaLabel?: string
  onAllCycles?: () => void
}

export const MonthSwitcher = ({
  title,
  subtitle,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  prevAriaLabel = 'Previous cycle',
  nextAriaLabel = 'Next cycle',
  onAllCycles,
}: Props) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px 4px',
    }}>
      <button
        type="button"
        aria-label={prevAriaLabel}
        onClick={onPrev}
        disabled={!canGoPrev}
        style={{
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', background: 'transparent', borderRadius: r.md, cursor: canGoPrev ? 'pointer' : 'default',
          color: canGoPrev ? t.text : t.textTer, opacity: canGoPrev ? 1 : 0.4,
        }}
      >
        <ChevronLeft size={20} strokeWidth={1.75} />
      </button>
      <div style={{ textAlign: 'center', minWidth: 0, padding: '0 8px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, color: t.text, letterSpacing: '-0.02em', margin: 0, fontFamily: 'var(--ds-font-display)' }}>
          {title}
        </h2>
        {subtitle ? (
          <p style={{ fontSize: 12, color: t.textSec, margin: '2px 0 0' }}>{subtitle}</p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={nextAriaLabel}
        onClick={onNext}
        disabled={!canGoNext}
        style={{
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', background: 'transparent', borderRadius: r.md, cursor: canGoNext ? 'pointer' : 'default',
          color: canGoNext ? t.text : t.textTer, opacity: canGoNext ? 1 : 0.4,
        }}
      >
        <ChevronRight size={20} strokeWidth={1.75} />
      </button>
      {onAllCycles && (
        <button
          type="button"
          onClick={onAllCycles}
          aria-label="All cycles"
          style={{
            width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'transparent', borderRadius: r.md, cursor: 'pointer',
            color: t.textSec,
          }}
        >
          <List size={16} aria-hidden />
        </button>
      )}
    </div>
  )
}
