
# Prompt 22: Universal Partial Reconciliation (Baixa Parcial)

## Summary
Create a Partial Reconciliation Modal that opens automatically when the user tries to match items with different amounts in the Workbench. The backend RPC already supports this -- this is a frontend-only change.

## Changes

### 1. New file: `src/components/financeiro/reconciliation/PartialReconciliationModal.tsx`

A self-contained modal component with these props:
- `isOpen`, `onClose`, `onConfirm(amount: number)`
- `statementItem: { description, amount, date }`
- `systemItem: { description, totalAmount, paidAmount, remainingAmount, customerName }`

**UI Layout:**
- **Header**: "Baixa Parcial" with AlertTriangle icon
- **System Item Section**: Customer name (or description fallback), value breakdown (Cheio / Baixado / Faltante)
- **Statement Item Section**: Description, amount, date
- **Input Field**: "Valor a Conciliar" -- defaults to `Math.abs(statementItem.amount)`, editable
- **Live Calculation**: "Novo Saldo Devedor" = `remainingAmount - inputValue`
- **Validation**: If input > remaining, show red warning and disable confirm button
- **Buttons**: "Cancelar" (outline) and "Confirmar Baixa Parcial" (primary)

### 2. Update `ReconciliationWorkbench.tsx`

**New state:**
- `showPartialModal: boolean`
- `partialStatementItem / partialSystemItem` to hold the selected items for the modal

**Replace the "Valores nao batem" block (lines 513-518):**
- Instead of just showing a warning, render a "Baixa Parcial" button that opens the modal
- The button will be styled with an amber/warning color

**New handler `handlePartialReconcile(amount: number)`:**
- Calls `reconcilePartial.mutateAsync` with `amountToReconcile: amount` and `targetBankId: bankAccountId`
- Clears selection and closes modal on success

**Also update `handleReconcile` (lines 272-294):**
- Add mismatch detection: if `!isPerfectMatch && hasBothSides`, open the partial modal instead of reconciling directly
- This covers the case where user clicks "Conciliar" with mismatched amounts

### 3. No hook changes needed
The `useReconcilePartial` hook (line 662) already accepts `amountToReconcile` and `targetBankId`.

### 4. No database changes needed
The `reconcile_transaction_partial` RPC already handles partial amounts and bank linking.

## Technical Details

### File: `src/components/financeiro/reconciliation/PartialReconciliationModal.tsx` (NEW)

```text
Props interface:
  isOpen: boolean
  onClose: () => void
  onConfirm: (amount: number) => void
  statementItem: { description: string, amount: number, date: string }
  systemItem: { 
    description: string, 
    totalAmount: number, 
    paidAmount: number, 
    remainingAmount: number, 
    customerName?: string 
  }
  isLoading?: boolean
```

Uses existing Dialog, Input, Button, Badge components. Input is a controlled number field with `formatCurrency` for display values.

### File: `src/components/financeiro/reconciliation/ReconciliationWorkbench.tsx`

**New state (after line 205):**
```text
const [showPartialModal, setShowPartialModal] = useState(false);
```

**Floating Action Bar changes (lines 513-518):**
Replace the static warning with an actionable button:
```text
{hasBothSides && !isPerfectMatch && (
  <Button onClick={() => setShowPartialModal(true)}>
    Baixa Parcial
  </Button>
)}
```

**Modal render (before closing div):**
Render `PartialReconciliationModal` using the first selected statement and system items, passing their amounts and details.

**onConfirm handler:**
Calls `reconcilePartial.mutateAsync({ statementEntryId, systemTransactionId, amountToReconcile, targetBankId: bankAccountId })`, then clears selection.

## User Flow
1. User selects a statement entry (R$ 200) and a system commission (R$ 1.000, Faltante R$ 500)
2. Floating bar shows "Baixa Parcial" button instead of just "Valores nao batem"
3. User clicks it -- modal opens pre-filled with R$ 200
4. Modal shows: Novo Saldo Devedor = R$ 300
5. User confirms -- RPC executes, commission becomes "Partial" with R$ 300 remaining
