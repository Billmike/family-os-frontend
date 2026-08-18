import { useState } from 'react'
import type { Expense, ExpenseDraft } from '../types'
import { EXPENSE_CATEGORIES } from '../types'
import { BottomSheet, FormField, Input, PrimaryButton, Select, t } from '../ui'
import { dateInputFromIso, dateInputToIso } from '../api/adapters'

interface Props {
  expense?: Expense | null
  today: string
  onClose: () => void
  onSave: (input: ExpenseDraft) => void
  onDelete?: (id: string) => void
}

export default function ExpenseSheet({ expense, today, onClose, onSave, onDelete }: Props) {
  const isEdit = Boolean(expense)
  const [amount, setAmount] = useState(
    expense ? String(expense.amount) : '',
  )
  const [category, setCategory] = useState(expense?.category ?? 'Transportation')
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
        <Select
          value={category}
          onChange={setCategory}
          options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))}
        />
      </FormField>
      <FormField label="Merchant">
        <Input placeholder="Miles Berlin" value={merchant} onChange={setMerchant} />
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
          onClick={() => onDelete(expense.id)}
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
      {!isEdit && (
        <p style={{ fontSize: 12, color: t.textTer, textAlign: 'center', marginTop: 10 }}>
          Shopping trips are still completed from the Shopping tab.
        </p>
      )}
    </BottomSheet>
  )
}
