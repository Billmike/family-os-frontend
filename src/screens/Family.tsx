import { useEffect, useState } from 'react'
import { UserPlus, MoreHorizontal } from 'lucide-react'
import type { Member, AppHandlers } from '../types'
import { t, r, MemberAvatar, Badge } from '../ui'

interface Props {
  members: Member[]
  familyName: string
  currentMemberId?: string
  onRename: (name: string) => void | Promise<void>
  openSheet: AppHandlers['openSheet']
  navigate: AppHandlers['navigate']
}

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', parent: 'Parent', child: 'Child' }
const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  admin:  { color: 'var(--ds-primary)',  bg: 'var(--ds-primary-subtle)' },
  parent: { color: 'var(--ds-text-secondary)', bg: 'var(--ds-surface-muted)' },
  child:  { color: 'var(--ds-success)',  bg: 'var(--ds-success-subtle)' },
}

export default function FamilyScreen({ members, familyName, currentMemberId, onRename, openSheet, navigate }: Props) {
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(familyName)

  useEffect(() => {
    setName(familyName)
  }, [familyName])

  const commitName = () => {
    setEditingName(false)
    const trimmed = name.trim()
    if (trimmed && trimmed !== familyName) void onRename(trimmed)
    else setName(familyName)
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
        {editingName ? (
          <input
            autoFocus
            style={{ fontSize: 22, fontWeight: 700, color: t.text, textAlign: 'center', border: 'none', borderBottom: `2px solid ${t.primary}`, outline: 'none', background: 'transparent', fontFamily: 'var(--ds-font)', letterSpacing: '-0.01em', padding: '4px 8px', width: '100%', maxWidth: 280, boxSizing: 'border-box' }}
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => e.key === 'Enter' && commitName()}
          />
        ) : (
          <button onClick={() => setEditingName(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, maxWidth: '100%' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, textAlign: 'center', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{name}</h1>
          </button>
        )}
        <span style={{ fontSize: 13, color: t.textTer }}>{members.length} members</span>
      </div>

      <div style={{ margin: '0 16px 20px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
        {members.map((m, i) => {
          const roleStyle = ROLE_COLORS[m.role] ?? ROLE_COLORS.parent
          const isYou = m.id === currentMemberId
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
              {!isYou && (
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex' }}>
                  <MoreHorizontal size={18} color={t.textTer} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ margin: '0 16px 20px' }}>
        <button
          onClick={() => openSheet({ type: 'inviteMember' })}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', border: `1.5px dashed ${t.borderStrong}`,
            borderRadius: r.lg, background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--ds-font)',
          }}
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

      <div style={{ margin: '0 16px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
        {[
          { label: 'Family settings', action: () => navigate('settings') },
          { label: 'Notification preferences', action: () => navigate('settings') },
          { label: 'Edit family name', action: () => setEditingName(true) },
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
    </div>
  )
}
