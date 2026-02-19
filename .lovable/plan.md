

# Fix Settings (Chart of Accounts) + Reconciliation Sign Bug

## Two Issues

### Issue 1: ConfiguracoesTab -- "Contas Bancarias" showing ledger accounts instead of real banks

**Problem:** The left column in "Plano de Contas" tab uses `AccountListSection` with `assetAccounts` (from `financial_accounts` table), showing ledger entries like "Contas a Receber" instead of real bank accounts (Itau, Nubank, etc.).

**Fix:** Replace the `AccountListSection` for "Contas Bancarias" with the already-imported-but-unused `BankAccountsSection` component, which correctly queries the `bank_accounts` table.

Additionally, add a "Restaurar Padroes" button next to the Categories section that seeds standard categories if missing.

### Issue 2: Reconciliation sign mismatch -- expenses appear as positive on system side

**Problem:** As shown in the screenshot, bank side shows `-R$ 150,00` for an expense but system side shows `+R$ 150,00`. The `usePendingReconciliation` hook maps system items with raw `item.amount` (which is stored as a positive magnitude for expenses). This causes a `R$ 300` mismatch instead of `R$ 0`.

**Fix:** In the system items mapping, force negative sign when `type === 'expense'`.

---

## Changes

### 1. `src/components/financeiro/ConfiguracoesTab.tsx`

**Left column fix (lines 448-458):**
- Replace `AccountListSection` for "Contas Bancarias" with `<BankAccountsSection />`
- Remove the now-unnecessary `assetAccounts` filter (but keep it for `CommissionTargetSection`)

**Right column enhancement (lines 460-469):**
- Add a "Restaurar Padroes" button next to "Adicionar" in the Categories section header
- The button calls a function that checks for standard category names and creates any that are missing using `createAccount` from `financialService`
- Standard categories to seed:
  - Expense: "Despesas Administrativas", "Marketing", "Pessoal", "Impostos e Taxas"
  - Revenue: "Receita de Vendas", "Receita de Servicos", "Comissoes"

### 2. `src/hooks/useReconciliation.ts` (line 144-154)

**Fix system items amount sign:**
- Change the amount mapping from `amount: item.amount` to:
  ```
  amount: (item.type === 'expense' || item.type === 'despesa')
    ? -Math.abs(item.amount)
    : Math.abs(item.amount)
  ```
- This ensures expenses are negative (matching bank statement convention) and revenues are positive

### 3. `src/components/financeiro/reconciliation/ReconciliationWorkbench.tsx` (line 49)

**Fix EntryCard sign detection:**
- Currently uses `item.amount >= 0` to determine revenue/expense visuals
- After the sign fix, this will work correctly since expenses will now be negative

### 4. `src/components/financeiro/conciliacao/SystemTransactionList.tsx`

**No changes needed** -- it already handles sign display correctly via `isExpense` check on `transaction.type` and applies manual `-`/`+` prefixes with `Math.abs`. After the hook fix, `transaction.amount` will be signed, so the `Math.abs` in `formatCurrency` will still work correctly for display.

---

## Technical Summary

| File | Change |
|------|--------|
| `ConfiguracoesTab.tsx` | Replace left column with `BankAccountsSection`; add "Restaurar Padroes" button for categories |
| `useReconciliation.ts` | Force signed amounts in `usePendingReconciliation` system items mapping |
| `ReconciliationWorkbench.tsx` | No change needed (sign detection already uses `amount >= 0`) |
| `SystemTransactionList.tsx` | No change needed (already uses type-based detection) |

