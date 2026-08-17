import { useState } from 'react'
import { Plus, ShoppingCart, ArrowLeft, Undo2 } from 'lucide-react'
import type {
  ShoppingItem,
  ShoppingLocation,
  ShoppingSession,
  Member,
  AppHandlers,
} from '../types'
import { t, r, ShoppingCheckbox, FAB, SectionLabel, EmptyState, SegmentedControl, PrimaryButton } from '../ui'
import { CATEGORY_ORDER } from '../data'
import { formatSessionCost, formatSessionDate } from '../api/adapters'

const UNASSIGNED = 'Unassigned'

type ShoppingView = 'list' | 'basket' | 'session-detail'

interface Props {
  shopping: ShoppingItem[]
  locations: ShoppingLocation[]
  members: Member[]
  activeSession: ShoppingSession | null
  sessionHistory: ShoppingSession[]
  loadSessionDetail: (sessionId: string) => Promise<ShoppingSession | null>
  openSheet: AppHandlers['openSheet']
  addToBasket: AppHandlers['addToBasket']
  removeFromBasket: AppHandlers['removeFromBasket']
}

export default function ShoppingScreen({
  shopping,
  locations,
  activeSession,
  sessionHistory,
  loadSessionDetail,
  openSheet,
  addToBasket,
  removeFromBasket,
}: Props) {
  const [view, setView] = useState<ShoppingView>('list')
  const [groupBy, setGroupBy] = useState<'Category' | 'Store'>('Category')
  const [selectedSession, setSelectedSession] = useState<ShoppingSession | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const active = shopping.filter(i => !i.completed)
  const basketCount = activeSession?.itemCount ?? 0

  const locationNameById = new Map(locations.map(l => [l.id, l.name]))

  const storeNameFor = (item: { locationId?: string | null; locationName?: string | null }) =>
    item.locationId
      ? (locationNameById.get(item.locationId) ?? item.locationName ?? UNASSIGNED)
      : (item.locationName ?? UNASSIGNED)

  const handleOpenSession = async (session: ShoppingSession) => {
    setLoadingDetail(true)
    const detail = await loadSessionDetail(session.id)
    setLoadingDetail(false)
    if (detail) {
      setSelectedSession(detail)
      setView('session-detail')
    }
  }

  if (view === 'basket') {
    const items = activeSession?.items ?? []
    return (
      <div style={{ minHeight: '100%', paddingBottom: 80 }}>
        <BasketHeader count={items.length} onBack={() => setView('list')} />
        {items.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Basket is empty"
            body="Mark items as purchased to add them here."
            action="Back to list"
            onAction={() => setView('list')}
          />
        ) : (
          <>
            <div style={{ margin: '0 16px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
              {items.map((item, i) => (
                <BasketRow
                  key={item.id}
                  item={item}
                  divider={i > 0}
                  secondary={storeNameFor(item)}
                  onUndo={() => removeFromBasket(item.id)}
                />
              ))}
            </div>
            <div style={{ padding: '16px' }}>
              <PrimaryButton onClick={() => openSheet({ type: 'completeShopping' })} fullWidth>
                Complete shopping
              </PrimaryButton>
            </div>
          </>
        )}
      </div>
    )
  }

  if (view === 'session-detail' && selectedSession) {
    const items = selectedSession.items ?? []
    const dateLabel = formatSessionDate(selectedSession.completedAt ?? selectedSession.startedAt)
    const costLabel = formatSessionCost(selectedSession)
    return (
      <div style={{ minHeight: '100%', paddingBottom: 80 }}>
        <div style={{ padding: '16px 16px 4px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setView('list')}
            aria-label="Back to shopping list"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          >
            <ArrowLeft size={20} color={t.text} />
          </button>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: t.text, marginBottom: 2 }}>{dateLabel}</h2>
            <p style={{ fontSize: 13, color: t.textSec }}>
              {items.length} item{items.length !== 1 ? 's' : ''}
              {costLabel ? ` · ${costLabel}` : ''}
            </p>
          </div>
        </div>
        <div style={{ margin: '8px 16px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          {items.map((item, i) => (
            <BasketRow
              key={item.id}
              item={item}
              divider={i > 0}
              secondary={storeNameFor(item)}
            />
          ))}
        </div>
      </div>
    )
  }

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
      <div style={{ padding: '16px 16px 4px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: t.text, letterSpacing: '-0.01em', marginBottom: 2 }}>Groceries</h2>
          <p style={{ fontSize: 13, color: t.textSec }}>{totalActive} item{totalActive !== 1 ? 's' : ''} remaining</p>
        </div>
        {basketCount > 0 && (
          <button
            onClick={() => setView('basket')}
            aria-label={`Open basket with ${basketCount} items`}
            style={{
              position: 'relative',
              background: t.primarySubtle,
              border: 'none',
              borderRadius: r.md,
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ShoppingCart size={18} color={t.primary} />
            <span style={{ fontSize: 13, fontWeight: 600, color: t.primary }}>{basketCount}</span>
          </button>
        )}
      </div>

      <div style={{ padding: '8px 16px 4px' }}>
        <SegmentedControl
          options={['Category', 'Store']}
          value={groupBy}
          onChange={v => setGroupBy(v as 'Category' | 'Store')}
        />
      </div>

      <div style={{ margin: '8px 16px', padding: '8px 12px', background: t.primarySubtle, borderRadius: r.md, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: 9999, background: t.primary, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: t.primary }}>Live sync with your family</span>
      </div>

      {totalActive === 0 && basketCount === 0 && sessionHistory.length === 0 && (
        <EmptyState
          icon={ShoppingCart}
          title="Nothing to buy"
          body="Add something your family needs."
          action="+ Add item"
          onAction={() => openSheet({ type: 'addShoppingItem' })}
        />
      )}

      {orderedKeys.map(key => (
        <div key={key}>
          <SectionLabel>{key}</SectionLabel>
          <div style={{ margin: '0 16px 6px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
            {groups[key].map((item, i) => (
              <ShoppingRow
                key={item.id}
                item={item}
                divider={i > 0}
                onToggle={addToBasket}
                secondary={groupBy === 'Category' ? storeNameFor(item) : item.category}
                hideSecondary={groupBy === 'Category' && !item.locationId}
              />
            ))}
          </div>
        </div>
      ))}

      {sessionHistory.length > 0 && (
        <div>
          <SectionLabel>Past trips</SectionLabel>
          <div style={{ margin: '0 16px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
            {sessionHistory.map((session, i) => {
              const dateLabel = formatSessionDate(session.completedAt ?? session.startedAt)
              const costLabel = formatSessionCost(session)
              return (
                <button
                  key={session.id}
                  onClick={() => { void handleOpenSession(session) }}
                  disabled={loadingDetail}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: 'none',
                    borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
                    background: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--ds-font)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, color: t.text, fontWeight: 500 }}>{dateLabel}</div>
                    <div style={{ fontSize: 12, color: t.textTer, marginTop: 2 }}>
                      {session.itemCount} item{session.itemCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {costLabel && (
                    <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{costLabel}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <FAB onClick={() => openSheet({ type: 'addShoppingItem' })}>
        <Plus size={24} color="#fff" />
      </FAB>
    </div>
  )
}

function BasketHeader({ count, onBack }: { count: number; onBack: () => void }) {
  return (
    <div style={{ padding: '16px 16px 4px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={onBack}
        aria-label="Back to shopping list"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
      >
        <ArrowLeft size={20} color={t.text} />
      </button>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: t.text, marginBottom: 2 }}>Basket</h2>
        <p style={{ fontSize: 13, color: t.textSec }}>{count} item{count !== 1 ? 's' : ''}</p>
      </div>
    </div>
  )
}

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
    }}>
      <ShoppingCheckbox checked={false} onChange={() => onToggle(item.id)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

function BasketRow({ item, divider, secondary, onUndo }: {
  item: { id: string; name: string; quantity: number; category: string }
  divider: boolean
  secondary?: string
  onUndo?: () => void
}) {
  return (
    <div style={{
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      borderTop: divider ? `1px solid ${t.border}` : 'none',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </div>
        {secondary && (
          <div style={{ fontSize: 12, color: t.textTer, marginTop: 2 }}>{secondary}</div>
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
      {onUndo && (
        <button
          onClick={onUndo}
          aria-label={`Return ${item.name} to list`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
        >
          <Undo2 size={18} color={t.textTer} />
        </button>
      )}
    </div>
  )
}
