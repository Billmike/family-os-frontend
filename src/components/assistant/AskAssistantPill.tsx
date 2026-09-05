import type { KeyboardEvent } from 'react'
import { MessageSquare } from 'lucide-react'
import { fonts, t } from '../../ui'

interface Props {
  onOpen: () => void
  compact?: boolean
}

export const AskAssistantPill = ({ onOpen, compact = false }: Props) => {
  const handleClick = () => {
    onOpen()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label="Ask assistant"
      tabIndex={0}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 0 : 6,
        minWidth: 44,
        minHeight: 44,
        padding: compact ? 6 : '6px 12px',
        border: `1px solid ${t.border}`,
        borderRadius: 9999,
        background: t.primarySubtle,
        color: t.primary,
        cursor: 'pointer',
        fontFamily: fonts.ui,
        fontSize: 13,
        fontWeight: 500,
        flexShrink: 0,
      }}
    >
      <MessageSquare size={16} strokeWidth={1.75} aria-hidden="true" />
      {!compact && <span>Ask assistant</span>}
    </button>
  )
}
