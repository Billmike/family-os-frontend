import { useEffect, useState } from 'react'
import type { Expense } from '../types'

export type LoadPeriodExpenses = (
  periodId: string,
  signal?: AbortSignal,
) => Promise<Expense[]>

const isAbortError = (err: unknown) =>
  (err instanceof DOMException && err.name === 'AbortError') ||
  (err instanceof Error && err.name === 'AbortError')

export const usePeriodExpenses = (
  periodId: string | null,
  loadPeriodExpenses: LoadPeriodExpenses,
) => {
  const [entries, setEntries] = useState<Expense[]>([])
  const [loadedPeriodId, setLoadedPeriodId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const retry = () => {
    setReloadToken(n => n + 1)
  }

  useEffect(() => {
    if (!periodId) {
      setEntries([])
      setLoadedPeriodId(null)
      setLoadError(false)
      return
    }

    const controller = new AbortController()
    setLoadError(false)

    void loadPeriodExpenses(periodId, controller.signal)
      .then(rows => {
        if (controller.signal.aborted) return
        setEntries(rows)
        setLoadedPeriodId(periodId)
        setLoadError(false)
      })
      .catch(err => {
        if (controller.signal.aborted || isAbortError(err)) return
        setLoadError(true)
      })

    return () => {
      controller.abort()
    }
  }, [periodId, loadPeriodExpenses, reloadToken])

  const belongsToPeriod = loadedPeriodId === periodId
  const showSkeleton = Boolean(periodId) && !belongsToPeriod && !loadError

  return {
    entries: belongsToPeriod ? entries : [],
    loadingEntries: showSkeleton,
    loadError: loadError && !showSkeleton,
    retry,
  }
}
