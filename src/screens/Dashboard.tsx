import type { AppHandlers, BudgetPeriod, CalendarEvent, ShoppingItem, ShoppingSession, Task } from '../types'
import { ArrowRight, Calendar, CheckSquare, Clock, ShoppingCart, Wallet } from 'lucide-react'
import { MemberAvatar, Skeleton } from '../ui'
import { formatTime, getGreeting, getMember } from '../data'
import { deriveBudgetState, formatMoney, formatYearMonthTitle } from '../api/adapters'
import { BudgetBar } from '../components/BudgetBar'

interface Props extends Partial<AppHandlers> {
  events: CalendarEvent[]; tasks: Task[]; shopping: ShoppingItem[]; activeSession: ShoppingSession | null
  currentPeriod: BudgetPeriod | null; memberName: string; currentMemberId?: string; dateLabel: string; today: string; loading?: boolean
  navigate: AppHandlers['navigate']; onOpenSpend: () => void; openSheet: AppHandlers['openSheet']
}

const RAIL_WIDTH = 40

const greetingIcon = () => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return '☀️'
  if (hour >= 12 && hour < 17) return '🌤️'
  if (hour >= 17 && hour < 21) return '🌇'
  return '🌙'
}

function briefing(events: CalendarEvent[], tasks: Task[], currentMemberId?: string) {
  const myTasks = tasks.filter(task => !task.completed && task.assigneeId === currentMemberId)
  if (!events.length && !myTasks.length) return 'You have a clear day — enjoy the breathing room.'
  const counts = [events.length && `${events.length} ${events.length === 1 ? 'event' : 'events'}`, myTasks.length && `${myTasks.length} ${myTasks.length === 1 ? 'task' : 'tasks'}`].filter(Boolean)
  return `You have ${counts.join(' and ')} today.${events[0] ? ` Next up: ${events[0].title} at ${formatTime(events[0].startTime)}.` : ''}`
}

function duration(event: CalendarEvent) {
  if (!event.endTime) return null
  const [startHour, startMinute] = event.startTime.split(':').map(Number)
  const [endHour, endMinute] = event.endTime.split(':').map(Number)
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  if (minutes <= 0) return null
  return minutes < 60 ? `${minutes}m` : minutes % 60 === 0 ? `${minutes / 60}h` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

function TimelineEvent({ event, first, last, onOpen }: { event: CalendarEvent; first: boolean; last: boolean; onOpen: () => void }) {
  const member = getMember(event.memberId)
  const eventDuration = duration(event)
  return <div style={{ display: 'flex', minHeight: 72 }}>
    <div style={{ width: RAIL_WIDTH, position: 'relative', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
      {!first && <span style={{ position: 'absolute', top: 0, height: '50%', width: 1, background: 'var(--dash-rail)' }} />}
      {!last && <span style={{ position: 'absolute', bottom: 0, height: '50%', width: 1, background: 'var(--dash-rail)' }} />}
      <span style={{ position: 'absolute', top: 'calc(50% - 24px)', fontSize: 10, fontWeight: 700, color: 'var(--dash-label)', whiteSpace: 'nowrap' }}>{formatTime(event.startTime)}</span>
      <span style={{ position: 'absolute', top: '50%', width: 9, height: 9, transform: 'translateY(-50%)', borderRadius: 9999, background: member.color, boxShadow: `0 0 0 3px color-mix(in srgb, ${member.color} 14%, transparent)` }} />
    </div>
    <div style={{ flex: 1, padding: `8px 0 ${last ? 0 : 12}px 12px` }}>
      <button type="button" onClick={onOpen} style={cardStyle({ padding: '11px 13px 11px 17px', minHeight: 56, display: 'flex', alignItems: 'center', gap: 10, position: 'relative', overflow: 'hidden', textAlign: 'left' })}>
        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: member.color }} />
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--dash-text)', fontSize: 14, fontWeight: 700 }}>{event.title}</span>{(eventDuration || event.location) && <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 3, color: 'var(--dash-label)', fontSize: 11, fontWeight: 500 }}>{[eventDuration, event.location].filter(Boolean).join(' · ')}</span>}</span>
        <MemberAvatar member={member} size={30} />
      </button>
    </div>
  </div>
}

function cardStyle(extra: Record<string, string | number | boolean>) {
  return { width: '100%', boxSizing: 'border-box' as const, border: '1px solid var(--dash-border)', borderRadius: 'var(--ds-radius-lg)', background: 'var(--ds-surface-chrome)', boxShadow: 'var(--dash-card-shadow)', cursor: 'pointer', fontFamily: 'var(--ds-font)', ...extra }
}

