import { ChevronLeft, ChevronRight, List } from 'lucide-react'
import { t, IconButton } from '../ui'

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
      <IconButton
        aria-label={prevAriaLabel}
        onClick={handlePrev}
        disabled={!canGoPrev}
      >
        <ChevronLeft size={18} strokeWidth={1.75} aria-hidden />
      </IconButton>
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
      <IconButton
        aria-label={nextAriaLabel}
        onClick={handleNext}
        disabled={!canGoNext}
      >
        <ChevronRight size={18} strokeWidth={1.75} aria-hidden />
      </IconButton>
      {onAllCycles && (
        <IconButton
          onClick={onAllCycles}
          aria-label="All cycles"
        >
          <List size={16} aria-hidden />
        </IconButton>
      )}
    </div>
  )
}
