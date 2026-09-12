import { useState } from "react";
import { ChevronDown, Plus, Repeat } from "lucide-react";
import type { Task, Member, AppHandlers } from "../types";
import { t, MemberAvatar, TaskCheckbox, FAB } from "../ui";
import { formatDate } from "../data";
import { addDays } from "../api/adapters";

interface Props {
  tasks: Task[];
  members: Member[];
  today: string;
  currentMemberId?: string;
  openSheet: AppHandlers["openSheet"];
  completeTask: AppHandlers["completeTask"];
  deleteTask: AppHandlers["deleteTask"];
}

const statusSummary = (openTasks: Task[], currentMemberId?: string): string => {
  if (openTasks.length === 0) return "All done — great work!";
  const myOpenCount = openTasks.filter(
    (task) => task.assigneeId === currentMemberId,
  ).length;
  if (myOpenCount > 0)
    return `${myOpenCount} task(s) need your attention · ${openTasks.length} open total`;
  return `${openTasks.length} open task(s) across the family`;
};

export default function TasksScreen({
  tasks,
  members,
  openSheet,
  completeTask,
  today,
  currentMemberId,
}: Props) {
  const [memberFilter, setMemberFilter] = useState<string | null>(null);

  const openTasks = tasks.filter((task) => !task.completed);
  const visibleMembers = memberFilter
    ? members.filter((member) => member.id === memberFilter)
    : members;

  const handleOpenAdd = () => openSheet({ type: "addTask" });
  const handleOpenTask = (taskId: string) =>
    openSheet({ type: "taskDetail", taskId });

  return (
    <div
      className="tasks-motion tasks-screen"
      style={{
        minHeight: "100%",
        background: "var(--task-page)",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "var(--task-panel)",
            borderBottom: "1px solid var(--task-grid)",
          }}
        >
          <div style={{ padding: "16px 16px 4px" }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--task-dim)",
                fontFamily: "var(--ds-font)",
              }}
            >
              {statusSummary(openTasks, currentMemberId)}
            </p>
          </div>

          <MemberFilter
            members={members}
            selected={memberFilter}
            onChange={setMemberFilter}
          />
        </div>

        <div
          key={memberFilter ?? "all"}
          className="tasks-motion"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            padding: 16,
            animation: "tasksEnter 0.22s ease-out",
          }}
        >
          {visibleMembers.map((member) => {
            const laneOpenTasks = openTasks.filter(
              (task) => task.assigneeId === member.id,
            );
            const laneCompletedTasks = tasks.filter(
              (task) => task.completed && task.assigneeId === member.id,
            );
            return (
              <MemberSwimlane
                key={member.id}
                member={member}
                openTasks={laneOpenTasks}
                completedTasks={laneCompletedTasks}
                today={today}
                onComplete={completeTask}
                onOpenTask={handleOpenTask}
              />
            );
          })}
        </div>
      </div>

      <FAB onClick={handleOpenAdd} aria-label="Add task">
        <Plus size={24} color={t.onPrimary} />
      </FAB>
    </div>
  );
}

function MemberFilter({
  members,
  selected,
  onChange,
}: {
  members: Member[];
  selected: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filter by Member"
      style={{
        display: "flex",
        gap: 8,
        padding: "10px 16px",
        overflowX: "auto",
        scrollbarWidth: "none",
        background: "var(--task-panel)",
      }}
    >
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-label="All Members"
        aria-pressed={selected === null}
        style={{
          flexShrink: 0,
          minHeight: 44,
          padding: "5px 14px",
          borderRadius: 9999,
          border: `1.5px solid ${selected === null ? "var(--task-text)" : "var(--task-grid)"}`,
          background:
            selected === null ? "var(--task-text)" : "var(--task-panel)",
          color:
            selected === null ? "var(--task-on-selected)" : "var(--task-dim)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "var(--ds-font)",
          transition: "all 0.15s",
        }}
      >
        All
      </button>

      {members.map((member) => {
        const isActive = selected === member.id;
        return (
          <button
            key={member.id}
            type="button"
            onClick={() => onChange(isActive ? null : member.id)}
            aria-pressed={isActive}
            aria-label={member.name}
            style={{
              flexShrink: 0,
              width: 44,
              height: 44,
              minWidth: 44,
              minHeight: 44,
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 9999,
              border: `1.5px solid ${isActive ? member.color : "var(--task-grid)"}`,
              background: isActive ? member.color : "var(--task-panel)",
              color: isActive ? "#fff" : member.color,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--ds-font)",
              transition: "all 0.15s",
            }}
          >
            {member.initials}
          </button>
        );
      })}
    </div>
  );
}

