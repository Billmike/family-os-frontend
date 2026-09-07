import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from './motion'

type AnimatedPresenceParams = {
  isOpen: boolean
  exitMs: number
  onExited?: () => void
}

type AnimatedPresence = {
  shouldRender: boolean
  isExiting: boolean
}

export const useAnimatedPresence = ({
  isOpen,
  exitMs,
  onExited,
}: AnimatedPresenceParams): AnimatedPresence => {
  const [shouldRender, setShouldRender] = useState(isOpen)
  const onExitedRef = useRef(onExited)
  onExitedRef.current = onExited

  if (isOpen && !shouldRender) {
    setShouldRender(true)
  }

  useEffect(() => {
    if (isOpen) return
    if (!shouldRender) return

    const finish = () => {
      setShouldRender(false)
      onExitedRef.current?.()
    }

    if (prefersReducedMotion()) {
      finish()
      return
    }

    const timer = window.setTimeout(finish, exitMs)
    return () => window.clearTimeout(timer)
  }, [isOpen, exitMs, shouldRender])

  return {
    shouldRender: isOpen || shouldRender,
    isExiting: shouldRender && !isOpen,
  }
}
