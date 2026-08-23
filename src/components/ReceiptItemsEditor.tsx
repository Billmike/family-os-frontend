import type { ReceiptItemDraft } from '../types'
import { FormField, Input, t } from '../ui'
import { formatMoney } from '../api/adapters'

interface Props {
  items: ReceiptItemDraft[]
  currency: string
  receiptTotal: number
  onChange: (items: ReceiptItemDraft[]) => void
}

export default function ReceiptItemsEditor({ items, currency, receiptTotal, onChange }: Props) {
  const includedSum = items
    .filter(item => item.isIncluded)
    .reduce((sum, item) => sum + (Number.isFinite(item.totalPrice) ? item.totalPrice : 0), 0)

  const handleUpdate = (index: number, patch: Partial<ReceiptItemDraft>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const handleToggle = (index: number) => {
    const item = items[index]
    if (!item) return
    handleUpdate(index, { isIncluded: !item.isIncluded })
  }

  const handleAddLine = () => {
    onChange([
      ...items,
      {
        name: '',
        quantity: 1,
        unit: null,
        unitPrice: null,
        totalPrice: 0,
        taxCode: null,
        isIncluded: true,
      },
    ])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
          color: t.textSec,
        }}
      >
        <span>Included lines</span>
        <span>
          {formatMoney(includedSum, currency)}
          {' / '}
          {formatMoney(receiptTotal, currency)}
        </span>
      </div>

      {items.map((item, index) => (
        <div
          key={`item-${index}`}
          style={{
            padding: 12,
            borderRadius: 'var(--ds-radius-md)',
            border: `1px solid ${t.border}`,
            background: item.isIncluded ? t.surface : t.surfaceMuted,
            opacity: item.isIncluded ? 1 : 0.7,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: t.textSec,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={item.isIncluded}
                onChange={() => handleToggle(index)}
                aria-label={`Include ${item.name || 'item'}`}
              />
              Include
            </label>
            <span style={{ fontSize: 13, color: t.textTer }}>#{index + 1}</span>
          </div>
          <FormField label="Name">
            <Input
              value={item.name}
              onChange={value => handleUpdate(index, { name: value })}
              placeholder="Item name"
            />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <FormField label="Qty">
              <Input
                value={item.quantity == null ? '' : String(item.quantity)}
                onChange={value => {
                  const parsed = Number.parseFloat(value.replace(',', '.'))
                  handleUpdate(index, {
                    quantity: Number.isFinite(parsed) ? parsed : null,
                  })
                }}
                inputMode="decimal"
                placeholder="1"
              />
            </FormField>
            <FormField label="Price">
              <Input
                value={String(item.totalPrice || '')}
                onChange={value => {
                  const parsed = Number.parseFloat(value.replace(',', '.'))
                  handleUpdate(index, {
                    totalPrice: Number.isFinite(parsed) ? parsed : 0,
                  })
                }}
                inputMode="decimal"
                placeholder="0.00"
              />
            </FormField>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddLine}
        aria-label="Add line item"
        style={{
          padding: '10px 12px',
          borderRadius: 'var(--ds-radius-md)',
          border: `1px dashed ${t.borderStrong}`,
          background: 'transparent',
          color: t.textSec,
          fontSize: 14,
          fontFamily: 'var(--ds-font)',
          cursor: 'pointer',
        }}
      >
        Add line
      </button>
    </div>
  )
}
