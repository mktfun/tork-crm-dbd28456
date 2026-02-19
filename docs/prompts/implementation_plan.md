
# Fix Zero Value, Legacy Accounts & Default Logic

The user reported critical bugs:
1.  **Ghost Account "Contas a Pagar"**: Error when registering expenses if the account doesn't exist.
2.  **Settings Confusion**: "Contas Bancárias" list shows ledger accounts like "Contas a Receber".
3.  **Reconciliation Signs**: Expenses appear as Positive in the System view, causing mismatch.

## User Review Required
> [!IMPORTANT]
> This plan involves "archiving" legacy accounts (Caixa, Banco Principal) and creating proper "Contas a Pagar" (Liability) and "Contas a Receber" (Asset) accounts. Transactions currently in "Caixa" might need manual migration if they are real.

## Proposed Changes

### Frontend (`src/services/financialService.ts`)
#### [MODIFY] `createFinancialMovement`
- **Implemented Fix**: Added logic to find or create "Contas a Pagar" / "Contas a Receber" case-insensitively. This prevents the "Account not found" error.

### Settings Page (`src/components/financeiro/ConfiguracoesTab.tsx`)
#### [MODIFY] `ConfiguracoesTab`
- **Replace List**: Use `<BankAccountsSection />` instead of generic account list for the left column. This filters out system accounts like "Contas a Receber" from the Bank list.
- **enhance Categories**: ensure standard categories are available.

#### [MODIFY] [useReconciliation.ts](file:///C:/Users/Davi/Desktop/projetos/antigravity/tork-crm-dbd28456/src/hooks/useReconciliation.ts)
- Modify `usePendingReconciliation` to use the `type` returned by the RPC.
- Force negative sign when `type === 'expense'`.

### SQL Updates
- **[NEW]** Update `get_transactions_for_reconciliation` RPC to:
    - Return `type` column explicitly.
    - Allow transactions linked via `bank_account_id` OR `financial_ledger`.
    - Handle missing ledger legs gracefully.
- **[NEW]** Update `get_bank_statement_paginated` to return `reconciled_by_name`.
    - Join `financial_transactions` -> `bank_statement_entries` -> `profiles`.

### Frontend Updates
- **[MODIFY]** `ReconciliationPage.tsx`:
    - Add tooltip to "Conciliado" badge showing "Conciliado por: [Nome]".

## Phase 3: Commission Reconciliation & Import Sync [NEW]

### Goal
- Enable **Partial Reconciliation** (Baixa Parcial) for commissions.
- Link imported transactions to **Import Files** (`bank_import_history`).
- Ensure NO automatic reconciliation is running.

### Database Changes
- **[EXECUTED]** Add `paid_amount` column to `financial_transactions` (default 0).
- **[EXECUTED]** Create `reconcile_transaction_partial` RPC.
    - Updates `financial_transactions.paid_amount`.
    - Marks as reconciled only if `paid_amount >= total_amount`.
    - Updates `bank_statement_entries.matched_transaction_id`.
- **[EXECUTED]** Create `import_bank_statement_batch` RPC.
    - Inserts record into `bank_import_history` (Auditor, File Name, Total).
    - Inserts entries into `bank_statement_entries` linked to history.

### Frontend Updates
- **[MODIFY]** `StatementImporter.tsx`:
    - Call `import_bank_statement_batch` instead of direct insert.
    - Pass File Name and User Name.
- **[MODIFY]** `ReconciliationPage.tsx`:
    - Add "Import History" tab or filter.
    - In Match suggestions, if amounts differ, show "Partial Match" button.
- **[VERIFY]** Confirm no auto-reconciliation triggers exist (Done).
- **[PROMPT]** **Prompt 17** generated in `PROMPT_17_COMMISSION_RECONCILIATION.md`.

## Phase 4: Commission Logic & Importing [NEW]

### Goal
- **Fix Zero Values**: Ensure commissions have correct values.
- **Provisioning**: Show "Pending" commissions in Reconciliation (Unassigned).
- **Lazy Import**: Allow importing without selecting a bank immediately.
- **Workbench Linking**: Select bank later and link unassigned items automatically.

### Database Changes
- **[EXECUTED]** **Prompt 18**: `reconcile_transaction_partial` (Partial Logic + Due Date Extension) & `get_transactions_for_reconciliation` (Unassigned Logic).
- **[EXECUTED]** **Prompt 19**: `import_bank_statement_batch` (Nullable Bank ID) & `reconcile_transaction_partial` (Target Bank Linking).
- **[EXECUTED]** **Prompt 21**: `get_transactions_for_reconciliation` (Rich Details: Customer, Branch, Insurer, Item).

### Frontend Updates (Prompts)
- **[READY]** **Prompt 19**: Frontend Import Flow (No Bank Select).
- **[READY]** **Prompt 20**: Unlock Workbench & Force Bank Selection Modal.
- **[READY]** **Prompt 21**: Workbench UI (Tripod Layout, Rich Cards, Filter Logic).

## Verification Plan

### Manual Verification
- **Import**: Upload file without bank -> Success.
- **Workbench**: Click tab -> Select Bank -> See items.
- **Matching**: Drag "Sem Banco" commission to statement -> Difference 0 -> Match.
- **Result**: Commission becomes Paid and Linked to Bank.
