import { useEffect, useRef, useState } from 'react'

const THRESHOLD_PX = 24
const GESTURE_SETTLE_MS = 200
const TOP_EPSILON_PX = 1
const SCROLL_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'PageDown',
  'PageUp',
  'Home',
  'End',
  ' ',
])

type ScrollMemory = {
  lastTop: number
  delta: number
}

const scrollerFrom = (target: EventTarget | null): HTMLElement | null => {
  const element = target instanceof Element
    ? target
    : target instanceof Node
      ? target.parentElement
      : null
  if (!element) return null
  if (element.closest('[role="dialog"], .bottom-sheet-root')) return null
  const scroller = element.closest('[data-tab-scroll]')
  return scroller instanceof HTMLElement ? scroller : null
}

const isTypingTarget = (element: Element): boolean =>
  element.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], .bottom-sheet-root') != null

export const useTabBarScroll = (screen: string, keyboardHidden: boolean): boolean => {
  const [isCompact, setIsCompact] = useState(false)
  const compactRef = useRef(false)
  const memoryRef = useRef(new WeakMap<Element, ScrollMemory>())
  const gestureRef = useRef(false)
  const settleRef = useRef(0)
  const keyboardRef = useRef(keyboardHidden)

  const setCompact = (next: boolean) => {
    if (compactRef.current === next) return
    compactRef.current = next
    setIsCompact(next)
  }

  const reset = () => {
    memoryRef.current = new WeakMap()
    setCompact(false)
  }

  const armGesture = () => {
    gestureRef.current = true
    window.clearTimeout(settleRef.current)
    settleRef.current = window.setTimeout(() => {
      gestureRef.current = false
    }, GESTURE_SETTLE_MS)
  }

  const anchor = (scroller: HTMLElement) => {
    if (!memoryRef.current.has(scroller)) {
      memoryRef.current.set(scroller, { lastTop: scroller.scrollTop, delta: 0 })
    }
    armGesture()
  }

  useEffect(() => {
    reset()
  }, [screen])

  useEffect(() => {
    const wasHidden = keyboardRef.current
    keyboardRef.current = keyboardHidden
    if (wasHidden && !keyboardHidden) reset()
  }, [keyboardHidden])

  useEffect(() => {
    const armFromPoint = (event: Event) => {
      const scroller = scrollerFrom(event.target)
      if (!scroller) return
      anchor(scroller)
    }

    const armFromKey = (event: KeyboardEvent) => {
      if (!SCROLL_KEYS.has(event.key)) return
      const target = event.target
      if (!(target instanceof Element) || isTypingTarget(target)) return
      const scroller = scrollerFrom(target) ?? document.querySelector('main[data-tab-scroll]')
      if (!(scroller instanceof HTMLElement)) return
      anchor(scroller)
    }

    const handleScroll = (event: Event) => {
      const scroller = event.target
      if (!(scroller instanceof HTMLElement) || !scroller.hasAttribute('data-tab-scroll')) return
      if (scroller.closest('[role="dialog"], .bottom-sheet-root')) return

      const maxScroll = scroller.scrollHeight - scroller.clientHeight
      const top = scroller.scrollTop
      const memory = memoryRef.current.get(scroller) ?? { lastTop: top, delta: 0 }
      memoryRef.current.set(scroller, memory)

      if (maxScroll <= TOP_EPSILON_PX || top <= TOP_EPSILON_PX) {
        memory.lastTop = Math.max(0, top)
        memory.delta = 0
        setCompact(false)
        return
      }

      if (top > maxScroll + TOP_EPSILON_PX) {
        memory.lastTop = maxScroll
        return
      }

      if (!gestureRef.current) {
        memory.lastTop = top
        memory.delta = 0
        return
      }

      armGesture()
      const delta = top - memory.lastTop
      memory.lastTop = top
      if (Math.abs(delta) < 0.5) return
      if (memory.delta !== 0 && Math.sign(delta) !== Math.sign(memory.delta)) memory.delta = 0
      memory.delta += delta
      if (memory.delta >= THRESHOLD_PX) setCompact(true)
      if (memory.delta <= -THRESHOLD_PX) setCompact(false)
    }

    const bound = new Set<HTMLElement>()
    const bindScroller = (scroller: HTMLElement) => {
      if (bound.has(scroller)) return
      bound.add(scroller)
      scroller.addEventListener('scroll', handleScroll, { passive: true })
    }
    const scanScrollers = () => {
      document.querySelectorAll('[data-tab-scroll]').forEach(node => {
        if (node instanceof HTMLElement) bindScroller(node)
      })
    }
    const observer = new MutationObserver(scanScrollers)
    observer.observe(document.body, { childList: true, subtree: true })
    scanScrollers()

    document.addEventListener('wheel', armFromPoint, { capture: true, passive: true })
    document.addEventListener('touchstart', armFromPoint, { capture: true, passive: true })
    document.addEventListener('keydown', armFromKey, true)
    return () => {
      observer.disconnect()
      bound.forEach(scroller => scroller.removeEventListener('scroll', handleScroll))
      document.removeEventListener('wheel', armFromPoint, { capture: true })
      document.removeEventListener('touchstart', armFromPoint, { capture: true })
      document.removeEventListener('keydown', armFromKey, true)
      window.clearTimeout(settleRef.current)
    }
  }, [])

  return isCompact
}
