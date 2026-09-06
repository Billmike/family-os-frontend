import type { ExpenseList, ExpenseListRow } from '../../api/assistant'
import { formatMoney } from '../../api/adapters'
import { fonts, t } from '../../ui'

interface Props {
  list: ExpenseList
}

const formatListDate = (occurredOn: string) => {
  const [year, month, day] = occurredOn.split('-').map(Number)
  if (!year || !month || !day) return occurredOn
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

const rowTitle = (row: ExpenseListRow) => row.merchant ?? ''

const windowLabel = (list: ExpenseList) =>
  list.period_label ? `Household · ${list.period_label}` : 'Household'

export const ExpenseListCard = ({ list }: Props) => {
  const totalLabel = formatMoney(Number.parseFloat(list.total) || 0, list.currency)
  const heading = `${list.count} · ${totalLabel}`
  const label = `${windowLabel(list)}, ${heading}`

  return (
    <div
      role="region"
      aria-label={label}
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
      <div>
        <p style={{ margin: 0, fontSize: 11, color: t.textSec }}>{windowLabel(list)}</p>
        <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 600, color: t.text }}>
          {heading}
        </p>
      </div>
      {list.rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: t.textTer }}>No expenses in this window.</p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {list.rows.map((row, index) => (
            <li
              key={row.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 0',
                borderTop: index === 0 ? 'none' : `1px solid ${t.border}`,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: t.text }}>
                  {rowTitle(row)}
                </div>
                <div style={{ fontSize: 12, color: t.textTer, marginTop: 2 }}>
                  {formatListDate(row.occurred_on)}
                  {row.category_or_subcategory_label
                    ? ` · ${row.category_or_subcategory_label}`
                    : ''}
                </div>
              </div>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: t.text,
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                }}
              >
                {formatMoney(Number.parseFloat(row.amount) || 0, list.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
