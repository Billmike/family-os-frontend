import { useEffect, useMemo, useState } from 'react'
import type { BudgetSubcategoryGroup, Expense, ExpenseDraft, Receipt } from '../types'
import { BottomSheet, FormField, Input, PrimaryButton, t } from '../ui'
import { dateInputFromIso, dateInputToIso, formatMoney, toReceipt } from '../api/adapters'
import * as receiptsApi from '../api/receipts'

interface Props {
  expense?: Expense | null
  today: string
  subcategoryGroups: BudgetSubcategoryGroup[]
  onClose: () => void
  onSave: (input: ExpenseDraft) => void
  onDelete?: (id: string) => void
  onScanReceipt?: () => void
}

export default function ExpenseSheet({
  expense,
  today,
  subcategoryGroups,
  onClose,
  onSave,
  onDelete,
  onScanReceipt,
}: Props) {
  const isEdit = Boolean(expense)
  const flatOptions = useMemo(
    () =>
      subcategoryGroups.flatMap(g =>
        g.subcategories.map(s => ({
          id: s.id,
          label: `${g.group} · ${s.name}`,
          group: g.group,
        })),
      ),
    [subcategoryGroups],
  )
  const defaultSubId =
    expense?.subcategoryId ??
    flatOptions.find(o => o.group === 'Fixed Expense' && o.label.includes('Transport'))?.id ??
    flatOptions[0]?.id ??
    ''

  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [subcategoryId, setSubcategoryId] = useState(defaultSubId)
  const [merchant, setMerchant] = useState(expense?.merchant ?? '')
  const [note, setNote] = useState(expense?.note ?? '')
  const [date, setDate] = useState(
    expense ? dateInputFromIso(expense.occurredAt) : today,
  )
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!expense || expense.sourceType !== 'receipt') return
    let cancelled = false
    const load = async () => {
      try {
        const raw = await receiptsApi.getReceiptForExpense(expense.id)
        if (cancelled) return
        const ui = toReceipt(raw)
        setReceipt(ui)
        const blob = await receiptsApi.getReceiptImage(ui.id)
        if (cancelled) return
        setReceiptImageUrl(URL.createObjectURL(blob))
      } catch {
        /* optional panel */
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [expense])

  useEffect(() => {
    return () => {
      if (receiptImageUrl) URL.revokeObjectURL(receiptImageUrl)
    }
  }, [receiptImageUrl])

  const parsed = Number.parseFloat(amount.replace(',', '.'))
  const valid = Number.isFinite(parsed) && parsed > 0 && Boolean(subcategoryId)

  const handleSave = () => {
    if (!valid) return
    onSave({
      amount: parsed,
      subcategoryId,
      merchant: merchant.trim() || null,
      note: note.trim() || null,
      occurredAt: dateInputToIso(date),
    })
  }

  return (
    <BottomSheet title={isEdit ? 'Edit entry' : 'Add entry'} onClose={onClose}>
      {receipt && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 'var(--ds-radius-md)',
            border: `1px solid ${t.border}`,
            background: t.surfaceMuted,
          }}
        >
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: t.textSec }}>
            From receipt
          </p>
          {receiptImageUrl && (
            <img
              src={receiptImageUrl}
              alt="Receipt"
              style={{
                width: '100%',
                maxHeight: 120,
                objectFit: 'contain',
                borderRadius: 'var(--ds-radius-sm)',
                marginBottom: 8,
                background: t.surface,
              }}
            />
          )}
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: t.textSec }}>
            {receipt.items
              .filter(item => item.isIncluded)
              .slice(0, 8)
              .map(item => (
                <li key={item.id} style={{ marginBottom: 4 }}>
                  {item.name}{' '}
                  <span style={{ color: t.textTer }}>
                    {formatMoney(item.totalPrice, receipt.currency ?? expense?.currency ?? 'EUR')}
                  </span>
                </li>
              ))}
            {receipt.items.filter(item => item.isIncluded).length > 8 && (
              <li style={{ color: t.textTer }}>
                +{receipt.items.filter(item => item.isIncluded).length - 8} more
              </li>
            )}
          </ul>
        </div>
      )}
      <FormField label="Amount (€)">
        <Input
          placeholder="0.00"
          value={amount}
          onChange={setAmount}
          autoFocus={!isEdit}
          inputMode="decimal"
        />
      </FormField>
      <FormField label="Subcategory">
        <select
          value={subcategoryId}
          onChange={e => setSubcategoryId(e.target.value)}
          aria-label="Budget subcategory"
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
          {subcategoryGroups.map(g => (
            <optgroup key={g.group} label={g.group}>
              {g.subcategories.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
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
        {isEdit ? 'Save' : 'Add entry'}
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
          Delete entry
        </button>
      )}
      {!isEdit && onScanReceipt && (
        <button
          type="button"
          onClick={onScanReceipt}
          aria-label="Scan a receipt instead"
          style={{
            width: '100%',
            marginTop: 12,
            padding: '12px',
            background: 'transparent',
            color: t.primary,
            border: 'none',
            borderRadius: 'var(--ds-radius-md)',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--ds-font)',
          }}
        >
          Scan a receipt instead
        </button>
      )}
      {!isEdit && !onScanReceipt && (
        <p style={{ fontSize: 12, color: t.textTer, textAlign: 'center', marginTop: 10 }}>
          Shopping trips are still completed from the Shopping tab.
        </p>
      )}
    </BottomSheet>
  )
}
