import { Home, Calendar, CheckSquare, ShoppingCart, Wallet, Bell } from 'lucide-react'
import type { Screen } from '../../types'

export const BOTTOM_NAV = [
  { screen: 'dashboard' as Screen, icon: Home, label: 'Home' },
  { screen: 'calendar' as Screen, icon: Calendar, label: 'Calendar' },
  { screen: 'tasks' as Screen, icon: CheckSquare, label: 'Tasks' },
  { screen: 'shopping' as Screen, icon: ShoppingCart, label: 'Shopping' },
  { screen: 'budgetSpend' as Screen, icon: Wallet, label: 'Budget' },
]

export const DESKTOP_NAV = [
  ...BOTTOM_NAV,
  { screen: 'notifications' as Screen, icon: Bell, label: 'Notifications' },
]

export const SCREEN_TITLES: Record<Screen, string> = {
  dashboard: 'FamilyOS',
  calendar: 'Calendar',
  tasks: 'Tasks',
  shopping: 'Shopping',
  budget: 'Budget',
  budgetSpend: 'Budget',
  budgetInsights: 'Budget',
  budgetActivity: 'Budget',
  personal: 'Budget',
  personalActivity: 'Budget',
  notifications: 'Notifications',
  family: 'Your Family',
  settings: 'Settings',
}
