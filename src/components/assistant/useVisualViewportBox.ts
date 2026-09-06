import { useEffect, useState } from 'react'

export type VisualViewportBox = {
  offsetTop: number
  offsetLeft: number
  width: number
  height: number
  keyboardOpen: boolean
}

const KEYBOARD_HEIGHT_PX = 80

const readBox = (): VisualViewportBox => {
  const viewport = window.visualViewport
  if (!viewport) {
    return {
      offsetTop: 0,
      offsetLeft: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      keyboardOpen: false,
    }
  }
  return {
    offsetTop: viewport.offsetTop,
    offsetLeft: viewport.offsetLeft,
    width: viewport.width,
    height: viewport.height,
    keyboardOpen: window.innerHeight - viewport.height > KEYBOARD_HEIGHT_PX,
  }
}

export const useVisualViewportBox = (): VisualViewportBox => {
  const [box, setBox] = useState(readBox)

  useEffect(() => {
    const viewport = window.visualViewport
    const handleChange = () => setBox(readBox())
    handleChange()
    viewport?.addEventListener('resize', handleChange)
    viewport?.addEventListener('scroll', handleChange)
    window.addEventListener('resize', handleChange)
    return () => {
      viewport?.removeEventListener('resize', handleChange)
      viewport?.removeEventListener('scroll', handleChange)
      window.removeEventListener('resize', handleChange)
    }
  }, [])

  return box
}
