

# Fix Analytics Dashboard & Legacy Account Cleanup

This plan addresses two major issues: (1) the "Analise por Dimensao" chart showing empty and the "Metas" gauge showing incorrect values, and (2) transactions displaying R$ 0,00 due to legacy account references.

---

## Part 1: Database Migration - Fix RPCs

A single SQL migration will update three database functions:

### 1.1 `get_revenue_by_dimension`
- Currently looks for legacy policy data instead of the new `financial_transactions` columns (`producer_id`, `insurance_company_id`, `ramo_id`)
- Will be replaced to prioritize those columns, falling back to `apolices` join only when missing
- Uses CTEs for clean dimension resolution (producer name from `profiles`, ramo name from `ramos`, company name from `companies`)

### 1.2 `get_goal_vs_actual`
- Currently returns incorrect percentage because it may use wrong field names or calculation
- Will be replaced to properly sum `total_amount` from confirmed, non-void revenue transactions
- Returns `percentage_achieved` as `ROUND((actual / goal) * 100, 2)` -- the frontend already reads `result.pct` which maps to this column alias

### 1.3 `get_recent_financial_transactions`
- Transactions show R$ 0,00 because `total_amount` isn't calculated correctly
- Will calculate as `SUM(ABS(fl.amount)) / 2` from `financial_ledger` to get the true value regardless of account type
- Also returns `is_confirmed` and `reconciled` fields properly

### 1.4 Archive Legacy Accounts
- Archive "Caixa", "Banco Principal", and "Comissoes a Receber" accounts (set `status = 'archived'`)
- These should no longer be used as default counterparts

---

## Part 2: Frontend - Fix `createFinancialMovement`

**File:** `src/services/financialService.ts`

Update the `createFinancialMovement` function (lines ~224-245):
- Remove logic that searches for "Caixa" as a default asset account
- For **expenses** without a bank: search for "Contas a Pagar" (liability type)
- For **revenue** without a bank: search for "Contas a Receber" (asset type)
- Throw a clear error if neither account is found

---

## Part 3: Frontend - Gauge Chart Alignment

**File:** `src/components/financeiro/faturamento/GaugeChart.tsx`

Minor tweaks to ensure the gauge renders correctly:
- Confirm container height is fixed at `180px`
- Ensure `PieChart` uses `margin={{ top: 0, right: 0, bottom: 0, left: 0 }}`
- Ensure `Pie` uses `cx="50%" cy="100%"` for perfect semicircle
- Position percentage text with `absolute bottom-2`

These are already mostly in place from previous changes -- will verify and adjust if needed.

---

## Part 4: Hook Field Mapping Verification

**File:** `src/hooks/useFinanceiro.ts`

- `useGoalVsActual` (line ~784): Already reads `result.pct` -- the updated RPC aliases the column as `pct`, so this should work correctly after the migration
- `useRevenueByDimension` (line ~460): Already maps `dimension_name`, `total_amount`, `transaction_count`, `percentage` -- matches the updated RPC signature
- `getRecentTransactions` (line ~292): Already maps `is_confirmed` with fallback -- will continue to work with the updated RPC that now returns this field

---

## Technical Summary

| Change | Type | File/Location |
|--------|------|---------------|
| Update `get_revenue_by_dimension` | SQL Migration | Database |
| Update `get_goal_vs_actual` | SQL Migration | Database |
| Update `get_recent_financial_transactions` | SQL Migration | Database |
| Archive legacy accounts | SQL Migration | Database |
| Replace "Caixa" logic with "Contas a Pagar"/"Contas a Receber" | Code Edit | `financialService.ts` |
| Verify gauge layout | Code Edit | `GaugeChart.tsx` (if needed) |

