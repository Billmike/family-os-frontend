import { useEffect, useRef, useState } from 'react'

export const TYPEWRITER_MS_PER_CHAR = 16

interface Args {
  index: number | null
  text: string
  onFinish: (completed: string) => void
}

export const useAssistantTypewriter = ({
  index,
  text,
  onFinish,
}: Args): number | null => {
  const [chars, setChars] = useState<number | null>(null)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  useEffect(() => {
    if (index === null) {
      setChars(null)
      return
    }
    if (text.length === 0) return
    setChars(0)
  }, [index, text])

  useEffect(() => {
    if (index === null || chars === null || text.length === 0) return
    const timer = window.setTimeout(() => {
      const next = chars + 1
      if (next >= text.length) {
        setChars(null)
        onFinishRef.current(text)
        return
      }
      setChars(next)
    }, TYPEWRITER_MS_PER_CHAR)
    return () => window.clearTimeout(timer)
  }, [index, chars, text])

  return index === null ? null : chars
}
