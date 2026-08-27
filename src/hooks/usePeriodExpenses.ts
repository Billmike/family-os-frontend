import { useEffect, useState } from 'react'
import type { Expense } from '../types'

export const usePeriodExpenses = (
  periodId: string | null,
  loadPeriodExpenses: (periodId: string) => Promise<Expense[]>,
) => {
  const [entries, setEntries] = useState<Expense[]>([])
  const [loadingEntries, setLoadingEntries] = useState(false)

  useEffect(() => {
    if (!periodId) {
      setEntries([])
      setLoadingEntries(false)
      return
    }
    let cancelled = false
    setEntries([])
    setLoadingEntries(true)
    void loadPeriodExpenses(periodId).then(rows => {
      if (cancelled) return
      setEntries(rows)
      setLoadingEntries(false)
    }).catch(() => {
      if (cancelled) return
      setEntries([])
      setLoadingEntries(false)
    })
    return () => { cancelled = true }
  }, [periodId, loadPeriodExpenses])

  return { entries, loadingEntries }
}
