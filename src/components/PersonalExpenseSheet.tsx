import { useState } from 'react'
import type { PersonalExpense, PersonalExpenseDraft } from '../types'
import { PERSONAL_EXPENSE_CATEGORIES } from '../types'
import { BottomSheet, FormField, Input, PrimaryButton, t } from '../ui'
import { dateInputFromIso, dateInputToIso } from '../api/adapters'

interface Props {
  expense?: PersonalExpense | null
  today: string
  onClose: () => void
  onSave: (input: PersonalExpenseDraft) => void
  onDelete?: (id: string) => void
}

export default function PersonalExpenseSheet({
  expense,
  today,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const isEdit = Boolean(expense)
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [category, setCategory] = useState(expense?.category ?? 'Other')
  const [merchant, setMerchant] = useState(expense?.merchant ?? '')
  const [note, setNote] = useState(expense?.note ?? '')
  const [date, setDate] = useState(
    expense ? dateInputFromIso(expense.occurredAt) : today,
  )

  const parsed = Number.parseFloat(amount.replace(',', '.'))
  const valid = Number.isFinite(parsed) && parsed > 0 && Boolean(category)

  const handleSave = () => {
    if (!valid) return
    onSave({
      amount: parsed,
      category,
      merchant: merchant.trim() || null,
      note: note.trim() || null,
      occurredAt: dateInputToIso(date),
    })
  }

  const handleDelete = () => {
    if (!expense || !onDelete) return
    onDelete(expense.id)
  }

  return (
    <BottomSheet title={isEdit ? 'Edit expense' : 'Add expense'} onClose={onClose}>
      <FormField label="Amount (€)">
        <Input
          placeholder="0.00"
          value={amount}
          onChange={setAmount}
          autoFocus={!isEdit}
          inputMode="decimal"
        />
      </FormField>
      <FormField label="Category">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          aria-label="Expense category"
          style={{
            width: '100%',
            border: `1px solid ${t.border}`,
            borderRadius: 'var(--ds-radius-md)',
            padding: '10px 12px',
            fontSize: 14,
            background: t.surface,
            color: t.text,
            fontFamily: 'var(--ds-font)',
          }}
        >
          {PERSONAL_EXPENSE_CATEGORIES.map(item => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Merchant">
        <Input placeholder="Café" value={merchant} onChange={setMerchant} />
      </FormField>
      <FormField label="Date">
        <Input type="date" value={date} onChange={setDate} />
      </FormField>
      <FormField label="Note (optional)">
        <Input placeholder="What was this for?" value={note} onChange={setNote} />
      </FormField>
      <PrimaryButton onClick={handleSave} fullWidth disabled={!valid}>
        {isEdit ? 'Save' : 'Add expense'}
      </PrimaryButton>
      {isEdit && expense && onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Delete expense"
          style={{
            width: '100%',
            marginTop: 12,
            padding: '12px',
            background: 'var(--ds-error-subtle)',
            color: 'var(--ds-error)',
            border: 'none',
            borderRadius: 'var(--ds-radius-md)',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--ds-font)',
          }}
        >
          Delete expense
        </button>
      )}
    </BottomSheet>
  )
}
