import { useState } from 'react'
import { Repeat } from 'lucide-react'
import type { AssistantTaskSubmit, TaskProposal } from '../../api/assistant'
import type { Member } from '../../types'
import { TASK_CATEGORIES } from '../../types'
import { fonts, t, PrimaryButton, GhostButton } from '../../ui'
import { ProposalField, proposalFieldInputStyle } from './ProposalField'

interface Props {
  proposal: TaskProposal
  members: Member[]
  defaultMemberId: string
  isSaving?: boolean
  onAdd: (input: AssistantTaskSubmit) => void
  onCancel: () => void
}

type EditableField = 'title' | 'assignee' | 'due' | 'priority' | 'category' | 'recurring'

type TaskDue = 'today' | 'tomorrow'
type TaskPriority = 'low' | 'medium' | 'high'

const dueFromProposal = (proposal: TaskProposal): TaskDue => {
  if (proposal.due === 'today' || proposal.due === 'tomorrow') return proposal.due
  return 'today'
}

const priorityFromProposal = (proposal: TaskProposal): TaskPriority => {
  if (proposal.priority === 'low' || proposal.priority === 'medium' || proposal.priority === 'high') {
    return proposal.priority
  }
  return 'medium'
}

const categoryFromProposal = (proposal: TaskProposal) => {
  if (proposal.category && (TASK_CATEGORIES as readonly string[]).includes(proposal.category)) {
    return proposal.category
  }
  return TASK_CATEGORIES[0]
}

const assigneeFromProposal = (
  proposal: TaskProposal,
  members: Member[],
  defaultMemberId: string,
) => {
  if (proposal.assignee_id && members.some(member => member.id === proposal.assignee_id)) {
    return proposal.assignee_id
  }
  if (defaultMemberId && members.some(member => member.id === defaultMemberId)) {
    return defaultMemberId
  }
  return members[0]?.id ?? ''
}

const priorityLabel = (priority: TaskPriority) => {
  if (priority === 'high') return 'High'
  if (priority === 'low') return 'Low'
  return 'Medium'
}

