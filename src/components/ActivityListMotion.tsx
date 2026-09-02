import { type AnimationEvent, type ReactNode, type TransitionEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MOTION_MS, prefersReducedMotion } from '../lib/motion'

export type ActivityPhase = 'enter' | 'exit' | 'idle'

export type ActivityMotionItem<T extends { id: string }> = {
  item: T
  phase: ActivityPhase
}

export const useActivityListMotion = <T extends { id: string }>(
  rows: T[],
  scopeKey: string | null,
  ready: boolean,
  versionOf: (item: T) => string = () => '',
) => {
  const [display, setDisplay] = useState<ActivityMotionItem<T>[]>([])
  const seenRef = useRef(new Set<string>())
  const seededForRef = useRef<string | null>(null)
  const displayRef = useRef(display)
  displayRef.current = display
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const signature = `${ready}|${scopeKey ?? ''}|${rows.map(row => `${row.id}:${versionOf(row)}`).join('|')}`

  const handleEnterEnd = (id: string) => {
    setDisplay(prev => prev.map(row => (
      row.item.id === id && row.phase === 'enter' ? { ...row, phase: 'idle' } : row
    )))
  }

  const handleExitEnd = (id: string) => {
    setDisplay(prev => prev.filter(row => row.item.id !== id))
  }

  useLayoutEffect(() => {
    const currentRows = rowsRef.current

    if (!scopeKey) {
      seededForRef.current = null
      seenRef.current = new Set()
      setDisplay([])
      return
    }

    if (!ready) return

    if (seededForRef.current !== scopeKey) {
      seededForRef.current = scopeKey
      seenRef.current = new Set(currentRows.map(row => row.id))
      setDisplay(currentRows.map(item => ({ item, phase: 'idle' as const })))
      return
    }

    const reduced = prefersReducedMotion()
    const prev = displayRef.current
    const nextById = new Map(currentRows.map(row => [row.id, row]))
    const used = new Set<string>()
    const merged: ActivityMotionItem<T>[] = []

    for (const row of prev) {
      const nextItem = nextById.get(row.item.id)
      if (nextItem) {
        used.add(nextItem.id)
        merged.push({
          item: nextItem,
          phase: row.phase === 'exit' ? 'idle' : row.phase,
        })
        seenRef.current.add(nextItem.id)
        continue
      }
      if (row.phase === 'exit') {
        merged.push(row)
        continue
      }
      if (reduced) continue
      merged.push({ item: row.item, phase: 'exit' })
    }

    const newcomers = currentRows.filter(row => !used.has(row.id))
    if (newcomers.length === 0) {
      setDisplay(merged)
      return
    }

    const result = [...merged]
    for (const item of newcomers) {
      const targetIndex = currentRows.findIndex(row => row.id === item.id)
      const phase: ActivityPhase = reduced || seenRef.current.has(item.id) ? 'idle' : 'enter'
      seenRef.current.add(item.id)
      let liveBefore = 0
      let insertAt = result.length
      for (let i = 0; i < result.length; i++) {
        if (result[i].phase === 'exit') continue
        if (liveBefore === targetIndex) {
          insertAt = i
          break
        }
        liveBefore++
      }
      result.splice(insertAt, 0, { item, phase })
    }
    setDisplay(result)
  }, [scopeKey, ready, signature])

  return { items: display, handleEnterEnd, handleExitEnd }
}

const useActivityPhaseTimeout = (
  phase: ActivityPhase,
  onEnterEnd: () => void,
  onExitEnd: () => void,
) => {
  const reduced = prefersReducedMotion()
  const onEnterEndRef = useRef(onEnterEnd)
  const onExitEndRef = useRef(onExitEnd)
  onEnterEndRef.current = onEnterEnd
  onExitEndRef.current = onExitEnd

  useEffect(() => {
    if (reduced || phase === 'idle') return
    const delay = phase === 'enter' ? MOTION_MS.enter + 40 : MOTION_MS.collapse + 40
    const id = window.setTimeout(() => {
      if (phase === 'enter') onEnterEndRef.current()
      else onExitEndRef.current()
    }, delay)
    return () => clearTimeout(id)
  }, [phase, reduced])
}

export const ActivityRowShell = ({
  phase,
  onEnterEnd,
  onExitEnd,
  children,
}: {
  phase: ActivityPhase
  onEnterEnd: () => void
  onExitEnd: () => void
  children: ReactNode
}) => {
  const reduced = prefersReducedMotion()
  useActivityPhaseTimeout(phase, onEnterEnd, onExitEnd)
  const className = [
    'activity-row-shell',
    phase === 'enter' && !reduced ? 'activity-row-enter' : '',
    phase === 'exit' && !reduced ? 'activity-row-exit' : '',
  ].filter(Boolean).join(' ')

  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (phase === 'enter') onEnterEnd()
  }

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== 'grid-template-rows') return
    if (phase === 'exit') onExitEnd()
  }

  return (
    <div
      className={className}
      onAnimationEnd={handleAnimationEnd}
      onTransitionEnd={handleTransitionEnd}
      style={{ transitionDuration: `${MOTION_MS.collapse}ms` }}
    >
      <div className="activity-row-shell-inner">
        <div
          className="activity-row-motion"
          onAnimationEnd={event => {
            if (event.target !== event.currentTarget) return
            if (phase === 'enter') onEnterEnd()
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export const ActivityTableRow = ({
  phase,
  onEnterEnd,
  onExitEnd,
  children,
}: {
  phase: ActivityPhase
  onEnterEnd: () => void
  onExitEnd: () => void
  children: ReactNode
}) => {
  const reduced = prefersReducedMotion()
  useActivityPhaseTimeout(phase, onEnterEnd, onExitEnd)
  const className = [
    phase === 'enter' && !reduced ? 'activity-row-enter-table' : '',
    phase === 'exit' && !reduced ? 'activity-row-exit-table' : '',
  ].filter(Boolean).join(' ')

  return (
    <tr
      className={className || undefined}
      onAnimationEnd={() => {
        if (phase === 'enter') onEnterEnd()
      }}
      onTransitionEnd={event => {
        if (event.propertyName !== 'opacity') return
        if (phase === 'exit') onExitEnd()
      }}
    >
      {children}
    </tr>
  )
}
