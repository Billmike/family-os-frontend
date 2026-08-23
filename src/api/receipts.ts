import { apiBlob, apiRequest, apiUpload } from './client'
import type { ExpenseOut, ReceiptConfirm, ReceiptOut } from './types'

export function uploadReceipt(familyId: string, file: File, categoryHint?: string | null) {
  const form = new FormData()
  form.append('file', file)
  if (categoryHint) {
    form.append('category_hint', categoryHint)
  }
  return apiUpload<ReceiptOut>(`/api/families/${familyId}/receipts`, form)
}

export function listReceipts(familyId: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiRequest<ReceiptOut[]>(`/api/families/${familyId}/receipts${query}`)
}

export function getReceipt(receiptId: string) {
  return apiRequest<ReceiptOut>(`/api/receipts/${receiptId}`)
}

export function confirmReceipt(receiptId: string, data: ReceiptConfirm) {
  return apiRequest<ExpenseOut>(`/api/receipts/${receiptId}/confirm`, {
    method: 'POST',
    body: data,
  })
}

export function discardReceipt(receiptId: string) {
  return apiRequest<void>(`/api/receipts/${receiptId}`, { method: 'DELETE' })
}

export function getReceiptForExpense(expenseId: string) {
  return apiRequest<ReceiptOut>(`/api/expenses/${expenseId}/receipt`)
}

export function getReceiptImage(receiptId: string) {
  return apiBlob(`/api/receipts/${receiptId}/image`)
}
