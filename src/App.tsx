import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Repeat } from "lucide-react";
import type {
  Screen,
  CalendarEvent,
  Task,
  ShoppingItem,
  ShoppingLocation,
  ShoppingSession,
  ShoppingSessionItem,
  HouseholdSpend,
  BudgetPeriod,
  BudgetSubcategoryGroup,
  Notification,
  BottomSheetType,
  Member,
  TaskUpdatePatch,
  ExpenseDraft,
  PersonalAccountSummary,
  PersonalExpense,
  PersonalExpenseDraft,
  ShoppingItemPatch,
} from "./types";
import { TASK_CATEGORIES } from "./types";
import { getMember, formatDate, formatTime } from "./data";
import {
  t,
  BottomSheet,
  Toast,
  OfflineBanner,
  FormField,
  Input,
  Select,
  PrimaryButton,
  SegmentedControl,
  CategorySelect,
} from "./ui";
import Dashboard from "./screens/Dashboard";
import CalendarScreen from "./screens/Calendar";
import TasksScreen from "./screens/Tasks";
import ShoppingScreen from "./screens/Shopping";
import NotificationsScreen from "./screens/Notifications";
import FamilyScreen from "./screens/Family";
import SettingsScreen from "./screens/Settings";
import Onboarding from "./screens/Onboarding";
import { SessionProvider, useSession } from "./auth/session";
import { ApiError } from "./api/client";
import {
  addDays,
  dueDateToIso,
  EVENT_FETCH_AHEAD_DAYS,
  EVENT_FETCH_BACK_DAYS,
  formatLongDate,
  localDateTimeToIso,
  priorityToApi,
  toCalendarEvent,
  toNotification,
  toExpense,
  toHouseholdSpend,
  toPersonalAccountSummary,
  toPersonalExpense,
  toBudgetPeriod,
  toBudgetSubcategoryGroups,
  sortBudgetPeriods,
  pickDefaultPeriodId,
  parseOverlapRange,
  cycleStatus,
  toShoppingItem,
  toShoppingLocation,
  toShoppingSession,
  toShoppingSessionItem,
  toTask,
  todayInTimezone,
} from "./api/adapters";
import * as dashboardApi from "./api/dashboard";
import * as eventsApi from "./api/events";
import * as tasksApi from "./api/tasks";
import * as shoppingApi from "./api/shopping";
import * as shoppingLocationsApi from "./api/shoppingLocations";
import * as shoppingSessionsApi from "./api/shoppingSessions";
import * as expensesApi from "./api/expenses";
import * as personalAccountsApi from "./api/personalAccounts";
import * as personalExpensesApi from "./api/personalExpenses";
import * as budgetsApi from "./api/budgets";
import * as budgetSubcategoriesApi from "./api/budgetSubcategories";
import * as notificationsApi from "./api/notifications";
import * as familiesApi from "./api/families";
import { useFamilyRealtime } from "./realtime/useFamilyRealtime";
import TaskDetailSheet from "./components/TaskDetailSheet";
import ExpenseSheet from "./components/ExpenseSheet";
import CycleDatesSheet from "./components/CycleDatesSheet";
import CycleListSheet from "./components/CycleListSheet";
import ExpenseEntryChooser from "./components/ExpenseEntryChooser";
import ReceiptScanSheet from "./components/ReceiptScanSheet";
import { ErrorBoundary } from "./components/ErrorBoundary";
import ShoppingItemSheet from "./components/ShoppingItemSheet";
import BudgetScreen, { type BudgetTab } from "./screens/Budget";
import {
  capturePendingInviteFromUrl,
  clearPendingInviteToken,
  getPendingInviteToken,
} from "./invite/pendingInvite";
import {
  LOGIN_PATH,
  isLoginPath,
  legacyGoRedirectPath,
  legacyPathRedirect,
  isBudgetSection,
  pathToScreen,
  screenToPath,
} from "./routing";
import ExpenseActivityScreen from "./screens/ExpenseActivity";
import PersonalExpensesScreen from "./screens/PersonalExpenses";
import PersonalActivityScreen from "./screens/PersonalActivity";
import PersonalExpenseSheet from "./components/PersonalExpenseSheet";
import PersonalAccountSheet from "./components/PersonalAccountSheet";
import { AppHeader } from "./components/shell/AppHeader";
import { DesktopSidebar } from "./components/shell/DesktopSidebar";
import { MobileBottomNav } from "./components/shell/MobileBottomNav";

const BUDGET_TAB_SCREENS: Record<BudgetTab, Screen> = {
  plan: "budget",
  spend: "budgetSpend",
  insights: "budgetInsights",
};

const BUDGET_TAB_BY_SCREEN: Partial<Record<Screen, BudgetTab>> = {
  budget: "plan",
  budgetSpend: "spend",
  budgetInsights: "insights",
};

/** Stepper taps arrive in bursts, so coalesce them into a single request. */
const ITEM_EDIT_DEBOUNCE_MS = 400;

const personalAccountStorageKey = (userId: string) =>
  `familyos_personal_account_${userId}`;

interface PendingEdit<T> {
  timer: number;
  patch: ShoppingItemPatch;
  /** Last server-confirmed value, restored if the request fails. */
  snapshot: T;
}

/** Omitted keys are left untouched by the API; an explicit null clears them. */
function shoppingPatchToApi(patch: ShoppingItemPatch) {
  const body: Partial<shoppingApi.ShoppingItemCreate> = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.quantity !== undefined) body.quantity = patch.quantity;
  if (patch.category !== undefined) body.category = patch.category;
  if (patch.locationId !== undefined) body.location_id = patch.locationId;
  return body;
}

export default function App() {
  return (
    <SessionProvider>
      <AppRoot />
    </SessionProvider>
  );
}

