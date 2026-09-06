import { type CSSProperties, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { fonts, r, t } from '../../ui'

export const proposalFieldInputStyle: CSSProperties = {
  width: '100%',
  minHeight: 40,
  padding: '0 10px',
  borderRadius: r.md,
  border: `1px solid ${t.borderStrong}`,
  background: t.surface,
  color: t.text,
  fontSize: 14,
  fontFamily: fonts.ui,
  outline: 'none',
  boxSizing: 'border-box',
}

export const ProposalField = ({
  label,
  confirmed,
  confirmedText,
  onEdit,
  children,
}: {
  label: string
  confirmed: boolean
  confirmedText: string
  onEdit: () => void
  children: ReactNode
}) => {
  if (confirmed) {
    return (
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${label}, ${confirmedText}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          width: '100%',
          minHeight: 40,
          padding: '8px 10px',
          borderRadius: r.md,
          border: `1px solid ${t.border}`,
          background: t.successSub,
          color: t.text,
          fontFamily: fonts.ui,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>
          <span style={{ display: 'block', fontSize: 11, color: t.textSec, marginBottom: 2 }}>{label}</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{confirmedText}</span>
        </span>
        <Check size={16} color={t.success} aria-hidden="true" />
      </button>
    )
  }
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 11, color: t.textSec, marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  )
}
