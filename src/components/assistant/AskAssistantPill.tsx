import type { KeyboardEvent } from 'react'
import { fonts, t } from '../../ui'
import { AssistantMark } from './AssistantMark'

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
        gap: compact ? 0 : 8,
        minWidth: 44,
        minHeight: 44,
        padding: compact ? 4 : '4px 12px 4px 4px',
        border: `1px solid ${t.border}`,
        borderRadius: 9999,
        background: t.surfaceElev,
        color: t.text,
        cursor: 'pointer',
        fontFamily: fonts.ui,
        fontSize: 13,
        fontWeight: 500,
        flexShrink: 0,
      }}
    >
      <AssistantMark size={compact ? 28 : 26} />
      {!compact && <span>Ask assistant</span>}
    </button>
  )
}
