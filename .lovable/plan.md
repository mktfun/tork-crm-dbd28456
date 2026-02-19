
# Fix: Decouple View Filter from Target Bank in Workbench

## Problem
When the user selects a target bank in the Workbench modal, the system passes that bank ID as both the **view filter** and the **linking target**. This causes the data to be filtered to only show that bank's items, hiding all the "Sem Banco" (unassigned) items the user actually wants to work with.

## Root Cause
In `ReconciliationPage.tsx` (line 691), the Workbench receives `bankAccountId={targetLinkingBankId || selectedBankAccountId!}`. This means when `targetLinkingBankId` is set, the Workbench fetches data filtered by that bank instead of showing the consolidated view.

## Changes

### 1. ReconciliationPage.tsx -- Fix the Workbench props (line 689-703)

**Current (broken):**
```text
bankAccountId={targetLinkingBankId || selectedBankAccountId!}
```

**Fixed:**
- When `targetLinkingBankId` is set (Linking Mode): pass `bankAccountId=""` or `null` equivalent so the hook fetches ALL items (consolidated), while still passing `targetLinkingBankId` separately for the RPC actions.
- When `selectedBankAccountId` is set (filtered mode): pass `bankAccountId={selectedBankAccountId}` as before.

The condition on line 689 also needs updating: the Workbench should render when `targetLinkingBankId` is set OR when a specific bank is selected. When `targetLinkingBankId` is set, the `bankAccountId` prop should be empty/null to trigger consolidated fetching.

### 2. ReconciliationWorkbench.tsx -- Handle null/empty bankAccountId for consolidated view

**Line 220:**
```text
const { data: pendingData, isLoading } = usePendingReconciliation(
    bankAccountId, startDate, endDate, showUnassigned || !!targetLinkingBankId
);
```

When `bankAccountId` is empty/null (linking mode), the hook should fetch consolidated data (all unassigned items). The `effectiveBankId` (line 219) remains `targetLinkingBankId || bankAccountId` and is used only for the reconciliation RPC calls, not for data fetching.

### 3. ReconciliationWorkbench.tsx -- Allow empty bankAccountId in props

Update the `bankAccountId` prop type to accept empty string or make it optional, so the component can operate in "consolidated + linking" mode.

## Summary of Data Flow After Fix

```text
Linking Mode:
  bankAccountId = "" (fetch ALL/consolidated)
  targetLinkingBankId = "itau-id" (used only in reconcile RPC)
  showUnassigned = true (automatic)

Filtered Mode (direct bank selection):
  bankAccountId = "santander-id" (fetch filtered)
  targetLinkingBankId = undefined
  showUnassigned = toggle-controlled
```

## Files Modified
- `src/components/financeiro/reconciliation/ReconciliationPage.tsx` -- Fix Workbench props to pass empty bankAccountId in linking mode
- `src/components/financeiro/reconciliation/ReconciliationWorkbench.tsx` -- Ensure effectiveBankId is only used for RPC actions, not for data fetching filter
