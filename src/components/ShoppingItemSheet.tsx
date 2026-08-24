import { useEffect, useRef, useState } from 'react'
import type { ShoppingItemDraft, ShoppingLocation } from '../types'
import { BottomSheet, FormField, Input, PrimaryButton, QuantityStepper, Select, t } from '../ui'
import { CATEGORY_ORDER } from '../data'

const NO_STORE = ''
const ADD_NEW_STORE = '__add_new__'

/**
 * `add` creates items and stays open for the next one. `list` edits a shopping
 * list item, `basket` edits an item already in the active basket.
 */
export type ShoppingItemSheetMode = 'add' | 'list' | 'basket'

interface EditableItem {
  id: string
  name: string
  category: string
  quantity: number
  locationId?: string | null
}

interface Props {
  mode: ShoppingItemSheetMode
  item?: EditableItem
  locations: ShoppingLocation[]
  onClose: () => void
  onSubmit: (draft: ShoppingItemDraft) => void
  onCreateLocation: (name: string) => Promise<ShoppingLocation | null>
  onDelete?: () => void
  onReturnToList?: () => void
  /** Fires when the edited item disappears because someone else moved it. */
  onVanished?: () => void
}

export default function ShoppingItemSheet({
  mode,
  item,
  locations,
  onClose,
  onSubmit,
  onCreateLocation,
  onDelete,
  onReturnToList,
  onVanished,
}: Props) {
  const isEdit = mode !== 'add'
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? CATEGORY_ORDER[0])
  const [locationId, setLocationId] = useState(item?.locationId ?? NO_STORE)
  const [quantity, setQuantity] = useState(item?.quantity ?? 1)
  const [addingStore, setAddingStore] = useState(false)
  const [newStoreName, setNewStoreName] = useState('')
  const [creatingStore, setCreatingStore] = useState(false)

  const onVanishedRef = useRef(onVanished)
  onVanishedRef.current = onVanished

  // Reseed only when the sheet switches to a different item, so a realtime
  // update from another family member cannot clobber in-progress edits.
  useEffect(() => {
    if (!item) return
    setName(item.name)
    setCategory(item.category)
    setLocationId(item.locationId ?? NO_STORE)
    setQuantity(item.quantity)
    setAddingStore(false)
    setNewStoreName('')
  }, [item?.id])

  useEffect(() => {
    if (isEdit && !item) onVanishedRef.current?.()
  }, [isEdit, item])

  if (isEdit && !item) return null

  const storeOptions = [
    { value: NO_STORE, label: 'None' },
    ...locations.map(l => ({ value: l.id, label: l.name })),
    { value: ADD_NEW_STORE, label: '+ Add new store…' },
  ]

  const trimmedName = name.trim()
  const dirty =
    !item ||
    trimmedName !== item.name ||
    category !== item.category ||
    (locationId || null) !== (item.locationId ?? null) ||
    quantity !== item.quantity

  const handleStoreChange = (value: string) => {
    if (value === ADD_NEW_STORE) {
      setAddingStore(true)
      setNewStoreName('')
      return
    }
    setAddingStore(false)
    setLocationId(value)
  }

  const handleSaveNewStore = async () => {
    const trimmed = newStoreName.trim()
    if (!trimmed || creatingStore) return
    setCreatingStore(true)
    try {
      const created = await onCreateLocation(trimmed)
      if (created) {
        setLocationId(created.id)
        setAddingStore(false)
        setNewStoreName('')
      }
    } finally {
      setCreatingStore(false)
    }
  }

  const handleSubmit = () => {
    if (!trimmedName) return
    onSubmit({
      name: trimmedName,
      category,
      quantity,
      locationId: locationId || null,
    })
    if (isEdit) return
    setName('')
    setQuantity(1)
  }

  return (
    <BottomSheet title={isEdit ? 'Edit Item' : 'Add Item'} onClose={onClose}>
      <FormField label="Item">
        <Input
          placeholder="What do you need?"
          value={name}
          onChange={setName}
          autoFocus={!isEdit}
        />
      </FormField>
      <FormField label="Category">
        <Select
          value={category}
          onChange={setCategory}
          options={CATEGORY_ORDER.map(c => ({ value: c, label: c }))}
        />
      </FormField>
      <FormField label="Store">
        <Select
          value={addingStore ? ADD_NEW_STORE : locationId}
          onChange={handleStoreChange}
          options={storeOptions}
        />
      </FormField>
      {addingStore && (
        <FormField label="New store name">
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input
                placeholder="e.g. JC Penney"
                value={newStoreName}
                onChange={setNewStoreName}
                autoFocus
              />
            </div>
            <PrimaryButton
              onClick={() => {
                void handleSaveNewStore()
              }}
              disabled={!newStoreName.trim() || creatingStore}
            >
              Save
            </PrimaryButton>
          </div>
        </FormField>
      )}
      <FormField label="Quantity">
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          label={trimmedName || 'item'}
          size="lg"
          fullWidth
        />
      </FormField>
      <PrimaryButton
        onClick={handleSubmit}
        fullWidth
        disabled={!trimmedName || (isEdit && !dirty)}
      >
        {isEdit ? 'Save changes' : 'Add Item'}
      </PrimaryButton>
      {mode === 'basket' && onReturnToList && (
        <button
          type="button"
          onClick={onReturnToList}
          aria-label={`Return ${item?.name ?? 'item'} to the shopping list`}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '12px',
            background: 'transparent',
            color: t.primary,
            border: 'none',
            borderRadius: 'var(--ds-radius-md)',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--ds-font)',
          }}
        >
          Return to list
        </button>
      )}
      {mode === 'list' && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${item?.name ?? 'item'}`}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '12px',
            background: 'var(--ds-error-subtle)',
            color: 'var(--ds-error)',
            border: 'none',
            borderRadius: 'var(--ds-radius-md)',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--ds-font)',
          }}
        >
          Delete item
        </button>
      )}
      {!isEdit && (
        <p style={{ fontSize: 12, color: t.textTer, textAlign: 'center', marginTop: 10 }}>
          Tap Add to continue adding items
        </p>
      )}
    </BottomSheet>
  )
}
