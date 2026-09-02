import type { BudgetState } from '../types'
import { t } from '../ui'
import { MOTION_EASE, MOTION_MS, prefersReducedMotion } from '../lib/motion'

const stateColor = (state: BudgetState) => {
  if (state === 'over') return t.attention
  if (state === 'warning') return t.attention
  return t.text
}

interface FillProps {
  percent: number
  color: string
  durationMs?: number
  height?: number
}

export const ScaleFill = ({
  percent,
  color,
  durationMs = MOTION_MS.state,
  height = 6,
}: FillProps) => {
  const reduced = prefersReducedMotion()
  const width = Math.min(Math.max(percent, 0), 100)
  const ms = reduced ? 0 : durationMs

  return (
    <div
      aria-hidden
      style={{
        height,
        borderRadius: 9999,
        background: t.surfaceMuted,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 9999,
          background: color,
          transform: `scaleX(${width / 100})`,
          transformOrigin: 'left center',
          transition: ms > 0
            ? `transform ${ms}ms ${MOTION_EASE}, background ${MOTION_MS.state}ms ${MOTION_EASE}`
            : 'none',
        }}
      />
    </div>
  )
}

interface Props {
  percentUsed: number
  state: BudgetState
  ariaLabel: string
  height?: number
  durationMs?: number
}

export function BudgetBar({ percentUsed, state, ariaLabel, height = 4, durationMs = MOTION_MS.state }: Props) {
  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(percentUsed, 100)}
      style={{ marginTop: 8 }}
    >
      <ScaleFill
        percent={percentUsed}
        color={stateColor(state)}
        durationMs={durationMs}
        height={height}
      />
    </div>
  )
}

export function budgetStateColor(state: BudgetState): string {
  return stateColor(state)
}