function AppRoot() {
  const session = useSession();
  const location = useLocation();
  const [setupPending, setSetupPending] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const inviteAcceptRef = useRef(false);

  // Synchronous so onboarding initial state sees the token on first paint
  capturePendingInviteFromUrl();

  useEffect(() => {
    if (session.status !== "unauthenticated") return;
    setSetupPending(false);
    inviteAcceptRef.current = false;
  }, [session.status]);

  // Signed-in user already in a family who opens /invite/:token
  useEffect(() => {
    if (session.status !== "ready") return;
    const token = getPendingInviteToken();
    if (!token || inviteAcceptRef.current) return;
    inviteAcceptRef.current = true;
    setInviteBusy(true);
    void (async () => {
      try {
        const result = await familiesApi.acceptInvitation(token);
        clearPendingInviteToken();
        await session.selectFamily(result.family.id);
      } catch {
        clearPendingInviteToken();
        inviteAcceptRef.current = false;
      } finally {
        setInviteBusy(false);
      }
    })();
  }, [session.status, session.selectFamily]);

  if (session.status === "loading" || inviteBusy) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: t.bg,
          color: t.textSec,
          fontFamily: "var(--ds-font)",
        }}
      >
        {inviteBusy ? "Joining family…" : "Loading…"}
      </div>
    );
  }

  const showOnboarding =
    session.status === "unauthenticated" ||
    session.status === "needs_family" ||
    setupPending;

  if (
    session.status === "unauthenticated" &&
    !isLoginPath(location.pathname) &&
    location.pathname !== "/"
  ) {
    return <Navigate to={LOGIN_PATH} replace />;
  }

  if (
    session.status === "ready" &&
    !setupPending &&
    isLoginPath(location.pathname)
  ) {
    return <Navigate to="/" replace />;
  }

  if (session.status === "needs_family" && isLoginPath(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  if (showOnboarding) {
    return (
      <Onboarding
        handlers={{
          register: async (email, password, name) => {
            setSetupPending(true);
            await session.register(email, password, name);
          },
          login: async (email, password) => {
            await session.login(email, password);
            setSetupPending(false);
          },
          needsFamily: session.status === "needs_family" || setupPending,
          userName: session.user?.name,
          onFamilyCreated: async (fam) => {
            setSetupPending(true);
            await session.setFamilyFromCreate(fam);
          },
          onJoinedFamily: async (familyId) => {
            await session.selectFamily(familyId);
            setSetupPending(false);
          },
          onEnterApp: () => {
            setSetupPending(false);
          },
        }}
      />
    );
  }

  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const session = useSession();
  const location = useLocation();
  const routerNavigate = useNavigate();
  const family = session.family!;
  const timeZone = family.timezone || "UTC";
  const members = session.members;
  const currentUser = session.currentMember ?? members[0];
  const today = todayInTimezone(timeZone);

  // Legacy push deep links: /?go=tasks → /tasks
  useEffect(() => {
    const legacyPath = legacyGoRedirectPath(location.search);
    if (!legacyPath) return;
    routerNavigate(legacyPath, { replace: true });
  }, [location.search, routerNavigate]);

  // Retired routes: /expenses → /budget, /budget/spend → /budget
  useEffect(() => {
    const target = legacyPathRedirect(location.pathname);
    if (!target) return;
    routerNavigate(`${target}${location.search}`, { replace: true });
  }, [location.pathname, location.search, routerNavigate]);

  // Unknown paths → home (invite paths are stripped before MainApp mounts)
  useEffect(() => {
    if (legacyGoRedirectPath(location.search)) return;
    if (legacyPathRedirect(location.pathname)) return;
    if (pathToScreen(location.pathname) !== null) return;
    if (isLoginPath(location.pathname)) return;
    routerNavigate("/", { replace: true });
  }, [location.pathname, location.search, routerNavigate]);

  const screen = pathToScreen(location.pathname) ?? "dashboard";
  const budgetTab = BUDGET_TAB_BY_SCREEN[screen];

  const navigateToScreen = useCallback(
    (next: Screen) => {
      routerNavigate(screenToPath(next));
    },
    [routerNavigate],
  );

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [shoppingListId, setShoppingListId] = useState<string | null>(null);
  const [shoppingLocations, setShoppingLocations] = useState<
    ShoppingLocation[]
  >([]);
  const [activeSession, setActiveSession] = useState<ShoppingSession | null>(
    null,
  );
  const [sessionHistory, setSessionHistory] = useState<ShoppingSession[]>([]);
  const [householdSpend, setHouseholdSpend] = useState<HouseholdSpend | null>(
    null,
  );
  const [budgetPeriods, setBudgetPeriods] = useState<BudgetPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const budgetPeriod =
    budgetPeriods.find((p) => p.id === selectedPeriodId) ?? null;
  const [subcategoryGroups, setSubcategoryGroups] = useState<BudgetSubcategoryGroup[]>([]);
  const [personalSummary, setPersonalSummary] = useState<PersonalAccountSummary | null>(null);
  const [selectedPersonalAccountId, setSelectedPersonalAccountId] = useState<string | null>(null);
  const [selectedPersonalMonth, setSelectedPersonalMonth] = useState(() => today.slice(0, 7));
  const [personalListEpoch, setPersonalListEpoch] = useState(0);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [dashGreeting, setDashGreeting] = useState(session.user?.name ?? "");
  const [dashDateLabel, setDashDateLabel] = useState(formatLongDate(today));
  const [familyName, setFamilyName] = useState(family.name);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<BottomSheetType | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingListEdits = useRef(
    new Map<string, PendingEdit<ShoppingItem>>(),
  );
  const pendingBasketEdits = useRef(
    new Map<string, PendingEdit<ShoppingSessionItem>>(),
  );

  useEffect(() => {
    const listEdits = pendingListEdits.current;
    const basketEdits = pendingBasketEdits.current;
    return () => {
      listEdits.forEach((edit) => window.clearTimeout(edit.timer));
      basketEdits.forEach((edit) => window.clearTimeout(edit.timer));
    };
  }, []);

  const unreadCount = notifs.filter((n) => !n.read).length;

  function showToast(msg: string, type: "success" | "error" = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  function handleError(e: unknown, fallback = "Something went wrong") {
    const msg = e instanceof ApiError ? e.message : fallback;
    showToast(msg, "error");
  }

  const loadAll = useCallback(async () => {
    const familyId = family.id;
    try {
      const from = `${addDays(today, -EVENT_FETCH_BACK_DAYS)}T00:00:00Z`;
      const to = `${addDays(today, EVENT_FETCH_AHEAD_DAYS)}T23:59:59Z`;

      const [dash, evs, tsks, lists, locs, ns, activeSess, history, spend, listedPeriods, subcats, personal] =
        await Promise.all([
          dashboardApi.getDashboard(familyId),
          eventsApi.listEvents(familyId, from, to),
          tasksApi.listTasks(familyId, "all"),
          shoppingApi.listShoppingLists(familyId),
          shoppingLocationsApi.listShoppingLocations(familyId),
          notificationsApi.listNotifications(),
          shoppingSessionsApi.getActiveSession(familyId),
          shoppingSessionsApi.listSessions(familyId, { limit: 20 }),
          expensesApi.getSpend(familyId).catch(() => null),
          budgetsApi.listBudgetPeriods(familyId).catch(() => null),
          budgetSubcategoriesApi.listBudgetSubcategories(familyId).catch(() => null),
          personalAccountsApi.listAccounts().catch(() => null),
        ]);

      setFamilyName(dash.family_name);
      setDashGreeting(dash.member_name);
      setDashDateLabel(formatLongDate(dash.date));

      setEvents(evs.map((e) => toCalendarEvent(e, timeZone)));
      setTasks(tsks.map((tk) => toTask(tk, dash.date, timeZone)));
      setNotifs(ns.map(toNotification));
      setShoppingLocations(locs.map(toShoppingLocation));
      setActiveSession(activeSess ? toShoppingSession(activeSess) : null);
      setSessionHistory(history.map(toShoppingSession));
      setHouseholdSpend(spend ? toHouseholdSpend(spend) : null);
      const nextPeriods = listedPeriods
        ? sortBudgetPeriods(listedPeriods.periods.map(toBudgetPeriod))
        : [];
      setBudgetPeriods(nextPeriods);
      setSelectedPeriodId((prev) => {
        if (prev && nextPeriods.some((p) => p.id === prev)) return prev;
        return pickDefaultPeriodId(nextPeriods, today);
      });
      if (subcats) setSubcategoryGroups(toBudgetSubcategoryGroups(subcats));
      if (personal) {
        const nextSummary = toPersonalAccountSummary(personal);
        setPersonalSummary(nextSummary);
        setSelectedPersonalMonth((prev) =>
          prev > nextSummary.currentMonth ? nextSummary.currentMonth : prev || nextSummary.currentMonth,
        );
        const stored = session.user
          ? localStorage.getItem(personalAccountStorageKey(session.user.id))
          : null;
        setSelectedPersonalAccountId((prev) => {
          const candidate = prev ?? stored;
          if (candidate && nextSummary.accounts.some((row) => row.id === candidate)) {
            return candidate;
          }
          return nextSummary.accounts[0]?.id ?? null;
        });
        setPersonalListEpoch((n) => n + 1);
      }

      const groceries =
        lists.find((l) => l.name.toLowerCase() === "groceries") ??
        lists[0] ??
        null;
      if (groceries) {
        setShoppingListId(groceries.id);
        const items = await shoppingApi.listShoppingItems(groceries.id);
        setShopping(items.map(toShoppingItem));
      } else {
        setShoppingListId(null);
        setShopping([]);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        void session.recoverFromLostFamily();
        return;
      }
      handleError(e, "Failed to load family data");
    } finally {
      setLoading(false);
    }
  }, [family.id, timeZone, today, session.recoverFromLostFamily, session.user]);

  const refreshSpend = useCallback(async () => {
    try {
      const spend = await expensesApi.getSpend(family.id);
      setHouseholdSpend(toHouseholdSpend(spend));
    } catch {
      /* keep the last known totals */
    }
  }, [family.id]);

  const refreshBudgets = useCallback(async (selectId?: string) => {
    try {
      const data = await budgetsApi.listBudgetPeriods(family.id);
      const next = sortBudgetPeriods(data.periods.map(toBudgetPeriod));
      setBudgetPeriods(next);
      setSelectedPeriodId((prev) => {
        if (selectId && next.some((p) => p.id === selectId)) return selectId;
        if (prev && next.some((p) => p.id === prev)) return prev;
        return pickDefaultPeriodId(next, today);
      });
    } catch {
      /* keep the last known budgets */
    }
  }, [family.id, today]);

  const refreshSubcategories = useCallback(async () => {
    try {
      const data = await budgetSubcategoriesApi.listBudgetSubcategories(family.id);
      setSubcategoryGroups(toBudgetSubcategoryGroups(data));
    } catch {
      /* keep last known */
    }
  }, [family.id]);

  const loadPeriodExpenses = useCallback(
    async (periodId: string, signal?: AbortSignal) => {
      const rows = await expensesApi.listExpenses(family.id, { periodId }, signal);
      return rows.map(toExpense);
    },
    [family.id],
  );

  const refreshPersonalSummary = useCallback(async (selectId?: string) => {
    try {
      const data = await personalAccountsApi.listAccounts();
      const nextSummary = toPersonalAccountSummary(data);
      setPersonalSummary(nextSummary);
      setSelectedPersonalMonth((prev) =>
        prev > nextSummary.currentMonth ? nextSummary.currentMonth : prev || nextSummary.currentMonth,
      );
      setSelectedPersonalAccountId((prev) => {
        const candidate = selectId ?? prev;
        if (candidate && nextSummary.accounts.some((row) => row.id === candidate)) {
          return candidate;
        }
        return nextSummary.accounts[0]?.id ?? null;
      });
      setPersonalListEpoch((n) => n + 1);
    } catch {
      /* keep last known personal totals */
    }
  }, []);

  const handleSelectPersonalAccount = useCallback(
    (accountId: string) => {
      setSelectedPersonalAccountId(accountId);
      if (session.user) {
        localStorage.setItem(personalAccountStorageKey(session.user.id), accountId);
      }
    },
    [session.user],
  );

  const loadPersonalMonthExpenses = useCallback(
    async (accountId: string, month: string, signal?: AbortSignal) => {
      const rows = await personalExpensesApi.listPersonalExpenses(accountId, month, signal);
      return rows.map(toPersonalExpense);
    },
    [personalListEpoch],
  );

  useEffect(() => {
    if (!session.user || !selectedPersonalAccountId) return;
    localStorage.setItem(
      personalAccountStorageKey(session.user.id),
      selectedPersonalAccountId,
    );
  }, [session.user, selectedPersonalAccountId]);

  const handleOpenSpend = useCallback(() => {
    const current = budgetPeriods.find((p) => cycleStatus(p, today) === "current");
    if (current) {
      setSelectedPeriodId(current.id);
    } else {
      const fallback = pickDefaultPeriodId(budgetPeriods, today);
      if (fallback) setSelectedPeriodId(fallback);
    }
    navigateToScreen("budgetSpend");
  }, [budgetPeriods, today, navigateToScreen]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useFamilyRealtime({
    familyId: family.id,
    timeZone,
    today,
    loadAll,
    onMembershipRevoked: () => {
      void session.recoverFromLostFamily();
    },
    setEvents,
    setTasks,
    setShopping,
    setActiveSession,
    setSessionHistory,
    setNotifs,
    refreshSpend,
    refreshBudgets,
  });

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    function onSwMessage(event: MessageEvent) {
      const data = event.data as { type?: string } | null;
      if (data?.type !== "notification.push") return;
      void notificationsApi
        .listNotifications()
        .then((ns) => setNotifs(ns.map(toNotification)))
        .catch(() => {
          /* keep current list */
        });
    }
    navigator.serviceWorker.addEventListener("message", onSwMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onSwMessage);
  }, []);

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  async function completeTask(id: string) {
    const task = tasks.find((tk) => tk.id === id);
    try {
      if (task?.completed) {
        await tasksApi.updateTask(id, { completed_at: null });
        setTasks((ts) =>
          ts.map((tk) => (tk.id === id ? { ...tk, completed: false } : tk)),
        );
        showToast("Task reopened");
      } else {
        await tasksApi.completeTask(id);
        const all = await tasksApi.listTasks(family.id, "all");
        setTasks(all.map((tk) => toTask(tk, today, timeZone)));
        showToast("Task completed");
      }
    } catch (e) {
      handleError(e);
    }
  }

  async function deleteTask(id: string) {
    try {
      await tasksApi.deleteTask(id);
      setTasks((ts) => ts.filter((tk) => tk.id !== id));
      setSheet((s) => (s?.type === "taskDetail" && s.taskId === id ? null : s));
      showToast("Task deleted");
    } catch (e) {
      handleError(e);
    }
  }

  async function updateTask(id: string, patch: TaskUpdatePatch) {
    const task = tasks.find((tk) => tk.id === id);
    if (!task) return;

    const payload: Parameters<typeof tasksApi.updateTask>[1] = {};

    if (patch.title !== undefined) {
      const trimmed = patch.title.trim();
      if (trimmed && trimmed !== task.title) payload.title = trimmed;
    }
    if (patch.description !== undefined) {
      const normalized = patch.description?.trim() || null;
      const current = task.description?.trim() || null;
      if (normalized !== current) payload.description = normalized;
    }
    if (patch.priority !== undefined && patch.priority !== task.priority) {
      payload.priority = priorityToApi(patch.priority);
    }
    if (patch.category !== undefined && patch.category !== task.category) {
      payload.category = patch.category;
    }
    if (
      patch.assigneeId !== undefined &&
      patch.assigneeId !== task.assigneeId
    ) {
      payload.assignee_ids = patch.assigneeId ? [patch.assigneeId] : [];
    }
    if (patch.dueAt !== undefined && patch.dueAt !== task.dueAt) {
      payload.due_at = patch.dueAt;
    } else if (patch.dueDate !== undefined) {
      const dueAt = dueDateToIso(patch.dueDate, today, timeZone);
      if (dueAt !== task.dueAt) payload.due_at = dueAt;
    }

    if (Object.keys(payload).length === 0) return;

    try {
      const updated = await tasksApi.updateTask(id, payload);
      setTasks((ts) =>
        ts.map((tk) => (tk.id === id ? toTask(updated, today, timeZone) : tk)),
      );
    } catch (e) {
      handleError(e);
    }
  }

  async function addTask(task: Omit<Task, "id" | "completed">) {
    try {
      const created = await tasksApi.createTask(family.id, {
        title: task.title,
        category: task.category,
        priority: priorityToApi(task.priority),
        assignee_ids: task.assigneeId ? [task.assigneeId] : [],
        due_at: dueDateToIso(task.dueDate, today, timeZone),
        recurrence_rule: task.recurring ? "weekly" : null,
      });
      setTasks((ts) => {
        const ui = toTask(created, today, timeZone);
        // Realtime may already have applied task.created; avoid a duplicate row.
        if (ts.some((t) => t.id === ui.id)) {
          return ts.map((t) => (t.id === ui.id ? ui : t));
        }
        return [ui, ...ts];
      });
      setSheet(null);
      showToast("Task created");
    } catch (e) {
      handleError(e);
    }
  }

  async function addToBasket(id: string) {
    const item = shopping.find((i) => i.id === id);
    if (!item || item.completed) return false;
    try {
      const result = await shoppingSessionsApi.addToBasket(family.id, id);
      setShopping((its) => its.filter((i) => i.id !== id));
      setActiveSession(toShoppingSession(result.session));
      return true;
    } catch (e) {
      handleError(e);
      return false;
    }
  }

  async function removeFromBasket(sessionItemId: string) {
    try {
      const result = await shoppingSessionsApi.removeFromBasket(sessionItemId);
      if (result.restored_item) {
        const ui = toShoppingItem(result.restored_item);
        setShopping((its) => {
          if (its.some((i) => i.id === ui.id)) return its;
          return [...its, ui];
        });
      }
      setActiveSession((prev) => {
        if (!prev) return null;
        const items = prev.items?.filter((i) => i.id !== sessionItemId) ?? [];
        if (items.length === 0) return { ...prev, itemCount: 0, items: [] };
        return { ...prev, itemCount: items.length, items };
      });
    } catch (e) {
      handleError(e);
      const active = await shoppingSessionsApi.getActiveSession(family.id);
      setActiveSession(active ? toShoppingSession(active) : null);
    }
  }

  async function completeShoppingSession(totalCost: number) {
    try {
      const completed = await shoppingSessionsApi.completeSession(
        family.id,
        totalCost,
      );
      const ui = toShoppingSession(completed);
      setActiveSession(null);
      setSessionHistory((prev) => [ui, ...prev.filter((s) => s.id !== ui.id)]);
      setSheet(null);
      showToast("Shopping trip completed");
      void refreshSpend();
      void refreshBudgets();
    } catch (e) {
      handleError(e);
    }
  }

  async function saveCycleDates(draft: {
    startDate: string
    endDate: string
    periodId: string | null
    copy: boolean
  }) {
    try {
      const labelMonth = draft.endDate.slice(0, 7)
      let saved
      if (draft.periodId) {
        saved = await budgetsApi.updateBudgetPeriod(draft.periodId, {
          start_date: draft.startDate,
          end_date: draft.endDate,
          label_month: labelMonth,
        })
      } else if (draft.copy) {
        saved = await budgetsApi.copyBudgetPeriod(family.id, {
          start_date: draft.startDate,
          end_date: draft.endDate,
          label_month: labelMonth,
          source_period_id: budgetPeriod?.id ?? null,
        })
      } else {
        const existingLines =
          budgetPeriod?.groups.flatMap(g =>
            g.lines.map(l => ({ subcategory_id: l.subcategoryId, amount: l.amount })),
          ) ?? []
        saved = await budgetsApi.createBudgetPeriod(family.id, {
          start_date: draft.startDate,
          end_date: draft.endDate,
          label_month: labelMonth,
          budgets: existingLines,
        })
      }
      setSheet(null)
      showToast('Budget cycle saved')
      void refreshBudgets(saved.id)
      void refreshSpend()
      void refreshSubcategories()
    } catch (e) {
      handleError(e)
      const range = e instanceof ApiError ? parseOverlapRange(e.message) : null
      if (range) setSheet({ type: 'cycleList', highlightRange: range })
    }
  }

  async function updateBudgetExpected(budgetId: string, amount: number) {
    try {
      await budgetsApi.updateBudget(budgetId, amount)
      void refreshBudgets()
      void refreshSpend()
    } catch (e) {
      handleError(e)
    }
  }

  async function addBudgetLine(subcategoryId: string, amount: number) {
    if (!budgetPeriod) {
      showToast('Start a budget cycle first', 'error')
      return
    }
    try {
      const lines = budgetPeriod.groups.flatMap(g =>
        g.lines.map(l => ({ subcategory_id: l.subcategoryId, amount: l.amount })),
      )
      const existing = lines.find(l => l.subcategory_id === subcategoryId)
      if (existing) existing.amount = amount
      else lines.push({ subcategory_id: subcategoryId, amount })
      await budgetsApi.updateBudgetPeriod(budgetPeriod.id, { budgets: lines })
      void refreshBudgets()
      void refreshSpend()
    } catch (e) {
      handleError(e)
    }
  }

  async function addBudgetSubcategory(group: string, name: string): Promise<string | null> {
    try {
      const row = await budgetSubcategoriesApi.createBudgetSubcategory(family.id, {
        group,
        name,
      })
      await refreshSubcategories()
      return row.id
    } catch (e) {
      handleError(e)
      return null
    }
  }

  async function renameBudgetSubcategory(subcategoryId: string, name: string): Promise<boolean> {
    try {
      await budgetSubcategoriesApi.updateBudgetSubcategory(subcategoryId, { name })
      await refreshSubcategories()
      void refreshBudgets()
      void refreshSpend()
      return true
    } catch (e) {
      handleError(e)
      return false
    }
  }

  async function removeBudgetLine(budgetId: string, name: string) {
    try {
      await budgetsApi.deleteBudget(budgetId)
      showToast(`${name} removed from this cycle`)
      void refreshBudgets()
      void refreshSpend()
    } catch (e) {
      handleError(e)
    }
  }

  async function settleBudgetLine(budgetId: string) {
    try {
      const period = await budgetsApi.settleBudget(budgetId)
      const updated = toBudgetPeriod(period)
      setBudgetPeriods((prev) =>
        sortBudgetPeriods(prev.map((p) => (p.id === updated.id ? updated : p))),
      )
      setSelectedPeriodId(updated.id)
      void refreshSpend()
    } catch (e) {
      handleError(e)
    }
  }

  async function unsettleBudgetLine(budgetId: string) {
    try {
      const period = await budgetsApi.unsettleBudget(budgetId)
      const updated = toBudgetPeriod(period)
      setBudgetPeriods((prev) =>
        sortBudgetPeriods(prev.map((p) => (p.id === updated.id ? updated : p))),
      )
      setSelectedPeriodId(updated.id)
      void refreshSpend()
    } catch (e) {
      handleError(e)
    }
  }

  async function deleteBudgetCycle(periodId: string) {
    try {
      await budgetsApi.deleteBudgetPeriod(periodId)
      showToast("Budget cycle deleted")
      await refreshBudgets()
      setSheet(null)
    } catch (e) {
      handleError(e)
    }
  }

  async function addExpense(input: ExpenseDraft) {
    try {
      await expensesApi.createExpense(family.id, {
        amount: input.amount,
        subcategory_id: input.subcategoryId,
        merchant: input.merchant,
        note: input.note,
        occurred_at: input.occurredAt,
      });
      setSheet(null);
      showToast("Expense added");
      void refreshSpend();
      void refreshBudgets();
    } catch (e) {
      handleError(e);
    }
  }

  async function updateExpense(id: string, input: ExpenseDraft) {
    try {
      await expensesApi.updateExpense(id, {
        amount: input.amount,
        subcategory_id: input.subcategoryId,
        merchant: input.merchant,
        note: input.note,
        occurred_at: input.occurredAt,
      });
      setSheet(null);
      showToast("Expense updated");
      void refreshSpend();
      void refreshBudgets();
    } catch (e) {
      handleError(e);
    }
  }

  async function deleteExpense(id: string) {
    try {
      await expensesApi.deleteExpense(id);
      setSheet(null);
      showToast("Expense deleted");
      void refreshSpend();
      void refreshBudgets();
    } catch (e) {
      handleError(e);
    }
  }

  async function createPersonalAccount(name: string) {
    try {
      const row = await personalAccountsApi.createAccount({
        name,
        timezone: family.timezone,
      });
      setSheet(null);
      showToast("Account created");
      handleSelectPersonalAccount(row.id);
      await refreshPersonalSummary(row.id);
    } catch (e) {
      handleError(e);
    }
  }

  async function updatePersonalAccount(accountId: string, name: string) {
    try {
      await personalAccountsApi.updateAccount(accountId, { name });
      setSheet(null);
      showToast("Account updated");
      await refreshPersonalSummary(accountId);
    } catch (e) {
      handleError(e);
    }
  }

  async function deletePersonalAccount(accountId: string) {
    try {
      await personalAccountsApi.deleteAccount(accountId);
      setSheet(null);
      showToast("Account deleted");
      if (session.user && selectedPersonalAccountId === accountId) {
        localStorage.removeItem(personalAccountStorageKey(session.user.id));
      }
      await refreshPersonalSummary();
    } catch (e) {
      handleError(e);
    }
  }

  async function addPersonalExpense(input: PersonalExpenseDraft) {
    if (!selectedPersonalAccountId) {
      showToast("Create an account first", "error");
      return;
    }
    try {
      await personalExpensesApi.createPersonalExpense(selectedPersonalAccountId, {
        amount: input.amount,
        category: input.category,
        merchant: input.merchant,
        note: input.note,
        occurred_at: input.occurredAt,
      });
      setSheet(null);
      showToast("Expense added");
      await refreshPersonalSummary(selectedPersonalAccountId);
    } catch (e) {
      handleError(e);
    }
  }

  async function updatePersonalExpenseRow(id: string, input: PersonalExpenseDraft) {
    try {
      await personalExpensesApi.updatePersonalExpense(id, {
        amount: input.amount,
        category: input.category,
        merchant: input.merchant,
        note: input.note,
        occurred_at: input.occurredAt,
      });
      setSheet(null);
      showToast("Expense updated");
      await refreshPersonalSummary(selectedPersonalAccountId ?? undefined);
    } catch (e) {
      handleError(e);
    }
  }

  async function deletePersonalExpenseRow(id: string) {
    try {
      await personalExpensesApi.deletePersonalExpense(id);
      setSheet(null);
      showToast("Expense deleted");
      await refreshPersonalSummary(selectedPersonalAccountId ?? undefined);
    } catch (e) {
      handleError(e);
    }
  }

  function handleReceiptConfirmed() {
    setSheet(null);
    showToast("Expense added from receipt");
    void refreshSpend();
    void refreshBudgets();
    void shoppingSessionsApi
      .listSessions(family.id, { limit: 20 })
      .then((history) => setSessionHistory(history.map(toShoppingSession)))
      .catch(() => {
        /* keep last known trips */
      });
  }

  async function loadSessionDetail(
    sessionId: string,
  ): Promise<ShoppingSession | null> {
    try {
      const detail = await shoppingSessionsApi.getSession(sessionId);
      return toShoppingSession(detail);
    } catch (e) {
      handleError(e);
      return null;
    }
  }

  async function reorderSession(
    sessionId: string,
  ): Promise<ShoppingSession | null> {
    try {
      const result = await shoppingSessionsApi.reorderSession(
        family.id,
        sessionId,
      );
      const session = toShoppingSession(result);
      setActiveSession(session);
      return session;
    } catch (e) {
      handleError(e);
      return null;
    }
  }

  function replaceActiveSessionItem(
    sessionItemId: string,
    update: (item: ShoppingSessionItem) => ShoppingSessionItem,
  ) {
    setActiveSession((current) =>
      current?.items
        ? {
            ...current,
            items: current.items.map((i) =>
              i.id === sessionItemId ? update(i) : i,
            ),
          }
        : current,
    );
  }

  async function flushListEdit(
    id: string,
    patch: ShoppingItemPatch,
    snapshot: ShoppingItem,
  ) {
    try {
      const updated = await shoppingApi.updateShoppingItem(
        id,
        shoppingPatchToApi(patch),
      );
      const ui = toShoppingItem(updated);
      setShopping((its) => its.map((i) => (i.id === id ? ui : i)));
    } catch (e) {
      setShopping((its) => its.map((i) => (i.id === id ? snapshot : i)));
      handleError(e);
    }
  }

  async function flushBasketEdit(
    sessionItemId: string,
    patch: ShoppingItemPatch,
    snapshot: ShoppingSessionItem,
  ) {
    try {
      const updated = await shoppingSessionsApi.updateSessionItem(
        sessionItemId,
        shoppingPatchToApi(patch),
      );
      const ui = toShoppingSessionItem(updated);
      replaceActiveSessionItem(sessionItemId, () => ui);
    } catch (e) {
      replaceActiveSessionItem(sessionItemId, () => snapshot);
      handleError(e);
    }
  }

  function updateShoppingItem(id: string, patch: ShoppingItemPatch) {
    const pending = pendingListEdits.current.get(id);
    const snapshot = pending?.snapshot ?? shopping.find((i) => i.id === id);
    if (!snapshot) return;
    if (pending) window.clearTimeout(pending.timer);

    setShopping((its) => its.map((i) => (i.id === id ? { ...i, ...patch } : i)));

    const merged = { ...pending?.patch, ...patch };
    const timer = window.setTimeout(() => {
      pendingListEdits.current.delete(id);
      void flushListEdit(id, merged, snapshot);
    }, ITEM_EDIT_DEBOUNCE_MS);
    pendingListEdits.current.set(id, { timer, patch: merged, snapshot });
  }

  function updateBasketItem(sessionItemId: string, patch: ShoppingItemPatch) {
    const pending = pendingBasketEdits.current.get(sessionItemId);
    const snapshot =
      pending?.snapshot ??
      activeSession?.items?.find((i) => i.id === sessionItemId);
    if (!snapshot) return;
    if (pending) window.clearTimeout(pending.timer);

    // A new store id makes the denormalized name stale; the list of known
    // locations covers the label until the response comes back.
    replaceActiveSessionItem(sessionItemId, (item) => ({
      ...item,
      ...patch,
      ...(patch.locationId !== undefined && { locationName: null }),
    }));

    const merged = { ...pending?.patch, ...patch };
    const timer = window.setTimeout(() => {
      pendingBasketEdits.current.delete(sessionItemId);
      void flushBasketEdit(sessionItemId, merged, snapshot);
    }, ITEM_EDIT_DEBOUNCE_MS);
    pendingBasketEdits.current.set(sessionItemId, {
      timer,
      patch: merged,
      snapshot,
    });
  }

  async function addShoppingItem(
    item: Omit<ShoppingItem, "id" | "completed" | "addedById">,
  ) {
    let listId = shoppingListId;
    try {
      if (!listId) {
        const lists = await shoppingApi.listShoppingLists(family.id);
        const groceries =
          lists.find((l) => l.name.toLowerCase() === "groceries") ?? lists[0];
        if (groceries) {
          listId = groceries.id;
          setShoppingListId(listId);
        } else {
          const created = await shoppingApi.createShoppingList(
            family.id,
            "Groceries",
          );
          listId = created.id;
          setShoppingListId(listId);
        }
      }
      const created = await shoppingApi.createShoppingItem(listId!, {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        location_id: item.locationId ?? null,
      });
      setShopping((its) => {
        if (its.some((i) => i.id === created.id)) return its;
        return [...its, toShoppingItem(created)];
      });
      showToast("Item added");
    } catch (e) {
      handleError(e);
    }
  }

  async function deleteShoppingItem(id: string) {
    try {
      await shoppingApi.deleteShoppingItem(id);
      setShopping((its) => its.filter((i) => i.id !== id));
      showToast("Item removed");
    } catch (e) {
      handleError(e);
    }
  }

  async function addShoppingLocation(
    name: string,
  ): Promise<ShoppingLocation | null> {
    try {
      const created = await shoppingLocationsApi.createShoppingLocation(
        family.id,
        name,
      );
      const ui = toShoppingLocation(created);
      setShoppingLocations((locs) => {
        if (locs.some((l) => l.id === ui.id)) return locs;
        return [...locs, ui].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        );
      });
      return ui;
    } catch (e) {
      handleError(e);
      return null;
    }
  }

  async function addEvent(event: Omit<CalendarEvent, "id">) {
    try {
      const starts = localDateTimeToIso(event.date, event.startTime, timeZone);
      const ends = event.endTime
        ? localDateTimeToIso(event.date, event.endTime, timeZone)
        : null;
      const created = await eventsApi.createEvent(family.id, {
        title: event.title,
        location: event.location ?? null,
        starts_at: starts,
        ends_at: ends,
        member_ids: event.memberId ? [event.memberId] : [],
      });
      setEvents((es) => {
        const ui = toCalendarEvent(created, timeZone);
        // Realtime may already have applied event.created; avoid a duplicate row.
        if (es.some((e) => e.id === ui.id)) {
          return es.map((e) => (e.id === ui.id ? ui : e));
        }
        return [...es, ui];
      });
      setSheet(null);
      showToast("Event created");
    } catch (e) {
      handleError(e);
    }
  }

  async function deleteEvent(id: string) {
    try {
      await eventsApi.deleteEvent(id);
      setEvents((es) => es.filter((e) => e.id !== id));
      setSheet(null);
      showToast("Event deleted");
    } catch (e) {
      handleError(e);
    }
  }

  async function markNotificationRead(id: string) {
    try {
      await notificationsApi.markNotificationRead(id);
      setNotifs((ns) =>
        ns.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (e) {
      handleError(e);
    }
  }

  async function markAllNotificationsRead() {
    try {
      await notificationsApi.markAllNotificationsRead();
      setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
    } catch (e) {
      handleError(e);
    }
  }

  async function renameFamily(name: string) {
    try {
      const updated = await familiesApi.updateFamily(family.id, { name });
      setFamilyName(updated.name);
      await session.refreshFamily();
      showToast("Family name updated");
    } catch (e) {
      handleError(e);
    }
  }

  async function removeFamilyMember(memberId: string) {
    try {
      await familiesApi.removeMember(family.id, memberId);
      await session.refreshFamily();
      showToast("Member removed");
    } catch (e) {
      handleError(e);
    }
  }

  async function leaveFamily() {
    try {
      await session.leaveCurrentFamily();
    } catch (e) {
      handleError(e);
    }
  }

  async function deleteFamily() {
    try {
      await session.deleteCurrentFamily();
    } catch (e) {
      handleError(e);
    }
  }

  async function inviteMember(
    email: string,
  ): Promise<{ invite_url: string; invite_token: string } | null> {
    try {
      const inv = await familiesApi.createInvitation(family.id, {
        email: email || undefined,
      });
      showToast("Invite link ready");
      return { invite_url: inv.invite_url, invite_token: inv.invite_token };
    } catch (e) {
      handleError(e);
      return null;
    }
  }

  const headerBackScreen: Screen =
    screen === "budgetActivity"
      ? "budgetSpend"
      : screen === "personalActivity"
        ? "personal"
        : "dashboard";

  const handlers = {
    navigate: navigateToScreen,
    openSheet: setSheet,
    completeTask: (id: string) => {
      void completeTask(id);
    },
    addToBasket: (id: string) => addToBasket(id),
    removeFromBasket: (sessionItemId: string) => {
      void removeFromBasket(sessionItemId);
    },
    completeShoppingSession: (totalCost: number) => {
      void completeShoppingSession(totalCost);
    },
    markNotificationRead: (id: string) => {
      void markNotificationRead(id);
    },
    markAllNotificationsRead: () => {
      void markAllNotificationsRead();
    },
    addTask: (task: Omit<Task, "id" | "completed">) => {
      void addTask(task);
    },
    addEvent: (event: Omit<CalendarEvent, "id">) => {
      void addEvent(event);
    },
    addShoppingItem: (
      item: Omit<ShoppingItem, "id" | "completed" | "addedById">,
    ) => {
      void addShoppingItem(item);
    },
    updateShoppingItem,
    updateBasketItem,
    deleteShoppingItem: (id: string) => {
      void deleteShoppingItem(id);
    },
    deleteTask: (id: string) => {
      void deleteTask(id);
    },
    deleteEvent: (id: string) => {
      void deleteEvent(id);
    },
    updateTask: (id: string, patch: TaskUpdatePatch) => {
      void updateTask(id, patch);
    },
    addExpense: (input: ExpenseDraft) => {
      void addExpense(input);
    },
    updateExpense: (id: string, input: ExpenseDraft) => {
      void updateExpense(id, input);
    },
    deleteExpense: (id: string) => {
      void deleteExpense(id);
    },
    onReceiptConfirmed: () => {
      handleReceiptConfirmed();
    },
  };

  if (loading) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: t.bg,
          color: t.textSec,
          fontFamily: "var(--ds-font)",
        }}
      >
        Loading your family…
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: t.bg,
        overflow: "hidden",
      }}
    >
      {isOffline && <OfflineBanner />}

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div className="hide-mobile" style={{ alignSelf: "stretch" }}>
          <DesktopSidebar
            screen={screen}
            familyName={familyName}
            unreadCount={unreadCount}
            currentUser={currentUser}
            userName={session.user?.name}
            onNavigate={navigateToScreen}
          />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <AppHeader
            screen={screen}
            familyName={familyName}
            unreadCount={unreadCount}
            currentUser={currentUser}
            onNavigate={navigateToScreen}
            onBack={() => navigateToScreen(headerBackScreen)}
          />

          <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
            {screen === "dashboard" && (
              <Dashboard
                events={events}
                tasks={tasks}
                shopping={shopping}
                activeSession={activeSession}
                currentPeriod={
                  budgetPeriods.find((p) => cycleStatus(p, today) === "current") ?? null
                }
                periods={budgetPeriods}
                memberName={dashGreeting}
                currentMemberId={currentUser?.id}
                dateLabel={dashDateLabel}
                today={today}
                onOpenSpend={handleOpenSpend}
                onOpenPersonal={() => navigateToScreen("personal")}
                personalSummary={personalSummary}
                {...handlers}
              />
            )}
            {screen === "calendar" && (
              <CalendarScreen
                events={events}
                members={members}
                today={today}
                {...handlers}
              />
            )}
            {screen === "tasks" && (
              <TasksScreen
                tasks={tasks}
                members={members}
                today={today}
                currentMemberId={currentUser?.id}
                {...handlers}
              />
            )}
            {screen === "shopping" && (
              <ShoppingScreen
                shopping={shopping}
                locations={shoppingLocations}
                members={members}
                activeSession={activeSession}
                sessionHistory={sessionHistory}
                loadSessionDetail={loadSessionDetail}
                {...handlers}
                reorderSession={reorderSession}
              />
            )}
            {screen === "budgetActivity" && (
              <ExpenseActivityScreen
                period={budgetPeriod}
                periods={budgetPeriods}
                selectedPeriodId={selectedPeriodId}
                loadPeriodExpenses={loadPeriodExpenses}
                onSelectPeriod={setSelectedPeriodId}
                onSelectPersonal={() => navigateToScreen("personal")}
                onOpenCycleList={() => setSheet({ type: 'cycleList' })}
                {...handlers}
              />
            )}
            {(screen === "personal" || screen === "personalActivity") && (
              screen === "personalActivity" ? (
                <PersonalActivityScreen
                  summary={personalSummary}
                  selectedAccountId={selectedPersonalAccountId}
                  selectedMonth={selectedPersonalMonth}
                  todayMonth={personalSummary?.currentMonth ?? today.slice(0, 7)}
                  loadMonthExpenses={loadPersonalMonthExpenses}
                  onSelectAccount={handleSelectPersonalAccount}
                  onSelectMonth={setSelectedPersonalMonth}
                  onSelectFamily={() => navigateToScreen("budgetSpend")}
                  {...handlers}
                />
              ) : (
                <PersonalExpensesScreen
                  summary={personalSummary}
                  selectedAccountId={selectedPersonalAccountId}
                  selectedMonth={selectedPersonalMonth}
                  todayMonth={personalSummary?.currentMonth ?? today.slice(0, 7)}
                  loading={loading}
                  loadMonthExpenses={loadPersonalMonthExpenses}
                  onSelectAccount={handleSelectPersonalAccount}
                  onSelectMonth={setSelectedPersonalMonth}
                  onSelectFamily={() => navigateToScreen("budgetSpend")}
                  {...handlers}
                />
              )
            )}
            {budgetTab && (
              <BudgetScreen
                tab={budgetTab}
                onSelectTab={(next) => navigateToScreen(BUDGET_TAB_SCREENS[next])}
                period={budgetPeriod}
                periods={budgetPeriods}
                selectedPeriodId={selectedPeriodId}
                today={today}
                subcategoryGroups={subcategoryGroups}
                loadPeriodExpenses={loadPeriodExpenses}
                loading={loading}
                onSelectPeriod={setSelectedPeriodId}
                onOpenCycleList={() => setSheet({ type: 'cycleList' })}
                onCreateCycle={() => setSheet({ type: 'cycleDates', mode: 'create' })}
                onCopyCycle={() => setSheet({ type: 'cycleDates', mode: 'copy' })}
                onEditDates={() => setSheet({ type: 'cycleDates', mode: 'current' })}
                onUpdateExpected={updateBudgetExpected}
                onAddLine={addBudgetLine}
                onAddSubcategory={addBudgetSubcategory}
                onRenameSubcategory={renameBudgetSubcategory}
                onRemoveLine={removeBudgetLine}
                onSettle={settleBudgetLine}
                onUnsettle={unsettleBudgetLine}
                onSelectPersonal={() => navigateToScreen("personal")}
                {...handlers}
              />
            )}
            {screen === "notifications" && (
              <NotificationsScreen notifications={notifs} {...handlers} />
            )}
            {screen === "family" && (
              <FamilyScreen
                members={members}
                familyName={familyName}
                currentMemberId={currentUser?.id}
                currentMemberRole={currentUser?.role}
                onRename={renameFamily}
                onRemoveMember={removeFamilyMember}
                onLeaveFamily={leaveFamily}
                onDeleteFamily={deleteFamily}
                onSignOut={session.logout}
                {...handlers}
              />
            )}
            {screen === "settings" && (
              <SettingsScreen
                navigate={navigateToScreen}
                user={session.user}
                currentMember={currentUser}
                familyName={familyName}
                isOwner={currentUser?.role === "admin"}
                onSignOut={session.logout}
                onLeaveFamily={leaveFamily}
                onDeleteFamily={deleteFamily}
              />
            )}
          </main>

          <div className="hide-desktop" style={{ width: '100%' }}>
            <MobileBottomNav screen={screen} onNavigate={navigateToScreen} />
          </div>
        </div>
      </div>

      {sheet?.type === "addEvent" && (
        <AddEventSheet
          onClose={() => setSheet(null)}
          onAdd={handlers.addEvent}
          members={members}
          today={today}
          defaultMemberId={currentUser?.id ?? ""}
        />
      )}
      {sheet?.type === "addTask" && (
        <AddTaskSheet
          onClose={() => setSheet(null)}
          onAdd={handlers.addTask}
          members={members}
          defaultMemberId={currentUser?.id ?? ""}
        />
      )}
      {sheet?.type === "addShoppingItem" && (
        <ShoppingItemSheet
          mode="add"
          locations={shoppingLocations}
          onClose={() => setSheet(null)}
          onSubmit={handlers.addShoppingItem}
          onCreateLocation={addShoppingLocation}
        />
      )}
      {sheet?.type === "editShoppingItem" && (
        <ShoppingItemSheet
          mode="list"
          item={shopping.find((i) => i.id === sheet.itemId)}
          locations={shoppingLocations}
          onClose={() => setSheet(null)}
          onSubmit={(draft) => {
            handlers.updateShoppingItem(sheet.itemId, draft);
            setSheet(null);
          }}
          onCreateLocation={addShoppingLocation}
          onDelete={() => {
            handlers.deleteShoppingItem(sheet.itemId);
            setSheet(null);
          }}
          onVanished={() => {
            setSheet(null);
            showToast("That item is no longer on the list", "error");
          }}
        />
      )}
      {sheet?.type === "editBasketItem" && (
        <ShoppingItemSheet
          mode="basket"
          item={activeSession?.items?.find(
            (i) => i.id === sheet.sessionItemId,
          )}
          locations={shoppingLocations}
          onClose={() => setSheet(null)}
          onSubmit={(draft) => {
            handlers.updateBasketItem(sheet.sessionItemId, draft);
            setSheet(null);
          }}
          onCreateLocation={addShoppingLocation}
          onReturnToList={() => {
            handlers.removeFromBasket(sheet.sessionItemId);
            setSheet(null);
          }}
          onVanished={() => {
            setSheet(null);
            showToast("That item is no longer in the basket", "error");
          }}
        />
      )}
      {sheet?.type === "completeShopping" && (
        <CompleteShoppingSheet
          onClose={() => setSheet(null)}
          onComplete={handlers.completeShoppingSession}
          itemCount={activeSession?.itemCount ?? 0}
        />
      )}
      {sheet?.type === "addExpense" && (
        <ExpenseSheet
          today={today}
          subcategoryGroups={subcategoryGroups}
          onClose={() => setSheet(null)}
          onSave={handlers.addExpense}
          onScanReceipt={() => setSheet({ type: "scanReceipt" })}
        />
      )}
      {sheet?.type === "chooseExpenseEntry" && (
        <ExpenseEntryChooser
          onClose={() => setSheet(null)}
          onScan={() => setSheet({ type: "scanReceipt" })}
          onManual={() => setSheet({ type: "addExpense" })}
        />
      )}
      {sheet?.type === "scanReceipt" && (
        <ReceiptScanSheet
          familyId={family.id}
          today={today}
          subcategoryGroups={subcategoryGroups}
          onClose={() => setSheet(null)}
          onConfirmed={handlers.onReceiptConfirmed}
          onEnterManually={() => setSheet({ type: "addExpense" })}
        />
      )}
      {sheet?.type === "editExpense" && (
        <ExpenseSheet
          expense={sheet.expense}
          today={today}
          subcategoryGroups={subcategoryGroups}
          onClose={() => setSheet(null)}
          onSave={(input) => handlers.updateExpense(sheet.expense.id, input)}
          onDelete={handlers.deleteExpense}
        />
      )}
      {sheet?.type === "addPersonalExpense" && (
        <PersonalExpenseSheet
          today={today}
          onClose={() => setSheet(null)}
          onSave={(input) => void addPersonalExpense(input)}
        />
      )}
      {sheet?.type === "editPersonalExpense" && (
        <PersonalExpenseSheet
          expense={sheet.expense}
          today={today}
          onClose={() => setSheet(null)}
          onSave={(input) => void updatePersonalExpenseRow(sheet.expense.id, input)}
          onDelete={(id) => void deletePersonalExpenseRow(id)}
        />
      )}
      {sheet?.type === "createPersonalAccount" && (
        <PersonalAccountSheet
          onClose={() => setSheet(null)}
          onSave={(name) => void createPersonalAccount(name)}
        />
      )}
      {sheet?.type === "editPersonalAccount" && (
        <PersonalAccountSheet
          account={sheet.account}
          onClose={() => setSheet(null)}
          onSave={(name) => void updatePersonalAccount(sheet.account.id, name)}
          onDelete={(id) => void deletePersonalAccount(id)}
        />
      )}
      {sheet?.type === "cycleDates" && (
        <CycleDatesSheet
          period={budgetPeriod}
          periods={budgetPeriods}
          mode={sheet.mode ?? 'create'}
          onClose={() => setSheet(null)}
          onSave={saveCycleDates}
        />
      )}
      {sheet?.type === "cycleList" && (
        <CycleListSheet
          periods={budgetPeriods}
          selectedPeriodId={selectedPeriodId}
          today={today}
          highlightRange={sheet.highlightRange}
          onClose={() => setSheet(null)}
          onSelect={(id) => {
            setSelectedPeriodId(id)
            setSheet(null)
          }}
          onEditDates={(id) => {
            setSelectedPeriodId(id)
            setSheet({ type: 'cycleDates', mode: 'current' })
          }}
          onDelete={deleteBudgetCycle}
        />
      )}
      {sheet?.type === "eventDetail" && (
        <EventDetailSheet
          event={events.find((e) => e.id === sheet.eventId)}
          onClose={() => setSheet(null)}
          onDelete={handlers.deleteEvent}
          today={today}
        />
      )}
      {sheet?.type === "taskDetail" && (
        <TaskDetailSheet
          task={tasks.find((tk) => tk.id === sheet.taskId)}
          members={members}
          today={today}
          timeZone={timeZone}
          onClose={() => setSheet(null)}
          onUpdate={(id, patch) => {
            void updateTask(id, patch);
          }}
          onComplete={handlers.completeTask}
          onDelete={handlers.deleteTask}
        />
      )}
      {sheet?.type === "inviteMember" && (
        <InviteMemberSheet
          familyName={familyName}
          onClose={() => setSheet(null)}
          onInvite={async (email) => {
            const result = await inviteMember(email);
            if (result && email) setSheet(null);
            return result;
          }}
        />
      )}

      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

