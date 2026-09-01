import type { CalendarEvent, Task, ShoppingItem, ShoppingSession, BudgetPeriod, AppHandlers, PersonalAccountSummary } from '../types'
import { Plus } from 'lucide-react'
import { t, fonts, MemberAvatar, TaskCheckbox, ShoppingCheckbox, Skeleton } from '../ui'
import { getMember, formatTime, getGreeting } from '../data'
import { formatMoney, formatYearMonthTitle, deriveBudgetState } from '../api/adapters'
import { BudgetBar, budgetStateColor } from '../components/BudgetBar'

interface Props extends Partial<AppHandlers> {
  events: CalendarEvent[]
  tasks: Task[]
  shopping: ShoppingItem[]
  activeSession: ShoppingSession | null
  currentPeriod: BudgetPeriod | null
  periods: BudgetPeriod[]
  personalSummary: PersonalAccountSummary | null
  memberName: string
  currentMemberId?: string
  dateLabel: string
  today: string
  loading?: boolean
  navigate: AppHandlers['navigate']
  onOpenSpend: () => void
  onOpenPersonal: () => void
  openSheet: AppHandlers['openSheet']
  completeTask: AppHandlers['completeTask']
  addToBasket: AppHandlers['addToBasket']
}

export default function Dashboard({ events, tasks, shopping, activeSession, currentPeriod, personalSummary, memberName, currentMemberId, dateLabel, today, navigate, onOpenSpend, onOpenPersonal, openSheet, completeTask, addToBasket, loading }: Props) {
  const todayEvents = events.filter(e => e.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const nextEvent = events
    .filter(e => e.date > today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))[0]
  const openTasks = tasks.filter(tk => !tk.completed)
  const assignedToMe = openTasks.filter(tk => currentMemberId && tk.assigneeId === currentMemberId)
  const dashTasks = openTasks.slice(0, 3)
  const dashShopping = shopping.filter(i => !i.completed).slice(0, 3)
  const basketCount = activeSession?.itemCount ?? 0
  const showNeeds = dashTasks.length > 0 || dashShopping.length > 0

  if (loading) {
    return (
      <div style={{ padding: '24px 20px' }}>
        <Skeleton h={32} w={220} />
        <div style={{ marginTop: 8 }}><Skeleton h={16} w={160} /></div>
        <div style={{ marginTop: 28 }}><Skeleton h={88} /></div>
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Skeleton h={72} />
          <Skeleton h={72} />
          <Skeleton h={72} />
          <Skeleton h={72} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0 32px' }}>
      <div className="canvas-split" style={{ padding: '8px 20px 0', maxWidth: 1120, margin: '0 auto' }}>
        <div>
          <h1 style={{
            fontFamily: fonts.display,
            fontSize: 32,
            fontWeight: 500,
            color: t.text,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            margin: '16px 0 4px',
          }}>
            {getGreeting()}, {memberName}
          </h1>
          <p style={{ fontSize: 14, color: t.textSec, margin: 0 }}>{dateLabel}</p>

          <section style={{ marginTop: 28 }} aria-label="Today">
            <h2 style={{
              fontFamily: fonts.display,
              fontSize: 20,
              fontWeight: 500,
              color: t.text,
              margin: '0 0 12px',
            }}>
              Today
            </h2>
            {todayEvents.length === 0 ? (
              <p style={{ fontSize: 14, color: t.textSec, margin: 0 }}>
                Nothing on the calendar today.
              </p>
            ) : (
              <div>
                {todayEvents.map(ev => {
                  const member = getMember(ev.memberId)
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => openSheet({ type: 'eventDetail', eventId: ev.id })}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 0',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: fonts.ui,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500, color: t.textSec, minWidth: 48, flexShrink: 0 }}>
                        {formatTime(ev.startTime)}
                      </span>
                      <span style={{ width: 3, height: 28, borderRadius: 9999, background: member.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 15, fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.title}
                        </span>
                        {ev.location && (
                          <span style={{ display: 'block', fontSize: 12, color: t.textTer, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ev.location}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            {nextEvent && (
              <p style={{ fontSize: 13, color: t.textTer, margin: '8px 0 0' }}>
                Next: {nextEvent.title}
                {' · '}
                {new Date(nextEvent.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                {' '}
                {formatTime(nextEvent.startTime)}
              </p>
            )}
          </section>
        </div>

        <div>
          <section aria-label="Pulse" style={{ marginTop: 16 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}>
              <PulseTile
                label="Family"
                onClick={onOpenSpend}
                ariaLabel="Open family budget"
              >
                <FamilyPulse period={currentPeriod} />
              </PulseTile>
              <PulseTile
                label="Personal"
                onClick={onOpenPersonal}
                ariaLabel="Open personal spend"
              >
                <PersonalPulse summary={personalSummary} />
              </PulseTile>
              <PulseTile
                label="Tasks"
                onClick={() => navigate('tasks')}
                ariaLabel="Open tasks"
              >
                <p style={{ fontSize: 22, fontWeight: 500, fontFamily: fonts.display, margin: 0, color: t.text }}>
                  {openTasks.length}
                </p>
                <p style={{ fontSize: 12, color: t.textSec, margin: '4px 0 0' }}>
                  {assignedToMe.length > 0
                    ? `${assignedToMe.length} need you`
                    : openTasks.length === 0
                      ? 'All caught up'
                      : 'open'}
                </p>
              </PulseTile>
              <PulseTile
                label="Shopping"
                onClick={() => navigate('shopping')}
                ariaLabel="Open shopping"
              >
                <p style={{ fontSize: 22, fontWeight: 500, fontFamily: fonts.display, margin: 0, color: t.text }}>
                  {shopping.filter(i => !i.completed).length}
                </p>
                <p style={{ fontSize: 12, color: t.textSec, margin: '4px 0 0' }}>
                  {basketCount > 0
                    ? `list · ${basketCount} in basket`
                    : 'on the list'}
                </p>
              </PulseTile>
            </div>
          </section>

          {showNeeds && (
            <section aria-label="Needs you" style={{ marginTop: 28 }}>
              <h2 style={{
                fontFamily: fonts.display,
                fontSize: 20,
                fontWeight: 500,
                color: t.text,
                margin: '0 0 8px',
              }}>
                Needs you
              </h2>
              {dashTasks.map(task => {
                const member = getMember(task.assigneeId)
                const isToday = task.dueDate === 'today' || task.dueDate === today
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                    <TaskCheckbox checked={task.completed} onChange={() => completeTask(task.id)} />
                    <button
                      type="button"
                      onClick={() => openSheet({ type: 'taskDetail', taskId: task.id })}
                      style={{
                        flex: 1, minWidth: 0, padding: 0, border: 'none', background: 'none',
                        cursor: 'pointer', textAlign: 'left', fontFamily: fonts.ui,
                      }}
                    >
                      <p style={{ fontSize: 15, color: t.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.title}
                      </p>
                      <p style={{ fontSize: 12, color: t.textTer, margin: '2px 0 0' }}>
                        {isToday ? 'Today' : task.dueDate === 'tomorrow' ? 'Tomorrow' : task.dueDate}
                        {' · '}
                        {member.name}
                      </p>
                    </button>
                  </div>
                )
              })}
              {dashShopping.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <ShoppingCheckbox checked={false} onChange={() => addToBasket(item.id)} />
                  <span style={{ fontSize: 15, color: t.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  {item.quantity > 1 && (
                    <span style={{ fontSize: 13, color: t.textTer }}>×{item.quantity}</span>
                  )}
                </div>
              ))}
              {dashShopping.length > 0 && (
                <button
                  type="button"
                  onClick={() => openSheet({ type: 'addShoppingItem' })}
                  aria-label="Add shopping item"
                  style={{
                    marginTop: 4,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: t.textSec,
                    fontSize: 13,
                    fontFamily: fonts.ui,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 0',
                    minHeight: 44,
                  }}
                >
                  <Plus size={14} /> Add item
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function PulseTile({
  label,
  onClick,
  ariaLabel,
  children,
}: {
  label: string
  onClick: () => void
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        textAlign: 'left',
        border: 'none',
        background: 'transparent',
        padding: '10px 4px 12px',
        cursor: 'pointer',
        fontFamily: fonts.ui,
        minHeight: 72,
      }}
    >
      <p style={{ fontSize: 11, color: t.textTer, margin: '0 0 6px' }}>{label}</p>
      {children}
    </button>
  )
}

function FamilyPulse({ period }: { period: BudgetPeriod | null }) {
  if (!period) {
    return (
      <>
        <p style={{ fontSize: 15, color: t.textSec, margin: 0 }}>No cycle</p>
        <p style={{ fontSize: 12, color: t.textTer, margin: '4px 0 0' }}>Start one</p>
      </>
    )
  }
  const used = period.summary.totalExpensesActual
  const expected = period.summary.totalExpensesExpected
  const remaining = expected - used
  const { percentUsed, state } = deriveBudgetState(used, expected)
  return (
    <>
      <p style={{
        fontSize: 22, fontWeight: 500, fontFamily: fonts.display, margin: 0, color: t.text,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {formatMoney(used, period.currency)}
      </p>
      {expected > 0 ? (
        <>
          <BudgetBar
            percentUsed={percentUsed}
            state={state}
            ariaLabel={`Household budget ${Math.round(percentUsed)} percent used`}
            height={3}
          />
          <p style={{ fontSize: 12, color: remaining < 0 ? budgetStateColor(state) : t.textSec, margin: '4px 0 0' }}>
            {remaining >= 0
              ? `${formatMoney(remaining, period.currency)} left`
              : `${formatMoney(Math.abs(remaining), period.currency)} over`}
          </p>
        </>
      ) : (
        <p style={{ fontSize: 12, color: t.textSec, margin: '4px 0 0' }}>
          {formatYearMonthTitle(period.labelMonth)}
        </p>
      )}
    </>
  )
}

function PersonalPulse({ summary }: { summary: PersonalAccountSummary | null }) {
  const accounts = summary?.accounts ?? []
  const total = summary?.currentMonthTotal ?? 0
  const currency = summary?.currency ?? 'EUR'
  if (accounts.length === 0) {
    return (
      <>
        <p style={{ fontSize: 15, color: t.textSec, margin: 0 }}>No accounts</p>
        <p style={{ fontSize: 12, color: t.textTer, margin: '4px 0 0' }}>Set one up</p>
      </>
    )
  }
  return (
    <>
      <p style={{
        fontSize: 22, fontWeight: 500, fontFamily: fonts.display, margin: 0, color: t.text,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {formatMoney(total, currency)}
      </p>
      <p style={{ fontSize: 12, color: t.textSec, margin: '4px 0 0' }}>
        {accounts.length === 1 ? accounts[0].name : `${accounts.length} accounts`}
      </p>
    </>
  )
}
