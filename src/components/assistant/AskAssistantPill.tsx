import { fonts, t, GhostButton } from '../../ui'
import { AssistantMark } from './AssistantMark'

interface Props {
  onOpen: () => void
  compact?: boolean
}

export const AskAssistantPill = ({ onOpen, compact = false }: Props) => {
  return (
    <GhostButton
      onClick={onOpen}
      bordered
      aria-label="Ask Heimdall"
      style={{
        gap: compact ? 0 : 8,
        minWidth: 44,
        padding: compact ? 4 : '4px 12px 4px 4px',
        borderRadius: 9999,
        background: t.surfaceElev,
        fontFamily: fonts.ui,
        fontSize: 13,
      }}
    >
      <AssistantMark size={compact ? 28 : 26} />
      {!compact && <span>Ask Heimdall</span>}
    </GhostButton>
  )
}
