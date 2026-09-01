import { Settings } from 'lucide-react'
import type { Member, Screen } from '../../types'
import { isBudgetSection } from '../../routing'
import { t, fonts, MemberAvatar } from '../../ui'
import { FamilyMark } from './FamilyMark'
import { DESKTOP_NAV } from './nav'

interface Props {
  screen: Screen
  familyName: string
  unreadCount: number
  currentUser: Member | null
  userName?: string
  onNavigate: (screen: Screen) => void
}

export const DesktopSidebar = ({
  screen,
  familyName,
  unreadCount,
  currentUser,
  userName,
  onNavigate,
}: Props) => {
  return (
    <aside
      style={{
        width: 228,
        background: t.bg,
        borderRight: `1px solid ${t.border}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        padding: '20px 0 12px',
        height: '100%',
      }}
    >
      <div
        style={{
          padding: '4px 20px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <FamilyMark size={28} />
        <span
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: t.text,
            fontFamily: fonts.display,
          }}
        >
          FamilyOS
        </span>
      </div>
      {DESKTOP_NAV.map(item => {
        const Icon = item.icon
        const active =
          screen === item.screen ||
          (item.screen === 'budgetSpend' && isBudgetSection(screen))
        return (
          <button
            key={item.screen}
            type="button"
            onClick={() => onNavigate(item.screen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 20px',
              minHeight: 44,
              border: 'none',
              background: 'transparent',
              color: active ? t.primary : t.textSec,
              fontSize: 14,
              fontWeight: active ? 500 : 400,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: fonts.ui,
              borderLeft: active ? `2px solid ${t.primary}` : '2px solid transparent',
            }}
          >
            <Icon size={18} strokeWidth={active ? 2 : 1.75} />
            {item.label}
            {item.screen === 'notifications' && unreadCount > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9999,
                  background: t.attention,
                  color: t.onPrimary,
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        )
      })}
      <div style={{ flex: 1 }} />
      <div
        style={{
          padding: '12px 16px',
          borderTop: `1px solid ${t.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() => onNavigate('family')}
          aria-label="Family members"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {currentUser && <MemberAvatar member={currentUser} size={32} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser?.name ?? userName}
          </p>
          <p style={{ fontSize: 11, color: t.textTer, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {familyName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          aria-label="Settings"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            padding: 10,
            minWidth: 44,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Settings size={16} color={t.textTer} />
        </button>
      </div>
    </aside>
  )
}
