import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Plus, ShoppingCart, Check, Trash2, RefreshCw, ChevronDown, Receipt } from 'lucide-react'
import type {
  ShoppingItem,
  ShoppingLocation,
  ShoppingSession,
  ShoppingSessionItem,
  Member,
  AppHandlers,
} from '../types'
import { t, r, FAB, EmptyState, PrimaryButton, QuantityStepper } from '../ui'
import { CATEGORY_ORDER } from '../data'
import { formatSessionCost, formatSessionDate } from '../api/adapters'
import { prefersReducedMotion } from '../lib/motion'

const UNASSIGNED = 'Unassigned'
const FLY_MS = 520
const COLLAPSE_MS = 280
const CART_ICON_PX = 18
/** Final chip width — visibly smaller than the cart icon so it reads as entering the basket */
const FLY_TARGET_WIDTH_RATIO = 0.5

const SHOPPING_TABS = {
  'To buy': { tabId: 'shopping-tab-to-buy', panelId: 'shopping-panel-to-buy' },
  Trips: { tabId: 'shopping-tab-trips', panelId: 'shopping-panel-trips' },
} as const

type ShoppingTab = 'To buy' | 'Trips'
type ShoppingView = 'list' | 'basket'
type GroupBy = 'Category' | 'Store'

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
  openSheet: AppHandlers['openSheet']
  addToBasket: AppHandlers['addToBasket']
  removeFromBasket: AppHandlers['removeFromBasket']
  deleteShoppingItem: AppHandlers['deleteShoppingItem']
  updateShoppingItem: AppHandlers['updateShoppingItem']
  updateBasketItem: AppHandlers['updateBasketItem']
}

const toBuyStatus = (toBuyCount: number, basketCount: number): string => {
  if (toBuyCount === 0) return 'List is clear'
  if (basketCount === 0) return `${toBuyCount} to buy`
  return `${toBuyCount} to buy · ${basketCount} in Basket`
}

const tripsStatus = (tripCount: number): string => {
  if (tripCount === 0) return 'No trips yet'
  return `${tripCount} shopping trip${tripCount === 1 ? '' : 's'}`
}

const toBuyEmpty = (basketCount: number, tripCount: number) => {
  if (basketCount === 0 && tripCount === 0) {
    return {
      title: 'Nothing to buy',
      body: 'Add something your family needs.',
    }
  }
  if (basketCount > 0) {
    return {
      title: 'List is clear',
      body: 'Items in the Basket are being bought. You can add more.',
    }
  }
  return {
    title: 'List is clear',
    body: 'Add something your family needs.',
  }
}

const tripsEmpty = {
  title: 'No trips yet',
  body: 'Complete a Basket to save a Shopping trip.',
}

const hasTripItems = (session: ShoppingSession): boolean =>
  (session.items?.length ?? 0) > 0

const storeNamesForTrip = (
  session: ShoppingSession,
  storeNameFor: (item: { locationId?: string | null; locationName?: string | null }) => string,
): string[] => {
  const names: string[] = []
  for (const item of session.items ?? []) {
    if (!item.locationId && !item.locationName) continue
    const name = storeNameFor(item)
    if (name === UNASSIGNED || names.includes(name)) continue
    names.push(name)
  }
  return names
}

