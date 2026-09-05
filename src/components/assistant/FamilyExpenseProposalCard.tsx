import { useMemo, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import type { ExpenseProposal } from '../../api/assistant'
import { dateInputToIso, formatMoney } from '../../api/adapters'
import type { BudgetSubcategoryGroup, ExpenseDraft } from '../../types'
import { fonts, r, t } from '../../ui'

interface Props {
  proposal: ExpenseProposal
  today: string
  subcategoryGroups: BudgetSubcategoryGroup[]
  currency?: string
  isSaving?: boolean
  onAdd: (input: ExpenseDraft) => void
  onCancel: () => void
}

type EditableField = 'amount' | 'subcategory' | 'merchant' | 'note' | 'date'

export const familyProposalComplete = (amount: string, subcategoryId: string) => {
  const parsed = Number.parseFloat(amount.replace(',', '.'))
  return Number.isFinite(parsed) && parsed > 0 && Boolean(subcategoryId)
}

export const FamilyExpenseProposalCard = ({
  proposal,
  today,
  subcategoryGroups,
  currency = 'EUR',
  isSaving = false,
  onAdd,
  onCancel,
}: Props) => {
  const [amount, setAmount] = useState(proposal.amount ?? '')
  const [subcategoryId, setSubcategoryId] = useState(proposal.subcategory_id ?? '')
  const [merchant, setMerchant] = useState(proposal.merchant ?? '')
  const [note, setNote] = useState(proposal.note ?? '')
  const [date, setDate] = useState(
    proposal.occurred_on_explicit && proposal.occurred_on
      ? proposal.occurred_on
      : today,
  )
  const [editing, setEditing] = useState<Partial<Record<EditableField, boolean>>>({})

  const flatOptions = useMemo(
    () =>
      subcategoryGroups.flatMap(group =>
        group.subcategories.map(sub => ({
          id: sub.id,
          name: sub.name,
          group: group.group,
        })),
      ),
    [subcategoryGroups],
  )
  const selectedSub = flatOptions.find(option => option.id === subcategoryId)
  const canAdd = familyProposalComplete(amount, subcategoryId) && !isSaving

  const handleEdit = (field: EditableField) => {
    setEditing(current => ({ ...current, [field]: true }))
  }

  const handleAdd = () => {
    if (!canAdd) return
    const parsed = Number.parseFloat(amount.replace(',', '.'))
    onAdd({
      amount: parsed,
      subcategoryId,
      merchant: merchant.trim() || null,
      note: note.trim() || null,
      occurredAt: dateInputToIso(date),
    })
  }

  const handleCancel = () => {
    if (isSaving) return
    onCancel()
  }

  return (
    <div
      role="group"
      aria-label="Expense proposal"
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
        label="Amount"
        confirmed={proposal.amount_explicit && !editing.amount && Boolean(amount)}
        confirmedText={formatMoney(Number.parseFloat(amount.replace(',', '.')) || 0, currency)}
        onEdit={() => handleEdit('amount')}
      >
        <input
          type="text"
          inputMode="decimal"
          aria-label="Amount"
          value={amount}
          onChange={event => setAmount(event.target.value)}
          placeholder="0.00"
          style={fieldInputStyle}
        />
      </ProposalField>
      <ProposalField
        label="Subcategory"
        confirmed={proposal.subcategory_id_explicit && !editing.subcategory && Boolean(selectedSub)}
        confirmedText={selectedSub ? `${selectedSub.group} · ${selectedSub.name}` : ''}
        onEdit={() => handleEdit('subcategory')}
      >
        <select
          aria-label="Subcategory"
          value={subcategoryId}
          onChange={event => setSubcategoryId(event.target.value)}
          style={{ ...fieldInputStyle, cursor: 'pointer' }}
        >
          <option value="">Choose a subcategory</option>
          {subcategoryGroups.map(group => (
            <optgroup key={group.group} label={group.group}>
              {group.subcategories.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </ProposalField>
      <ProposalField
        label="Merchant"
        confirmed={proposal.merchant_explicit && !editing.merchant && Boolean(merchant)}
        confirmedText={merchant}
        onEdit={() => handleEdit('merchant')}
      >
        <input
          type="text"
          aria-label="Merchant"
          value={merchant}
          onChange={event => setMerchant(event.target.value)}
          placeholder="Optional"
          style={fieldInputStyle}
        />
      </ProposalField>
      <ProposalField
        label="Note"
        confirmed={proposal.note_explicit && !editing.note && Boolean(note)}
        confirmedText={note}
        onEdit={() => handleEdit('note')}
      >
        <input
          type="text"
          aria-label="Note"
          value={note}
          onChange={event => setNote(event.target.value)}
          placeholder="Optional"
          style={fieldInputStyle}
        />
      </ProposalField>
      <ProposalField
        label="Date"
        confirmed={proposal.occurred_on_explicit && !editing.date && Boolean(date)}
        confirmedText={date}
        onEdit={() => handleEdit('date')}
      >
        <input
          type="date"
          aria-label="Date"
          value={date}
          onChange={event => setDate(event.target.value)}
          style={fieldInputStyle}
        />
      </ProposalField>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          aria-label="Add expense"
          style={{
            flex: 1,
            minHeight: 44,
            border: 'none',
            borderRadius: r.md,
            background: canAdd ? t.primary : 'var(--ds-disabled-bg)',
            color: canAdd ? t.onPrimary : 'var(--ds-disabled-text)',
            fontSize: 14,
            fontWeight: 500,
            fontFamily: fonts.ui,
            cursor: canAdd ? 'pointer' : 'not-allowed',
          }}
        >
          {isSaving ? 'Adding…' : 'Add expense'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          aria-label="Cancel expense proposal"
          style={{
            minHeight: 44,
            padding: '0 14px',
            border: `1px solid ${t.borderStrong}`,
            borderRadius: r.md,
            background: t.surfaceChrome,
            color: t.text,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: fonts.ui,
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export const FamilyExpenseSuccessCard = ({
  amount,
  subcategoryName,
  currency = 'EUR',
}: {
  amount: string
  subcategoryName: string
  currency?: string
}) => {
  const parsed = Number.parseFloat(amount.replace(',', '.'))
  const amountLabel = Number.isFinite(parsed) ? formatMoney(parsed, currency) : amount
  return (
    <div
      role="status"
      aria-label={`Added ${amountLabel} in ${subcategoryName}`}
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
        {amountLabel} · {subcategoryName}
      </p>
    </div>
  )
}

const fieldInputStyle = {
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
  boxSizing: 'border-box' as const,
}

const ProposalField = ({
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
