import { ChevronLeft, ChevronRight } from 'lucide-react'
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
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', background: 'transparent', borderRadius: r.md, cursor: canGoPrev ? 'pointer' : 'default',
          color: canGoPrev ? t.text : t.textTer, opacity: canGoPrev ? 1 : 0.4,
        }}
      >
        <ChevronLeft size={20} strokeWidth={1.75} />
      </button>
      <div style={{ textAlign: 'center', minWidth: 0, padding: '0 8px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: t.text, letterSpacing: '-0.02em', margin: 0 }}>
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
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', background: 'transparent', borderRadius: r.md, cursor: canGoNext ? 'pointer' : 'default',
          color: canGoNext ? t.text : t.textTer, opacity: canGoNext ? 1 : 0.4,
        }}
      >
        <ChevronRight size={20} strokeWidth={1.75} />
      </button>
    </div>
  )
}
