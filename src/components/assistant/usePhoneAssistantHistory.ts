import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  claimAssistantHistory,
  hasAssistantHistoryState,
  releaseAssistantHistory,
  withAssistantHistoryState,
} from './phoneAssistant'

type PhoneAssistantHistoryParams = {
  isOpen: boolean
  isPhone: boolean
  onDismiss: () => void
}

export const usePhoneAssistantHistory = ({
  isOpen,
  isPhone,
  onDismiss,
}: PhoneAssistantHistoryParams) => {
  const location = useLocation()
  const navigate = useNavigate()
  const isOpenRef = useRef(false)
  const isPhoneRef = useRef(isPhone)
  const onDismissRef = useRef(onDismiss)
  const locationRef = useRef(location)

  isOpenRef.current = isOpen
  isPhoneRef.current = isPhone
  onDismissRef.current = onDismiss
  locationRef.current = location

  const handleClose = useCallback(() => {
    const shouldPop = releaseAssistantHistory()
    onDismissRef.current()
    if (shouldPop) navigate(-1)
  }, [navigate])

  useEffect(() => {
    const handlePopState = () => {
      if (!releaseAssistantHistory()) return
      if (isOpenRef.current && isPhoneRef.current) onDismissRef.current()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClose, isOpen])

  useEffect(() => {
    if (!isOpen) return
    if (!isPhone) {
      if (releaseAssistantHistory()) navigate(-1)
      return
    }
    if (!claimAssistantHistory()) return
    const current = locationRef.current
    if (hasAssistantHistoryState(current.state)) return
    navigate(
      {
        pathname: current.pathname,
        search: current.search,
        hash: current.hash,
      },
      { state: withAssistantHistoryState(current.state) },
    )
  }, [isOpen, isPhone, navigate])

  return { handleClose }
}
