import { useEffect, useState } from 'react'
import type { Expense, HouseholdSpend } from '../types'

export const useMonthExpenses = (
  spend: HouseholdSpend | null,
  loadMonthExpenses: (month: string) => Promise<Expense[]>,
  initialMonth?: string | null,
) => {
  const [selectedMonth, setSelectedMonth] = useState(
    initialMonth || spend?.currentMonth || '',
  )
  const [entries, setEntries] = useState<Expense[]>([])
  const [loadingEntries, setLoadingEntries] = useState(false)

  useEffect(() => {
    if (!initialMonth) return
    setSelectedMonth(prev => (prev === initialMonth ? prev : initialMonth))
  }, [initialMonth])

  useEffect(() => {
    if (!spend) return
    if (!selectedMonth || !spend.months.some(row => row.month === selectedMonth)) {
      setSelectedMonth(spend.currentMonth)
    }
  }, [spend, selectedMonth])

  useEffect(() => {
    if (!selectedMonth) return
    let cancelled = false
    setLoadingEntries(true)
    void loadMonthExpenses(selectedMonth).then(rows => {
      if (cancelled) return
      setEntries(rows)
      setLoadingEntries(false)
    }).catch(() => {
      if (cancelled) return
      setEntries([])
      setLoadingEntries(false)
    })
    return () => { cancelled = true }
  }, [selectedMonth, loadMonthExpenses, spend])

  return { selectedMonth, setSelectedMonth, entries, loadingEntries }
}
