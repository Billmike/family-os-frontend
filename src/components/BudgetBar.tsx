import type { BudgetState } from '../types'
import { t } from '../ui'

const stateColor = (state: BudgetState) => {
  if (state === 'over') return t.error
  if (state === 'warning') return t.warning
  return t.primary
}

interface Props {
  percentUsed: number
  state: BudgetState
  ariaLabel: string
  height?: number
}

export function BudgetBar({ percentUsed, state, ariaLabel, height = 4 }: Props) {
  const width = Math.min(Math.max(percentUsed, 0), 100)
  const fill = stateColor(state)

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(percentUsed, 100)}
      style={{
        marginTop: 8,
        height,
        borderRadius: 9999,
        background: t.surfaceMuted,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${width}%`,
          height: '100%',
          borderRadius: 9999,
          background: fill,
          transition: 'width 0.2s ease',
        }}
      />
    </div>
  )
}

export function budgetStateColor(state: BudgetState): string {
  return stateColor(state)
}