export const TaskProposalCard = ({
  proposal,
  members,
  defaultMemberId,
  isSaving = false,
  onAdd,
  onCancel,
}: Props) => {
  const [title, setTitle] = useState(proposal.title ?? '')
  const [assigneeId, setAssigneeId] = useState(
    assigneeFromProposal(proposal, members, defaultMemberId),
  )
  const [due, setDue] = useState<TaskDue>(dueFromProposal(proposal))
  const [priority, setPriority] = useState<TaskPriority>(priorityFromProposal(proposal))
  const [category, setCategory] = useState(categoryFromProposal(proposal))
  const [recurring, setRecurring] = useState(proposal.recurring)
  const [editing, setEditing] = useState<Partial<Record<EditableField, boolean>>>({})

  const selectedMember = members.find(member => member.id === assigneeId)
  const canAdd = title.trim().length > 0 && !isSaving

  const handleEdit = (field: EditableField) => {
    setEditing(current => ({ ...current, [field]: true }))
  }

  const handleDueChange = (value: string) => {
    if (value === 'today' || value === 'tomorrow') setDue(value)
  }

  const handlePriorityChange = (value: string) => {
    const next = value.toLowerCase()
    if (next === 'low' || next === 'medium' || next === 'high') setPriority(next)
  }

  const handleAdd = () => {
    if (!canAdd) return
    onAdd({
      title: title.trim(),
      assigneeId,
      due,
      priority,
      category,
      recurring,
    })
  }

  const handleCancel = () => {
    if (isSaving) return
    onCancel()
  }

  const handleRecurringToggle = () => {
    setRecurring(current => !current)
  }

  return (
    <div
      role="group"
      aria-label="Task proposal"
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 16,
        background: t.surface,
        border: `1px solid ${t.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontFamily: fonts.ui,
      }}
    >
      <ProposalField
        label="What needs doing?"
        confirmed={proposal.title_explicit && !editing.title && Boolean(title.trim())}
        confirmedText={title.trim()}
        onEdit={() => handleEdit('title')}
      >
        <input
          type="text"
          aria-label="What needs doing?"
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="Add a task…"
          style={proposalFieldInputStyle}
        />
      </ProposalField>
      <ProposalField
        label="Assign to"
        confirmed={
          proposal.assignee_id_explicit
          && !editing.assignee
          && Boolean(selectedMember)
          && assigneeId === proposal.assignee_id
        }
        confirmedText={selectedMember?.name ?? ''}
        onEdit={() => handleEdit('assignee')}
      >
        <select
          aria-label="Assign to"
          value={assigneeId}
          onChange={event => setAssigneeId(event.target.value)}
          style={{ ...proposalFieldInputStyle, cursor: 'pointer' }}
        >
          {members.map(member => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
      </ProposalField>
      <ProposalField
        label="Due"
        confirmed={proposal.due_explicit && !editing.due && Boolean(due)}
        confirmedText={due}
        onEdit={() => handleEdit('due')}
      >
        <select
          aria-label="Due"
          value={due}
          onChange={event => handleDueChange(event.target.value)}
          style={{ ...proposalFieldInputStyle, cursor: 'pointer' }}
        >
          <option value="today">today</option>
          <option value="tomorrow">tomorrow</option>
        </select>
      </ProposalField>
      <ProposalField
        label="Priority"
        confirmed={proposal.priority_explicit && !editing.priority}
        confirmedText={priorityLabel(priority)}
        onEdit={() => handleEdit('priority')}
      >
        <select
          aria-label="Priority"
          value={priorityLabel(priority)}
          onChange={event => handlePriorityChange(event.target.value)}
          style={{ ...proposalFieldInputStyle, cursor: 'pointer' }}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </ProposalField>
      <ProposalField
        label="Category"
        confirmed={proposal.category_explicit && !editing.category && Boolean(category)}
        confirmedText={category}
        onEdit={() => handleEdit('category')}
      >
        <select
          aria-label="Category"
          value={category}
          onChange={event => setCategory(event.target.value)}
          style={{ ...proposalFieldInputStyle, cursor: 'pointer' }}
        >
          {TASK_CATEGORIES.map(item => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </ProposalField>
      {proposal.recurring_explicit && !editing.recurring ? (
        <ProposalField
          label="Recurring task"
          confirmed
          confirmedText={recurring ? 'Weekly' : 'Off'}
          onEdit={() => handleEdit('recurring')}
        >
          <span />
        </ProposalField>
      ) : (
        <div>
          <span style={{ display: 'block', fontSize: 11, color: t.textSec, marginBottom: 4 }}>
            Recurring task
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 40,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: t.text }}>
              <Repeat size={16} color={t.textSec} aria-hidden="true" />
              Weekly
            </span>
            <button
              type="button"
              aria-label="Recurring task"
              aria-pressed={recurring}
              onClick={handleRecurringToggle}
              style={{
                width: 44,
                height: 26,
                borderRadius: 9999,
                border: 'none',
                background: recurring ? t.primary : t.border,
                cursor: 'pointer',
                position: 'relative',
                padding: 0,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 3,
                  left: recurring ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: 9999,
                  background: t.toggleKnob,
                  boxShadow: 'var(--ds-shadow-low)',
                }}
              />
            </button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <PrimaryButton
          onClick={handleAdd}
          disabled={!canAdd}
          aria-label="Add task"
          style={{ flex: 1, fontSize: 14 }}
        >
          {isSaving ? 'Adding…' : 'Add task'}
        </PrimaryButton>
        <GhostButton
          onClick={handleCancel}
          disabled={isSaving}
          bordered
          aria-label="Cancel task proposal"
          style={{ padding: '0 14px', fontSize: 14, background: t.surfaceChrome }}
        >
          Cancel
        </GhostButton>
      </div>
    </div>
  )
}

export const TaskProposalSuccessCard = ({ title }: { title: string }) => (
  <div
    role="status"
    aria-label={`Added task ${title}`}
    style={{
      marginTop: 10,
      padding: 12,
      borderRadius: 16,
      background: t.successSub,
      border: `1px solid ${t.border}`,
      fontFamily: fonts.ui,
    }}
  >
    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: t.text }}>
      {title}
    </p>
  </div>
)
