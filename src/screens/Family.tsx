import { useEffect, useState, type ReactNode } from 'react'
import { UserPlus, MoreHorizontal } from 'lucide-react'
import type { Member, AppHandlers } from '../types'
import { t, r, MemberAvatar, Badge, BottomSheet, Input, FormField } from '../ui'

interface Props {
  members: Member[]
  familyName: string
  currentMemberId?: string
  currentMemberRole?: Member['role']
  onRename: (name: string) => void | Promise<void>
  onRemoveMember: (memberId: string) => void | Promise<void>
  onLeaveFamily: () => void | Promise<void>
  onDeleteFamily: () => void | Promise<void>
  openSheet: AppHandlers['openSheet']
  navigate: AppHandlers['navigate']
}

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', parent: 'Parent', child: 'Child' }
const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  admin:  { color: 'var(--ds-primary)',  bg: 'var(--ds-primary-subtle)' },
  parent: { color: 'var(--ds-text-secondary)', bg: 'var(--ds-surface-muted)' },
  child:  { color: 'var(--ds-success)',  bg: 'var(--ds-success-subtle)' },
}

type ConfirmState =
  | { type: 'remove'; member: Member }
  | { type: 'leave' }
  | { type: 'delete' }
  | { type: 'memberMenu'; member: Member }
  | null

