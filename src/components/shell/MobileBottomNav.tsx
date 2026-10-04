import { useEffect, useState } from 'react'
import type { Screen } from '../../types'
import { isBudgetSection } from '../../routing'
import { useVisualViewportBox } from '../assistant/useVisualViewportBox'
import { BOTTOM_NAV } from './nav'

const PHONE_TAB_QUERY = '(max-width: 767px)'

interface Props {
  screen: Screen
  onNavigate: (screen: Screen) => void
}

const usePhoneTabBar = (): boolean => {
  const [isPhone, setIsPhone] = useState(() => window.matchMedia(PHONE_TAB_QUERY).matches)

  useEffect(() => {
    const media = window.matchMedia(PHONE_TAB_QUERY)
    const handleChange = () => setIsPhone(media.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  return isPhone
}

export const MobileBottomNav = ({ screen, onNavigate }: Props) => {
  const isPhone = usePhoneTabBar()
  const { keyboardOpen } = useVisualViewportBox()
  const keyboardHidden = isPhone && keyboardOpen

  useEffect(() => {
    document.documentElement.classList.toggle('tab-bar-keyboard', keyboardHidden)
    return () => document.documentElement.classList.remove('tab-bar-keyboard')
  }, [keyboardHidden])

  return (
    <nav
      aria-label="Main"
      aria-hidden={keyboardHidden || undefined}
      inert={keyboardHidden || undefined}
      className="tab-bar"
    >
      {BOTTOM_NAV.map(item => {
        const Icon = item.icon
        const active =
          screen === item.screen ||
          (item.screen === 'budgetSpend' && isBudgetSection(screen))
        const handleNavigate = () => onNavigate(item.screen)
        return (
          <button
            key={item.screen}
            type="button"
            className={active ? 'ds-btn ds-btn-icon ds-btn-selected tab-bar-item' : 'ds-btn ds-btn-icon tab-bar-item'}
            onClick={handleNavigate}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={22} strokeWidth={active ? 2 : 1.75} aria-hidden />
            <span className="tab-bar-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
