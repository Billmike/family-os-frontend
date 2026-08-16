import { useEffect, useRef, useState } from 'react'
import { Plus, MoreHorizontal, Repeat, CheckSquare } from 'lucide-react'
import type { Task, Member, AppHandlers } from '../types'
import { t, r, MemberAvatar, TaskCheckbox, FAB, SegmentedControl, SectionLabel, EmptyState, PriorityIcon, CategoryIcon } from '../ui'
import { getMember } from '../data'

interface Props {
  tasks: Task[]
  members: Member[]
  today: string
  currentMemberId?: string
  openSheet: AppHandlers['openSheet']
  completeTask: AppHandlers['completeTask']
  deleteTask: AppHandlers['deleteTask']
}

type Filter = 'All' | 'Mine' | 'Completed'

export default function TasksScreen({ tasks, openSheet, completeTask, deleteTask, today, currentMemberId }: Props) {
  const [filter, setFilter] = useState<Filter>('All')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const active = tasks.filter(tk => !tk.completed)
  const completed = tasks.filter(tk => tk.completed)
  const mineId = currentMemberId ?? ''

  const filterTasks = () => {
    if (filter === 'Completed') return completed
    const pool = active
    if (filter === 'Mine') return pool.filter(tk => tk.assigneeId === mineId)
    return pool
  }

  const filtered = filterTasks()
  const todayTasks = filtered.filter(tk => tk.dueDate === 'today' || tk.dueDate === today)
  const upcomingTasks = filtered.filter(tk => tk.dueDate !== 'today' && tk.dueDate !== today && !tk.completed)
  const completedShown = filter === 'Completed' ? filtered : []

  const attention = active.filter(tk => tk.assigneeId === mineId).length

  return (
    <div style={{ minHeight: '100%', paddingBottom: 100 }}>
      <div style={{ padding: '16px 16px 4px' }}>
        {attention > 0
          ? <p style={{ fontSize: 13, color: t.textSec }}>{attention} task{attention !== 1 ? 's' : ''} need your attention</p>
          : <p style={{ fontSize: 13, color: t.success }}>{"You're all caught up!"}</p>
        }
      </div>

      <div style={{ padding: '8px 16px 12px' }}>
        <SegmentedControl options={['All', 'Mine', 'Completed']} value={filter} onChange={v => setFilter(v as Filter)} />
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={CheckSquare}
          title={filter === 'Completed' ? 'No completed tasks' : 'Nothing needs doing'}
          body={filter === 'Completed' ? 'Completed tasks will appear here.' : 'Add a task to get started.'}
          action={filter !== 'Completed' ? '+ Add task' : undefined}
          onAction={() => openSheet({ type: 'addTask' })}
        />
      )}

      {todayTasks.length > 0 && (
        <div>
          <SectionLabel>Today</SectionLabel>
          <TaskList tasks={todayTasks} today={today} onComplete={completeTask} onDelete={deleteTask} menuOpen={menuOpen} onMenuOpen={setMenuOpen} />
        </div>
      )}

      {upcomingTasks.length > 0 && (
        <div>
          <SectionLabel>Upcoming</SectionLabel>
          <TaskList tasks={upcomingTasks} today={today} onComplete={completeTask} onDelete={deleteTask} menuOpen={menuOpen} onMenuOpen={setMenuOpen} />
        </div>
      )}

      {completedShown.length > 0 && (
        <div>
          <SectionLabel>Completed</SectionLabel>
          <TaskList tasks={completedShown} today={today} onComplete={completeTask} onDelete={deleteTask} menuOpen={menuOpen} onMenuOpen={setMenuOpen} />
        </div>
      )}

      <FAB onClick={() => openSheet({ type: 'addTask' })}>
        <Plus size={24} color="#fff" />
      </FAB>
    </div>
  )
}

function TaskList({ tasks, today, onComplete, onDelete, menuOpen, onMenuOpen }: {
  tasks: Task[]
  today: string
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  menuOpen: string | null
  onMenuOpen: (id: string | null) => void
}) {
  return (
    <div style={{ margin: '0 16px 8px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'visible' }}>
      {tasks.map((task, i) => (
        <TaskRow
          key={task.id}
          task={task}
          today={today}
          divider={i > 0}
          onComplete={onComplete}
          onDelete={onDelete}
          menuOpen={menuOpen === task.id}
          onMenuOpen={open => onMenuOpen(open ? task.id : null)}
        />
      ))}
    </div>
  )
}

function TaskRow({ task, today, divider, onComplete, onDelete, menuOpen, onMenuOpen }: {
  task: Task
  today: string
  divider: boolean
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  menuOpen: boolean
  onMenuOpen: (open: boolean) => void
}) {
  const member = getMember(task.assigneeId)
  const isToday = task.dueDate === 'today' || task.dueDate === today
  const rowRef = useRef<HTMLDivElement>(null)
  const [menuUp, setMenuUp] = useState(false)

  useEffect(() => {
    if (!menuOpen || !rowRef.current) return
    const rect = rowRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    setMenuUp(spaceBelow < 120)
  }, [menuOpen])

  return (
    <div ref={rowRef} style={{
      position: 'relative',
      padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12,
      borderTop: divider ? `1px solid ${t.border}` : 'none',
      opacity: task.completed ? 0.45 : 1,
      transition: 'opacity 0.2s',
      background: t.surface,
    }}>
      <TaskCheckbox checked={task.completed} onChange={() => onComplete(task.id)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, color: t.text, textDecoration: task.completed ? 'line-through' : 'none', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <MemberAvatar member={member} size={16} />
          <span style={{ fontSize: 12, color: t.textTer }}>{member.name}</span>
          {task.category && (
            <CategoryIcon category={task.category} size={14} />
          )}
          {!task.completed && (
            <span style={{ fontSize: 12, color: isToday ? t.textSec : t.textTer }}>
              {isToday ? 'Today' : task.dueDate === 'tomorrow' ? 'Tomorrow' : task.dueDate}
            </span>
          )}
          {task.recurring && <Repeat size={11} color={t.textTer} />}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <PriorityIcon priority={task.priority} size={14} />
        <button
          onClick={e => { e.stopPropagation(); onMenuOpen(!menuOpen) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
        >
          <MoreHorizontal size={16} color={t.textTer} />
        </button>
      </div>

      {menuOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={() => onMenuOpen(false)}
          />
          <div
            style={{
              position: 'absolute', right: 12, zIndex: 50,
              ...(menuUp ? { bottom: 36 } : { top: 36 }),
              background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`,
              boxShadow: 'var(--ds-shadow-md)', overflow: 'hidden', minWidth: 140,
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { onComplete(task.id); onMenuOpen(false) }}
              style={{ display: 'block', width: '100%', padding: '11px 16px', border: 'none', background: 'none', textAlign: 'left', fontSize: 14, color: t.text, cursor: 'pointer', fontFamily: 'var(--ds-font)' }}
            >
              {task.completed ? 'Mark incomplete' : 'Mark complete'}
            </button>
            <div style={{ height: 1, background: t.border }} />
            <button
              onClick={() => { onDelete(task.id); onMenuOpen(false) }}
              style={{ display: 'block', width: '100%', padding: '11px 16px', border: 'none', background: 'none', textAlign: 'left', fontSize: 14, color: 'var(--ds-error)', cursor: 'pointer', fontFamily: 'var(--ds-font)' }}
            >
              Delete task
            </button>
          </div>
        </>
      )}
    </div>
  )
}
