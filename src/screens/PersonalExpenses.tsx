import { useNavigate } from "react-router-dom";
import { ArrowRight, Plus, Wallet } from "lucide-react";
import type {
  AppHandlers,
  PersonalAccountSummary,
  PersonalExpense,
  PersonalExpenseAccount,
} from "../types";
import {
  t,
  r,
  EmptyState,
  SectionLabel,
  Skeleton,
  FAB,
  ExpenseCategoryIcon,
  EXPENSE_CATEGORY_COLORS,
} from "../ui";
import { MonthSwitcher } from "../components/MonthSwitcher";
import { MoneyScopeSwitch } from "../components/MoneyScopeSwitch";
import { usePersonalMonthExpenses } from "../hooks/usePersonalMonthExpenses";
import {
  formatMoney,
  formatSessionDate,
  formatYearMonthTitle,
  personalExpenseTitle,
  shiftYearMonth,
} from "../api/adapters";
import { personalActivityPath } from "../routing";
import { CycleExpensesLoadError } from "../components/ErrorBoundary";

const ACTIVITY_PREVIEW_LIMIT = 5;
const SIDE_PAD = 16;
const MONTH_WINDOW = 36;

interface Props {
  summary: PersonalAccountSummary | null;
  selectedAccountId: string | null;
  selectedMonth: string;
  todayMonth: string;
  loading?: boolean;
  loadMonthExpenses: (
    accountId: string,
    month: string,
    signal?: AbortSignal,
  ) => Promise<PersonalExpense[]>;
  onSelectAccount: (accountId: string) => void;
  onSelectMonth: (month: string) => void;
  onSelectFamily: () => void;
  openSheet: AppHandlers["openSheet"];
}

