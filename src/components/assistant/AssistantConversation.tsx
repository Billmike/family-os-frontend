import { fonts, t } from '../../ui'
import type {
  AssistantExpenseChangeSubmit,
  AssistantExpenseSubmit,
  AssistantTaskSubmit,
  AssistantThreadItem,
  ExpenseListRow,
} from '../../api/assistant'
import type { BudgetSubcategoryGroup, Member, PersonalExpenseAccount } from '../../types'
import { AssistantComposer } from './AssistantComposer'
import { AssistantMark } from './AssistantMark'
import {
  ExpenseProposalCard,
  FamilyExpenseSuccessCard,
} from './FamilyExpenseProposalCard'
import {
  ExpenseChangeProposalCard,
  ExpenseChangeSuccessCard,
} from './ExpenseChangeProposalCard'
import { ExpenseListCard } from './ExpenseListCard'
import { TaskProposalCard, TaskProposalSuccessCard } from './TaskProposalCard'

interface Props {
  messages: AssistantThreadItem[]
  draft: string
  isTurnInFlight: boolean
  revealingIndex?: number | null
  revealChars?: number | null
  composerId?: string
  showComposer?: boolean
  today?: string
  subcategoryGroups?: BudgetSubcategoryGroup[]
  personalAccounts?: PersonalExpenseAccount[]
  destinationHint?: 'household' | 'personal' | null
  lastUsedAccountId?: string | null
  members?: Member[]
  defaultMemberId?: string
  savingProposalIndex?: number | null
  onDraftChange: (value: string) => void
  onSend: () => void
  onAddProposal?: (index: number, input: AssistantExpenseSubmit) => void
  onAddTaskProposal?: (index: number, input: AssistantTaskSubmit) => void
  onSelectListRow?: (index: number, row: ExpenseListRow) => void
  onSaveChange?: (index: number, input: AssistantExpenseChangeSubmit) => void
  onDeleteChange?: (index: number) => void
  onCancelProposal?: (index: number) => void
}

const EXAMPLE_PROMPT = 'I spent €12 at Tesco'
const MAX_THREAD_MESSAGES = 20

export const canSendAssistantTurn = (
  draft: string,
  isBusy: boolean,
  messageCount: number,
) => draft.trim().length > 0 && !isBusy && messageCount < MAX_THREAD_MESSAGES

export const AssistantConversation = ({
  messages,
  draft,
  isTurnInFlight,
  revealingIndex = null,
  revealChars = null,
  composerId = 'assistant-composer',
  showComposer = true,
  today = '',
  subcategoryGroups = [],
  personalAccounts = [],
  destinationHint = null,
  lastUsedAccountId = null,
  members = [],
  defaultMemberId = '',
  savingProposalIndex = null,
  onDraftChange,
  onSend,
  onAddProposal,
  onAddTaskProposal,
  onSelectListRow,
  onSaveChange,
  onDeleteChange,
  onCancelProposal,
}: Props) => {
  const isBusy = isTurnInFlight || revealingIndex !== null
  const canSend = canSendAssistantTurn(draft, isBusy, messages.length)

  const handleExampleClick = () => {
    if (isBusy) return
    onDraftChange(EXAMPLE_PROMPT)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        height: '100%',
        minHeight: 0,
        fontFamily: fonts.ui,
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: showComposer ? '4px 16px 16px' : '4px 16px 8px',
        }}
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
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  aria-hidden={revealingIndex === index}
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
                  {revealingIndex === index && revealChars !== null
                    ? message.content.slice(0, revealChars)
                    : message.content}
                </div>
                {message.proposalState === 'saved' && message.savedSummary && (
                  <FamilyExpenseSuccessCard
                    amount={message.savedSummary.amount}
                    label={message.savedSummary.label}
                  />
                )}
                {message.proposalState === 'saved' && message.savedTaskTitle && (
                  <TaskProposalSuccessCard title={message.savedTaskTitle} />
                )}
                {message.proposal
                  && message.proposalState !== 'cancelled'
                  && message.proposalState !== 'saved'
                  && revealingIndex !== index && (
                  <ExpenseProposalCard
                    proposal={message.proposal}
                    today={today}
                    subcategoryGroups={subcategoryGroups}
                    personalAccounts={personalAccounts}
                    destinationHint={destinationHint}
                    lastUsedAccountId={lastUsedAccountId}
                    isSaving={savingProposalIndex === index}
                    onAdd={input => onAddProposal?.(index, input)}
                    onCancel={() => onCancelProposal?.(index)}
                  />
                )}
                {message.taskProposal
                  && message.proposalState !== 'cancelled'
                  && message.proposalState !== 'saved'
                  && revealingIndex !== index && (
                  <TaskProposalCard
                    proposal={message.taskProposal}
                    members={members}
                    defaultMemberId={defaultMemberId}
                    isSaving={savingProposalIndex === index}
                    onAdd={input => onAddTaskProposal?.(index, input)}
                    onCancel={() => onCancelProposal?.(index)}
                  />
                )}
                {message.expenseList && revealingIndex !== index && (
                  <ExpenseListCard
                    list={message.expenseList}
                    onSelectRow={row => onSelectListRow?.(index, row)}
                  />
                )}
                {message.changeOutcome && revealingIndex !== index && (
                  <ExpenseChangeSuccessCard
                    action={message.changeOutcome.action}
                    amount={message.changeOutcome.amount}
                    label={message.changeOutcome.label}
                    currency={message.expenseList?.currency}
                  />
                )}
                {message.changeProposal
                  && !message.changeOutcome
                  && revealingIndex !== index && (
                  <ExpenseChangeProposalCard
                    key={message.changeProposal.expense_id}
                    proposal={message.changeProposal}
                    subcategoryGroups={subcategoryGroups}
                    currency={message.expenseList?.currency}
                    isSaving={savingProposalIndex === index}
                    onSave={input => onSaveChange?.(index, input)}
                    onDelete={() => onDeleteChange?.(index)}
                    onCancel={() => onCancelProposal?.(index)}
                  />
                )}
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
          isTurnInFlight={isBusy}
          canSend={canSend}
          composerId={composerId}
          onDraftChange={onDraftChange}
          onSend={onSend}
        />
      )}
    </div>
  )
}
