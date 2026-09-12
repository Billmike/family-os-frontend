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
  tone?: 'default' | 'paper'
}

const iconBtn = (enabled: boolean, tone: 'default' | 'paper') => ({
  width: 44,
  height: 44,
  display: 'flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  border: 'none',
  background: 'transparent',
  borderRadius: r.md,
  cursor: enabled ? 'pointer' : 'default',
  color: tone === 'paper'
    ? enabled ? 'var(--budget-text)' : 'var(--budget-label)'
    : enabled ? t.text : t.textTer,
  opacity: enabled ? 1 : 0.4,
  padding: 0,
  flexShrink: 0,
})

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
  tone = 'default',
}: Props) => {
  const handlePrev = () => {
    if (!canGoPrev) return
    onPrev()
  }

  const handleNext = () => {
    if (!canGoNext) return
    onNext()
  }

  const isPaper = tone === 'paper'
  const periodLabel = subtitle ? `${title}, ${subtitle}` : title

  return (
    <div
      role="group"
      aria-label={`Budget period ${periodLabel}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      <button
        type="button"
        aria-label={prevAriaLabel}
        onClick={handlePrev}
        disabled={!canGoPrev}
        style={iconBtn(canGoPrev, tone)}
      >
        <ChevronLeft size={18} strokeWidth={1.75} aria-hidden />
      </button>
      <p
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: isPaper ? 'var(--budget-text)' : t.text,
          margin: 0,
          whiteSpace: 'nowrap',
          fontFamily: 'var(--ds-font)',
          padding: '0 2px',
        }}
      >
        {title}
      </p>
      <button
        type="button"
        aria-label={nextAriaLabel}
        onClick={handleNext}
        disabled={!canGoNext}
        style={iconBtn(canGoNext, tone)}
      >
        <ChevronRight size={18} strokeWidth={1.75} aria-hidden />
      </button>
      {onAllCycles && (
        <button
          type="button"
          onClick={onAllCycles}
          aria-label="All cycles"
          style={{
            ...iconBtn(true, tone),
            color: isPaper ? 'var(--budget-dim)' : t.textSec,
          }}
        >
          <List size={16} aria-hidden />
        </button>
      )}
    </div>
  )
}
