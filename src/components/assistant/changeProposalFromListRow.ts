import type { ExpenseChangeProposal, ExpenseList, ExpenseListRow } from '../../api/assistant'
import { PERSONAL_EXPENSE_CATEGORIES } from '../../types'

export const changeProposalFromListRow = (
  list: ExpenseList,
  row: ExpenseListRow,
): ExpenseChangeProposal | null => {
  if (!row.writable) return null
  const isPersonal = list.destination === 'personal'
  const categoryLabel = row.category_or_subcategory_label
  const category = (
    isPersonal
    && categoryLabel
    && (PERSONAL_EXPENSE_CATEGORIES as readonly string[]).includes(categoryLabel)
  )
    ? categoryLabel
    : null
  return {
    expense_id: row.id,
    destination: list.destination,
    account_id: isPersonal ? list.account_id : null,
    amount: row.amount,
    subcategory_id: isPersonal ? null : (row.subcategory_id ?? null),
    category,
    merchant: row.merchant,
    note: row.note ?? null,
    occurred_on: row.occurred_on,
    amount_explicit: false,
    subcategory_id_explicit: false,
    category_explicit: false,
    merchant_explicit: false,
    note_explicit: false,
    occurred_on_explicit: false,
    destination_explicit: false,
    account_id_explicit: false,
    writable: true,
  }
}
