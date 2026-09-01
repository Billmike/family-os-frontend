import { ArrowLeft, Bell } from 'lucide-react'
import type { Member, Screen } from '../../types'
import { t, fonts, MemberAvatar } from '../../ui'
import { FamilyMark } from './FamilyMark'
import { SCREEN_TITLES } from './nav'

interface Props {
  screen: Screen
  familyName: string
  unreadCount: number
  currentUser: Member | null
  onNavigate: (screen: Screen) => void
  onBack: () => void
}

const NESTED_SCREENS = new Set<Screen>([
  'notifications',
  'family',
  'settings',
  'budgetActivity',
  'personalActivity',
])

const MONEY_SCREENS = new Set<Screen>([
  'budget',
  'budgetSpend',
  'budgetInsights',
  'budgetActivity',
  'personal',
  'personalActivity',
])

export const AppHeader = ({
  screen,
  familyName,
  unreadCount,
  currentUser,
  onNavigate,
  onBack,
}: Props) => {
  const isDashboard = screen === 'dashboard'
  const isNested = NESTED_SCREENS.has(screen)
  const showTitle = !isDashboard
  const title = MONEY_SCREENS.has(screen) ? 'Budget' : SCREEN_TITLES[screen]

  return (
    <header
      style={{
        minHeight: 'calc(52px + env(safe-area-inset-top, 0px))',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 16,
        gap: 12,
        flexShrink: 0,
        background: t.bg,
        borderBottom: `1px solid ${t.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      {isNested ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: t.text,
            padding: '4px 0',
            fontFamily: fonts.ui,
            flexShrink: 0,
            minHeight: 44,
          }}
        >
          <ArrowLeft size={18} />
          <span style={{ fontSize: 15 }}>Back</span>
        </button>
      ) : isDashboard ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <FamilyMark size={28} />
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: t.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {familyName}
          </span>
        </div>
      ) : null}

      {showTitle && (
        <span
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: t.text,
            flex: isNested ? 1 : undefined,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: fonts.display,
          }}
        >
          {title}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }} />
      <div className="hide-desktop" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          type="button"
          onClick={() => onNavigate('notifications')}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          style={{
            position: 'relative',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            flexShrink: 0,
            minWidth: 44,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell size={20} color={t.textSec} strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                minWidth: 16,
                height: 16,
                borderRadius: 9999,
                background: t.attention,
                color: t.onPrimary,
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1.5px solid ${t.bg}`,
                padding: '0 3px',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('family')}
          aria-label="Family members"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            minWidth: 44,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {currentUser && <MemberAvatar member={currentUser} size={32} />}
        </button>
      </div>
    </header>
  )
}
