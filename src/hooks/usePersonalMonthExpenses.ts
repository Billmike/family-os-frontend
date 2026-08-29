import { useEffect, useState } from 'react'
import type { PersonalExpense } from '../types'

type LoadMonthExpenses = (
  accountId: string,
  month: string,
  signal?: AbortSignal,
) => Promise<PersonalExpense[]>

const isAbortError = (err: unknown) =>
  (err instanceof DOMException && err.name === 'AbortError')
  || (err instanceof Error && err.name === 'AbortError')

export const usePersonalMonthExpenses = (
  accountId: string | null,
  month: string | null,
  loadMonthExpenses: LoadMonthExpenses,
) => {
  const [entries, setEntries] = useState<PersonalExpense[]>([])
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const retry = () => {
    setReloadToken(n => n + 1)
  }

  useEffect(() => {
    if (!accountId || !month) {
      setEntries([])
      setLoadedKey(null)
      setLoadError(false)
      return
    }

    const key = `${accountId}:${month}`
    const controller = new AbortController()
    setLoadError(false)

    void loadMonthExpenses(accountId, month, controller.signal)
      .then(rows => {
        if (controller.signal.aborted) return
        setEntries(rows)
        setLoadedKey(key)
        setLoadError(false)
      })
      .catch(err => {
        if (controller.signal.aborted || isAbortError(err)) return
        setLoadError(true)
      })

    return () => {
      controller.abort()
    }
  }, [accountId, month, loadMonthExpenses, reloadToken])

  const currentKey = accountId && month ? `${accountId}:${month}` : null
  const belongs = loadedKey === currentKey
  const showSkeleton = Boolean(currentKey) && !belongs && !loadError

  return {
    entries: belongs ? entries : [],
    loadingEntries: showSkeleton,
    loadError: loadError && !showSkeleton,
    retry,
  }
}
