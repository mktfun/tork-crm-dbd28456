

# Fix Reconciliation Sign Mismatch (Final Resolution)

## Root Cause

The frontend hook `usePendingReconciliation` (lines 144-159 of `useReconciliation.ts`) already has correct sign-forcing logic:

```
const itemType = item.type || (item.amount < 0 ? 'expense' : 'revenue');
const signedAmount = (itemType === 'expense') ? -Math.abs(item.amount) : Math.abs(item.amount);
```

**However**, the RPC `get_transactions_for_reconciliation` does NOT return a `type` column. Since `item.type` is always `undefined` and the amount is stored as a positive magnitude, the fallback `item.amount < 0 ? 'expense' : 'revenue'` always evaluates to `'revenue'`. This is why every transaction appears green/positive.

## Solution

### Step 1: Database Migration -- Update the RPC

Replace `get_transactions_for_reconciliation` with a version that joins `financial_ledger` and `financial_accounts` to determine the actual transaction type (`expense` or `revenue`).

```sql
CREATE OR REPLACE FUNCTION get_transactions_for_reconciliation(p_bank_account_id UUID)
RETURNS TABLE (
    id UUID,
    transaction_date DATE,
    description TEXT,
    amount NUMERIC,
    type TEXT,
    status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  SELECT
      ft.id,
      ft.transaction_date,
      ft.description,
      ABS(fl.amount) as amount,
      fa.type::TEXT as type,
      ft.status
  FROM financial_transactions ft
  JOIN financial_ledger fl ON ft.id = fl.transaction_id
  JOIN financial_accounts fa ON fl.account_id = fa.id
  WHERE
      fa.type IN ('expense', 'revenue')
      AND ft.user_id = v_user_id
      AND NOT COALESCE(ft.is_void, FALSE)
      AND (ft.reconciled = false OR ft.reconciled IS NULL)
      AND EXISTS (
          SELECT 1 FROM financial_ledger fl2
          JOIN financial_accounts fa2 ON fl2.account_id = fa2.id
          WHERE fl2.transaction_id = ft.id
            AND fa2.type = 'asset'
      )
  ORDER BY ft.transaction_date DESC;
END;
$$;
```

Key differences from the old RPC:
- Returns a `type` column (`'expense'` or `'revenue'`) derived from `financial_accounts.type`
- Returns a `status` column
- Joins through `financial_ledger` to `financial_accounts` to get the actual account type
- Filters to only expense/revenue legs (not asset/liability legs)
- Keeps `SECURITY DEFINER` and `user_id` check for RLS

### Step 2: No Frontend Changes Needed

The existing frontend code in `useReconciliation.ts` (lines 144-159) already:
1. Reads `item.type` from the RPC response
2. Falls back to amount-based detection only if `type` is missing
3. Forces negative sign for expenses via `-Math.abs(item.amount)`

The `ReconciliationWorkbench.tsx` `EntryCard` (line 49) uses `item.amount >= 0` for color logic, which will work correctly once expenses have negative amounts.

### Summary

| Component | Change |
|-----------|--------|
| RPC `get_transactions_for_reconciliation` | Database migration: add `type` and `status` columns to return table |
| `useReconciliation.ts` | No change (already handles `type` correctly) |
| `ReconciliationWorkbench.tsx` | No change (sign detection via `amount >= 0` works with signed data) |

This is a **database-only fix**. One migration, zero code changes.