export default function FamilyScreen({
  members,
  familyName,
  currentMemberId,
  currentMemberRole,
  onRename,
  onRemoveMember,
  onLeaveFamily,
  onDeleteFamily,
  openSheet,
  navigate,
}: Props) {
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(familyName)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [deleteName, setDeleteName] = useState('')
  const [busy, setBusy] = useState(false)

  const isOwner = currentMemberRole === 'admin'
  const canInvite = currentMemberRole === 'admin' || currentMemberRole === 'parent'
  const canRename = canInvite

  useEffect(() => {
    setName(familyName)
  }, [familyName])

  const commitName = () => {
    setEditingName(false)
    const trimmed = name.trim()
    if (trimmed && trimmed !== familyName) void onRename(trimmed)
    else setName(familyName)
  }

  const handleCloseConfirm = () => {
    if (busy) return
    setConfirm(null)
    setDeleteName('')
  }

  const handleConfirmRemove = async () => {
    if (confirm?.type !== 'remove') return
    setBusy(true)
    try {
      await onRemoveMember(confirm.member.id)
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmLeave = async () => {
    setBusy(true)
    try {
      await onLeaveFamily()
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (deleteName.trim() !== familyName) return
    setBusy(true)
    try {
      await onDeleteFamily()
      setConfirm(null)
      setDeleteName('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100%', paddingBottom: 40 }}>
      <div style={{ padding: '24px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '100%' }}>
          {members.slice(0, 6).map((m, i) => (
            <div key={m.id} style={{ marginLeft: i > 0 ? -12 : 0, border: `2px solid ${t.bg}`, borderRadius: 9999 }}>
              <MemberAvatar member={m} size={48} />
            </div>
          ))}
          {members.length > 6 && (
            <div style={{
              marginLeft: -12, width: 48, height: 48, borderRadius: 9999,
              border: `2px solid ${t.bg}`, background: t.surfaceMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, color: t.textSec,
            }}>
              +{members.length - 6}
            </div>
          )}
        </div>
        {editingName && canRename ? (
          <input
            autoFocus
            style={{ fontSize: 22, fontWeight: 700, color: t.text, textAlign: 'center', border: 'none', borderBottom: `2px solid ${t.primary}`, outline: 'none', background: 'transparent', fontFamily: 'var(--ds-font)', letterSpacing: '-0.01em', padding: '4px 8px', width: '100%', maxWidth: 280, boxSizing: 'border-box' }}
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => e.key === 'Enter' && commitName()}
            aria-label="Family name"
          />
        ) : canRename ? (
          <button
            onClick={() => setEditingName(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, maxWidth: '100%' }}
            aria-label="Edit family name"
          >
            <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, textAlign: 'center', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{name}</h1>
          </button>
        ) : (
          <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, textAlign: 'center', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{name}</h1>
        )}
        <span style={{ fontSize: 13, color: t.textTer }}>{members.length} members</span>
      </div>

      <div style={{ margin: '0 16px 20px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
        {members.map((m, i) => {
          const roleStyle = ROLE_COLORS[m.role] ?? ROLE_COLORS.parent
          const isYou = m.id === currentMemberId
          const canManage = isOwner && !isYou
          return (
            <div key={m.id} style={{
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
              borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
            }}>
              <MemberAvatar member={m} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 16, fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{m.name}</span>
                  <Badge label={ROLE_LABELS[m.role] ?? m.role} color={roleStyle.color} bg={roleStyle.bg} />
                </div>
                <span style={{ fontSize: 12, color: t.textTer }}>
                  {isYou ? 'You' : m.userId ? 'Active member' : 'Profile only'}
                </span>
              </div>
              {canManage && (
                <button
                  onClick={() => setConfirm({ type: 'memberMenu', member: m })}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setConfirm({ type: 'memberMenu', member: m })
                    }
                  }}
                  tabIndex={0}
                  aria-label={`Manage ${m.name}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex' }}
                >
                  <MoreHorizontal size={18} color={t.textTer} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {canInvite && (
        <div style={{ margin: '0 16px 20px' }}>
          <button
            onClick={() => openSheet({ type: 'inviteMember' })}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', border: `1.5px dashed ${t.borderStrong}`,
              borderRadius: r.lg, background: 'transparent', cursor: 'pointer',
              fontFamily: 'var(--ds-font)',
            }}
            aria-label="Invite family member"
          >
            <div style={{ width: 44, height: 44, borderRadius: 9999, background: t.primarySubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UserPlus size={20} color={t.primary} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 15, fontWeight: 500, color: t.primary, marginBottom: 2 }}>Invite family member</p>
              <p style={{ fontSize: 12, color: t.textTer }}>Share an invite link</p>
            </div>
          </button>
        </div>
      )}

      <div style={{ margin: '0 16px 20px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
        {[
          { label: 'Family settings', action: () => navigate('settings') },
          { label: 'Notification preferences', action: () => navigate('settings') },
          ...(canRename ? [{ label: 'Edit family name', action: () => setEditingName(true) }] : []),
        ].map((item, i) => (
          <button key={item.label} onClick={item.action} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', border: 'none', borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
            background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
            fontFamily: 'var(--ds-font)', fontSize: 15, color: t.text,
          }}>
            {item.label}
            <span style={{ color: t.textTer, fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>

      <div style={{ margin: '0 16px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
        <button
          onClick={() => setConfirm({ type: 'leave' })}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', border: 'none', background: 'none', cursor: 'pointer',
            width: '100%', textAlign: 'left', fontFamily: 'var(--ds-font)', fontSize: 15,
            color: 'var(--ds-error)',
          }}
          aria-label="Leave family"
        >
          Leave family
        </button>
        {isOwner && (
          <button
            onClick={() => setConfirm({ type: 'delete' })}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', border: 'none', borderTop: `1px solid ${t.border}`,
              background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
              fontFamily: 'var(--ds-font)', fontSize: 15, color: 'var(--ds-error)',
            }}
            aria-label="Delete family"
          >
            Delete family
          </button>
        )}
      </div>

      {confirm?.type === 'memberMenu' && (
        <BottomSheet title={confirm.member.name} onClose={handleCloseConfirm}>
          <p style={{ fontSize: 14, color: t.textSec, lineHeight: 1.5, marginBottom: 16 }}>
            {confirm.member.userId ? 'Active member' : 'Profile only'} · {ROLE_LABELS[confirm.member.role] ?? confirm.member.role}
          </p>
          <button
            onClick={() => setConfirm({ type: 'remove', member: confirm.member })}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: r.md,
              border: `1px solid var(--ds-error)`, background: 'var(--ds-error-subtle)',
              color: 'var(--ds-error)', fontSize: 15, fontWeight: 500,
              fontFamily: 'var(--ds-font)', cursor: 'pointer',
            }}
            aria-label={`Remove ${confirm.member.name}`}
          >
            Remove from family
          </button>
        </BottomSheet>
      )}

      {confirm?.type === 'remove' && (
        <BottomSheet title="Remove member" onClose={handleCloseConfirm}>
          <p style={{ fontSize: 14, color: t.textSec, lineHeight: 1.55, marginBottom: 20 }}>
            Remove <strong style={{ color: t.text }}>{confirm.member.name}</strong> from this family? They will lose access to tasks, events, and shopping.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <DangerButton onClick={() => void handleConfirmRemove()} disabled={busy}>
              {busy ? 'Removing…' : 'Remove member'}
            </DangerButton>
            <button
              onClick={handleCloseConfirm}
              disabled={busy}
              style={{
                width: '100%', padding: '12px 20px', border: 'none', background: 'none',
                color: t.textSec, fontSize: 15, fontFamily: 'var(--ds-font)', cursor: busy ? 'default' : 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </BottomSheet>
      )}

      {confirm?.type === 'leave' && (
        <BottomSheet title="Leave family" onClose={handleCloseConfirm}>
          <p style={{ fontSize: 14, color: t.textSec, lineHeight: 1.55, marginBottom: 20 }}>
            {isOwner
              ? 'If you are the last adult, this family and all its data will be deleted. Otherwise another parent becomes the admin.'
              : 'You will lose access to this family’s tasks, events, and shopping.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <DangerButton onClick={() => void handleConfirmLeave()} disabled={busy}>
              {busy ? 'Leaving…' : 'Leave family'}
            </DangerButton>
            <button
              onClick={handleCloseConfirm}
              disabled={busy}
              style={{
                width: '100%', padding: '12px 20px', border: 'none', background: 'none',
                color: t.textSec, fontSize: 15, fontFamily: 'var(--ds-font)', cursor: busy ? 'default' : 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </BottomSheet>
      )}

      {confirm?.type === 'delete' && (
        <BottomSheet title="Delete family" onClose={handleCloseConfirm}>
          <p style={{ fontSize: 14, color: t.textSec, lineHeight: 1.55, marginBottom: 16 }}>
            This permanently deletes the family and all tasks, events, shopping lists, and members. Type <strong style={{ color: t.text }}>{familyName}</strong> to confirm.
          </p>
          <FormField label="Family name">
            <Input
              value={deleteName}
              onChange={setDeleteName}
              placeholder={familyName}
              autoFocus
            />
          </FormField>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            <DangerButton
              onClick={() => void handleConfirmDelete()}
              disabled={busy || deleteName.trim() !== familyName}
            >
              {busy ? 'Deleting…' : 'Delete family'}
            </DangerButton>
            <button
              onClick={handleCloseConfirm}
              disabled={busy}
              style={{
                width: '100%', padding: '12px 20px', border: 'none', background: 'none',
                color: t.textSec, fontSize: 15, fontFamily: 'var(--ds-font)', cursor: busy ? 'default' : 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

function DangerButton({
  onClick,
  children,
  disabled,
}: {
  onClick?: () => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', padding: '12px 20px',
        background: disabled ? 'var(--ds-disabled-bg)' : 'var(--ds-error)',
        color: disabled ? 'var(--ds-disabled-text)' : t.onPrimary,
        border: 'none', borderRadius: r.md, fontSize: 15, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'var(--ds-font)',
      }}
    >
      {children}
    </button>
  )
}
