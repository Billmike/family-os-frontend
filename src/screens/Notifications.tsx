import type { Notification, AppHandlers } from '../types'
import { Calendar, CheckSquare, ShoppingCart, Users, Bell } from 'lucide-react'
import { t, r, EmptyState } from '../ui'

interface Props {
  notifications: Notification[]
  markNotificationRead: AppHandlers['markNotificationRead']
  markAllNotificationsRead: AppHandlers['markAllNotificationsRead']
  navigate: AppHandlers['navigate']
}

const ICONS = {
  calendar: Calendar,
  task: CheckSquare,
  shopping: ShoppingCart,
  family: Users,
}

const ICON_COLORS = {
  calendar: { color: 'var(--ds-primary)',   bg: 'var(--ds-primary-subtle)' },
  task:     { color: 'var(--ds-success)',   bg: 'var(--ds-success-subtle)' },
  shopping: { color: 'var(--ds-warning)',   bg: 'var(--ds-warning-subtle)' },
  family:   { color: 'var(--ds-info)',      bg: 'var(--ds-info-subtle)' },
}

export default function NotificationsScreen({ notifications, markNotificationRead, markAllNotificationsRead, navigate }: Props) {
  const unread  = notifications.filter(n => !n.read)
  const todayNs = notifications.filter(n => !n.timestamp.includes('Yesterday'))
  const earlier = notifications.filter(n => n.timestamp.includes('Yesterday'))

  const handleTap = (n: Notification) => {
    markNotificationRead(n.id)
    if (n.targetScreen) navigate(n.targetScreen)
  }

  return (
    <div style={{ minHeight: '100%', paddingBottom: 40 }}>
      {/* Header actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
        {unread.length > 0
          ? <span style={{ fontSize: 13, color: t.textSec }}>{unread.length} unread</span>
          : <span style={{ fontSize: 13, color: t.textTer }}>All caught up</span>
        }
        {unread.length > 0 && (
          <button
            onClick={markAllNotificationsRead}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: t.primary, fontFamily: 'var(--ds-font)', fontWeight: 500 }}
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 && (
        <EmptyState icon={Bell} title="No notifications" body="You are all caught up." />
      )}

      {todayNs.length > 0 && (
        <NotifGroup title="Today" notifs={todayNs} onTap={handleTap} />
      )}
      {earlier.length > 0 && (
        <NotifGroup title="Earlier" notifs={earlier} onTap={handleTap} />
      )}
    </div>
  )
}

function NotifGroup({ title, notifs, onTap }: { title: string; notifs: Notification[]; onTap: (n: Notification) => void }) {
  return (
    <div style={{ margin: '12px 0 4px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: t.textTer, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 16px 8px' }}>{title}</p>
      <div style={{ margin: '0 16px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
        {notifs.map((n, i) => {
          const Icon = ICONS[n.type] ?? Bell
          const { color, bg } = ICON_COLORS[n.type]
          return (
            <button key={n.id} onClick={() => onTap(n)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '13px 16px', width: '100%', border: 'none', cursor: 'pointer',
              background: n.read ? t.surface : t.surfaceMuted,
              borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
              borderLeft: n.read ? '3px solid transparent' : `3px solid ${color}`,
              textAlign: 'left', fontFamily: 'var(--ds-font)',
              transition: 'background 0.15s',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: r.md, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={color} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: n.read ? 400 : 600, color: t.text, marginBottom: 3 }}>{n.title}</p>
                <p style={{ fontSize: 13, color: t.textSec, lineHeight: 1.5 }}>{n.body}</p>
                <p style={{ fontSize: 11, color: t.textTer, marginTop: 5 }}>{n.timestamp}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
