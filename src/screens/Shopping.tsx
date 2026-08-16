import { useState } from 'react'
import { Plus, ShoppingCart } from 'lucide-react'
import type { ShoppingItem, ShoppingLocation, Member, AppHandlers } from '../types'
import { t, r, ShoppingCheckbox, FAB, SectionLabel, EmptyState, SegmentedControl } from '../ui'
import { CATEGORY_ORDER } from '../data'

const UNASSIGNED = 'Unassigned'

interface Props {
  shopping: ShoppingItem[]
  locations: ShoppingLocation[]
  members: Member[]
  openSheet: AppHandlers['openSheet']
  completeShoppingItem: AppHandlers['completeShoppingItem']
}

export default function ShoppingScreen({
  shopping,
  locations,
  openSheet,
  completeShoppingItem,
}: Props) {
  const [groupBy, setGroupBy] = useState<'Category' | 'Store'>('Category')
  const active = shopping.filter(i => !i.completed)
  const completed = shopping.filter(i => i.completed)

  const locationNameById = new Map(locations.map(l => [l.id, l.name]))

  const storeNameFor = (item: ShoppingItem) =>
    item.locationId ? (locationNameById.get(item.locationId) ?? UNASSIGNED) : UNASSIGNED

  const groups: Record<string, ShoppingItem[]> = {}
  active.forEach(item => {
    const key = groupBy === 'Category' ? item.category : storeNameFor(item)
    ;(groups[key] ??= []).push(item)
  })

  const orderedKeys =
    groupBy === 'Category'
      ? [
          ...CATEGORY_ORDER.filter(c => groups[c]),
          ...Object.keys(groups).filter(c => !CATEGORY_ORDER.includes(c)),
        ]
      : [
          ...locations.map(l => l.name).filter(name => groups[name]),
          ...(groups[UNASSIGNED] ? [UNASSIGNED] : []),
          ...Object.keys(groups).filter(
            name => name !== UNASSIGNED && !locations.some(l => l.name === name),
          ),
        ]

  const totalActive = active.length

  return (
    <div style={{ minHeight: '100%', paddingBottom: 80 }}>
      {/* List header */}
      <div style={{ padding: '16px 16px 4px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: t.text, letterSpacing: '-0.01em', marginBottom: 2 }}>Groceries</h2>
          <p style={{ fontSize: 13, color: t.textSec }}>{totalActive} item{totalActive !== 1 ? 's' : ''} remaining</p>
        </div>
        {completed.length > 0 && (
          <span style={{ fontSize: 12, color: t.textTer }}>{completed.length} done</span>
        )}
      </div>

      <div style={{ padding: '8px 16px 4px' }}>
        <SegmentedControl
          options={['Category', 'Store']}
          value={groupBy}
          onChange={v => setGroupBy(v as 'Category' | 'Store')}
        />
      </div>

      {/* Collaboration note */}
      <div style={{ margin: '8px 16px', padding: '8px 12px', background: t.primarySubtle, borderRadius: r.md, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: 9999, background: t.primary, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: t.primary }}>Live sync with your family</span>
      </div>

      {/* Empty state */}
      {totalActive === 0 && completed.length === 0 && (
        <EmptyState
          icon={ShoppingCart}
          title="Nothing to buy"
          body="Add something your family needs."
          action="+ Add item"
          onAction={() => openSheet({ type: 'addShoppingItem' })}
        />
      )}

      {/* Active items grouped by category or store */}
      {orderedKeys.map(key => (
        <div key={key}>
          <SectionLabel>{key}</SectionLabel>
          <div style={{ margin: '0 16px 6px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
            {groups[key].map((item, i) => (
              <ShoppingRow
                key={item.id}
                item={item}
                divider={i > 0}
                onToggle={completeShoppingItem}
                secondary={groupBy === 'Category' ? storeNameFor(item) : item.category}
                hideSecondary={groupBy === 'Category' && !item.locationId}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Completed section */}
      {completed.length > 0 && (
        <div>
          <SectionLabel>In basket</SectionLabel>
          <div style={{ margin: '0 16px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
            {completed.map((item, i) => (
              <ShoppingRow
                key={item.id}
                item={item}
                divider={i > 0}
                onToggle={completeShoppingItem}
              />
            ))}
          </div>
        </div>
      )}

      {/* FAB */}
      <FAB onClick={() => openSheet({ type: 'addShoppingItem' })}>
        <Plus size={24} color="#fff" />
      </FAB>
    </div>
  )
}

// ─── ShoppingRow ──────────────────────────────────────────────────────────────

function ShoppingRow({ item, divider, onToggle, secondary, hideSecondary }: {
  item: ShoppingItem
  divider: boolean
  onToggle: (id: string) => void
  secondary?: string
  hideSecondary?: boolean
}) {
  return (
    <div style={{
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      borderTop: divider ? `1px solid ${t.border}` : 'none',
      opacity: item.completed ? 0.45 : 1,
      transition: 'opacity 0.2s',
    }}>
      <ShoppingCheckbox checked={item.completed} onChange={() => onToggle(item.id)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: t.text, textDecoration: item.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </div>
        {secondary && !hideSecondary && (
          <div style={{ fontSize: 12, color: t.textTer, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {secondary}
          </div>
        )}
      </div>
      {item.quantity > 1 && (
        <div style={{
          minWidth: 28, height: 22, borderRadius: r.pill, border: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px',
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: t.textSec }}>×{item.quantity}</span>
        </div>
      )}
    </div>
  )
}
