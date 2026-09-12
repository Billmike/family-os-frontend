import { useMemo, useState } from 'react'
import type { AssistantExpenseSubmit, ExpenseProposal } from '../../api/assistant'
import { dateInputToIso, formatMoney } from '../../api/adapters'
import type { BudgetSubcategoryGroup, PersonalExpenseAccount } from '../../types'
import { PERSONAL_EXPENSE_CATEGORIES } from '../../types'
import { fonts, t, PrimaryButton, GhostButton } from '../../ui'
import { titleCaseMerchant } from './titleCaseMerchant'
import { ProposalField, proposalFieldInputStyle } from './ProposalField'

type DestinationChoice = 'household' | 'personal'

interface Props {
  proposal: ExpenseProposal
  today: string
  subcategoryGroups: BudgetSubcategoryGroup[]
  personalAccounts?: PersonalExpenseAccount[]
  destinationHint?: DestinationChoice | null
  lastUsedAccountId?: string | null
  currency?: string
  isSaving?: boolean
  onAdd: (input: AssistantExpenseSubmit) => void
  onCancel: () => void
}

type EditableField =
  | 'destination'
  | 'amount'
  | 'subcategory'
  | 'category'
  | 'account'
  | 'merchant'
  | 'note'
  | 'date'

export const familyProposalComplete = (amount: string, subcategoryId: string) => {
  const parsed = Number.parseFloat(amount.replace(',', '.'))
  return Number.isFinite(parsed) && parsed > 0 && Boolean(subcategoryId)
}

export const personalProposalComplete = (
  amount: string,
  category: string,
  accountId: string,
) => {
  const parsed = Number.parseFloat(amount.replace(',', '.'))
  return Number.isFinite(parsed) && parsed > 0 && Boolean(category) && Boolean(accountId)
}

const destinationFromProposal = (
  proposal: ExpenseProposal,
  destinationHint: DestinationChoice | null | undefined,
  hasPersonalAccounts: boolean,
): DestinationChoice | '' => {
  if (!hasPersonalAccounts) return 'household'
  if (
    proposal.destination_explicit
    && (proposal.destination === 'household' || proposal.destination === 'personal')
  ) {
    return proposal.destination
  }
  if (destinationHint === 'household' || destinationHint === 'personal') {
    return destinationHint
  }
  if (proposal.destination === 'household' || proposal.destination === 'personal') {
    return proposal.destination
  }
  return ''
}

const accountFromProposal = (
  proposal: ExpenseProposal,
  accounts: PersonalExpenseAccount[],
  lastUsedAccountId: string | null | undefined,
) => {
  if (proposal.account_id && accounts.some(account => account.id === proposal.account_id)) {
    return proposal.account_id
  }
  if (lastUsedAccountId && accounts.some(account => account.id === lastUsedAccountId)) {
    return lastUsedAccountId
  }
  return ''
}

const categoryFromProposal = (proposal: ExpenseProposal) => {
  if (proposal.category && (PERSONAL_EXPENSE_CATEGORIES as readonly string[]).includes(proposal.category)) {
    return proposal.category
  }
  return ''
}

