import { useEffect, useState } from 'react'
import type { AppHandlers, Member } from '../types'
import type { UserOut } from '../api/types'
import * as notificationsApi from '../api/notifications'
import { ApiError } from '../api/client'
import { t, r, Toggle, MemberAvatar, BottomSheet, SegmentedControl, FormField, Input } from '../ui'
import { useTheme } from '../lib/theme/ThemeProvider'
import type { ThemePreference } from '../lib/theme/theme'
import { InstallStepsList } from '../lib/pwa/InstallStepsList'
import { usePwaInstall } from '../lib/pwa/usePwaInstall'
import {
  iosInstallRequired,
  isPushEnabledOnThisDevice,
  isPushSupported,
  subscribeThisDevice,
  unsubscribeThisDevice,
} from '../lib/push/webPush'

interface Props {
  navigate: AppHandlers['navigate']
  user: UserOut | null
  currentMember?: Member | null
  familyName?: string
  isOwner?: boolean
  onSignOut: () => void
  onLeaveFamily: () => void | Promise<void>
  onDeleteFamily: () => void | Promise<void>
}

export default function SettingsScreen({
  navigate,
  user,
  currentMember,
  familyName = '',
  isOwner = false,
  onSignOut,
  onLeaveFamily,
  onDeleteFamily,
}: Props) {
  const { preference, setPreference } = useTheme()
  const appearanceLabel =
    preference === 'light' ? 'Light' : preference === 'dark' ? 'Dark' : 'System'

  const handleAppearanceChange = (label: string) => {
    setPreference(label.toLowerCase() as ThemePreference)
  }

  const displayMember: Member = currentMember ?? {
    id: user?.id ?? 'me',
    name: user?.name ?? 'You',
    role: 'admin',
    initials: (user?.name ?? 'Y').slice(0, 1).toUpperCase(),
    color: 'var(--ds-member-1)',
    bg: 'var(--ds-member-1-bg)',
  }

  const [prefs, setPrefs] = useState({
    eventReminders: true,
    taskAssigned: true,
    taskDueSoon: true,
    shoppingUpdates: true,
    familyInvites: true,
    budgetAlerts: true,
  })
  const [pushOnDevice, setPushOnDevice] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [vapidAvailable, setVapidAvailable] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInstallSheet, setShowInstallSheet] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [installBusy, setInstallBusy] = useState(false)
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [familyActionBusy, setFamilyActionBusy] = useState(false)
  const pwa = usePwaInstall()
  const needsIosInstall = iosInstallRequired()

  useEffect(() => {
    setPushOnDevice(isPushEnabledOnThisDevice())
    void (async () => {
      try {
        const p = await notificationsApi.getNotificationPreferences()
        setPrefs({
          eventReminders: p.calendar_reminders,
          taskAssigned: p.task_assignments,
          taskDueSoon: p.task_due_soon,
          shoppingUpdates: p.shopping_activity,
          familyInvites: p.family_activity,
          budgetAlerts: p.budget_alerts,
        })
      } catch {
        /* keep defaults */
      }
      try {
        const { public_key } = await notificationsApi.getVapidPublicKey()
        setVapidAvailable(Boolean(public_key))
      } catch {
        setVapidAvailable(false)
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
        budget_alerts: next.budgetAlerts,
      })
    } catch (e) {
      setPrefs(prefs)
      setError(e instanceof ApiError ? e.message : 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const togglePush = async () => {
    if (needsIosInstall) {
      setShowInstallSheet(true)
      return
    }
    if (!isPushSupported() || !vapidAvailable) {
      setError('Push notifications are not available on this device')
      return
    }
    setPushBusy(true)
    setError(null)
    try {
      if (pushOnDevice) {
        await unsubscribeThisDevice()
        setPushOnDevice(false)
      } else {
        const result = await subscribeThisDevice()
        if (result === 'subscribed') {
          setPushOnDevice(true)
        } else if (result === 'denied') {
          setError('Notification permission was denied. Enable it in browser settings.')
        } else if (result === 'ios_install_required') {
          setShowInstallSheet(true)
        } else {
          setError('Could not enable push on this device')
        }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to update push settings')
    } finally {
      setPushBusy(false)
    }
  }

  const sendTestPush = async () => {
    setPushBusy(true)
    setError(null)
    try {
      const { sent, subscriptions, error } = await notificationsApi.sendTestPush()
      if (sent < 1) {
        if (error) {
          setError(error)
        } else if (subscriptions < 1) {
          setError('No push subscription on the server for this account. Toggle push off and on again.')
        } else {
          setError('Push send failed. Check VAPID keys on the server.')
        }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to send test push')
    } finally {
      setPushBusy(false)
    }
  }

  const onInstallRowClick = async () => {
    if (pwa.mode === 'installed') return
    if (pwa.mode === 'prompt') {
      setInstallBusy(true)
      try {
        await pwa.promptInstall()
      } finally {
        setInstallBusy(false)
      }
      return
    }
    setShowInstallSheet(true)
  }

  const installLabel =
    pwa.mode === 'installed'
      ? 'Installed'
      : installBusy
        ? 'Installing…'
        : 'Install FamilyOS'

  const showPushToggle = isPushSupported() && vapidAvailable

  const handleCloseConfirm = () => {
    if (familyActionBusy) return
    setConfirm(null)
    setDeleteName('')
  }

  const handleConfirmLeave = async () => {
    setFamilyActionBusy(true)
    try {
      await onLeaveFamily()
      setConfirm(null)
    } finally {
      setFamilyActionBusy(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (deleteName.trim() !== familyName) return
    setFamilyActionBusy(true)
    try {
      await onDeleteFamily()
      setConfirm(null)
      setDeleteName('')
    } finally {
      setFamilyActionBusy(false)
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
        <p style={{ fontSize: 11, fontWeight: 700, color: t.textTer, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Appearance</p>
        <div
          role="group"
          aria-label="Appearance"
          style={{ background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, padding: 12 }}
        >
          <SegmentedControl
            options={['Light', 'Dark', 'System']}
            value={appearanceLabel}
            onChange={handleAppearanceChange}
          />
          {preference === 'system' && (
            <p style={{ fontSize: 12, color: t.textTer, marginTop: 10, padding: '0 4px' }}>Matches this device</p>
          )}
        </div>
      </section>

      <section style={{ margin: '0 16px 20px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: t.textTer, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Notifications{saving || pushBusy ? '…' : ''}
        </p>
        {error && <p style={{ fontSize: 12, color: 'var(--ds-error)', marginBottom: 8 }}>{error}</p>}
        {needsIosInstall && (
          <p style={{ fontSize: 12, color: t.textSec, marginBottom: 8, lineHeight: 1.45 }}>
            On iPhone and iPad, install FamilyOS to your Home Screen to enable push notifications.
          </p>
        )}
        <div style={{ background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          {showPushToggle && (
            <>
              <ToggleRow
                label="Push on this device"
                value={pushOnDevice}
                onChange={() => void togglePush()}
              />
              {pushOnDevice && (
                <SettingsRow
                  label="Send test push"
                  divider
                  onClick={() => void sendTestPush()}
                />
              )}
            </>
          )}
          <PrefGroup label="Calendar" divider={showPushToggle}>
            <ToggleRow label="Events and reminders" value={prefs.eventReminders} onChange={() => void toggle('eventReminders')} />
          </PrefGroup>
          <PrefGroup label="Tasks" divider>
            <ToggleRow label="Task assigned to me" value={prefs.taskAssigned} onChange={() => void toggle('taskAssigned')} />
            <ToggleRow label="Task due soon" value={prefs.taskDueSoon} onChange={() => void toggle('taskDueSoon')} divider />
          </PrefGroup>
          <PrefGroup label="Shopping" divider>
            <ToggleRow label="Items added or bought" value={prefs.shoppingUpdates} onChange={() => void toggle('shoppingUpdates')} />
          </PrefGroup>
          <PrefGroup label="Family" divider>
            <ToggleRow label="Someone joins the family" value={prefs.familyInvites} onChange={() => void toggle('familyInvites')} />
          </PrefGroup>
          <PrefGroup label="Budgets" divider>
            <ToggleRow label="Budget alerts" value={prefs.budgetAlerts} onChange={() => void toggle('budgetAlerts')} />
          </PrefGroup>
        </div>
      </section>

      <section style={{ margin: '0 16px 20px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: t.textTer, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Family</p>
        <div style={{ background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          <SettingsRow label="Family settings" onClick={() => navigate('family')} />
          <SettingsRow label="Invite a member" onClick={() => navigate('family')} divider />
          <SettingsRow label="Sign out" danger divider onClick={onSignOut} />
        </div>
      </section>

      <section style={{ margin: '0 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: t.textTer, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>App</p>
        <div style={{ background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          <SettingsRow
            label={installLabel}
            onClick={pwa.mode === 'installed' ? undefined : () => void onInstallRowClick()}
          />
          <SettingsRow label="About" divider onClick={() => setShowAbout(true)} />
        </div>
      </section>

      <section style={{ margin: '0 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: t.textTer, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Danger zone</p>
        <div style={{ background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          <SettingsRow label="Leave family" danger onClick={() => setConfirm('leave')} />
          {isOwner && (
            <SettingsRow label="Delete family" danger divider onClick={() => setConfirm('delete')} />
          )}
        </div>
      </section>

      {showInstallSheet && (
        <BottomSheet title="Install FamilyOS" onClose={() => setShowInstallSheet(false)}>
          <p style={{ fontSize: 14, color: t.textSec, lineHeight: 1.6, marginBottom: 16 }}>
            Add FamilyOS to your home screen for a full-screen app experience
            {needsIosInstall ? ' and to enable push notifications.' : '.'}
          </p>
          <InstallStepsList variant={pwa.isIos ? 'ios' : 'manual'} />
        </BottomSheet>
      )}

      {showAbout && (
        <BottomSheet title="About FamilyOS" onClose={() => setShowAbout(false)}>
          <p style={{ fontSize: 14, color: t.textSec, lineHeight: 1.6, marginBottom: 16 }}>
            FamilyOS is a shared household coordination app — one place for your family to see
            what is happening today, what needs to be done, what needs to be bought, and what
            needs your attention.
          </p>
          <p style={{ fontSize: 14, color: t.textSec, lineHeight: 1.6, marginBottom: 16 }}>
            Everything your family needs to coordinate today, in one place.
          </p>
          <ul
            style={{
              margin: '0 0 20px',
              padding: '0 0 0 18px',
              fontSize: 14,
              color: t.textSec,
              lineHeight: 1.7,
            }}
          >
            <li>Dashboard for today&apos;s overview</li>
            <li>Shared calendar and reminders</li>
            <li>Family tasks and assignments</li>
            <li>Shopping lists everyone can update</li>
            <li>Notifications that keep the household in sync</li>
          </ul>
          <p style={{ fontSize: 13, color: t.textTer, marginBottom: 4 }}>Version 0.1</p>
          <p style={{ fontSize: 13, color: t.textTer, lineHeight: 1.5 }}>
            Built as a mobile-first progressive web app for the whole household.
          </p>
        </BottomSheet>
      )}
      {confirm === 'leave' && (
        <BottomSheet title="Leave family" onClose={handleCloseConfirm}>
          <p style={{ fontSize: 14, color: t.textSec, lineHeight: 1.55, marginBottom: 20 }}>
            {isOwner
              ? 'If you are the last adult, this family and all its data will be deleted. Otherwise another parent becomes the admin.'
              : 'You will lose access to this family\u2019s tasks, events, and shopping.'}
          </p>
          <button
            onClick={() => void handleConfirmLeave()}
            disabled={familyActionBusy}
            style={{
              width: '100%', padding: '12px 20px', marginBottom: 10,
              background: familyActionBusy ? 'var(--ds-disabled-bg)' : 'var(--ds-error)',
              color: familyActionBusy ? 'var(--ds-disabled-text)' : t.onPrimary,
              border: 'none', borderRadius: r.md, fontSize: 15, fontWeight: 500,
              cursor: familyActionBusy ? 'not-allowed' : 'pointer', fontFamily: 'var(--ds-font)',
            }}
          >
            {familyActionBusy ? 'Leaving\u2026' : 'Leave family'}
          </button>
          <button
            onClick={handleCloseConfirm}
            disabled={familyActionBusy}
            style={{
              width: '100%', padding: '12px 20px', border: 'none', background: 'none',
              color: t.textSec, fontSize: 15, fontFamily: 'var(--ds-font)',
              cursor: familyActionBusy ? 'default' : 'pointer',
            }}
          >
            Cancel
          </button>
        </BottomSheet>
      )}

      {confirm === 'delete' && (
        <BottomSheet title="Delete family" onClose={handleCloseConfirm}>
          <p style={{ fontSize: 14, color: t.textSec, lineHeight: 1.55, marginBottom: 16 }}>
            This permanently deletes the family and all tasks, events, shopping lists, and members. Type{' '}
            <strong style={{ color: t.text }}>{familyName}</strong> to confirm.
          </p>
          <FormField label="Family name">
            <Input
              value={deleteName}
              onChange={setDeleteName}
              placeholder={familyName}
              autoFocus
            />
          </FormField>
          <button
            onClick={() => void handleConfirmDelete()}
            disabled={familyActionBusy || deleteName.trim() !== familyName}
            style={{
              width: '100%', padding: '12px 20px', marginBottom: 10, marginTop: 8,
              background:
                familyActionBusy || deleteName.trim() !== familyName
                  ? 'var(--ds-disabled-bg)'
                  : 'var(--ds-error)',
              color:
                familyActionBusy || deleteName.trim() !== familyName
                  ? 'var(--ds-disabled-text)'
                  : t.onPrimary,
              border: 'none', borderRadius: r.md, fontSize: 15, fontWeight: 500,
              cursor:
                familyActionBusy || deleteName.trim() !== familyName ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--ds-font)',
            }}
          >
            {familyActionBusy ? 'Deleting\u2026' : 'Delete family'}
          </button>
          <button
            onClick={handleCloseConfirm}
            disabled={familyActionBusy}
            style={{
              width: '100%', padding: '12px 20px', border: 'none', background: 'none',
              color: t.textSec, fontSize: 15, fontFamily: 'var(--ds-font)',
              cursor: familyActionBusy ? 'default' : 'pointer',
            }}
          >
            Cancel
          </button>
        </BottomSheet>
      )}
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
      {!danger && onClick && <span style={{ color: t.textTer, fontSize: 18 }}>›</span>}
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
