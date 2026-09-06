import { useEffect, useState } from 'react'
import { isPhoneAssistantViewport } from './phoneAssistant'

export const useIsPhoneAssistant = (): boolean => {
  const [isPhone, setIsPhone] = useState(isPhoneAssistantViewport)

  useEffect(() => {
    const handleResize = () => {
      setIsPhone(isPhoneAssistantViewport())
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return isPhone
}