export const ExpenseProposalCard = ({
  proposal,
  today,
  subcategoryGroups,
  personalAccounts = [],
  destinationHint = null,
  lastUsedAccountId = null,
  currency = 'EUR',
  isSaving = false,
  onAdd,
  onCancel,
}: Props) => {
  const hasPersonalAccounts = personalAccounts.length > 0
  const [destination, setDestination] = useState<DestinationChoice | ''>(
    destinationFromProposal(proposal, destinationHint, hasPersonalAccounts),
  )
  const [amount, setAmount] = useState(proposal.amount ?? '')
  const [subcategoryId, setSubcategoryId] = useState(proposal.subcategory_id ?? '')
  const [category, setCategory] = useState(categoryFromProposal(proposal))
  const [accountId, setAccountId] = useState(
    accountFromProposal(proposal, personalAccounts, lastUsedAccountId),
  )
  const [merchant, setMerchant] = useState(proposal.merchant ?? '')
  const [note, setNote] = useState(proposal.note ?? '')
  const [date, setDate] = useState(
    proposal.occurred_on_explicit && proposal.occurred_on
      ? proposal.occurred_on
      : today,
  )
  const [editing, setEditing] = useState<Partial<Record<EditableField, boolean>>>({})

  const flatOptions = useMemo(
    () =>
      subcategoryGroups.flatMap(group =>
        group.subcategories.map(sub => ({
          id: sub.id,
          name: sub.name,
          group: group.group,
        })),
      ),
    [subcategoryGroups],
  )
  const selectedSub = flatOptions.find(option => option.id === subcategoryId)
  const selectedAccount = personalAccounts.find(account => account.id === accountId)
  const isHousehold = destination === 'household'
  const isPersonal = destination === 'personal'
  const destinationConfirmed = Boolean(
    hasPersonalAccounts
    && proposal.destination_explicit
    && !editing.destination
    && destination
    && destination === proposal.destination,
  )
  const canAdd = (
    isHousehold
      ? familyProposalComplete(amount, subcategoryId)
      : isPersonal
        ? personalProposalComplete(amount, category, accountId)
        : false
  ) && !isSaving

  const handleEdit = (field: EditableField) => {
    setEditing(current => ({ ...current, [field]: true }))
  }

  const handleDestinationChange = (value: string) => {
    if (value === 'household' || value === 'personal' || value === '') {
      setDestination(value)
    }
  }

  const handleMerchantBlur = () => {
    setMerchant(current => titleCaseMerchant(current))
  }

  const handleAdd = () => {
    if (!canAdd) return
    const titledMerchant = titleCaseMerchant(merchant)
    setMerchant(titledMerchant)
    const parsed = Number.parseFloat(amount.replace(',', '.'))
    const shared = {
      amount: parsed,
      merchant: titledMerchant || null,
      note: note.trim() || null,
      occurredAt: dateInputToIso(date),
    }
    if (isPersonal) {
      onAdd({
        destination: 'personal',
        accountId,
        category,
        ...shared,
      })
      return
    }
    onAdd({
      destination: 'household',
      subcategoryId,
      ...shared,
    })
  }

  const handleCancel = () => {
    if (isSaving) return
    onCancel()
  }

  return (
    <div
      role="group"
      aria-label="Expense proposal"
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 16,
        background: t.surface,
        border: `1px solid ${t.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontFamily: fonts.ui,
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {hasPersonalAccounts && (
        <ProposalField
          label="Destination"
          confirmed={destinationConfirmed}
          confirmedText={destination === 'personal' ? 'Personal' : 'Household'}
          onEdit={() => handleEdit('destination')}
        >
          <select
            aria-label="Destination"
            required
            value={destination}
            onChange={event => handleDestinationChange(event.target.value)}
            style={{ ...proposalFieldInputStyle, cursor: 'pointer' }}
          >
            <option value="">Choose household or personal</option>
            <option value="household">Household</option>
            <option value="personal">Personal</option>
          </select>
        </ProposalField>
      )}
      <ProposalField
        label="Amount"
        confirmed={proposal.amount_explicit && !editing.amount && Boolean(amount)}
        confirmedText={formatMoney(Number.parseFloat(amount.replace(',', '.')) || 0, currency)}
        onEdit={() => handleEdit('amount')}
      >
        <input
          type="text"
          inputMode="decimal"
          aria-label="Amount"
          value={amount}
          onChange={event => setAmount(event.target.value)}
          placeholder="0.00"
          style={proposalFieldInputStyle}
        />
      </ProposalField>
      {isHousehold && (
        <ProposalField
          label="Subcategory"
          confirmed={proposal.subcategory_id_explicit && !editing.subcategory && Boolean(selectedSub)}
          confirmedText={selectedSub ? `${selectedSub.group} · ${selectedSub.name}` : ''}
          onEdit={() => handleEdit('subcategory')}
        >
          <select
            aria-label="Subcategory"
            value={subcategoryId}
            onChange={event => setSubcategoryId(event.target.value)}
            style={{ ...proposalFieldInputStyle, cursor: 'pointer' }}
          >
            <option value="">Choose a subcategory</option>
            {subcategoryGroups.map(group => (
              <optgroup key={group.group} label={group.group}>
                {group.subcategories.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </ProposalField>
      )}
      {isPersonal && (
        <>
          <ProposalField
            label="Category"
            confirmed={proposal.category_explicit && !editing.category && Boolean(category)}
            confirmedText={category}
            onEdit={() => handleEdit('category')}
          >
            <select
              aria-label="Category"
              value={category}
              onChange={event => setCategory(event.target.value)}
              style={{ ...proposalFieldInputStyle, cursor: 'pointer' }}
            >
              <option value="">Choose a category</option>
              {PERSONAL_EXPENSE_CATEGORIES.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </ProposalField>
          <ProposalField
            label="Personal account"
            confirmed={
              proposal.account_id_explicit
              && !editing.account
              && Boolean(selectedAccount)
              && accountId === proposal.account_id
            }
            confirmedText={selectedAccount?.name ?? ''}
            onEdit={() => handleEdit('account')}
          >
            <select
              aria-label="Personal account"
              value={accountId}
              onChange={event => setAccountId(event.target.value)}
              style={{ ...proposalFieldInputStyle, cursor: 'pointer' }}
            >
              <option value="">Choose a personal account</option>
              {personalAccounts.map(account => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </ProposalField>
        </>
      )}
      <ProposalField
        label="Merchant"
        confirmed={proposal.merchant_explicit && !editing.merchant && Boolean(merchant)}
        confirmedText={merchant}
        onEdit={() => handleEdit('merchant')}
      >
        <input
          type="text"
          aria-label="Merchant"
          value={merchant}
          onChange={event => setMerchant(event.target.value)}
          onBlur={handleMerchantBlur}
          placeholder="Optional"
          style={proposalFieldInputStyle}
        />
      </ProposalField>
      <ProposalField
        label="Note"
        confirmed={proposal.note_explicit && !editing.note && Boolean(note)}
        confirmedText={note}
        onEdit={() => handleEdit('note')}
      >
        <input
          type="text"
          aria-label="Note"
          value={note}
          onChange={event => setNote(event.target.value)}
          placeholder="Optional"
          style={proposalFieldInputStyle}
        />
      </ProposalField>
      <ProposalField
        label="Date"
        confirmed={proposal.occurred_on_explicit && !editing.date && Boolean(date)}
        confirmedText={date}
        onEdit={() => handleEdit('date')}
      >
        <input
          type="date"
          aria-label="Date"
          className="proposal-date-input"
          value={date}
          onChange={event => setDate(event.target.value)}
          style={proposalFieldInputStyle}
        />
      </ProposalField>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <PrimaryButton
          onClick={handleAdd}
          disabled={!canAdd}
          aria-label="Add expense"
          style={{ flex: 1, fontSize: 14 }}
        >
          {isSaving ? 'Adding…' : 'Add expense'}
        </PrimaryButton>
        <GhostButton
          onClick={handleCancel}
          disabled={isSaving}
          bordered
          aria-label="Cancel expense proposal"
          style={{ padding: '0 14px', fontSize: 14, background: t.surfaceChrome }}
        >
          Cancel
        </GhostButton>
      </div>
    </div>
  )
}

export const FamilyExpenseSuccessCard = ({
  amount,
  label,
  currency = 'EUR',
}: {
  amount: string
  label: string
  currency?: string
}) => {
  const parsed = Number.parseFloat(amount.replace(',', '.'))
  const amountLabel = Number.isFinite(parsed) ? formatMoney(parsed, currency) : amount
  const title = label
  return (
    <div
      role="status"
      aria-label={`Added ${amountLabel} in ${title}`}
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 16,
        background: t.successSub,
        border: `1px solid ${t.border}`,
        fontFamily: fonts.ui,
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: t.text }}>
        {amountLabel} · {title}
      </p>
    </div>
  )
}
