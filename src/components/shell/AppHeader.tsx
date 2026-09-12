import { ArrowLeft, Bell } from 'lucide-react'
import type { Member, Screen } from '../../types'
import { t, fonts, MemberAvatar, GhostButton, IconButton } from '../../ui'
import { AskAssistantPill } from '../assistant/AskAssistantPill'
import { FamilyMark } from './FamilyMark'
import { SCREEN_TITLES } from './nav'

interface Props {
  screen: Screen
  familyName: string
  unreadCount: number
  currentUser: Member | null
  assistantEnabled?: boolean
  onNavigate: (screen: Screen) => void
  onBack: () => void
  onOpenAssistant?: () => void
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
  assistantEnabled = false,
  onNavigate,
  onBack,
  onOpenAssistant,
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
        <GhostButton
          onClick={onBack}
          aria-label="Back"
          style={{
            gap: 4,
            padding: '4px 0',
            flexShrink: 0,
            fontWeight: 400,
          }}
        >
          <ArrowLeft size={18} aria-hidden />
          <span style={{ fontSize: 15 }}>Back</span>
        </GhostButton>
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
            fontFamily: fonts.ui,
          }}
        >
          {title}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }} />
      {assistantEnabled && onOpenAssistant && (
        <div className="hide-mobile">
          <AskAssistantPill onOpen={onOpenAssistant} />
        </div>
      )}
      <div className="hide-desktop" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {assistantEnabled && onOpenAssistant && (
          <AskAssistantPill onOpen={onOpenAssistant} compact />
        )}
        <IconButton
          onClick={() => onNavigate('notifications')}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          style={{ position: 'relative' }}
        >
          <Bell size={20} strokeWidth={1.75} aria-hidden />
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
        </IconButton>
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
