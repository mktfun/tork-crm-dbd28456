

# Prompt 26: Final Reconciliation Logic (The Correct Flow)

## Problem Summary

The current implementation has two issues:

1. **Entering Workbench always forces a bank selection modal** (line 562-566 in ReconciliationPage.tsx). The user should see data immediately without a modal.
2. **When in "Linking Mode" (targetLinkingBankId set), bankAccountId is passed as empty string** (line 691), which causes `usePendingReconciliation` to return empty arrays (line 119 in useReconciliation.ts: `if (!bankAccountId) return empty`).

## Two Modes Required

- **Mode A (Consolidated/Default):** No bank selected. Show ALL items where `bank_account_id IS NULL`. No modal on entry. Modal only appears when matching two "No Bank" items (to ask which bank to assign).
- **Mode B (Specific Bank):** User selects a bank from the dropdown. Show items for that bank. "Mostrar Sem Banco" toggle available. No modal needed for matching (bank is implied).

## Changes

### 1. `src/hooks/useReconciliation.ts` -- Handle null bankAccountId for consolidated fetching

**Current (line 119):** Returns empty when `bankAccountId` is falsy.

**Fix:** When `bankAccountId` is null/empty, fetch consolidated data (all items with `bank_account_id IS NULL`):
- System RPC: Call with a special "consolidated" flag or skip the bank-filtered RPC and query directly for unassigned transactions.
- Statement query: Fetch entries where `bank_account_id IS NULL`.

### 2. `src/components/financeiro/reconciliation/ReconciliationPage.tsx`

**Tab switching (lines 560-567):**
- Remove the modal trigger when clicking Workbench. Instead, just switch to workbench mode directly.
- If `isConsolidated` (no bank selected), pass `bankAccountId` as `null` to the Workbench (Mode A).
- If a specific bank is selected, pass that bankId (Mode B).

**Workbench rendering (lines 689-718):**
- Remove the condition that requires `targetLinkingBankId` or `selectedBankAccountId` to render the Workbench.
- Always render the Workbench when `viewMode === 'workbench'`.
- Remove the fallback "Selecione um banco" card (lines 704-718).

**Remove `targetLinkingBankId` state** (or repurpose it): The "target linking bank" concept is no longer needed as an upfront selection. Instead, the bank selection modal will appear on-demand during the matching action.

**Remove `showBankSelectForWorkbench` modal trigger on tab click** (lines 562-566).

### 3. `src/components/financeiro/reconciliation/ReconciliationWorkbench.tsx`

**New state:** `pendingMatch` to hold the pair of items waiting for bank selection.

**New behavior in `handleReconcile`:**

```text
if both items have no bank_account_id:
    -> Store them as pendingMatch, open bank selection modal
    -> On confirm: call RPC with selected bankId as targetBankId
else if statement item has a bank:
    -> Use that bank as targetBankId, reconcile directly (no modal)
else if system item has a bank:
    -> Use that bank as targetBankId, reconcile directly (no modal)
```

**Bank selection modal:** Move the "Qual banco?" modal INTO the Workbench component, triggered only when both sides are unassigned.

**Props simplification:**
- Remove `targetLinkingBankId`, `targetLinkingBankName`, `onChangeTargetBank` props.
- Accept `bankAccountId` as `string | null` (null = consolidated mode).
- Accept `bankAccounts` list for the on-demand modal.

### 4. `supabase/functions/generate-summary/index.ts` -- Fix build error

**Line 97:** `error.message` on `unknown` type. Fix: `(error as Error).message`.

## Data Flow After Fix

```text
Mode A (Consolidated):
  bankAccountId = null
  Hook fetches: bank_account_id IS NULL (both sides)
  On match: if both unassigned -> modal asks bank -> RPC with selected bank
  
Mode B (Filtered):
  bankAccountId = "santander-id"
  Hook fetches: bank_account_id = santander + optionally NULL (toggle)
  On match: no modal, bank is implied from statement side
```

## Files Modified
- `src/hooks/useReconciliation.ts` -- Handle null bankAccountId for consolidated fetch
- `src/components/financeiro/reconciliation/ReconciliationPage.tsx` -- Remove upfront modal, simplify workbench rendering
- `src/components/financeiro/reconciliation/ReconciliationWorkbench.tsx` -- Add on-demand bank modal, remove linking mode props
- `supabase/functions/generate-summary/index.ts` -- Fix TypeScript error on line 97

