
# Prompt 21: Workbench Matching UI & "Sem Banco" Visibility

## Summary
Enhance the Reconciliation Workbench to display rich policy details (Customer, Insurer, Branch, Item) on system transaction cards, show a value breakdown (Full / Paid / Remaining), and improve the "Tripod" balance bar. The database RPC is already updated -- this is purely a frontend change.

## Changes

### 1. New `SystemEntryCard` component in `ReconciliationWorkbench.tsx`
Replace the generic `EntryCard` usage for the **right panel (System)** with a richer card layout:

- **Title**: `customer_name` (bold, large) with fallback to `description`
- **Badges row**: `branch_name` | `insurer_name` | `item_name` (only rendered if non-null)
- **Value breakdown** (3 inline items):
  - "Cheio: R$ X" (muted)
  - "Baixado: R$ Y" (green)
  - "Faltante: R$ Z" (red, bold -- this is `remaining_amount`)
- **"Sem Banco" badge**: Retained for items where `bank_account_id` is null
- **Date** shown below badges

### 2. Update `systemSum` calculation
Currently uses `item.amount`. Change to use `item.remaining_amount ?? Math.abs(item.amount)` so the Tripod difference indicator correctly reflects remaining balances.

### 3. Tripod Balance Bar refinement
The existing balance bar already has the correct 3-column layout (Extrato / Diferenca / Sistema). Minor label and visual polish:
- Add a delta symbol to the difference display
- Keep existing green/red logic

### 4. Left panel (Statement) -- no changes
The `EntryCard` for statement items remains as-is since bank statement entries don't have policy details.

## Technical Details

### File: `src/components/financeiro/reconciliation/ReconciliationWorkbench.tsx`

**New `SystemEntryCard` component** (added alongside existing `EntryCard`):
- Accepts `PendingReconciliationItem` with the rich fields
- Renders customer name as primary title
- Shows badge row for branch/insurer/item
- Shows value breakdown using `total_amount`, `paid_amount`, `remaining_amount`
- Fallback: if `customer_name` is null, renders like the standard `EntryCard`

**Right panel render** (lines ~336-347):
- Replace `EntryCard` with `SystemEntryCard` for system items

**`systemSum` calculation** (lines ~161-163):
- Use `remaining_amount` (absolute value) instead of `amount` for more accurate difference calculation

### File: `src/hooks/useReconciliation.ts`
- No changes needed -- the `PendingReconciliationItem` interface already includes all rich fields (`total_amount`, `paid_amount`, `remaining_amount`, `customer_name`, `insurer_name`, `branch_name`, `item_name`) and the mapping logic is already in place.

### File: `src/components/financeiro/conciliacao/SystemTransactionList.tsx`
- No changes needed -- the "Sem Banco" badge is already implemented here from Prompt 19.

## No Database Changes
The `get_transactions_for_reconciliation` RPC has already been updated with the JOINs and new columns as specified.
