import { useState } from 'react'
import type { PersonalExpenseAccount } from '../types'
import { BottomSheet, FormField, Input, PrimaryButton, DangerButton } from '../ui'

interface Props {
  account?: PersonalExpenseAccount | null
  onClose: () => void
  onSave: (name: string) => void
  onDelete?: (id: string) => void
}

export default function PersonalAccountSheet({
  account,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const isEdit = Boolean(account)
  const [name, setName] = useState(account?.name ?? '')
  const trimmed = name.trim()
  const valid = trimmed.length >= 1 && trimmed.length <= 40

  const handleSave = () => {
    if (!valid) return
    onSave(trimmed)
  }

  const handleDelete = () => {
    if (!account || !onDelete) return
    const label = `Delete ${account.name} and all of its expenses?`
    if (!window.confirm(label)) return
    onDelete(account.id)
  }

  return (
    <BottomSheet title={isEdit ? 'Account' : 'New account'} onClose={onClose}>
      <FormField label="Name">
        <Input
          placeholder="Coffee money"
          value={name}
          onChange={setName}
          autoFocus
        />
      </FormField>
      <PrimaryButton onClick={handleSave} fullWidth disabled={!valid}>
        {isEdit ? 'Save' : 'Create account'}
      </PrimaryButton>
      {isEdit && account && onDelete && (
        <DangerButton
          quiet
          fullWidth
          onClick={handleDelete}
          aria-label={`Delete ${account.name}`}
          style={{ marginTop: 12 }}
        >
          Delete account
        </DangerButton>
      )}
    </BottomSheet>
  )
}
