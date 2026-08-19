import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Plus, Minus, ShoppingCart, ArrowLeft, Undo2, Check, Trash2, RefreshCw } from 'lucide-react'
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
const FLY_MS = 520
const COLLAPSE_MS = 280
const CART_ICON_PX = 18
/** Final chip width — visibly smaller than the cart icon so it reads as entering the basket */
const FLY_TARGET_WIDTH_RATIO = 0.5

type ShoppingView = 'list' | 'basket' | 'session-detail'

interface Flyer {
  key: string
  itemId: string
  name: string
  quantity: number
  from: DOMRect
  to: { x: number; y: number; iconSize: number }
}

interface Props {
  shopping: ShoppingItem[]
  locations: ShoppingLocation[]
  members: Member[]
  activeSession: ShoppingSession | null
  sessionHistory: ShoppingSession[]
  loadSessionDetail: (sessionId: string) => Promise<ShoppingSession | null>
  reorderSession: (sessionId: string) => Promise<ShoppingSession | null>
  updateSessionItem: (sessionItemId: string, quantity: number) => Promise<boolean>
  openSheet: AppHandlers['openSheet']
  addToBasket: AppHandlers['addToBasket']
  removeFromBasket: AppHandlers['removeFromBasket']
  deleteShoppingItem: AppHandlers['deleteShoppingItem']
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function ShoppingScreen({
  shopping,
  locations,
  activeSession,
  sessionHistory,
  loadSessionDetail,
  reorderSession,
  updateSessionItem,
  openSheet,
  addToBasket,
  removeFromBasket,
  deleteShoppingItem,
}: Props) {
  const [view, setView] = useState<ShoppingView>('list')
  const [groupBy, setGroupBy] = useState<'Category' | 'Store'>('Category')
  const [selectedSession, setSelectedSession] = useState<ShoppingSession | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [departing, setDeparting] = useState<ShoppingItem[]>([])
  const [flyers, setFlyers] = useState<Flyer[]>([])
  const [displayCount, setDisplayCount] = useState(activeSession?.itemCount ?? 0)
  const [cartPulse, setCartPulse] = useState(false)

  const cartRef = useRef<HTMLButtonElement>(null)
  const rowRefs = useRef(new Map<string, HTMLElement>())
  const flyerCountRef = useRef(0)
  const basketCount = activeSession?.itemCount ?? 0

  useEffect(() => {
    if (flyerCountRef.current > 0) return
    setDisplayCount(basketCount)
  }, [basketCount])

  const active = shopping.filter(i => !i.completed)
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

  const handleReorder = async () => {
    if (!selectedSession || reordering) return
    setReordering(true)
    const session = await reorderSession(selectedSession.id)
    setReordering(false)
    if (session) {
      setSelectedSession(null)
      setView('basket')
    }
  }

  const pulseCart = () => {
    setCartPulse(false)
    requestAnimationFrame(() => setCartPulse(true))
  }

  const handleAddToBasket = (item: ShoppingItem) => {
    if (departing.some(d => d.id === item.id)) return

    if (prefersReducedMotion()) {
      void Promise.resolve(addToBasket(item.id))
      return
    }

    const row = rowRefs.current.get(item.id)
    const cart = cartRef.current
    if (!row || !cart) {
      void Promise.resolve(addToBasket(item.id))
      return
    }

    const from = row.getBoundingClientRect()
    const cartBox = cart.getBoundingClientRect()
    const key = `${item.id}-${Date.now()}`
    flyerCountRef.current += 1
    setDeparting(prev => (prev.some(d => d.id === item.id) ? prev : [...prev, item]))
    setFlyers(prev => [
      ...prev,
      {
        key,
        itemId: item.id,
        name: item.name,
        quantity: item.quantity,
        from,
        to: {
          x: cartBox.left + cartBox.width / 2,
          y: cartBox.top + cartBox.height / 2,
          iconSize: CART_ICON_PX,
        },
      },
    ])

    const pending = Promise.resolve(addToBasket(item.id)).then(ok => {
      if (ok === false) throw new Error('add-to-basket-failed')
    })
    let failed = false
    let landed = false
    pending.catch(() => {
      failed = true
      if (landed) setDisplayCount(c => Math.max(0, c - 1))
    })

    window.setTimeout(() => {
      landed = true
      flyerCountRef.current = Math.max(0, flyerCountRef.current - 1)
      setFlyers(prev => prev.filter(f => f.key !== key))
      setDeparting(prev => prev.filter(d => d.id !== item.id))
      if (!failed) {
        setDisplayCount(c => c + 1)
        pulseCart()
      }
    }, FLY_MS)
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
                  onQuantityChange={(qty) => { void updateSessionItem(item.id, qty) }}
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
    const hasNonEmptyActiveSession = !!activeSession && activeSession.itemCount > 0
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
        <div style={{ padding: '16px' }}>
          <PrimaryButton
            onClick={() => { void handleReorder() }}
            disabled={reordering || hasNonEmptyActiveSession}
            fullWidth
          >
            <RefreshCw size={16} style={{ marginRight: 8 }} />
            {reordering ? 'Setting up basket…' : 'Shop again'}
          </PrimaryButton>
          {hasNonEmptyActiveSession && (
            <p style={{ fontSize: 12, color: t.textTer, textAlign: 'center', marginTop: 8 }}>
              You have an{' '}
              <button
                onClick={() => setView('basket')}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: t.primary, textDecoration: 'underline' }}
              >
                active basket
              </button>
              {' '}— complete it before starting a new trip
            </p>
          )}
        </div>
      </div>
    )
  }

  const departingVisible = departing.filter(d => !active.some(a => a.id === d.id))
  const listItems = [...active, ...departingVisible]

  const groups: Record<string, ShoppingItem[]> = {}
  listItems.forEach(item => {
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
  const departingIds = new Set(departing.map(d => d.id))

  return (
    <div style={{ minHeight: '100%', paddingBottom: 80 }}>
      <div style={{ padding: '16px 16px 4px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: t.text, letterSpacing: '-0.01em', marginBottom: 2 }}>Groceries</h2>
          <p style={{ fontSize: 13, color: t.textSec }}>{totalActive} item{totalActive !== 1 ? 's' : ''} remaining</p>
        </div>
        <button
          ref={cartRef}
          onClick={() => setView('basket')}
          aria-label={displayCount > 0 ? `Open basket with ${displayCount} items` : 'Open basket'}
          className={`basket-target${cartPulse ? ' is-pulsing' : ''}`}
          onAnimationEnd={() => setCartPulse(false)}
          style={{
            position: 'relative',
            background: displayCount > 0 || flyers.length > 0 ? t.primarySubtle : t.surface,
            border: `1px solid ${displayCount > 0 || flyers.length > 0 ? 'transparent' : t.border}`,
            borderRadius: r.md,
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 38,
          }}
        >
          <ShoppingCart size={18} color={displayCount > 0 || flyers.length > 0 ? t.primary : t.textSec} />
          {displayCount > 0 && (
            <span
              aria-live="polite"
              style={{ fontSize: 13, fontWeight: 600, color: t.primary, minWidth: 10, textAlign: 'center' }}
            >
              {displayCount}
            </span>
          )}
        </button>
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

      {totalActive === 0 && departing.length === 0 && basketCount === 0 && sessionHistory.length === 0 && (
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
                departing={departingIds.has(item.id)}
                onToggle={() => handleAddToBasket(item)}
                onRemove={() => deleteShoppingItem(item.id)}
                rowRef={el => {
                  if (el) rowRefs.current.set(item.id, el)
                  else rowRefs.current.delete(item.id)
                }}
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
        <Plus size={24} color={t.onPrimary} />
      </FAB>

      {flyers.map(flyer => (
        <FlyingChip key={flyer.key} flyer={flyer} />
      ))}
    </div>
  )
}

function FlyingChip({ flyer }: { flyer: Flyer }) {
  const ref = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const label = labelRef.current
    if (!el) return

    const startW = flyer.from.width
    const startH = flyer.from.height
    const targetW = Math.min(startW * 0.08, flyer.to.iconSize * FLY_TARGET_WIDTH_RATIO)
    const targetH = Math.max(targetW, startH * 0.2)
    const squeezeW = flyer.to.iconSize * 0.72
    const midW = startW * 0.48
    const midH = startH * 0.58
    const lateW = Math.max(squeezeW, targetW * 2.2)

    const startX = flyer.from.left
    const startY = flyer.from.top
    const endX = flyer.to.x - targetW / 2
    const endY = flyer.to.y - targetH / 2
    const lift = Math.min(72, Math.abs(endY - startY) * 0.35 + 36)
    const midX = startX + (endX - startX) * 0.42
    const midY = startY + (endY - startY) * 0.26 - lift
    const lateX = startX + (endX - startX) * 0.78
    const lateY = startY + (endY - startY) * 0.82

    const easing = 'cubic-bezier(0.22, 1, 0.36, 1)'
    el.style.willChange = 'transform, width, height, opacity, border-radius'

    const motion = el.animate(
      [
        {
          transform: `translate(${startX}px, ${startY}px)`,
          width: `${startW}px`,
          height: `${startH}px`,
          borderRadius: `${r.lg}px`,
          opacity: 1,
          offset: 0,
        },
        {
          transform: `translate(${midX}px, ${midY}px)`,
          width: `${midW}px`,
          height: `${midH}px`,
          borderRadius: `${r.md}px`,
          opacity: 1,
          offset: 0.4,
        },
        {
          transform: `translate(${lateX}px, ${lateY}px)`,
          width: `${lateW}px`,
          height: `${targetH * 1.35}px`,
          borderRadius: `${r.pill}px`,
          opacity: 1,
          offset: 0.72,
        },
        {
          transform: `translate(${endX}px, ${endY}px)`,
          width: `${targetW}px`,
          height: `${targetH}px`,
          borderRadius: `${r.pill}px`,
          opacity: 0,
          offset: 1,
        },
      ],
      { duration: FLY_MS, easing, fill: 'forwards' },
    )

    const labelAnim = label?.animate(
      [{ opacity: 1, offset: 0 }, { opacity: 0, offset: 0.32 }],
      { duration: FLY_MS * 0.32, easing: 'ease-out', fill: 'forwards' },
    )

    return () => {
      motion.cancel()
      labelAnim?.cancel()
      el.style.willChange = 'auto'
    }
  }, [flyer])

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 80,
        pointerEvents: 'none',
        width: flyer.from.width,
        height: flyer.from.height,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px',
        background: t.surface,
        borderRadius: r.lg,
        boxShadow: 'var(--ds-shadow-md)',
        border: `1px solid ${t.border}`,
        overflow: 'hidden',
        transform: `translate(${flyer.from.left}px, ${flyer.from.top}px)`,
        fontFamily: 'var(--ds-font)',
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 9999, flexShrink: 0,
        background: t.success, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Check size={13} color={t.onPrimary} strokeWidth={2.5} />
      </div>
      <span
        ref={labelRef}
        style={{ fontSize: 15, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}
      >
        {flyer.name}
      </span>
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

function ShoppingRow({ item, divider, departing, onToggle, onRemove, rowRef, secondary, hideSecondary }: {
  item: ShoppingItem
  divider: boolean
  departing: boolean
  onToggle: () => void
  onRemove: () => void
  rowRef: (el: HTMLElement | null) => void
  secondary?: string
  hideSecondary?: boolean
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: departing ? '0fr' : '1fr',
        transition: `grid-template-rows ${COLLAPSE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
    >
      <div style={{ overflow: 'hidden' }}>
        <div
          ref={rowRef}
          style={{
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
            borderTop: divider ? `1px solid ${t.border}` : 'none',
            opacity: departing ? 0 : 1,
            transition: 'opacity 0.16s ease',
          }}
        >
          <ShoppingCheckbox checked={departing} onChange={onToggle} />
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
          {!departing && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                onRemove()
              }}
              aria-label={`Remove ${item.name} from list`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
            >
              <Trash2 size={18} color={t.textTer} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function BasketRow({ item, divider, secondary, onUndo, onQuantityChange }: {
  item: { id: string; name: string; quantity: number; category: string }
  divider: boolean
  secondary?: string
  onUndo?: () => void
  onQuantityChange?: (quantity: number) => void
}) {
  const editable = !!onQuantityChange

  const handleDecrement = () => {
    if (!onQuantityChange) return
    if (item.quantity <= 1 && onUndo) {
      onUndo()
      return
    }
    onQuantityChange(item.quantity - 1)
  }

  const handleIncrement = () => {
    if (!onQuantityChange) return
    onQuantityChange(item.quantity + 1)
  }

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
      {editable ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={handleDecrement}
            aria-label={`Decrease quantity of ${item.name}`}
            style={{
              width: 28, height: 28, borderRadius: r.pill,
              border: `1px solid ${t.border}`, background: t.surface,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Minus size={14} color={t.textSec} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: t.text, minWidth: 24, textAlign: 'center' }}>
            {item.quantity}
          </span>
          <button
            onClick={handleIncrement}
            aria-label={`Increase quantity of ${item.name}`}
            style={{
              width: 28, height: 28, borderRadius: r.pill,
              border: `1px solid ${t.border}`, background: t.surface,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Plus size={14} color={t.textSec} />
          </button>
        </div>
      ) : (
        item.quantity > 1 && (
          <div style={{
            minWidth: 28, height: 22, borderRadius: r.pill, border: `1px solid ${t.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px',
          }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: t.textSec }}>×{item.quantity}</span>
          </div>
        )
      )}
      {onUndo && !editable && (
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