export default function ShoppingScreen({
  shopping,
  locations,
  activeSession,
  sessionHistory,
  loadSessionDetail,
  reorderSession,
  openSheet,
  addToBasket,
  removeFromBasket,
  deleteShoppingItem,
  updateShoppingItem,
  updateBasketItem,
}: Props) {
  const [tab, setTab] = useState<ShoppingTab>('To buy')
  const [view, setView] = useState<ShoppingView>('list')
  const [groupBy, setGroupBy] = useState<GroupBy>('Category')
  const [groupFilter, setGroupFilter] = useState<string | null>(null)
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null)
  const [tripDetails, setTripDetails] = useState<Record<string, ShoppingSession>>({})
  const [reorderingTripId, setReorderingTripId] = useState<string | null>(null)
  const requestedTripIds = useRef(new Set<string>())
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

  const departingVisible = departing.filter(d => !active.some(a => a.id === d.id))
  const listItems = [...active, ...departingVisible]

  const groups: Record<string, ShoppingItem[]> = {}
  listItems.forEach(item => {
    const key = groupBy === 'Category' ? item.category : storeNameFor(item)
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  })

  const occupiedKeys =
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

  const occupiedKeySet = occupiedKeys.join('\0')

  useEffect(() => {
    if (groupFilter == null) return
    const keys = occupiedKeySet.length === 0 ? [] : occupiedKeySet.split('\0')
    if (!keys.includes(groupFilter)) setGroupFilter(null)
  }, [groupFilter, occupiedKeySet])

  const visibleKeys =
    groupFilter && occupiedKeys.includes(groupFilter) ? [groupFilter] : occupiedKeys

  const resolveTrip = (session: ShoppingSession): ShoppingSession => {
    if (hasTripItems(session)) return session
    return tripDetails[session.id] ?? session
  }

  const ensureTripDetail = (session: ShoppingSession) => {
    if (hasTripItems(session) || session.itemCount === 0) return
    if (requestedTripIds.current.has(session.id)) return
    requestedTripIds.current.add(session.id)
    void loadSessionDetail(session.id).then(detail => {
      if (detail) setTripDetails(prev => ({ ...prev, [session.id]: detail }))
      else requestedTripIds.current.delete(session.id)
    })
  }

  useEffect(() => {
    if (tab !== 'Trips') return
    sessionHistory.forEach(session => ensureTripDetail(session))
  }, [sessionHistory, tab])

  const handleToggleTrip = (session: ShoppingSession) => {
    if (expandedTripId === session.id) {
      setExpandedTripId(null)
      return
    }
    setExpandedTripId(session.id)
    ensureTripDetail(session)
  }

  const handleShopAgain = async (sessionId: string) => {
    if (reorderingTripId || (activeSession && activeSession.itemCount > 0)) return
    setReorderingTripId(sessionId)
    const session = await reorderSession(sessionId)
    setReorderingTripId(null)
    if (session) setView('basket')
  }

  const handleSwitchTab = (next: ShoppingTab) => {
    setTab(next)
  }

  const handleSwitchGroupBy = (next: GroupBy) => {
    setGroupBy(next)
    setGroupFilter(null)
  }

  const handleSelectGroup = (key: string | null) => {
    setGroupFilter(prev => (key != null && prev === key ? null : key))
  }

  const handleOpenAdd = () => openSheet({ type: 'addShoppingItem' })
  const handleOpenBasket = () => setView('basket')

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

  const totalActive = active.length
  const departingIds = new Set(departing.map(d => d.id))
  const tripCount = sessionHistory.length
  const statusCopy = tab === 'To buy' ? toBuyStatus(totalActive, basketCount) : tripsStatus(tripCount)
  const emptyCopy = toBuyEmpty(basketCount, tripCount)
  const showToBuyEmpty = tab === 'To buy' && totalActive === 0 && departing.length === 0
  const showTripsEmpty = tab === 'Trips' && tripCount === 0
  const hasNonEmptyActiveSession = !!activeSession && activeSession.itemCount > 0

  return (
    <div
      className="shopping-motion shopping-screen"
      style={{
        minHeight: '100%',
        background: 'var(--shop-page)',
      }}
    >
      <div style={{ maxWidth: 720, width: '100%', margin: '0 auto' }}>
        <div
          style={{
            background: 'var(--shop-panel)',
            borderBottom: '1px solid var(--shop-grid)',
            position: 'sticky',
            top: 0,
            zIndex: 5,
          }}
        >
          <div style={{ padding: '16px 16px 4px' }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'var(--shop-dim)',
                fontFamily: 'var(--ds-font)',
              }}
            >
              {statusCopy}
            </p>
          </div>

          <ShoppingTabs value={tab} onChange={handleSwitchTab} />

          {tab === 'To buy' && !showToBuyEmpty && (
            <>
              <div style={{ padding: '8px 16px 4px' }}>
                <GroupByControl value={groupBy} onChange={handleSwitchGroupBy} />
              </div>
              <GroupFilter
                groups={occupiedKeys}
                selected={groupFilter}
                groupBy={groupBy}
                onChange={handleSelectGroup}
              />
            </>
          )}
        </div>

        <div
          key={tab}
          className="shopping-motion"
          role="tabpanel"
          id={SHOPPING_TABS[tab].panelId}
          aria-labelledby={SHOPPING_TABS[tab].tabId}
          style={{ animation: 'shoppingEnter 0.22s ease-out' }}
        >
          {tab === 'To buy' && (
            <>
              {showToBuyEmpty && (
                <ShopEmptyState
                  title={emptyCopy.title}
                  body={emptyCopy.body}
                  onAdd={handleOpenAdd}
                />
              )}

              {visibleKeys.map(key => (
                <div key={key}>
                  <ShopSectionLabel>{key}</ShopSectionLabel>
                  <div>
                    {groups[key].map((item, i) => (
                      <ShoppingRow
                        key={item.id}
                        item={item}
                        divider={i > 0}
                        departing={departingIds.has(item.id)}
                        onAddToBasket={() => handleAddToBasket(item)}
                        onEdit={() => openSheet({ type: 'editShoppingItem', itemId: item.id })}
                        onQuantityChange={(quantity) => updateShoppingItem(item.id, { quantity })}
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
            </>
          )}

          {tab === 'Trips' && (
            <>
              {showTripsEmpty && (
                <ShopEmptyState
                  icon={Receipt}
                  title={tripsEmpty.title}
                  body={tripsEmpty.body}
                />
              )}
              {!showTripsEmpty && (
                <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sessionHistory.map(session => {
                    const trip = resolveTrip(session)
                    return (
                      <TripReceiptCard
                        key={session.id}
                        session={trip}
                        expanded={expandedTripId === session.id}
                        loadingItems={expandedTripId === session.id && !hasTripItems(trip)}
                        reordering={reorderingTripId === session.id}
                        shopAgainDisabled={reorderingTripId != null || hasNonEmptyActiveSession}
                        storeNames={storeNamesForTrip(trip, storeNameFor)}
                        onToggle={() => { void handleToggleTrip(session) }}
                        onShopAgain={() => { void handleShopAgain(session.id) }}
                        onOpenBasket={handleOpenBasket}
                        showActiveBasketHelper={hasNonEmptyActiveSession}
                      />
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <button
        ref={cartRef}
        type="button"
        onClick={handleOpenBasket}
        aria-label={displayCount === 1 ? 'Open Basket, 1 item' : `Open Basket, ${displayCount} items`}
        className={`shopping-basket-bar basket-target${cartPulse ? ' is-pulsing' : ''} fab`}
        onAnimationEnd={() => setCartPulse(false)}
        style={{
          position: 'fixed',
          height: 52,
          borderRadius: r.xl,
          background: 'var(--shop-panel)',
          border: '1px solid var(--shop-grid)',
          boxShadow: 'var(--shop-card-shadow)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 16px',
          zIndex: 10,
          fontFamily: 'var(--ds-font)',
        }}
      >
        <ShoppingCart size={18} color="var(--shop-coral)" />
        <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 500, color: 'var(--shop-text)' }}>
          Basket
        </span>
        <span
          aria-live="polite"
          style={{
            minWidth: 24,
            height: 24,
            padding: '0 8px',
            borderRadius: 9999,
            background: 'var(--shop-coral)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {displayCount}
        </span>
      </button>

      {view === 'basket' && (
        <BasketPanel
          items={activeSession?.items ?? []}
          storeNameFor={storeNameFor}
          onClose={() => setView('list')}
          onEdit={(id) => openSheet({ type: 'editBasketItem', sessionItemId: id })}
          onUndo={removeFromBasket}
          onQuantityChange={(id, quantity) => updateBasketItem(id, { quantity })}
          onComplete={() => openSheet({ type: 'completeShopping' })}
        />
      )}

      <FAB onClick={handleOpenAdd} aria-label="Add item">
        <Plus size={24} color={t.onPrimary} />
      </FAB>

      {flyers.map(flyer => (
        <FlyingChip key={flyer.key} flyer={flyer} />
      ))}
    </div>
  )
}

function ShoppingTabs({
  value,
  onChange,
}: {
  value: ShoppingTab
  onChange: (tab: ShoppingTab) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Shopping views"
      style={{
        display: 'flex',
        width: '100%',
        boxSizing: 'border-box',
        borderBottom: '1px solid var(--shop-grid)',
      }}
    >
      {(['To buy', 'Trips'] as const).map(option => {
        const isActive = option === value
        const ids = SHOPPING_TABS[option]
        return (
          <button
            key={option}
            type="button"
            role="tab"
            id={ids.tabId}
            aria-controls={ids.panelId}
            aria-selected={isActive}
            onClick={() => onChange(option)}
            style={{
              flex: 1,
              padding: '10px 10px 12px',
              minHeight: 44,
              border: 'none',
              borderRadius: 0,
              background: 'transparent',
              color: isActive ? 'var(--shop-text)' : 'var(--shop-dim)',
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              cursor: 'pointer',
              fontFamily: 'var(--ds-font)',
              borderBottom: isActive ? '2px solid var(--shop-text)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

function GroupByControl({
  value,
  onChange,
}: {
  value: GroupBy
  onChange: (value: GroupBy) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Group by Category or Store"
      style={{
        display: 'flex',
        background: 'var(--shop-toggle)',
        borderRadius: 9999,
        padding: 3,
      }}
    >
      {(['Category', 'Store'] as const).map(option => {
        const isActive = option === value
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option)}
            style={{
              flex: 1,
              minHeight: 32,
              padding: '4px 11px',
              borderRadius: 9999,
              border: 'none',
              background: isActive ? 'var(--shop-panel)' : 'transparent',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              color: isActive ? 'var(--shop-text)' : 'var(--shop-dim)',
              fontFamily: 'var(--ds-font)',
              boxShadow: isActive ? 'var(--shop-card-shadow)' : 'none',
            }}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

function GroupFilter({
  groups,
  selected,
  groupBy,
  onChange,
}: {
  groups: string[]
  selected: string | null
  groupBy: GroupBy
  onChange: (key: string | null) => void
}) {
  return (
    <div
      role="group"
      aria-label={groupBy === 'Category' ? 'Filter by Shopping category' : 'Filter by Store'}
      style={{
        display: 'flex',
        gap: 8,
        padding: '10px 16px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        background: 'var(--shop-panel)',
      }}
    >
      <FilterChip
        label="All"
        accessibleName={groupBy === 'Category' ? 'All Shopping categories' : 'All Stores'}
        pressed={selected === null}
        onClick={() => onChange(null)}
      />
      {groups.map(group => (
        <FilterChip
          key={group}
          label={group}
          accessibleName={groupBy === 'Category' ? `${group} Shopping category` : `${group} Store`}
          pressed={selected === group}
          onClick={() => onChange(group)}
        />
      ))}
    </div>
  )
}

function FilterChip({
  label,
  accessibleName,
  pressed,
  onClick,
}: {
  label: string
  accessibleName: string
  pressed: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={accessibleName}
      style={{
        flexShrink: 0,
        minHeight: 44,
        padding: '5px 14px',
        borderRadius: 9999,
        border: `1.5px solid ${pressed ? 'var(--shop-text)' : 'var(--shop-grid)'}`,
        background: pressed ? 'var(--shop-text)' : 'var(--shop-panel)',
        color: pressed ? 'var(--shop-on-selected)' : 'var(--shop-dim)',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--ds-font)',
      }}
    >
      {label}
    </button>
  )
}

function ShopEmptyState({
  title,
  body,
  onAdd,
  icon: Icon = ShoppingCart,
}: {
  title: string
  body: string
  onAdd?: () => void
  icon?: typeof ShoppingCart
}) {
  return (
    <div
      style={{
        padding: '20px 24px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        textAlign: 'center',
      }}
    >
      <Icon size={22} color="var(--shop-dim)" strokeWidth={1.5} aria-hidden />
      <p
        style={{
          fontSize: 18,
          fontWeight: 500,
          color: 'var(--shop-text)',
          fontFamily: 'var(--ds-font-display)',
          margin: '4px 0 0',
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: 14,
          color: 'var(--shop-dim)',
          lineHeight: 1.45,
          maxWidth: 280,
          margin: 0,
        }}
      >
        {body}
      </p>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          style={{
            marginTop: 4,
            padding: '11px 20px',
            minHeight: 44,
            background: t.primary,
            color: t.onPrimary,
            border: 'none',
            borderRadius: r.md,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--ds-font)',
          }}
        >
          + Add item
        </button>
      )}
    </div>
  )
}

function TripReceiptCard({
  session,
  expanded,
  loadingItems,
  reordering,
  shopAgainDisabled,
  storeNames,
  onToggle,
  onShopAgain,
  onOpenBasket,
  showActiveBasketHelper,
}: {
  session: ShoppingSession
  expanded: boolean
  loadingItems: boolean
  reordering: boolean
  shopAgainDisabled: boolean
  storeNames: string[]
  onToggle: () => void
  onShopAgain: () => void
  onOpenBasket: () => void
  showActiveBasketHelper: boolean
}) {
  const dateLabel = formatSessionDate(session.completedAt ?? session.startedAt)
  const costLabel = formatSessionCost(session)
  const itemCount = session.itemCount
  const items = session.items ?? []
  const panelId = `trip-items-${session.id}`

  return (
    <article
      style={{
        background: 'var(--shop-card)',
        border: '1px solid var(--shop-grid)',
        borderRadius: r.lg,
        boxShadow: 'var(--shop-card-shadow)',
        overflow: 'hidden',
        fontFamily: 'var(--ds-font)',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${dateLabel} shopping trip, ${itemCount === 1 ? '1 item' : `${itemCount} items`}`}
        style={{
          width: '100%',
          display: 'block',
          textAlign: 'left',
          padding: '14px 16px 12px',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--ds-font)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: 'var(--shop-text)',
                fontFamily: 'var(--ds-font-display)',
              }}
            >
              {dateLabel}
            </div>
            <div style={{ fontSize: 13, color: 'var(--shop-dim)', marginTop: 2 }}>
              {itemCount === 1 ? '1 item' : `${itemCount} items`}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {costLabel ? (
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--shop-text)' }}>
                {costLabel}
              </span>
            ) : null}
            <ChevronDown
              size={18}
              color="var(--shop-dim)"
              aria-hidden
              style={{
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </div>
        </div>
        {storeNames.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginTop: 10,
            }}
          >
            {storeNames.map(name => (
              <span
                key={name}
                style={{
                  padding: '3px 10px',
                  borderRadius: 9999,
                  border: '1px solid var(--shop-grid)',
                  background: 'var(--shop-toggle)',
                  color: 'var(--shop-text)',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </button>

      <div style={{ padding: '0 16px 14px' }}>
        <button
          type="button"
          onClick={onShopAgain}
          disabled={shopAgainDisabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            minHeight: 44,
            padding: '10px 16px',
            border: 'none',
            borderRadius: r.md,
            background: shopAgainDisabled ? 'var(--shop-toggle)' : 'var(--shop-coral)',
            color: shopAgainDisabled ? 'var(--shop-dim)' : '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: shopAgainDisabled ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--ds-font)',
          }}
        >
          <RefreshCw size={16} aria-hidden />
          {reordering ? 'Setting up basket…' : 'Shop again'}
        </button>
        {showActiveBasketHelper && (
          <p style={{ fontSize: 12, color: 'var(--shop-dim)', textAlign: 'center', margin: '8px 0 0' }}>
            You have an{' '}
            <button
              type="button"
              onClick={onOpenBasket}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--shop-coral)',
                textDecoration: 'underline',
                fontFamily: 'var(--ds-font)',
              }}
            >
              active basket
            </button>
            {' '}— complete it before starting a new trip
          </p>
        )}
      </div>

      <div
        id={panelId}
        hidden={!expanded}
        role="region"
        aria-label={`${dateLabel} items`}
      >
        <div
          style={{
            padding: '0 16px 8px',
            borderTop: '1px solid var(--shop-grid)',
          }}
        >
          {loadingItems && (
            <p style={{ fontSize: 13, color: 'var(--shop-dim)', margin: '12px 0' }}>
              Loading items…
            </p>
          )}
          {!loadingItems && items.map((item, i) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 0',
                borderTop: i > 0 ? '1px solid var(--shop-grid)' : 'none',
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: 'var(--shop-text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {item.name}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--shop-dim)', flexShrink: 0 }}>
                ×{item.quantity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

function ShopSectionLabel({ children }: { children: string }) {
  return (
    <p
      style={{
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--shop-dim)',
        letterSpacing: '0.01em',
        padding: '12px 16px 6px',
        fontFamily: 'var(--ds-font)',
        margin: 0,
      }}
    >
      {children}
    </p>
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
        background: 'var(--shop-card)',
        borderRadius: r.lg,
        boxShadow: 'var(--shop-card-shadow)',
        border: '1px solid var(--shop-grid)',
        overflow: 'hidden',
        transform: `translate(${flyer.from.left}px, ${flyer.from.top}px)`,
        fontFamily: 'var(--ds-font)',
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 9999, flexShrink: 0,
        background: 'var(--shop-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Check size={13} color="#fff" strokeWidth={2.5} />
      </div>
      <span
        ref={labelRef}
        style={{ fontSize: 15, color: 'var(--shop-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}
      >
        {flyer.name}
      </span>
    </div>
  )
}

function BasketPanel({
  items,
  storeNameFor,
  onClose,
  onEdit,
  onUndo,
  onQuantityChange,
  onComplete,
}: {
  items: ShoppingSessionItem[]
  storeNameFor: (item: { locationId?: string | null; locationName?: string | null }) => string
  onClose: () => void
  onEdit: (id: string) => void
  onUndo: (id: string) => void
  onQuantityChange: (id: string, quantity: number) => void
  onComplete: () => void
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      role="dialog"
      aria-modal="true"
      aria-label="Basket"
    >
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: t.overlay, animation: 'fadeIn 0.2s ease' }} />
      <div
        className="bottom-sheet-panel"
        style={{
          position: 'relative',
          background: 'var(--shop-panel)',
          borderRadius: '12px 12px 0 0',
          boxShadow: 'var(--ds-shadow-high)',
          maxHeight: '80dvh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="bottom-sheet-handle" style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 9999, background: 'var(--shop-grid)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 12px' }}>
          <span style={{ fontSize: 20, fontWeight: 500, fontFamily: 'var(--ds-font-display)', color: 'var(--shop-text)' }}>
            Basket
          </span>
          <span style={{ fontSize: 13, color: 'var(--shop-dim)' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
          {items.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Basket is empty"
              body="Add items from the list to put them here."
              action="Close"
              onAction={onClose}
            />
          ) : (
            items.map((item, i) => (
              <BasketRow
                key={item.id}
                item={item}
                divider={i > 0}
                secondary={storeNameFor(item)}
                onEdit={() => onEdit(item.id)}
                onUndo={() => onUndo(item.id)}
                onQuantityChange={(quantity) => onQuantityChange(item.id, quantity)}
              />
            ))
          )}
        </div>
        {items.length > 0 && (
          <div style={{ padding: '8px 16px 16px' }}>
            <PrimaryButton onClick={onComplete} fullWidth>
              Complete shopping
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  )
}

function ShoppingRow({ item, divider, departing, onAddToBasket, onEdit, onQuantityChange, onRemove, rowRef, secondary, hideSecondary }: {
  item: ShoppingItem
  divider: boolean
  departing: boolean
  onAddToBasket: () => void
  onEdit: () => void
  onQuantityChange: (quantity: number) => void
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
            borderTop: divider ? '1px solid var(--shop-grid)' : 'none',
            opacity: departing ? 0 : 1,
            transition: 'opacity 0.16s ease',
          }}
        >
          <CartControl departing={departing} onAdd={onAddToBasket} name={item.name} />
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${item.name}`}
            style={{
              flex: 1, minWidth: 0, display: 'block', textAlign: 'left',
              background: 'none', border: 'none', padding: '2px 0', margin: 0,
              cursor: 'pointer', fontFamily: 'var(--ds-font)',
            }}
          >
            <div style={{ fontSize: 15, color: 'var(--shop-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.name}
            </div>
            {secondary && !hideSecondary && (
              <div style={{ fontSize: 12, color: 'var(--shop-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {secondary}
              </div>
            )}
          </button>
          {!departing && (
            <>
              <QuantityStepper
                value={item.quantity}
                onChange={onQuantityChange}
                label={item.name}
              />
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  onRemove()
                }}
                aria-label={`Remove ${item.name} from list`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
              >
                <Trash2 size={18} color="var(--shop-dim)" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CartControl({
  departing,
  onAdd,
  name,
}: {
  departing: boolean
  onAdd: () => void
  name: string
}) {
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation()
        if (!departing) onAdd()
      }}
      aria-label={departing ? `Adding ${name} to Basket` : `Add ${name} to Basket`}
      disabled={departing}
      style={{
        width: 44,
        height: 44,
        minWidth: 44,
        minHeight: 44,
        borderRadius: 9999,
        border: 'none',
        padding: 0,
        background: departing ? 'var(--shop-coral)' : 'var(--shop-coral-subtle)',
        color: departing ? '#fff' : 'var(--shop-coral)',
        cursor: departing ? 'default' : 'pointer',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ShoppingCart size={18} strokeWidth={2} aria-hidden />
    </button>
  )
}

function BasketRow({ item, divider, secondary, onEdit, onUndo, onQuantityChange }: {
  item: { id: string; name: string; quantity: number; category: string }
  divider: boolean
  secondary?: string
  onEdit?: () => void
  onUndo?: () => void
  onQuantityChange?: (quantity: number) => void
}) {
  const label = (
    <>
      <div style={{ fontSize: 15, color: 'var(--shop-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.name}
      </div>
      {secondary && (
        <div style={{ fontSize: 12, color: 'var(--shop-dim)', marginTop: 2 }}>{secondary}</div>
      )}
    </>
  )

  return (
    <div style={{
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      borderTop: divider ? '1px solid var(--shop-grid)' : 'none',
    }}>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${item.name}`}
          style={{
            flex: 1, minWidth: 0, display: 'block', textAlign: 'left',
            background: 'none', border: 'none', padding: '2px 0', margin: 0,
            cursor: 'pointer', fontFamily: 'var(--ds-font)',
          }}
        >
          {label}
        </button>
      ) : (
        <div style={{ flex: 1, minWidth: 0 }}>{label}</div>
      )}
      {onQuantityChange ? (
        <QuantityStepper
          value={item.quantity}
          onChange={onQuantityChange}
          label={item.name}
          atMinAction={
            onUndo
              ? { label: `Return ${item.name} to list`, onActivate: onUndo }
              : undefined
          }
        />
      ) : (
        item.quantity > 1 && (
          <div style={{
            minWidth: 28, height: 22, borderRadius: r.pill, border: '1px solid var(--shop-grid)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px',
          }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--shop-dim)' }}>×{item.quantity}</span>
          </div>
        )
      )}
    </div>
  )
}
