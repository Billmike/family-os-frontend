import type { CalendarEvent, Task, ShoppingItem, AppHandlers } from '../types'
import { Calendar, CheckSquare, ShoppingCart, ArrowRight, Plus } from 'lucide-react'
import { t, r, MemberAvatar, TaskCheckbox, ShoppingCheckbox } from '../ui'
import { getMember, TODAY, TOMORROW, formatTime, getGreeting } from '../data'

interface Props extends Partial<AppHandlers> {
  events: CalendarEvent[]
  tasks: Task[]
  shopping: ShoppingItem[]
  memberName: string
  dateLabel: string
  today: string
  navigate: AppHandlers['navigate']
  openSheet: AppHandlers['openSheet']
  completeTask: AppHandlers['completeTask']
  completeShoppingItem: AppHandlers['completeShoppingItem']
}

export default function Dashboard({ events, tasks, shopping, memberName, dateLabel, today, navigate, openSheet, completeTask, completeShoppingItem }: Props) {
  const tomorrow = (() => {
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })()
  const todayEvents = events.filter(e => e.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const upcomingEvents = events.filter(e => e.date > today).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).slice(0, 4)
  const openTasks = tasks.filter(tk => !tk.completed)
  const dashTasks = openTasks.slice(0, 4)
  const dashShopping = shopping.filter(i => !i.completed).slice(0, 5)
  const completedShopping = shopping.filter(i => i.completed).length

  const daySection = (dateStr: string) => {
    if (dateStr === today || dateStr === TODAY) return 'Today'
    if (dateStr === tomorrow || dateStr === TOMORROW) return 'Tomorrow'
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-GB', { weekday: 'long' })
  }

  const upcomingGrouped: Record<string, CalendarEvent[]> = {}
  upcomingEvents.forEach(ev => {
    const key = daySection(ev.date)
    ;(upcomingGrouped[key] ??= []).push(ev)
  })

  return (
    <div style={{ padding: '0 0 24px', maxWidth: 600, margin: '0 auto' }}>
      {/* ─── Greeting ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 20px 20px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, color: t.text, letterSpacing: '-0.02em', marginBottom: 4 }}>
          {getGreeting()}, {memberName}
        </h1>
        <p style={{ fontSize: 14, color: t.textSec }}>{dateLabel}</p>
      </div>

      {/* ─── Today section ──────────────────────────────────────────────────── */}
      <DashSection
        icon={<Calendar size={16} color={t.primary} strokeWidth={1.75} />}
        title="Today"
        count={`${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''}`}
        onViewAll={() => navigate('calendar')}
        viewLabel="Calendar"
      >
        {todayEvents.length === 0 ? (
          <div style={{ padding: '16px 20px', color: t.textTer, fontSize: 14 }}>{"Your calendar is clear today."}</div>
        ) : (
          <div>
            {todayEvents.map((ev, i) => {
              const member = getMember(ev.memberId)
              return (
                <div key={ev.id} style={{
                  padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16,
                  borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
                }}>
                  <div style={{ textAlign: 'right', minWidth: 48, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: t.textSec }}>{formatTime(ev.startTime)}</span>
                  </div>
                  <div style={{ width: 3, height: 36, borderRadius: 9999, background: member.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 500, color: t.text, marginBottom: 2 }}>{ev.title}</p>
                    {ev.location && <p style={{ fontSize: 12, color: t.textTer, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.location}</p>}
                  </div>
                  <MemberAvatar member={member} size={24} />
                </div>
              )
            })}
          </div>
        )}
      </DashSection>

      {/* ─── Tasks section ──────────────────────────────────────────────────── */}
      <DashSection
        icon={<CheckSquare size={16} color={t.primary} strokeWidth={1.75} />}
        title="Tasks"
        count={`${openTasks.length} open`}
        onViewAll={() => navigate('tasks')}
        viewLabel="View all"
      >
        {dashTasks.length === 0 ? (
          <div style={{ padding: '16px 20px', color: t.textTer, fontSize: 14 }}>Nothing needs doing right now.</div>
        ) : (
          <div>
            {dashTasks.map((task, i) => {
              const member = getMember(task.assigneeId)
              const isToday = task.dueDate === 'today' || task.dueDate === today
              return (
                <div key={task.id} style={{
                  padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 12,
                  borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
                  opacity: task.completed ? 0.4 : 1, transition: 'opacity 0.2s',
                }}>
                  <TaskCheckbox checked={task.completed} onChange={() => completeTask(task.id)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, color: t.text, textDecoration: task.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 12, color: isToday ? t.textSec : t.textTer }}>
                        {isToday ? 'Today' : task.dueDate === 'tomorrow' ? 'Tomorrow' : task.dueDate}
                      </span>
                      <span style={{ fontSize: 12, color: t.textTer }}>·</span>
                      <MemberAvatar member={member} size={14} />
                      <span style={{ fontSize: 12, color: t.textTer }}>{member.name}</span>
                    </div>
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: 9999, background: task.priority === 'high' ? 'var(--ds-error)' : task.priority === 'medium' ? 'var(--ds-warning)' : 'var(--ds-success)', flexShrink: 0 }} />
                </div>
              )
            })}
            {openTasks.length > 4 && (
              <button onClick={() => navigate('tasks')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', color: t.primary, fontSize: 13, fontWeight: 500, fontFamily: 'var(--ds-font)' }}>
                +{openTasks.length - 4} more tasks <ArrowRight size={13} />
              </button>
            )}
          </div>
        )}
      </DashSection>

      {/* ─── Shopping section ───────────────────────────────────────────────── */}
      <DashSection
        icon={<ShoppingCart size={16} color={t.primary} strokeWidth={1.75} />}
        title="Shopping"
        count={`${dashShopping.length} item${dashShopping.length !== 1 ? 's' : ''}`}
        onViewAll={() => navigate('shopping')}
        viewLabel="View list"
        onAdd={() => openSheet({ type: 'addShoppingItem' })}
      >
        {dashShopping.length === 0 && completedShopping === 0 ? (
          <div style={{ padding: '16px 20px', color: t.textTer, fontSize: 14 }}>Nothing to buy.</div>
        ) : (
          <div>
            {dashShopping.map((item, i) => (
              <div key={item.id} style={{
                padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12,
                borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
              }}>
                <ShoppingCheckbox checked={item.completed} onChange={() => completeShoppingItem(item.id)} />
                <span style={{ fontSize: 15, color: t.text, flex: 1 }}>{item.name}</span>
                {item.quantity > 1 && (
                  <span style={{ fontSize: 13, color: t.textTer }}>×{item.quantity}</span>
                )}
              </div>
            ))}
            {completedShopping > 0 && (
              <div style={{ padding: '8px 20px 4px' }}>
                <span style={{ fontSize: 12, color: t.textTer }}>{completedShopping} item{completedShopping !== 1 ? 's' : ''} completed</span>
              </div>
            )}
          </div>
        )}
      </DashSection>

      {/* ─── Upcoming section ───────────────────────────────────────────────── */}
      {upcomingEvents.length > 0 && (
        <DashSection
          icon={<Calendar size={16} color={t.primary} strokeWidth={1.75} />}
          title="Upcoming"
          count=""
          onViewAll={() => navigate('calendar')}
          viewLabel="Calendar"
        >
          <div style={{ padding: '4px 0 8px' }}>
            {Object.entries(upcomingGrouped).map(([day, dayEvents]) => (
              <div key={day} style={{ padding: '8px 20px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: t.textTer, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>{day}</p>
                {dayEvents.map(ev => {
                  const member = getMember(ev.memberId)
                  return (
                    <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: t.textSec, minWidth: 60 }}>{formatTime(ev.startTime)}</span>
                      <div style={{ width: 3, height: 20, borderRadius: 9999, background: member.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: t.text, flex: 1 }}>{ev.title}</span>
                      <MemberAvatar member={member} size={18} />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </DashSection>
      )}
    </div>
  )
}

// ─── DashSection ─────────────────────────────────────────────────────────────

function DashSection({ icon, title, count, onViewAll, viewLabel, onAdd, children }: {
  icon: React.ReactNode
  title: string
  count: string
  onViewAll: () => void
  viewLabel: string
  onAdd?: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{ margin: '0 0 8px' }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {icon}
          <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{title}</span>
          {count && <span style={{ fontSize: 12, color: t.textTer, marginLeft: 2 }}>{count}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {onAdd && (
            <button onClick={onAdd} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}>
              <Plus size={16} color={t.primary} />
            </button>
          )}
          <button onClick={onViewAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, color: t.primary, fontSize: 13, fontWeight: 500, padding: '4px 0', fontFamily: 'var(--ds-font)' }}>
            {viewLabel} <ArrowRight size={13} />
          </button>
        </div>
      </div>
      {/* Content card */}
      <div style={{
        margin: '0 16px',
        background: t.surface,
        borderRadius: r.lg,
        border: `1px solid ${t.border}`,
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  )
}
