import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { t } from '../../ui'
import { useVisualViewportBox } from './useVisualViewportBox'

interface Props {
  header: ReactNode
  footer: ReactNode
  children: ReactNode
  isExiting?: boolean
}

const PHONE_OPEN_CLASS = 'assistant-phone-open'

const handlePinDocument = () => {
  window.scrollTo(0, 0)
}

export const AssistantMobilePanel = ({
  header,
  footer,
  children,
  isExiting = false,
}: Props) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const box = useVisualViewportBox()

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  useEffect(() => {
    const html = document.documentElement
    const viewport = window.visualViewport
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    html.classList.add(PHONE_OPEN_CLASS)
    handlePinDocument()

    const handleFocusIn = () => {
      handlePinDocument()
      window.requestAnimationFrame(handlePinDocument)
    }

    document.addEventListener('focusin', handleFocusIn)
    viewport?.addEventListener('resize', handlePinDocument)
    viewport?.addEventListener('scroll', handlePinDocument)
    window.addEventListener('scroll', handlePinDocument, { passive: true })
    return () => {
      html.classList.remove(PHONE_OPEN_CLASS)
      html.style.removeProperty('--assistant-vv-top')
      html.style.removeProperty('--assistant-vv-height')
      document.removeEventListener('focusin', handleFocusIn)
      viewport?.removeEventListener('resize', handlePinDocument)
      viewport?.removeEventListener('scroll', handlePinDocument)
      window.removeEventListener('scroll', handlePinDocument)
      window.scrollTo(scrollX, scrollY)
    }
  }, [])

  useEffect(() => {
    const html = document.documentElement
    html.style.setProperty('--assistant-vv-top', `${box.offsetTop}px`)
    html.style.setProperty('--assistant-vv-height', `${box.height}px`)
  }, [box.offsetTop, box.height])

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Heimdall"
      tabIndex={-1}
      aria-hidden={isExiting || undefined}
      className={`assistant-mobile-panel${isExiting ? ' is-exiting' : ''}`}
      style={{
        position: 'fixed',
        top: box.offsetTop,
        left: box.offsetLeft,
        width: box.width,
        height: box.height,
        maxWidth: '100%',
        zIndex: 250,
        display: 'flex',
        flexDirection: 'column',
        background: t.surfaceElev,
        overflow: 'hidden',
        overflowX: 'hidden',
        overscrollBehavior: 'none',
        touchAction: 'none',
        boxSizing: 'border-box',
        outline: 'none',
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
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
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
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
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
