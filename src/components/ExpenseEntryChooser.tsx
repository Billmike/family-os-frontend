import type { CSSProperties } from 'react'
import { Camera, Keyboard } from 'lucide-react'
import { BottomSheet, t } from '../ui'

interface Props {
  onClose: () => void
  onScan: () => void
  onManual: () => void
}

export default function ExpenseEntryChooser({ onClose, onScan, onManual }: Props) {
  return (
    <BottomSheet title="Add expense" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          type="button"
          onClick={onScan}
          aria-label="Scan receipt"
          style={actionStyle}
        >
          <Camera size={20} color={t.primary} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, color: t.text }}>Scan receipt</div>
            <div style={{ fontSize: 13, color: t.textSec }}>
              Extract items and total from a photo
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={onManual}
          aria-label="Add manually"
          style={actionStyle}
        >
          <Keyboard size={20} color={t.primary} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, color: t.text }}>Add manually</div>
            <div style={{ fontSize: 13, color: t.textSec }}>
              Enter amount, category, and merchant
            </div>
          </div>
        </button>
      </div>
    </BottomSheet>
  )
}

const actionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  width: '100%',
  padding: '14px 16px',
  borderRadius: 'var(--ds-radius-md)',
  border: '1px solid var(--ds-border)',
  background: 'var(--ds-surface)',
  cursor: 'pointer',
  fontFamily: 'var(--ds-font)',
}
