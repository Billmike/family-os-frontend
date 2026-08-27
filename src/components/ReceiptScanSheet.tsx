import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, AlertTriangle } from 'lucide-react'
import type { BudgetSubcategoryGroup, Receipt, ReceiptConfirmDraft, ReceiptItemDraft } from '../types'
import { BottomSheet, FormField, Input, PrimaryButton, t } from '../ui'
import { dateInputFromIso, dateInputToIso, formatMoney, toReceipt } from '../api/adapters'
import * as receiptsApi from '../api/receipts'
import { ApiError } from '../api/client'
import { compressImageForUpload } from '../lib/image'
import ReceiptItemsEditor from './ReceiptItemsEditor'

/** Groups that show the full itemized editor by default. */
export const ITEMIZED_GROUPS = new Set([
  'Fixed Expense',
  'Variable Expense',
])

type Step = 'choose' | 'uploading' | 'extracting' | 'review' | 'failed'

interface Props {
  familyId: string
  today: string
  subcategoryGroups: BudgetSubcategoryGroup[]
  onClose: () => void
  onConfirmed: () => void
  onEnterManually: () => void
}

const POLL_MS = 1500
const POLL_CEILING_MS = 60_000

export default function ReceiptScanSheet({
  familyId,
  today,
  subcategoryGroups,
  onClose,
  onConfirmed,
  onEnterManually,
}: Props) {
  const groceriesId = useMemo(() => {
    for (const g of subcategoryGroups) {
      const found = g.subcategories.find(s => s.role === 'groceries')
      if (found) return found.id
    }
    return subcategoryGroups[0]?.subcategories[0]?.id ?? ''
  }, [subcategoryGroups])

  const subcategoryMeta = useMemo(() => {
    const map = new Map<string, { group: string; name: string; role: string | null }>()
    for (const g of subcategoryGroups) {
      for (const s of g.subcategories) {
        map.set(s.id, { group: g.group, name: s.name, role: s.role })
      }
    }
    return map
  }, [subcategoryGroups])

  const [step, setStep] = useState<Step>('choose')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCollapsedItems, setShowCollapsedItems] = useState(false)

  const [subcategoryId, setSubcategoryId] = useState(groceriesId)
  const [merchant, setMerchant] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [total, setTotal] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [items, setItems] = useState<ReceiptItemDraft[]>([])
  const [totalsMismatch, setTotalsMismatch] = useState(false)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const pollStartedAt = useRef<number>(0)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!subcategoryId && groceriesId) setSubcategoryId(groceriesId)
  }, [groceriesId, subcategoryId])

  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  const applyReceipt = (receipt: Receipt) => {
    setSubcategoryId(receipt.suggestedSubcategoryId ?? groceriesId)
    setMerchant(receipt.merchant ?? '')
    setDate(receipt.purchasedAt ? dateInputFromIso(receipt.purchasedAt) : today)
    setTotal(receipt.total != null ? String(receipt.total) : '')
    setCurrency(receipt.currency ?? 'EUR')
    setTotalsMismatch(receipt.totalsMismatch)
    setItems(
      receipt.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        taxCode: item.taxCode,
        isIncluded: item.isIncluded,
      })),
    )
  }

  const loadImagePreview = async (id: string) => {
    try {
      const blob = await receiptsApi.getReceiptImage(id)
      if (cancelledRef.current) return
      const url = URL.createObjectURL(blob)
      setImageUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    } catch {
      /* preview is optional */
    }
  }

  const pollUntilReady = async (id: string) => {
    pollStartedAt.current = Date.now()
    setStep('extracting')
    while (!cancelledRef.current) {
      const raw = await receiptsApi.getReceipt(id)
      const receipt = toReceipt(raw)
      if (receipt.status === 'ready') {
        applyReceipt(receipt)
        void loadImagePreview(id)
        setStep('review')
        return
      }
      if (receipt.status === 'failed') {
        setErrorMessage(receipt.errorMessage || 'Could not read this receipt')
        setStep('failed')
        return
      }
      if (Date.now() - pollStartedAt.current > POLL_CEILING_MS) {
        setErrorMessage('Extraction timed out. Try again or enter manually.')
        setStep('failed')
        return
      }
      await new Promise(resolve => setTimeout(resolve, POLL_MS))
    }
  }

  const handleFile = async (file: File | null) => {
    if (!file) return
    setErrorMessage(null)
    setStep('uploading')
    try {
      const compressed = await compressImageForUpload(file)
      const uploaded = await receiptsApi.uploadReceipt(familyId, compressed)
      const receipt = toReceipt(uploaded)
      setReceiptId(receipt.id)
      await pollUntilReady(receipt.id)
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Upload failed'
      setErrorMessage(message)
      setStep('failed')
    }
  }

  const handleDiscard = async () => {
    if (receiptId) {
      try {
        await receiptsApi.discardReceipt(receiptId)
      } catch {
        /* ignore */
      }
    }
    onClose()
  }

  const parsedTotal = Number.parseFloat(total.replace(',', '.'))
  const selectedGroup = subcategoryMeta.get(subcategoryId)?.group ?? ''
  const isItemized = ITEMIZED_GROUPS.has(selectedGroup) || subcategoryMeta.get(subcategoryId)?.role === 'groceries'
  const valid =
    Number.isFinite(parsedTotal) &&
    parsedTotal > 0 &&
    Boolean(subcategoryId) &&
    (!isItemized || items.some(item => item.isIncluded && item.name.trim()))

  const handleConfirm = async () => {
    if (!receiptId || !valid || saving) return
    setSaving(true)
    try {
      const draft: ReceiptConfirmDraft = {
        subcategoryId,
        merchant: merchant.trim() || null,
        note: note.trim() || null,
        occurredAt: dateInputToIso(date),
        currency,
        total: parsedTotal,
        items,
      }
      await receiptsApi.confirmReceipt(receiptId, {
        subcategory_id: draft.subcategoryId,
        merchant: draft.merchant,
        note: draft.note,
        occurred_at: draft.occurredAt,
        currency: draft.currency,
        total: draft.total,
        items: draft.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          tax_code: item.taxCode,
          is_included: item.isIncluded,
        })),
      })
      onConfirmed()
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not save expense'
      setErrorMessage(message)
    } finally {
      setSaving(false)
    }
  }

  const title =
    step === 'choose'
      ? 'Scan receipt'
      : step === 'uploading' || step === 'extracting'
        ? 'Reading receipt'
        : step === 'failed'
          ? 'Could not read receipt'
          : 'Review receipt'

  return (
    <BottomSheet title={title} onClose={handleDiscard}>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        aria-hidden
        onChange={e => {
          const file = e.target.files?.[0] ?? null
          e.target.value = ''
          void handleFile(file)
        }}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        aria-hidden
        onChange={e => {
          const file = e.target.files?.[0] ?? null
          e.target.value = ''
          void handleFile(file)
        }}
      />

      {step === 'choose' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 14, color: t.textSec, margin: 0 }}>
            Take a photo or choose an image. We will extract items, prices, and the total.
          </p>
          <PrimaryButton
            onClick={() => cameraInputRef.current?.click()}
            fullWidth
            aria-label="Take photo"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Camera size={18} />
              Take photo
            </span>
          </PrimaryButton>
          <button
            type="button"
            onClick={() => libraryInputRef.current?.click()}
            aria-label="Choose from library"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--ds-radius-md)',
              border: `1px solid ${t.border}`,
              background: t.surface,
              color: t.text,
              fontSize: 15,
              fontWeight: 500,
              fontFamily: 'var(--ds-font)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <ImagePlus size={18} />
            Choose from library
          </button>
        </div>
      )}

      {(step === 'uploading' || step === 'extracting') && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            padding: '24px 8px',
            color: t.textSec,
          }}
        >
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ margin: 0, fontSize: 15 }}>
            {step === 'uploading' ? 'Uploading photo…' : 'Extracting items…'}
          </p>
        </div>
      )}

      {step === 'failed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              gap: 10,
              padding: 12,
              borderRadius: 'var(--ds-radius-md)',
              background: t.errorSub,
              color: t.error,
              fontSize: 14,
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{errorMessage || 'Something went wrong'}</span>
          </div>
          <PrimaryButton
            onClick={() => {
              setErrorMessage(null)
              setStep('choose')
            }}
            fullWidth
          >
            Try again
          </PrimaryButton>
          <button
            type="button"
            onClick={onEnterManually}
            aria-label="Enter expense manually"
            style={{
              width: '100%',
              padding: '12px',
              border: 'none',
              background: 'transparent',
              color: t.primary,
              fontSize: 15,
              fontWeight: 500,
              fontFamily: 'var(--ds-font)',
              cursor: 'pointer',
            }}
          >
            Enter manually instead
          </button>
        </div>
      )}

      {step === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Uploaded receipt"
              style={{
                width: '100%',
                maxHeight: 160,
                objectFit: 'contain',
                borderRadius: 'var(--ds-radius-md)',
                background: t.surfaceMuted,
                marginBottom: 8,
              }}
            />
          )}
          {totalsMismatch && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: 10,
                marginBottom: 8,
                borderRadius: 'var(--ds-radius-md)',
                background: t.warningSub,
                color: t.warning,
                fontSize: 13,
              }}
              role="status"
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              Line items do not add up to the printed total. Please double-check.
            </div>
          )}
          {errorMessage && (
            <p style={{ color: t.error, fontSize: 13, margin: '0 0 8px' }}>{errorMessage}</p>
          )}
          <FormField label="Subcategory">
            <select
              value={subcategoryId}
              onChange={e => setSubcategoryId(e.target.value)}
              aria-label="Budget subcategory"
              style={{
                width: '100%',
                border: `1px solid ${t.border}`,
                borderRadius: 'var(--ds-radius-md)',
                padding: '10px 12px',
                fontSize: 14,
                background: t.surface,
                color: t.text,
                fontFamily: 'var(--ds-font)',
              }}
            >
              {subcategoryGroups.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.subcategories.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </FormField>
          <FormField label="Merchant">
            <Input placeholder="REWE" value={merchant} onChange={setMerchant} />
          </FormField>
          <FormField label={`Total (${currency})`}>
            <Input
              placeholder="0.00"
              value={total}
              onChange={setTotal}
              inputMode="decimal"
            />
          </FormField>
          <FormField label="Date">
            <Input type="date" value={date} onChange={setDate} />
          </FormField>
          <FormField label="Note (optional)">
            <Input placeholder="What was this for?" value={note} onChange={setNote} />
          </FormField>

          {isItemized ? (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: t.text, margin: '0 0 8px' }}>
                Line items
              </p>
              <ReceiptItemsEditor
                items={items}
                currency={currency}
                receiptTotal={Number.isFinite(parsedTotal) ? parsedTotal : 0}
                onChange={setItems}
              />
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setShowCollapsedItems(v => !v)}
                aria-expanded={showCollapsedItems}
                aria-label={showCollapsedItems ? 'Hide detected lines' : 'Show detected lines'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--ds-radius-md)',
                  border: `1px solid ${t.border}`,
                  background: t.surfaceMuted,
                  color: t.textSec,
                  fontSize: 14,
                  fontFamily: 'var(--ds-font)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {showCollapsedItems ? 'Hide' : 'Show'} {items.length} detected line
                {items.length === 1 ? '' : 's'}
              </button>
              {showCollapsedItems && (
                <div style={{ marginTop: 8 }}>
                  <ReceiptItemsEditor
                    items={items}
                    currency={currency}
                    receiptTotal={Number.isFinite(parsedTotal) ? parsedTotal : 0}
                    onChange={setItems}
                  />
                </div>
              )}
            </div>
          )}

          <PrimaryButton onClick={() => void handleConfirm()} fullWidth disabled={!valid || saving}>
            {saving
              ? 'Saving…'
              : `Save ${formatMoney(Number.isFinite(parsedTotal) ? parsedTotal : 0, currency)}`}
          </PrimaryButton>
        </div>
      )}
    </BottomSheet>
  )
}
