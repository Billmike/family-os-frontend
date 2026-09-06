import { useEffect, useRef, useState } from 'react'

export type VisualViewportBox = {
  offsetTop: number
  offsetLeft: number
  width: number
  height: number
  keyboardOpen: boolean
}

const KEYBOARD_HEIGHT_PX = 80
const ORIENTATION_SETTLE_MS = 120

type ViewportMetrics = {
  offsetTop: number
  offsetLeft: number
  width: number
  height: number
}

const readMetrics = (): ViewportMetrics => {
  const viewport = window.visualViewport
  if (!viewport) {
    return {
      offsetTop: 0,
      offsetLeft: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }
  return {
    offsetTop: viewport.offsetTop,
    offsetLeft: viewport.offsetLeft,
    width: viewport.width,
    height: viewport.height,
  }
}

const layoutHeightOf = (metrics: ViewportMetrics): number =>
  Math.max(window.innerHeight, metrics.height)

const toVisualViewportBox = (metrics: ViewportMetrics, layoutHeight: number): VisualViewportBox => ({
  ...metrics,
  keyboardOpen: layoutHeight - metrics.height > KEYBOARD_HEIGHT_PX,
})

export const useVisualViewportBox = (): VisualViewportBox => {
  const layoutHeightRef = useRef(layoutHeightOf(readMetrics()))
  const [box, setBox] = useState(() => toVisualViewportBox(readMetrics(), layoutHeightRef.current))

  useEffect(() => {
    const viewport = window.visualViewport
    const syncLayoutHeight = () => {
      layoutHeightRef.current = Math.max(layoutHeightRef.current, layoutHeightOf(readMetrics()))
    }

    const handleChange = () => {
      const metrics = readMetrics()
      syncLayoutHeight()
      setBox(toVisualViewportBox(metrics, layoutHeightRef.current))
    }

    const handleOrientationChange = () => {
      layoutHeightRef.current = 0
      window.setTimeout(() => {
        layoutHeightRef.current = layoutHeightOf(readMetrics())
        handleChange()
      }, ORIENTATION_SETTLE_MS)
    }

    handleChange()
    viewport?.addEventListener('resize', handleChange)
    viewport?.addEventListener('scroll', handleChange)
    window.addEventListener('resize', handleChange)
    window.addEventListener('orientationchange', handleOrientationChange)
    return () => {
      viewport?.removeEventListener('resize', handleChange)
      viewport?.removeEventListener('scroll', handleChange)
      window.removeEventListener('resize', handleChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])

  return box
}