function AddEventSheet({
  onClose,
  onAdd,
  members,
  today,
  defaultMemberId,
}: {
  onClose: () => void;
  onAdd: (e: Omit<CalendarEvent, "id">) => void;
  members: Member[];
  today: string;
  defaultMemberId: string;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [startTime, setStart] = useState("09:00");
  const [endTime, setEnd] = useState("10:00");
  const [memberId, setMember] = useState(defaultMemberId);
  const [location, setLocation] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      date,
      startTime,
      endTime,
      memberId,
      location: location || undefined,
    });
  };

  return (
    <BottomSheet title="New Event" onClose={onClose}>
      <FormField label="Title">
        <Input
          placeholder="What's happening?"
          value={title}
          onChange={setTitle}
          autoFocus
        />
      </FormField>
      <FormField label="Date">
        <Input type="date" value={date} onChange={setDate} />
      </FormField>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <FormField label="Start time">
          <Input type="time" value={startTime} onChange={setStart} />
        </FormField>
        <FormField label="End time">
          <Input type="time" value={endTime} onChange={setEnd} />
        </FormField>
      </div>
      <FormField label="Who">
        <Select
          value={memberId}
          onChange={setMember}
          options={members.map((m) => ({ value: m.id, label: m.name }))}
        />
      </FormField>
      <FormField label="Location (optional)">
        <Input
          placeholder="Add location"
          value={location}
          onChange={setLocation}
        />
      </FormField>
      <PrimaryButton onClick={submit} fullWidth disabled={!title.trim()}>
        Create Event
      </PrimaryButton>
    </BottomSheet>
  );
}

