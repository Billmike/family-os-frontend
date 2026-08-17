import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  AlignLeft,
  Calendar,
  Flag,
  MoreHorizontal,
  Repeat,
  X,
} from "lucide-react";
import type { Member, Task, TaskUpdatePatch } from "../types";
import {
  dueAtToDate,
  formatTaskDueLabel,
  localDateTimeToIso,
} from "../api/adapters";
import { getMember } from "../data";
import {
  BottomSheet,
  CategoryIcon,
  CategorySelect,
  MemberAvatar,
  PriorityIcon,
  Select,
  TaskCheckbox,
  t,
  r,
} from "../ui";
import TaskDateSheet from "./TaskDateSheet";

interface Props {
  task: Task | undefined;
  members: Member[];
  today: string;
  timeZone: string;
  onClose: () => void;
  onUpdate: (id: string, patch: TaskUpdatePatch) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

const PRIORITIES: Task["priority"][] = ["low", "medium", "high"];

const priorityLabel = (p: Task["priority"]) =>
  p === "high" ? "High" : p === "low" ? "Low" : "Medium";

function useDebouncedSave(
  value: string,
  saved: string,
  onSave: (value: string) => void,
  delay = 500,
) {
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    if (value === saved) return;
    const timer = window.setTimeout(() => {
      onSaveRef.current(value);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [value, saved, delay]);
}

export default function TaskDetailSheet({
  task,
  members,
  today,
  timeZone,
  onClose,
  onUpdate,
  onComplete,
  onDelete,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [showDateSheet, setShowDateSheet] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setShowDescription(Boolean(task.description));
    setShowPriorityPicker(false);
    setShowAssigneePicker(false);
    setShowCategoryPicker(false);
    setMenuOpen(false);
  }, [task?.id, task?.title, task?.description]);

  const handleSaveTitle = useCallback(
    (value: string) => {
      if (!task) return;
      const trimmed = value.trim();
      if (!trimmed || trimmed === task.title) return;
      onUpdate(task.id, { title: trimmed });
    },
    [task, onUpdate],
  );

  const handleSaveDescription = useCallback(
    (value: string) => {
      if (!task) return;
      const normalized = value.trim() || null;
      const current = task.description?.trim() || null;
      if (normalized === current) return;
      onUpdate(task.id, { description: normalized });
    },
    [task, onUpdate],
  );

  useDebouncedSave(title, task?.title ?? "", handleSaveTitle);
  useDebouncedSave(description, task?.description ?? "", handleSaveDescription);

  if (!task) return null;

  const member = getMember(task.assigneeId);
  const dueDateLabel = formatTaskDueLabel(task.dueAt, today, timeZone);
  const selectedDate = dueAtToDate(task.dueAt, timeZone);

  const handleTitleBlur = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(task.title);
      return;
    }
    handleSaveTitle(trimmed);
  };

  const handleDescriptionBlur = () => {
    handleSaveDescription(description);
  };

  const handlePrioritySelect = (priority: Task["priority"]) => {
    if (priority === task.priority) {
      setShowPriorityPicker(false);
      return;
    }
    onUpdate(task.id, { priority });
    setShowPriorityPicker(false);
  };

  const handleAssigneeSelect = (assigneeId: string) => {
    if (assigneeId === task.assigneeId) {
      setShowAssigneePicker(false);
      return;
    }
    onUpdate(task.id, { assigneeId });
    setShowAssigneePicker(false);
  };

  const handleCategorySelect = (category: string) => {
    if (category === task.category) {
      setShowCategoryPicker(false);
      return;
    }
    onUpdate(task.id, { category });
    setShowCategoryPicker(false);
  };

  const handleDateConfirm = (date: string) => {
    const dueAt = localDateTimeToIso(date, "17:00", timeZone);
    if (dueAt === task.dueAt) {
      setShowDateSheet(false);
      return;
    }
    onUpdate(task.id, { dueAt });
    setShowDateSheet(false);
  };

  const handleDelete = () => {
    onDelete(task.id);
    setMenuOpen(false);
  };

  const header = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 20px 12px",
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 4,
          display: "flex",
        }}
      >
        <X size={20} color={t.textSec} />
      </button>
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More actions"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            display: "flex",
          }}
        >
          <MoreHorizontal size={20} color={t.textSec} />
        </button>
        {menuOpen && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 10 }}
              onClick={() => setMenuOpen(false)}
            />
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 32,
                zIndex: 20,
                background: t.surface,
                borderRadius: r.lg,
                border: `1px solid ${t.border}`,
                boxShadow: "var(--ds-shadow-md)",
                overflow: "hidden",
                minWidth: 160,
              }}
            >
              <button
                onClick={() => {
                  onComplete(task.id);
                  setMenuOpen(false);
                }}
                style={menuItemStyle}
              >
                {task.completed ? "Mark incomplete" : "Mark complete"}
              </button>
              <div style={{ height: 1, background: t.border }} />
              <button
                onClick={handleDelete}
                style={{ ...menuItemStyle, color: t.error }}
              >
                Delete task
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <BottomSheet
        onClose={onClose}
        header={header}
        ariaLabel="Task details"
        listenEscape={!showDateSheet}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 16,
            marginTop: 6,
          }}
        >
          <TaskCheckbox
            checked={task.completed}
            onChange={() => onComplete(task.id)}
            size={24}
          />
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            rows={2}
            aria-label="Task title"
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              background: "transparent",
              resize: "none",
              fontSize: 22,
              fontWeight: 600,
              color: t.text,
              lineHeight: 1.35,
              fontFamily: "var(--ds-font)",
              outline: "none",
              padding: 0,
              textDecoration: task.completed ? "line-through" : "none",
            }}
          />
        </div>

        <button
          onClick={() => setShowAssigneePicker((v) => !v)}
          style={metaRowStyle}
        >
          <MemberAvatar member={member} size={20} />
          <span style={{ fontSize: 13, color: t.textSec }}>{member.name}</span>
          {task.category && <CategoryIcon category={task.category} size={14} />}
          <span style={{ fontSize: 13, color: t.textTer }}>
            {task.category}
          </span>
          {task.recurring && <Repeat size={12} color={t.textTer} />}
        </button>

        {showAssigneePicker && (
          <div style={{ marginBottom: 12 }}>
            <Select
              value={task.assigneeId}
              onChange={handleAssigneeSelect}
              options={members.map((m) => ({ value: m.id, label: m.name }))}
            />
          </div>
        )}

        {showCategoryPicker && (
          <div style={{ marginBottom: 12 }}>
            <CategorySelect
              value={task.category}
              onChange={handleCategorySelect}
            />
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <ActionPill
            icon={<Calendar size={14} color={t.textSec} strokeWidth={1.75} />}
            label={dueDateLabel}
            active={Boolean(task.dueAt)}
            onClick={() => setShowDateSheet(true)}
          />
          <ActionPill
            icon={<AlignLeft size={14} color={t.textSec} strokeWidth={1.75} />}
            label={task.description ? "Description" : "Description"}
            active={Boolean(task.description)}
            onClick={() => setShowDescription((v) => !v)}
          />
          <ActionPill
            icon={<Flag size={14} color={t.textSec} strokeWidth={1.75} />}
            label={priorityLabel(task.priority)}
            active={task.priority !== "medium"}
            onClick={() => setShowPriorityPicker((v) => !v)}
          />
        </div>

        {showPriorityPicker && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => handlePrioritySelect(p)}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  borderRadius: r.md,
                  border: `1px solid ${task.priority === p ? t.primary : t.border}`,
                  background: task.priority === p ? t.primarySubtle : t.surface,
                  cursor: "pointer",
                  fontFamily: "var(--ds-font)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: task.priority === p ? 600 : 400,
                  color: t.text,
                }}
              >
                <PriorityIcon priority={p} size={14} />
                {priorityLabel(p)}
              </button>
            ))}
          </div>
        )}

        {showDescription && (
          <div style={{ marginBottom: 16 }}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Add a description…"
              rows={4}
              aria-label="Task description"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px",
                borderRadius: r.md,
                border: `1px solid ${t.border}`,
                background: t.surfaceMuted,
                fontSize: 15,
                color: t.text,
                lineHeight: 1.5,
                resize: "vertical",
                fontFamily: "var(--ds-font)",
                outline: "none",
              }}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            onClick={() => setShowCategoryPicker((v) => !v)}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: r.md,
              border: `1px solid ${t.border}`,
              background: t.surfaceMuted,
              cursor: "pointer",
              fontFamily: "var(--ds-font)",
              fontSize: 13,
              color: t.textSec,
            }}
          >
            Change category
          </button>
          <button
            onClick={() => setShowAssigneePicker((v) => !v)}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: r.md,
              border: `1px solid ${t.border}`,
              background: t.surfaceMuted,
              cursor: "pointer",
              fontFamily: "var(--ds-font)",
              fontSize: 13,
              color: t.textSec,
            }}
          >
            Change assignee
          </button>
        </div>
      </BottomSheet>

      {showDateSheet && (
        <TaskDateSheet
          today={today}
          initialDate={selectedDate}
          onClose={() => setShowDateSheet(false)}
          onConfirm={handleDateConfirm}
        />
      )}
    </>
  );
}

function ActionPill({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        borderRadius: r.pill,
        border: `1px solid ${active ? t.primary : t.border}`,
        background: active ? t.primarySubtle : t.surfaceMuted,
        cursor: "pointer",
        fontFamily: "var(--ds-font)",
        fontSize: 13,
        color: t.text,
        fontWeight: active ? 500 : 400,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

const menuItemStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "11px 16px",
  border: "none",
  background: "none",
  textAlign: "left",
  fontSize: 14,
  color: t.text,
  cursor: "pointer",
  fontFamily: "var(--ds-font)",
};

const metaRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 16,
  padding: 0,
  border: "none",
  background: "none",
  cursor: "pointer",
  fontFamily: "var(--ds-font)",
  flexWrap: "wrap",
};
