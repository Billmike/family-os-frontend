import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../../lib/motion'
import { t } from '../../ui'
import { useVisualViewportBox } from './useVisualViewportBox'

interface Props {
  header: ReactNode
  footer: ReactNode
  children: ReactNode
  onClose: () => void
}

export const AssistantMobilePanel = ({
  header,
  footer,
  children,
  onClose,
}: Props) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const box = useVisualViewportBox()
  const reduceMotion = prefersReducedMotion()

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const html = document.documentElement
    const { body } = document
    const previousHtmlOverflow = html.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousHtmlOverscroll = html.style.overscrollBehavior
    const previousBodyOverscroll = body.style.overscrollBehavior
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    html.style.overscrollBehavior = 'none'
    body.style.overscrollBehavior = 'none'
    return () => {
      html.style.overflow = previousHtmlOverflow
      body.style.overflow = previousBodyOverflow
      html.style.overscrollBehavior = previousHtmlOverscroll
      body.style.overscrollBehavior = previousBodyOverscroll
    }
  }, [])

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Ask assistant"
      tabIndex={-1}
      className="assistant-mobile-panel"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: box.width,
        height: box.height,
        transform: `translate(${box.offsetLeft}px, ${box.offsetTop}px)`,
        zIndex: 250,
        display: 'flex',
        flexDirection: 'column',
        background: t.surfaceElev,
        overflow: 'hidden',
        overscrollBehavior: 'none',
        boxSizing: 'border-box',
        outline: 'none',
        animation: reduceMotion ? 'none' : 'fadeIn 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          background: t.surfaceChrome,
        }}
      >
        {header}
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
      <div
        style={{
          flexShrink: 0,
          paddingBottom: box.keyboardOpen ? 0 : 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        {footer}
      </div>
    </div>
  )
}
