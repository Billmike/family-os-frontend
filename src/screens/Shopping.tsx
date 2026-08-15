import { useState } from 'react'
import { Plus, ShoppingCart } from 'lucide-react'
import type { ShoppingItem, Member, AppHandlers } from '../types'
import { t, r, ShoppingCheckbox, FAB, SectionLabel, EmptyState } from '../ui'
import { getMember, CATEGORY_ORDER } from '../data'

interface Props {
  shopping: ShoppingItem[]
  members: Member[]
  openSheet: AppHandlers['openSheet']
  completeShoppingItem: AppHandlers['completeShoppingItem']
}

export default function ShoppingScreen({ shopping, openSheet, completeShoppingItem }: Props) {
  const active    = shopping.filter(i => !i.completed)
  const completed = shopping.filter(i => i.completed)

  // Group by category in a defined order
  const categories: Record<string, ShoppingItem[]> = {}
  active.forEach(item => {
    ;(categories[item.category] ??= []).push(item)
  })

  const orderedCats = [
    ...CATEGORY_ORDER.filter(c => categories[c]),
    ...Object.keys(categories).filter(c => !CATEGORY_ORDER.includes(c)),
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

      {/* Active items grouped by category */}
      {orderedCats.map(cat => (
        <div key={cat}>
          <SectionLabel>{cat}</SectionLabel>
          <div style={{ margin: '0 16px 6px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
            {categories[cat].map((item, i) => (
              <ShoppingRow
                key={item.id}
                item={item}
                divider={i > 0}
                onToggle={completeShoppingItem}
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

function ShoppingRow({ item, divider, onToggle }: {
  item: ShoppingItem
  divider: boolean
  onToggle: (id: string) => void
}) {
  const addedBy = getMember(item.addedById)
  return (
    <div style={{
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      borderTop: divider ? `1px solid ${t.border}` : 'none',
      opacity: item.completed ? 0.45 : 1,
      transition: 'opacity 0.2s',
    }}>
      <ShoppingCheckbox checked={item.completed} onChange={() => onToggle(item.id)} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: t.text, textDecoration: item.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.name}
      </span>
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