function MemberSwimlane({
  member,
  openTasks,
  completedTasks,
  today,
  onComplete,
  onOpenTask,
}: {
  member: Member;
  openTasks: Task[];
  completedTasks: Task[];
  today: string;
  onComplete: (id: string) => void;
  onOpenTask: (id: string) => void;
}) {
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const completedPanelId = `${member.id}-completed-tasks`;

  const handleToggleCompleted = () => {
    setIsCompletedExpanded((current) => !current);
  };

  return (
    <section aria-label={`${member.name}'s Tasks`}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 2px 10px",
          borderBottom: `3px solid ${member.color}`,
          marginBottom: 10,
        }}
      >
        <MemberAvatar member={member} size={28} />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 15,
            fontWeight: 700,
            color: "var(--task-text)",
            letterSpacing: "-0.02em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "var(--ds-font)",
          }}
        >
          {member.name}
        </span>
        {openTasks.length > 0 && (
          <span
            style={{
              minWidth: 22,
              height: 22,
              padding: "0 6px",
              borderRadius: 9999,
              background: member.bg,
              color: member.color,
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontVariantNumeric: "tabular-nums",
              fontFamily: "var(--ds-font)",
            }}
          >
            {openTasks.length}
          </span>
        )}
      </div>

      <div
        style={{
          background: "var(--task-card)",
          border: "1px solid var(--task-grid)",
          borderRadius: "var(--ds-radius-lg)",
          boxShadow: "var(--task-card-shadow)",
          overflow: "hidden",
        }}
      >
        {openTasks.length === 0 ? (
          <p
            style={{
              margin: 0,
              padding: "18px 16px",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--task-dim)",
              fontFamily: "var(--ds-font)",
            }}
          >
            All done!
          </p>
        ) : (
          <TaskList
            tasks={openTasks}
            today={today}
            onComplete={onComplete}
            onOpenTask={onOpenTask}
          />
        )}
        {completedTasks.length > 0 && (
          <>
            <button
              type="button"
              aria-expanded={isCompletedExpanded}
              aria-controls={completedPanelId}
              aria-label={
                isCompletedExpanded
                  ? `Hide ${completedTasks.length} completed Tasks for ${member.name}`
                  : `Show ${completedTasks.length} completed Tasks for ${member.name}`
              }
              onClick={handleToggleCompleted}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                minHeight: 44,
                padding: "10px 16px",
                border: "none",
                borderTop: "1px solid var(--task-grid)",
                background: "transparent",
                color: "var(--task-dim)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--ds-font)",
              }}
            >
              <span style={{ flex: 1, textAlign: "left" }}>
                Completed ({completedTasks.length})
              </span>
              <ChevronDown
                size={16}
                aria-hidden
                style={{
                  transform: isCompletedExpanded ? "rotate(180deg)" : "none",
                  transition: "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
            </button>
            <div
              id={completedPanelId}
              hidden={!isCompletedExpanded}
              style={{
                borderTop: "1px solid var(--task-grid)",
                animation: isCompletedExpanded
                  ? "tasksEnter 0.22s ease-out"
                  : "none",
              }}
            >
              <TaskList
                tasks={completedTasks}
                today={today}
                onComplete={onComplete}
                onOpenTask={onOpenTask}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function TaskList({
  tasks,
  today,
  onComplete,
  onOpenTask,
}: {
  tasks: Task[];
  today: string;
  onComplete: (id: string) => void;
  onOpenTask: (id: string) => void;
}) {
  return (
    <div>
      {tasks.map((task, index) => (
        <TaskRow
          key={task.id}
          task={task}
          today={today}
          divider={index > 0}
          onComplete={onComplete}
          onOpen={() => onOpenTask(task.id)}
        />
      ))}
    </div>
  );
}

function TaskRow({
  task,
  today,
  divider,
  onComplete,
  onOpen,
}: {
  task: Task;
  today: string;
  divider: boolean;
  onComplete: (id: string) => void;
  onOpen: () => void;
}) {
  const dueLabel = formatDate(task.dueDate, today, addDays(today, 1));
  const isDueToday = dueLabel === "Today";

  return (
    <div
      style={{
        position: "relative",
        padding: "12px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        borderTop: divider ? "1px solid var(--task-grid)" : "none",
        opacity: task.completed ? 0.55 : 1,
        background: "transparent",
      }}
    >
      <TaskCheckbox
        checked={task.completed}
        priority={task.priority}
        onChange={() => onComplete(task.id)}
        aria-label={
          task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`
        }
      />
      <button
        type="button"
        onClick={onOpen}
        style={{
          flex: 1,
          minWidth: 0,
          padding: 0,
          border: "none",
          background: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "var(--ds-font)",
        }}
      >
        <p
          style={{
            margin: 0,
            marginBottom: 6,
            fontSize: 15,
            color: "var(--task-text)",
            textDecoration: task.completed ? "line-through" : "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {task.title}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <DueChip label={dueLabel} emphasize={isDueToday} />
          {task.recurring && <RecurringChip />}
        </div>
      </button>
    </div>
  );
}

function DueChip({ label, emphasize }: { label: string; emphasize: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 22,
        padding: "2px 8px",
        borderRadius: 9999,
        border: "1px solid var(--task-grid)",
        background: "var(--task-page)",
        color: emphasize ? "var(--task-text)" : "var(--task-dim)",
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "var(--ds-font)",
      }}
    >
      {label}
    </span>
  );
}

function RecurringChip() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        minHeight: 22,
        padding: "2px 8px",
        borderRadius: 9999,
        border: "1px solid var(--task-grid)",
        background: "var(--task-page)",
        color: "var(--task-dim)",
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "var(--ds-font)",
      }}
    >
      <Repeat size={11} aria-hidden />
      Recurring
    </span>
  );
}
