import { useEffect, useState } from 'react'
import type { AppHandlers, Member } from '../types'
import type { UserOut } from '../api/types'
import * as notificationsApi from '../api/notifications'
import { ApiError } from '../api/client'
import { t, r, Toggle, MemberAvatar } from '../ui'

interface Props {
  navigate: AppHandlers['navigate']
  user: UserOut | null
  currentMember?: Member | null
  onSignOut: () => void
}

export default function SettingsScreen({ navigate, user, currentMember, onSignOut }: Props) {
  const displayMember: Member = currentMember ?? {
    id: user?.id ?? 'me',
    name: user?.name ?? 'You',
    role: 'admin',
    initials: (user?.name ?? 'Y').slice(0, 1).toUpperCase(),
    color: '#6366F1',
    bg: '#EEF2FF',
  }

  const [prefs, setPrefs] = useState({
    eventReminders: true,
    taskAssigned: true,
    taskDueSoon: true,
    shoppingUpdates: true,
    familyInvites: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const p = await notificationsApi.getNotificationPreferences()
        setPrefs({
          eventReminders: p.calendar_reminders,
          taskAssigned: p.task_assignments,
          taskDueSoon: p.task_due_soon,
          shoppingUpdates: p.shopping_activity,
          familyInvites: p.family_activity,
        })
      } catch {
        /* keep defaults */
      }
    })()
  }, [])

  const toggle = async (key: keyof typeof prefs) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setSaving(true)
    setError(null)
    try {
      await notificationsApi.updateNotificationPreferences({
        calendar_reminders: next.eventReminders,
        task_assignments: next.taskAssigned,
        task_due_soon: next.taskDueSoon,
        shopping_activity: next.shoppingUpdates,
        family_activity: next.familyInvites,
      })
    } catch (e) {
      setPrefs(prefs)
      setError(e instanceof ApiError ? e.message : 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100%', paddingBottom: 40 }}>
      <section style={{ margin: '16px 16px 20px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: t.textTer, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Account</p>
        <div style={{ background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: `1px solid ${t.border}`, minWidth: 0 }}>
            <MemberAvatar member={displayMember} size={52} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 17, fontWeight: 600, color: t.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name ?? displayMember.name}</p>
              <p style={{ fontSize: 13, color: t.textTer, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email ?? ''}</p>
            </div>
          </div>
          {['Edit name', 'Change email', 'Change avatar'].map((item, i) => (
            <SettingsRow key={item} label={item} divider={i > 0} />
          ))}
        </div>
      </section>

      <section style={{ margin: '0 16px 20px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: t.textTer, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Notifications{saving ? '…' : ''}
        </p>
        {error && <p style={{ fontSize: 12, color: 'var(--ds-error)', marginBottom: 8 }}>{error}</p>}
        <div style={{ background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          <PrefGroup label="Calendar">
            <ToggleRow label="Event reminders" value={prefs.eventReminders} onChange={() => void toggle('eventReminders')} />
          </PrefGroup>
          <PrefGroup label="Tasks" divider>
            <ToggleRow label="Task assigned to me" value={prefs.taskAssigned} onChange={() => void toggle('taskAssigned')} />
            <ToggleRow label="Task due soon" value={prefs.taskDueSoon} onChange={() => void toggle('taskDueSoon')} divider />
          </PrefGroup>
          <PrefGroup label="Shopping" divider>
            <ToggleRow label="Someone adds an item" value={prefs.shoppingUpdates} onChange={() => void toggle('shoppingUpdates')} />
          </PrefGroup>
          <PrefGroup label="Family" divider>
            <ToggleRow label="Family invitations" value={prefs.familyInvites} onChange={() => void toggle('familyInvites')} />
          </PrefGroup>
        </div>
      </section>

      <section style={{ margin: '0 16px 20px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: t.textTer, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Family</p>
        <div style={{ background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          <SettingsRow label="Manage family" onClick={() => navigate('family')} />
          <SettingsRow label="Invite a member" onClick={() => navigate('family')} divider />
        </div>
      </section>

      <section style={{ margin: '0 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: t.textTer, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>App</p>
        <div style={{ background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          <SettingsRow label="Install FamilyOS" />
          <SettingsRow label="About" divider />
          <SettingsRow label="Sign out" danger divider onClick={onSignOut} />
        </div>
      </section>
    </div>
  )
}

function SettingsRow({ label, divider, danger, onClick }: { label: string; divider?: boolean; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px', width: '100%', border: 'none',
      borderTop: divider ? `1px solid ${t.border}` : 'none',
      background: 'none', cursor: onClick ? 'pointer' : 'default', textAlign: 'left',
      fontFamily: 'var(--ds-font)', fontSize: 15,
      color: danger ? 'var(--ds-error)' : t.text,
    }}>
      {label}
      {!danger && <span style={{ color: t.textTer, fontSize: 18 }}>›</span>}
    </button>
  )
}

function PrefGroup({ label, children, divider }: { label: string; children: React.ReactNode; divider?: boolean }) {
  return (
    <div style={{ borderTop: divider ? `1px solid ${t.border}` : 'none' }}>
      <p style={{ fontSize: 12, fontWeight: 500, color: t.textTer, padding: '10px 16px 4px' }}>{label}</p>
      {children}
    </div>
  )
}

function ToggleRow({ label, value, onChange, divider }: { label: string; value: boolean; onChange: () => void; divider?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', borderTop: divider ? `1px solid ${t.border}` : 'none',
      gap: 12,
    }}>
      <span style={{ fontSize: 15, color: t.text, flex: 1, minWidth: 0, paddingRight: 12 }}>{label}</span>
      <Toggle on={value} onChange={onChange} />
    </div>
  )
}