function AddTaskSheet({
  onClose,
  onAdd,
  members,
  defaultMemberId,
}: {
  onClose: () => void;
  onAdd: (tk: Omit<Task, "id" | "completed">) => void;
  members: Member[];
  defaultMemberId: string;
}) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssignee] = useState(defaultMemberId);
  const [dueDate, setDue] = useState<"today" | "tomorrow">("today");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [category, setCategory] = useState<string>(TASK_CATEGORIES[0]);
  const [recurring, setRecurring] = useState(false);

  const submit = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      assigneeId,
      dueDate,
      priority,
      recurring,
      category,
      description: null,
      dueAt: null,
    });
  };

  return (
    <BottomSheet title="New Task" onClose={onClose}>
      <FormField label="What needs doing?">
        <Input
          placeholder="Add a task…"
          value={title}
          onChange={setTitle}
          autoFocus
        />
      </FormField>
      <FormField label="Assign to">
        <Select
          value={assigneeId}
          onChange={setAssignee}
          options={members.map((m) => ({ value: m.id, label: m.name }))}
        />
      </FormField>
      <FormField label="Due">
        <SegmentedControl
          options={["today", "tomorrow"]}
          value={dueDate}
          onChange={(v) => setDue(v as "today" | "tomorrow")}
        />
      </FormField>
      <FormField label="Priority">
        <SegmentedControl
          options={["Low", "Medium", "High"]}
          value={
            priority === "high" ? "High" : priority === "low" ? "Low" : "Medium"
          }
          onChange={(v) =>
            setPriority(v.toLowerCase() as "high" | "medium" | "low")
          }
        />
      </FormField>
      <FormField label="Category">
        <CategorySelect value={category} onChange={setCategory} />
      </FormField>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          padding: "12px 0",
          borderTop: `1px solid ${t.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Repeat size={16} color={t.textSec} />
          <span style={{ fontSize: 14, color: t.text }}>Recurring task</span>
        </div>
        <button
          onClick={() => setRecurring((v) => !v)}
          style={{
            width: 44,
            height: 26,
            borderRadius: 9999,
            border: "none",
            background: recurring ? t.primary : t.border,
            cursor: "pointer",
            position: "relative",
            transition: "background 0.2s",
            padding: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 3,
              left: recurring ? 21 : 3,
              width: 20,
              height: 20,
              borderRadius: 9999,
              background: t.toggleKnob,
              boxShadow: "var(--ds-shadow-low)",
              transition: "left 0.2s",
            }}
          />
        </button>
      </div>
      <PrimaryButton onClick={submit} fullWidth disabled={!title.trim()}>
        Create Task
      </PrimaryButton>
    </BottomSheet>
  );
}

function CompleteShoppingSheet({
  onClose,
  onComplete,
  itemCount,
}: {
  onClose: () => void;
  onComplete: (totalCost: number) => void;
  itemCount: number;
}) {
  const [cost, setCost] = useState("");

  const parsed = Number.parseFloat(cost.replace(",", "."));
  const valid = Number.isFinite(parsed) && parsed > 0;

  const submit = () => {
    if (!valid) return;
    onComplete(parsed);
  };

  return (
    <BottomSheet title="Complete shopping" onClose={onClose}>
      <p style={{ fontSize: 14, color: t.textSec, marginBottom: 16 }}>
        {itemCount} item{itemCount !== 1 ? "s" : ""} in your basket
      </p>
      <FormField label="Total cost (€)">
        <Input
          placeholder="0.00"
          value={cost}
          onChange={setCost}
          autoFocus
          inputMode="decimal"
        />
      </FormField>
      <PrimaryButton onClick={submit} fullWidth disabled={!valid}>
        Complete shopping
      </PrimaryButton>
    </BottomSheet>
  );
}

function EventDetailSheet({
  event,
  onClose,
  onDelete,
  today,
}: {
  event: CalendarEvent | undefined;
  onClose: () => void;
  onDelete: (id: string) => void;
  today: string;
}) {
  if (!event) return null;
  const member = getMember(event.memberId);
  return (
    <BottomSheet title="Event" onClose={onClose}>
      <div
        style={{
          marginBottom: 4,
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: 4,
            height: 32,
            borderRadius: 9999,
            background: member.color,
            flexShrink: 0,
            marginTop: 4,
          }}
        />
        <span
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: t.text,
            minWidth: 0,
            wordBreak: "break-word",
          }}
        >
          {event.title}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: 20,
          marginBottom: 24,
        }}
      >
        <DetailRow
          icon="📅"
          label={formatDate(event.date, today, addDays(today, 1))}
        />
        <DetailRow
          icon="⏰"
          label={
            formatTime(event.startTime) +
            (event.endTime ? ` – ${formatTime(event.endTime)}` : "")
          }
        />
        <DetailRow icon="👤" label={member.name} />
        {event.location && <DetailRow icon="📍" label={event.location} />}
      </div>
      <button
        onClick={() => onDelete(event.id)}
        style={{
          width: "100%",
          padding: "12px",
          background: "var(--ds-error-subtle)",
          color: "var(--ds-error)",
          border: "none",
          borderRadius: "var(--ds-radius-md)",
          fontSize: 15,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "var(--ds-font)",
        }}
      >
        Delete Event
      </button>
    </BottomSheet>
  );
}

function DetailRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 15, color: t.text }}>{label}</span>
    </div>
  );
}

function InviteMemberSheet({
  familyName,
  onClose,
  onInvite,
}: {
  familyName: string;
  onClose: () => void;
  onInvite: (
    email: string,
  ) => Promise<{ invite_url: string; invite_token: string } | null>;
}) {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      setBusy(true);
      const result = await onInvite("");
      if (result) setLink(result.invite_url);
      setBusy(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BottomSheet title="Invite Family Member" onClose={onClose}>
      <p
        style={{
          fontSize: 14,
          color: t.textSec,
          marginBottom: 20,
          lineHeight: 1.6,
        }}
      >
        Share this link so someone can join {familyName}. They will open it,
        create an account if needed, and join your family.
      </p>
      <FormField label="Invite link">
        <div style={{ display: "flex", gap: 8 }}>
          <div
            style={{
              flex: 1,
              height: 44,
              padding: "0 12px",
              borderRadius: "var(--ds-radius-md)",
              border: `1px solid ${t.border}`,
              background: t.surfaceMuted,
              display: "flex",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: t.textSec,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {busy && !link ? "Generating…" : link || "—"}
            </span>
          </div>
          <button
            onClick={() => {
              if (!link) return;
              navigator.clipboard?.writeText(link);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
            style={{
              padding: "0 16px",
              height: 44,
              borderRadius: "var(--ds-radius-md)",
              border: `1px solid ${t.borderStrong}`,
              background: t.surface,
              fontSize: 13,
              fontWeight: 500,
              color: t.text,
              cursor: "pointer",
              fontFamily: "var(--ds-font)",
              flexShrink: 0,
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </FormField>
      <div
        style={{ position: "relative", textAlign: "center", margin: "16px 0" }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 1,
            background: t.border,
          }}
        />
        <span
          style={{
            position: "relative",
            background: t.surface,
            padding: "0 12px",
            fontSize: 12,
            color: t.textTer,
          }}
        >
          optional
        </span>
      </div>
      <FormField label="Email (optional — delivery not enabled yet)">
        <Input
          placeholder="name@email.com"
          value={email}
          onChange={setEmail}
          type="email"
        />
      </FormField>
      <p
        style={{
          fontSize: 12,
          color: t.textTer,
          marginTop: -8,
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        Saving an email stores it for later. Share the invite link above for
        now.
      </p>
      <PrimaryButton
        onClick={() => {
          void (async () => {
            const result = await onInvite(email);
            if (result) setLink(result.invite_url);
          })();
        }}
        fullWidth
        disabled={!email.includes("@") || busy}
      >
        Create invite with email
      </PrimaryButton>
    </BottomSheet>
  );
}
