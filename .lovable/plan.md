
# Redesign e Correção da Tela de Renovações

## Overview

This is a comprehensive redesign covering three areas: fixing the renewal flow (critical bug -- currently creates duplicate policies), redesigning the UI from cards to a table layout, and cleaning up all legacy hardcoded colors. The `policy_renewal_history` table migration has already been applied.

## Files to Modify

### 1. `src/components/policies/RenewPolicyModal.tsx` -- Critical flow fix + design cleanup

**Flow fix (critical):**
- Remove `addPolicy` usage entirely -- renewals must NOT create new policies
- Replace with: (1) insert into `policy_renewal_history` to save snapshot, (2) `updatePolicy` on the existing policy with new values
- Add optional `newPolicyNumber` field to schema
- Remove `generateRenewedPolicyNumber` function
- Remove `validateOriginalPolicy` function (unnecessary gate)

**New `onSubmit` logic:**
```text
1. Insert into policy_renewal_history (previous + new values)
2. updatePolicy(policy.id, { expirationDate, premiumValue, commissionRate, bonus_class, policyNumber?, renewalStatus: 'Renovada', status: 'Ativa' })
3. Toast success, reset, close
```

**Design cleanup:**
- Remove `bg-slate-900 border-slate-700` from DialogContent
- Remove all `text-slate-300`, `bg-slate-800`, `border-slate-600`, `text-white` from Labels, Inputs, Selects, Textarea
- Remove `bg-green-600 hover:bg-green-700 text-white` from submit button (use default variant)
- Remove `border-slate-600 text-slate-300 hover:bg-slate-800` from cancel button (use `variant="outline"`)
- Replace `text-red-400` error messages with `text-destructive`

**Enhanced header:**
- Icon box with `bg-primary/10` + `RotateCcw` icon in `text-primary`
- Subtitle showing policy number and client name

**DatePicker replacement:**
- Replace native `<input type="date">` with Shadcn Popover + Calendar for `newExpirationDate`
- Use `ptBR` locale, disable past dates

**Current policy summary block:**
- Replace `bg-slate-800 border-slate-600` with `bg-muted/50 border-border`
- Show 4 fields: Vencimento, Premio, Comissao, Bonus in a clean grid with `text-muted-foreground` labels and `text-foreground` values

### 2. `src/pages/Renovacoes.tsx` -- Full page redesign

**Replace cards with table layout:**
- Remove `renderPolicyCard` function and card grid
- Add a `glass-component` container with table header (icon box + title + count)
- Table columns: Cliente, No Apolice, Seguradora, Vencimento, Dias, Premio, Bonus, Status, Acoes
- Each row is a `div` with grid columns, hover state `hover:bg-muted/50`
- Days column uses semantic colors: `text-destructive` (overdue), `text-amber-500` (<=15d), `text-foreground` (normal)
- Actions column: "Renovar" button + DropdownMenu for status changes

**Add KPI bar:**
- 4 mini KPIs between header and filters: "Vencendo em 30d" (orange), "Vencidas" (destructive), "Renovadas" (emerald), "Total" (primary)
- Computed from loaded `renewals` array

**Replace period filter Selects with Button group:**
- Period: row of `Button variant="ghost"/"secondary"` for 30/60/90/120/Todos
- Status: keep as Select (more options)

**Fix hardcoded colors:**
- Remove `text-red-400`, `text-orange-400`, `text-blue-400`, `text-green-400`, `bg-green-600`
- Replace `getRenewalStatusBadge` switch with config map using `variant="secondary"/"default"/"destructive"`

**Pagination:**
- Replace Pagination component with simple prev/next + "1-12 de 23" footer inside the table container

**Loading skeleton:**
- Replace card skeletons with table row skeletons

### 3. `src/hooks/useSupabaseRenewals.ts` -- Add bonus_class

- Add `bonus_class: item.bonus_class || null` to the transform map
- No other changes needed

## Files NOT Modified
- `ExportRenewalsModal` -- untouched
- `useSupabasePolicies.ts` -- untouched (updatePolicy already supports all needed fields)
- `policy_renewal_history` table -- already created via migration
- Any other hooks or components

## Technical Notes

- The `updatePolicy` function in `useSupabasePolicies.ts` already maps `premiumValue`, `commissionRate`, `expirationDate`, `bonus_class`, `policyNumber`, `renewalStatus`, and `status` -- no changes needed there
- The `supabase` client import is needed in `RenewPolicyModal` for the direct insert into `policy_renewal_history` (not exposed via any hook)
- The `policy.userId` field is available from `useSupabaseRenewals` transform and will be used for the `user_id` in the history insert
- Calendar component needs `pointer-events-auto` class per Shadcn datepicker guidelines
