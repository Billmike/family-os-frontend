import type { FormEvent, KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { fonts, t } from '../../ui'
import type { AssistantMessageIn } from '../../api/assistant'

interface Props {
  messages: AssistantMessageIn[]
  draft: string
  isTurnInFlight: boolean
  composerId?: string
  onDraftChange: (value: string) => void
  onSend: () => void
}

const EXAMPLE_LINE = 'Try: I spent €12 at Tesco'
const MAX_MESSAGE_CHARS = 500
const MAX_THREAD_MESSAGES = 20

export const AssistantConversation = ({
  messages,
  draft,
  isTurnInFlight,
  composerId = 'assistant-composer',
  onDraftChange,
  onSend,
}: Props) => {
  const canSend =
    draft.trim().length > 0 &&
    !isTurnInFlight &&
    messages.length < MAX_THREAD_MESSAGES

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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        fontFamily: fonts.ui,
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          paddingBottom: 16,
        }}
        aria-live="polite"
      >
        {messages.length === 0 && !isTurnInFlight && (
          <p style={{ fontSize: 14, color: t.textSec, margin: 0, lineHeight: 1.5 }}>
            {EXAMPLE_LINE}
          </p>
        )}
        {messages.map((message, index) => {
          const isUser = message.role === 'user'
          return (
            <div
              key={`${message.role}-${index}`}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '10px 12px',
                borderRadius: 12,
                background: isUser ? t.primarySubtle : t.surfaceMuted,
                color: t.text,
                fontSize: 14,
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {message.content}
            </div>
          )
        })}
        {isTurnInFlight && (
          <div
            role="status"
            aria-label="Assistant is typing"
            style={{
              alignSelf: 'flex-start',
              display: 'flex',
              gap: 4,
              padding: '12px 14px',
              borderRadius: 12,
              background: t.surfaceMuted,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: t.textTer }} />
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: t.textTer }} />
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: t.textTer }} />
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <label htmlFor={composerId} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          Message the Assistant
        </label>
        <textarea
          id={composerId}
          aria-label="Message the Assistant"
          value={draft}
          maxLength={MAX_MESSAGE_CHARS}
          rows={2}
          disabled={isTurnInFlight}
          onChange={event => onDraftChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe a spend"
          style={{
            flex: 1,
            resize: 'none',
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: '10px 12px',
            fontFamily: fonts.ui,
            fontSize: 14,
            color: t.text,
            background: t.surfaceElev,
            outline: 'none',
            minHeight: 44,
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
          }}
        >
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