function PulseTile({ label, value, note, icon: Icon, alert, onClick, children }: { label: string; value: string; note: string; icon: typeof Calendar; alert?: boolean; onClick: () => void; children?: React.ReactNode }) {
  return <button type="button" onClick={onClick} style={cardStyle({ minWidth: 0, minHeight: 150, position: 'relative', display: 'flex', flexDirection: 'column', padding: '16px 14px 14px', textAlign: 'left' })}>
    {alert && <span aria-label="Needs attention" style={{ position: 'absolute', top: 11, right: 11, width: 7, height: 7, borderRadius: 9999, background: 'var(--ds-error)', boxShadow: '0 0 0 2px var(--ds-surface-chrome)' }} />}
    <Icon size={15} color="var(--dash-label)" strokeWidth={1.75} style={{ marginBottom: 10 }} />
    <span style={{ fontSize: 27, fontWeight: 800, lineHeight: 1, letterSpacing: '-.04em', color: 'var(--dash-text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    {children && <span style={{ margin: '8px 0' }}>{children}</span>}
    <span style={{ marginTop: children ? 0 : 8, color: 'var(--dash-label)', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</span>
    <span style={{ marginTop: 2, color: 'var(--dash-note)', fontSize: 12, lineHeight: 1.4 }}>{note}</span>
  </button>
}

export default function Dashboard({ events, tasks, shopping, activeSession, currentPeriod, memberName, currentMemberId, dateLabel, today, loading, navigate, onOpenSpend, openSheet }: Props) {
  const todayEvents = events.filter(event => event.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const nextFutureEvent = events.filter(event => event.date > today).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))[0]
  const openTasks = tasks.filter(task => !task.completed)
  const myOpenTasks = openTasks.filter(task => task.assigneeId === currentMemberId)
  const shoppingCount = shopping.filter(item => !item.completed).length
  const basketCount = activeSession?.itemCount ?? 0
  const nextEvent = todayEvents[0]
  const nextMember = nextEvent ? getMember(nextEvent.memberId) : null
  const familyPulse = currentPeriod ? (() => {
    const used = currentPeriod.summary.totalExpensesActual
    const expected = currentPeriod.summary.totalExpensesExpected
    const remaining = expected - used
    const budget = deriveBudgetState(used, expected)
    return { value: formatMoney(used, currentPeriod.currency), note: expected > 0 ? remaining >= 0 ? `${formatMoney(remaining, currentPeriod.currency)} left` : `${formatMoney(Math.abs(remaining), currentPeriod.currency)} over` : formatYearMonthTitle(currentPeriod.labelMonth), alert: budget.state === 'over', expected, ...budget }
  })() : null

  if (loading) return <DashboardSkeleton />

  return <div className="dashboard-motion" style={{ minHeight: '100%', paddingBottom: 48, background: 'var(--ds-bg)' }}>
    <section style={{ padding: '24px 20px 20px', background: 'var(--dash-hero)', borderBottom: '1px solid var(--dash-border)', animation: 'dashboardEnter .4s ease-out' }}><div style={{ maxWidth: 720, margin: '0 auto' }}>
      <p style={{ margin: '0 0 14px', color: 'var(--dash-label)', fontSize: 11, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase' }}>{dateLabel}</p>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}><h1 style={{ flex: 1, margin: 0, color: 'var(--dash-text)', fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1.12 }}>{getGreeting()},<br />{memberName}.</h1><span aria-hidden style={{ fontSize: 34, lineHeight: 1.1 }}>{greetingIcon()}</span></div>
      <p style={{ margin: `0 0 ${nextEvent ? 18 : 0}px`, maxWidth: 520, color: 'var(--dash-note)', fontSize: 15, lineHeight: 1.6 }}>{briefing(todayEvents, tasks, currentMemberId)}</p>
      {nextEvent && nextMember && <button type="button" onClick={() => openSheet({ type: 'eventDetail', eventId: nextEvent.id })} style={cardStyle({ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px 13px 17px', position: 'relative', overflow: 'hidden', textAlign: 'left', animation: 'dashboardEnter .4s .12s both ease-out' })}><span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: nextMember.color }} /><span style={{ padding: '4px 10px', borderRadius: 'var(--ds-radius-md)', background: `color-mix(in srgb, ${nextMember.color} 12%, transparent)`, color: nextMember.color, fontSize: 13, fontWeight: 700 }}>{formatTime(nextEvent.startTime)}</span><span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--dash-text)', fontSize: 14, fontWeight: 700 }}>{nextEvent.title}</span>{nextEvent.location && <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2, color: 'var(--dash-label)', fontSize: 12 }}>{nextEvent.location}</span>}</span><MemberAvatar member={nextMember} size={26} /></button>}
    </div></section>

    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <section style={{ padding: '20px 16px 8px', background: 'linear-gradient(to bottom, var(--dash-hero) 0, var(--ds-bg) 72px)', animation: 'dashboardEnter .4s .08s both ease-out' }}><SectionHead label="Today" action="See all" onAction={() => navigate('calendar')} offset />{todayEvents.length ? <div style={{ paddingTop: 8 }}>{todayEvents.map((event, index) => <TimelineEvent key={event.id} event={event} first={index === 0} last={index === todayEvents.length - 1} onOpen={() => openSheet({ type: 'eventDetail', eventId: event.id })} />)}{nextFutureEvent && <NextEvent event={nextFutureEvent} />}</div> : <EmptyAgenda nextEvent={nextFutureEvent} />}</section>
      <section style={{ padding: '20px 16px 8px', animation: 'dashboardEnter .4s .16s both ease-out' }}><SectionHead label="Pulse" /><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <PulseTile label="Budget" value={familyPulse?.value ?? '—'} note={familyPulse?.note ?? 'Start a cycle'} icon={Wallet} alert={familyPulse?.alert} onClick={onOpenSpend}>{familyPulse?.expected ? <BudgetBar percentUsed={familyPulse.percentUsed} state={familyPulse.state} ariaLabel={`Household budget ${Math.round(familyPulse.percentUsed)} percent used`} height={2} /> : null}</PulseTile>
        <PulseTile label="Tasks" value={String(openTasks.length)} note={myOpenTasks.length ? `${myOpenTasks.length} need you` : openTasks.length ? 'All clear' : 'Nothing open'} icon={CheckSquare} alert={myOpenTasks.some(task => task.dueDate === today || task.dueDate === 'today')} onClick={() => navigate('tasks')} />
        <PulseTile label="Shopping" value={String(shoppingCount)} note={basketCount ? `${basketCount} in basket` : shoppingCount ? 'Items to get' : 'List is clear'} icon={ShoppingCart} onClick={() => navigate('shopping')} />
        <PulseTile label="Calendar" value={String(todayEvents.length)} note={todayEvents.length === 0 ? 'Free today' : todayEvents.length === 1 ? '1 event today' : `${todayEvents.length} events today`} icon={Calendar} onClick={() => navigate('calendar')} />
      </div></section>
    </div>
  </div>
}

function SectionHead({ label, action, onAction, offset = false }: { label: string; action?: string; onAction?: () => void; offset?: boolean }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, paddingLeft: offset ? RAIL_WIDTH + 12 : 0 }}><span style={{ color: 'var(--dash-label)', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{label}</span>{action && onAction && <button type="button" onClick={onAction} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: 4, border: 0, background: 'transparent', color: 'var(--ds-primary)', fontFamily: 'var(--ds-font)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{action} <ArrowRight size={12} /></button>}</div>
}

function NextEvent({ event }: { event: CalendarEvent }) { return <p style={{ margin: '8px 0 0', paddingLeft: RAIL_WIDTH + 12, color: 'var(--dash-note)', fontSize: 12 }}>Next: <span style={{ color: 'var(--dash-text)', fontWeight: 500 }}>{event.title}</span> · {new Date(`${event.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p> }

function EmptyAgenda({ nextEvent }: { nextEvent?: CalendarEvent }) { return <div style={{ padding: '16px 0 8px 52px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, border: '1px solid var(--dash-border)', borderRadius: 'var(--ds-radius-lg)', background: 'var(--ds-surface-chrome)', boxShadow: 'var(--dash-card-shadow)' }}><Clock size={16} color="var(--dash-label)" /><span><span style={{ display: 'block', color: 'var(--dash-text)', fontSize: 14, fontWeight: 500 }}>Nothing scheduled today</span>{nextEvent && <span style={{ display: 'block', marginTop: 2, color: 'var(--dash-note)', fontSize: 12 }}>Next: {nextEvent.title} · {new Date(`${nextEvent.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>}</span></div></div> }

function DashboardSkeleton() { return <div style={{ padding: '24px 20px' }}><Skeleton h={16} w={160} /><div style={{ marginTop: 14 }}><Skeleton h={76} w={260} /></div><div style={{ marginTop: 20 }}><Skeleton h={72} /></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24 }}><Skeleton h={150} /><Skeleton h={150} /><Skeleton h={150} /><Skeleton h={150} /></div></div> }