export default function PersonalExpensesScreen({
  summary,
  selectedAccountId,
  selectedMonth,
  todayMonth,
  loading,
  loadMonthExpenses,
  onSelectAccount,
  onSelectMonth,
  onSelectFamily,
  openSheet,
}: Props) {
  const navigate = useNavigate();
  const accounts = summary?.accounts ?? [];
  const selected = accounts.find((row) => row.id === selectedAccountId) ?? null;
  const { entries, loadingEntries, loadError, retry } =
    usePersonalMonthExpenses(
      selected?.id ?? null,
      selected ? selectedMonth : null,
      loadMonthExpenses,
    );

  const monthTotal = entries.reduce((sum, row) => sum + row.amount, 0);
  const currency = selected?.currency ?? summary?.currency ?? "EUR";
  const minMonth = shiftYearMonth(todayMonth, -MONTH_WINDOW);
  const canGoPrev = selectedMonth > minMonth;
  const canGoNext = selectedMonth < todayMonth;
  const preview = entries.slice(0, ACTIVITY_PREVIEW_LIMIT);
  const showViewMore = entries.length > ACTIVITY_PREVIEW_LIMIT;

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    onSelectMonth(shiftYearMonth(selectedMonth, -1));
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    onSelectMonth(shiftYearMonth(selectedMonth, 1));
  };

  const handleAdd = () => {
    if (!selected) {
      openSheet({ type: "createPersonalAccount" });
      return;
    }
    openSheet({ type: "addPersonalExpense" });
  };

  const handleOpenExpense = (expense: PersonalExpense) => {
    openSheet({ type: "editPersonalExpense", expense });
  };

  const handleViewMore = () => {
    if (!selected) return;
    navigate(personalActivityPath(selected.id, selectedMonth));
  };

  const handleSelectAccount = (account: PersonalExpenseAccount) => {
    if (account.id === selectedAccountId) {
      openSheet({ type: "editPersonalAccount", account });
      return;
    }
    onSelectAccount(account.id);
  };

  return (
    <div style={{ padding: "0 0 24px" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: t.bgGlass,
          backdropFilter: "blur(12px)",
          padding: `8px ${SIDE_PAD}px 12px`,
        }}
      >
        <MoneyScopeSwitch
          scope="personal"
          onSelectFamily={onSelectFamily}
          onSelectPersonal={() => undefined}
        />
        <p style={{ fontSize: 12, color: t.textSec, margin: "0 0 10px" }}>
          Only you can see this.
        </p>
        <div
          role="tablist"
          aria-label="Personal expense accounts"
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 2,
            margin: "0 -4px",
          }}
        >
          {accounts.map((account) => {
            const active = account.id === selectedAccountId;
            return (
              <button
                key={account.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={
                  active
                    ? `${account.name}, selected. Edit account`
                    : account.name
                }
                tabIndex={0}
                onClick={() => handleSelectAccount(account)}
                style={{
                  flexShrink: 0,
                  border: `1px solid ${active ? t.primary : t.border}`,
                  background: active ? t.primarySubtle : t.surface,
                  color: active ? t.primary : t.text,
                  fontWeight: active ? 600 : 500,
                  fontSize: 13,
                  padding: "8px 12px",
                  borderRadius: r.pill,
                  cursor: "pointer",
                  fontFamily: "var(--ds-font)",
                }}
              >
                {account.name}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: `8px ${SIDE_PAD}px`,
          }}
        >
          <Skeleton h={120} />
          <Skeleton h={160} />
        </div>
      ) : accounts.length === 0 || !selected ? (
        <EmptyState
          icon={Wallet}
          title="No personal accounts yet"
          body="Track spending that isn’t household. Only you will see it."
          action="Create account"
          onAction={() => openSheet({ type: "createPersonalAccount" })}
        />
      ) : (
        <>
          <MonthSwitcher
            title={formatYearMonthTitle(selectedMonth)}
            subtitle={selected.name}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            onPrev={handlePrevMonth}
            onNext={handleNextMonth}
            prevAriaLabel="Previous month"
            nextAriaLabel="Next month"
          />

          <div
            style={{
              margin: "12px 16px 16px",
              background: t.surface,
              borderRadius: r.lg,
              border: `1px solid ${t.border}`,
              padding: "18px 16px",
            }}
          >
            <p
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: t.text,
                letterSpacing: "-0.03em",
                fontVariantNumeric: "tabular-nums",
                margin: 0,
              }}
            >
              {formatMoney(monthTotal, currency)}
            </p>
            <p style={{ fontSize: 13, color: t.textSec, margin: "6px 0 0" }}>
              {entries.length === 1
                ? "1 expense"
                : `${entries.length} expenses`}{" "}
              this month
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              paddingRight: 16,
            }}
          >
            <SectionLabel>Activity</SectionLabel>
            {showViewMore && (
              <button
                type="button"
                onClick={handleViewMore}
                aria-label="View more expenses"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  color: t.primary,
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "4px 0",
                  fontFamily: "var(--ds-font)",
                  flexShrink: 0,
                }}
              >
                View more <ArrowRight size={13} />
              </button>
            )}
          </div>

          <div
            style={{
              margin: "0 16px",
              background: t.surface,
              borderRadius: r.lg,
              border: `1px solid ${t.border}`,
              overflow: "hidden",
              minHeight: 56,
            }}
          >
            {loadingEntries ? (
              <div
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <Skeleton h={16} />
                <Skeleton h={16} w="70%" />
              </div>
            ) : entries.length === 0 ? (
              <>
                <div style={{ padding: "20px 16px" }}>
                  <p style={{ fontSize: 14, color: t.textTer, margin: 0 }}>
                    No expenses this month.
                  </p>
                </div>
                {loadError && <CycleExpensesLoadError onRetry={retry} />}
              </>
            ) : (
              <>
                {preview.map((expense, i) => (
                  <PersonalExpenseRow
                    key={expense.id}
                    expense={expense}
                    showBorder={i > 0}
                    onOpen={handleOpenExpense}
                  />
                ))}
                {loadError && <CycleExpensesLoadError onRetry={retry} />}
              </>
            )}
          </div>
        </>
      )}

      <FAB
        onClick={handleAdd}
        aria-label={selected ? "Add expense" : "Create account"}
      >
        <Plus size={24} color={t.onPrimary} />
      </FAB>
    </div>
  );
}

const PersonalExpenseRow = ({
  expense,
  showBorder,
  onOpen,
}: {
  expense: PersonalExpense;
  showBorder: boolean;
  onOpen: (expense: PersonalExpense) => void;
}) => {
  const title = personalExpenseTitle(expense);
  return (
    <button
      type="button"
      onClick={() => onOpen(expense)}
      aria-label={`Edit ${title}`}
      style={{
        width: "100%",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        border: "none",
        borderTop: showBorder ? `1px solid ${t.border}` : "none",
        background: "none",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--ds-font)",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: t.surfaceMuted,
            color: EXPENSE_CATEGORY_COLORS[expense.category] ?? t.textSec,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ExpenseCategoryIcon category={expense.category} size={16} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, color: t.text, fontWeight: 500 }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: t.textTer, marginTop: 2 }}>
            {formatSessionDate(expense.occurredAt)} · {expense.category}
          </div>
        </div>
      </div>
      <span
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: t.text,
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        {formatMoney(expense.amount, expense.currency)}
      </span>
    </button>
  );
};
