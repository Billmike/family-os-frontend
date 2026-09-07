import { useMemo, useState } from 'react'
import type { AssistantChangeOutcome, AssistantExpenseChangeSubmit, ExpenseChangeProposal } from '../../api/assistant'
import { dateInputToIso, formatMoney } from '../../api/adapters'
import type { BudgetSubcategoryGroup } from '../../types'
import { PERSONAL_EXPENSE_CATEGORIES } from '../../types'
import { fonts, r, t } from '../../ui'
import { titleCaseMerchant } from './titleCaseMerchant'
import { ProposalField, proposalFieldInputStyle } from './ProposalField'
import { familyProposalComplete, personalProposalComplete } from './FamilyExpenseProposalCard'

interface Props {
  proposal: ExpenseChangeProposal
  subcategoryGroups: BudgetSubcategoryGroup[]
  currency?: string
  isSaving?: boolean
  onSave: (input: AssistantExpenseChangeSubmit) => void
  onDelete: () => void
  onCancel: () => void
}

type EditableField = 'amount' | 'subcategory' | 'category' | 'merchant' | 'note' | 'date'

const categoryFromProposal = (proposal: ExpenseChangeProposal) => {
  if (proposal.category && (PERSONAL_EXPENSE_CATEGORIES as readonly string[]).includes(proposal.category)) {
    return proposal.category
  }
  return ''
}

export const ExpenseChangeProposalCard = ({
  proposal,
  subcategoryGroups,
  currency = 'EUR',
  isSaving = false,
  onSave,
  onDelete,
  onCancel,
}: Props) => {
  const isHousehold = proposal.destination === 'household'
  const isPersonal = proposal.destination === 'personal'
  const [amount, setAmount] = useState(proposal.amount ?? '')
  const [subcategoryId, setSubcategoryId] = useState(proposal.subcategory_id ?? '')
  const [category, setCategory] = useState(categoryFromProposal(proposal))
  const [merchant, setMerchant] = useState(proposal.merchant ?? '')
  const [note, setNote] = useState(proposal.note ?? '')
  const [date, setDate] = useState(proposal.occurred_on ?? '')
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
  const canSave = (
    isHousehold
      ? familyProposalComplete(amount, subcategoryId)
      : isPersonal
        ? personalProposalComplete(amount, category, proposal.account_id ?? '')
        : false
  ) && !isSaving

  const handleEdit = (field: EditableField) => {
    setEditing(current => ({ ...current, [field]: true }))
  }

  const handleMerchantBlur = () => {
    setMerchant(current => titleCaseMerchant(current))
  }

  const handleSave = () => {
    if (!canSave) return
    const titledMerchant = titleCaseMerchant(merchant)
    setMerchant(titledMerchant)
    const parsed = Number.parseFloat(amount.replace(',', '.'))
    const shared = {
      expenseId: proposal.expense_id,
      amount: parsed,
      merchant: titledMerchant || null,
      note: note.trim() || null,
      occurredAt: dateInputToIso(date),
    }
    if (isPersonal) {
      if (!proposal.account_id) return
      onSave({
        destination: 'personal',
        accountId: proposal.account_id,
        category,
        ...shared,
      })
      return
    }
    onSave({
      destination: 'household',
      subcategoryId,
      ...shared,
    })
  }

  const handleDelete = () => {
    if (isSaving) return
    onDelete()
  }

  const handleCancel = () => {
    if (isSaving) return
    onCancel()
  }

  return (
    <div
      role="group"
      aria-label="Expense change proposal"
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
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <p style={{ margin: 0, fontSize: 11, color: t.textSec }}>
        {isPersonal ? 'Personal' : 'Household'}
      </p>
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
          style={proposalFieldInputStyle}
        />
      </ProposalField>
      {isHousehold && (
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
            style={{ ...proposalFieldInputStyle, cursor: 'pointer' }}
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
      )}
      {isPersonal && (
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
            <option value="">Choose a category</option>
            {PERSONAL_EXPENSE_CATEGORIES.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </ProposalField>
      )}
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
          onBlur={handleMerchantBlur}
          placeholder="Optional"
          style={proposalFieldInputStyle}
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
          style={proposalFieldInputStyle}
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
          className="proposal-date-input"
          value={date}
          onChange={event => setDate(event.target.value)}
          style={proposalFieldInputStyle}
        />
      </ProposalField>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          aria-label="Save expense"
          style={{
            flex: 1,
            minHeight: 44,
            border: 'none',
            borderRadius: r.md,
            background: canSave ? t.primary : 'var(--ds-disabled-bg)',
            color: canSave ? t.onPrimary : 'var(--ds-disabled-text)',
            fontSize: 14,
            fontWeight: 500,
            fontFamily: fonts.ui,
            cursor: canSave ? 'pointer' : 'not-allowed',
          }}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          aria-label="Cancel expense change"
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
      <button
        type="button"
        onClick={handleDelete}
        disabled={isSaving}
        aria-label="Delete expense"
        style={{
          minHeight: 44,
          border: 'none',
          borderRadius: r.md,
          background: t.errorSub,
          color: t.error,
          fontSize: 14,
          fontWeight: 500,
          fontFamily: fonts.ui,
          cursor: isSaving ? 'not-allowed' : 'pointer',
        }}
      >
        Delete
      </button>
    </div>
  )
}

export const ExpenseChangeSuccessCard = ({
  action,
  amount,
  label,
  currency = 'EUR',
}: AssistantChangeOutcome & { currency?: string }) => {
  const parsed = Number.parseFloat(amount.replace(',', '.'))
  const amountLabel = Number.isFinite(parsed) ? formatMoney(parsed, currency) : amount
  const title = action === 'deleted' ? `Deleted · ${label}` : `${amountLabel} · ${label}`
  const ariaLabel = action === 'deleted' ? `Deleted ${label}` : `Saved ${amountLabel} in ${label}`
  return (
    <div
      role="status"
      aria-label={ariaLabel}
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
}
