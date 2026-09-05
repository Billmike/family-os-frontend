import { fonts, t } from '../../ui'
import type { AssistantMessageIn } from '../../api/assistant'
import { AssistantComposer } from './AssistantComposer'
import { AssistantMark } from './AssistantMark'

interface Props {
  messages: AssistantMessageIn[]
  draft: string
  isTurnInFlight: boolean
  composerId?: string
  showComposer?: boolean
  onDraftChange: (value: string) => void
  onSend: () => void
}

const EXAMPLE_PROMPT = 'I spent €12 at Tesco'
const MAX_THREAD_MESSAGES = 20

export const canSendAssistantTurn = (
  draft: string,
  isTurnInFlight: boolean,
  messageCount: number,
) => draft.trim().length > 0 && !isTurnInFlight && messageCount < MAX_THREAD_MESSAGES

export const AssistantConversation = ({
  messages,
  draft,
  isTurnInFlight,
  composerId = 'assistant-composer',
  showComposer = true,
  onDraftChange,
  onSend,
}: Props) => {
  const canSend = canSendAssistantTurn(draft, isTurnInFlight, messages.length)

  const handleExampleClick = () => {
    if (isTurnInFlight) return
    onDraftChange(EXAMPLE_PROMPT)
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
          gap: 16,
          padding: showComposer ? '4px 16px 16px' : '4px 0 8px',
        }}
        aria-live="polite"
      >
        {messages.length === 0 && !isTurnInFlight && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <AssistantMark size={28} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 16,
                  background: t.surfaceChrome,
                  border: `1px solid ${t.border}`,
                  color: t.text,
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                Tell me a spend and I will draft it. Try an example below.
              </div>
              <button
                type="button"
                onClick={handleExampleClick}
                aria-label={`Use example: ${EXAMPLE_PROMPT}`}
                style={{
                  alignSelf: 'flex-start',
                  padding: '8px 12px',
                  borderRadius: 9999,
                  border: `1px solid ${t.borderStrong}`,
                  background: t.surfaceChrome,
                  color: t.text,
                  fontSize: 13,
                  fontFamily: fonts.ui,
                  cursor: 'pointer',
                  minHeight: 36,
                }}
              >
                {EXAMPLE_PROMPT}
              </button>
            </div>
          </div>
        )}
        {messages.map((message, index) => {
          const isUser = message.role === 'user'
          if (isUser) {
            return (
              <div
                key={`${message.role}-${index}`}
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '85%',
                  padding: '12px 14px',
                  borderRadius: 16,
                  background: t.primarySubtle,
                  color: t.text,
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {message.content}
              </div>
            )
          }
          return (
            <div
              key={`${message.role}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                maxWidth: '92%',
              }}
            >
              <AssistantMark size={28} />
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 16,
                  background: t.surfaceChrome,
                  border: `1px solid ${t.border}`,
                  color: t.text,
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {message.content}
              </div>
            </div>
          )
        })}
        {isTurnInFlight && (
          <div
            role="status"
            aria-label="Assistant is typing"
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
          >
            <AssistantMark size={28} />
            <div
              style={{
                display: 'flex',
                gap: 5,
                padding: '14px 16px',
                borderRadius: 16,
                background: t.surfaceChrome,
                border: `1px solid ${t.border}`,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: t.textTer }} />
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: t.textTer }} />
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: t.textTer }} />
            </div>
          </div>
        )}
      </div>
      {showComposer && (
        <AssistantComposer
          draft={draft}
          isTurnInFlight={isTurnInFlight}
          canSend={canSend}
          composerId={composerId}
          onDraftChange={onDraftChange}
          onSend={onSend}
        />
      )}
    </div>
  )
}
