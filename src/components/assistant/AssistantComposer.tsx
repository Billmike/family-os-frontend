import type { FormEvent, KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { fonts, r, t } from '../../ui'

interface Props {
  draft: string
  isTurnInFlight: boolean
  canSend: boolean
  composerId: string
  onDraftChange: (value: string) => void
  onSend: () => void
}

const MAX_MESSAGE_CHARS = 500

export const AssistantComposer = ({
  draft,
  isTurnInFlight,
  canSend,
  composerId,
  onDraftChange,
  onSend,
}: Props) => {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSend) return
    onSend()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend) onSend()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box',
        background: t.surfaceChrome,
        borderTop: `1px solid ${t.border}`,
        padding: '8px 12px calc(8px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <label htmlFor={composerId} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        Message the Assistant
      </label>
      <textarea
        id={composerId}
        aria-label="Message the Assistant"
        value={draft}
        maxLength={MAX_MESSAGE_CHARS}
        rows={1}
        disabled={isTurnInFlight}
        onChange={event => onDraftChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={event => {
          event.currentTarget.style.boxShadow = '0 0 0 3px var(--ds-focus)'
        }}
        onBlur={event => {
          event.currentTarget.style.boxShadow = 'none'
        }}
        placeholder="Ask about your household..."
        style={{
          flex: 1,
          resize: 'none',
          border: `1px solid ${t.border}`,
          borderRadius: r.pill,
          padding: '10px 16px',
          fontFamily: fonts.ui,
          fontSize: 14,
          color: t.text,
          background: t.surfaceMuted,
          outline: 'none',
          minHeight: 44,
          lineHeight: 1.4,
          boxShadow: 'none',
        }}
      />
      <button
        type="submit"
        aria-label="Send message"
        disabled={!canSend}
        style={{
          width: 44,
          height: 44,
          minWidth: 44,
          minHeight: 44,
          border: 'none',
          borderRadius: 9999,
          background: canSend ? t.primary : t.surfaceMuted,
          color: canSend ? t.onPrimary : t.textTer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: canSend ? 'pointer' : 'default',
          flexShrink: 0,
        }}
      >
        <Send size={16} aria-hidden="true" />
      </button>
    </form>
  )
}
