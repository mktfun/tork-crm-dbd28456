
# Prompt 23: Commission Payment Timeline

## Overview

Create a `CommissionPaymentTimeline` component that displays a visual progress bar and vertical timeline of partial payments for each commission. Integrate it into both the Policy Details page (replacing the simple commission list in `CommissionExtract`) and the Client Details page (as a new section after interactions).

## Important Discovery

The `transaction_payments` table has a FK to the legacy `transactions` table, NOT to `financial_transactions`. The ERP commissions stored in `financial_transactions` track payments differently:
- `financial_transactions.total_amount` = full commission value
- `financial_transactions.paid_amount` = accumulated paid amount  
- `financial_transactions.status` = `'pending'` | `'partial'` | `'reconciled'`

For the timeline, we will query `transaction_payments` where the `transaction_id` matches entries that can be correlated. However, since the reconciliation workbench writes partial payments directly to `financial_transactions.paid_amount`, we need to also check if there are reconciliation records. The approach will be:

1. Query `financial_transactions` with their payment progress for ERP commissions
2. For the detailed timeline events, we can use the reconciliation timestamps and description from `financial_transactions` itself (reconciled_at, reconciliation_method) as each partial reconciliation updates these fields

Since the prompt explicitly shows querying `transaction_payments` as a sub-select of `financial_transactions`, but the FK doesn't support that join, I will instead query the payment timeline from the `financial_transactions` fields directly (paid_amount, status, reconciled_at) and fall back to showing summary progress when detailed payment events aren't available.

## Files to Create

### 1. `src/components/financeiro/CommissionPaymentTimeline.tsx` (NEW)

Props:
- `policyId: string` -- fetch commissions for this policy
- `compact?: boolean` -- default false; when true, show only progress bar + summary + last 3 payments

Query:
```ts
supabase
  .from('financial_transactions')
  .select(`
    id, description, transaction_date, total_amount,
    paid_amount, status, reference_number
  `)
  .eq('related_entity_id', policyId)
  .eq('related_entity_type', 'policy')
  .eq('is_void', false)
  .order('transaction_date', { ascending: true })
```

For each commission found, render:
- **Header**: Reference number + status badge
- **Progress bar**: Using shadcn `Progress` component. Amber when < 100%, emerald when = 100%.
- **Summary line**: "Recebido: R$ X / Faltante: R$ Y / Total: R$ Z"
- **Timeline**: Vertical dot-line timeline. Since detailed payment events aren't available via FK join, show:
  - If `paid_amount > 0` and `status === 'partial'`: one entry showing "Pagamento parcial registrado" with the paid amount
  - If `status === 'reconciled'`: show "Quitado" entry
  - If remaining > 0: dashed "Saldo pendente" entry in red

Loading state: Skeleton components.
Empty state: "Nenhum pagamento registrado ainda" with Pendente badge.

## Files to Modify

### 2. `src/components/policies/CommissionExtract.tsx`

**What changes:**
- Import `CommissionPaymentTimeline`
- In the "Transacoes no Faturamento" section (lines 217-291), replace the existing commission list with `<CommissionPaymentTimeline policyId={policy.id} />`
- Keep the "Gerar Comissao" button logic for when no commissions exist
- Keep the header (Apolice summary grid, Comissao Total green block) unchanged

### 3. `src/pages/ClientDetails.tsx`

**What changes:**
- Import `CommissionPaymentTimeline` and `AppCard`, `Badge`, `DollarSign` icon, `Separator`
- After `<ClientInteractionsHistory />` (line 153), add a new section "Recebimentos de Comissao"
- Iterate over `clientPolicies`, rendering `<CommissionPaymentTimeline policyId={policy.id} compact />` for each
- Each policy gets a mini-header showing policy number and type badge
- Separator between policies
- Only render the section if `clientPolicies.length > 0`

## Status Badge Mapping

| Status | Label | Style |
|--------|-------|-------|
| `pending` | Pendente | `variant="outline"` + `text-amber-500 border-amber-500` |
| `partial` | Parcial | `variant="outline"` + `text-blue-500 border-blue-500` |
| `reconciled` | Quitado | `variant="default"` + `bg-emerald-600` |

## Technical Notes

- Uses `useQuery` with key `['commission-timeline', policyId]`
- `formatCurrency` from `@/utils/formatCurrency`
- `Progress` from `@/components/ui/progress` with `indicatorClassName` for color control
- `Skeleton` from `@/components/ui/skeleton` for loading state
- `AppCard` with `glass-component` pattern for card wrapper
- `date-fns` `format` for date formatting
- No database migrations needed -- all data already exists
- No changes to commission generation logic, RPCs, or other existing components
