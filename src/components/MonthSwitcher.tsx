import { ChevronLeft, ChevronRight } from 'lucide-react'
import { t, r } from '../ui'

interface Props {
  monthTitle: string
  canGoPrev: boolean
  canGoNext: boolean
  onPrev: () => void
  onNext: () => void
}

export const MonthSwitcher = ({ monthTitle, canGoPrev, canGoNext, onPrev, onNext }: Props) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px 4px',
    }}>
      <button
        type="button"
        aria-label="Previous month"
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
      <h2 style={{ fontSize: 16, fontWeight: 600, color: t.text, letterSpacing: '-0.02em', margin: 0 }}>
        {monthTitle}
      </h2>
      <button
        type="button"
        aria-label="Next month"
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
