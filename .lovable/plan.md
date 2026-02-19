
# The Complete Reconciliation Suite: Audit History + Workbench Overhaul

## Overview

Upgrade the reconciliation module with two major enhancements:
1. **Import History Tab** -- auditable timeline of all imports with detail drill-down
2. **Enhanced Import Wizard** -- adds a mandatory "Auditor Name" step before processing
3. **Workbench polish** -- the existing side-by-side workbench is already built; we refine integration with the new import flow

No database changes needed -- the `bank_import_history` table already exists with the required schema.

---

## 1. StatementImporter Wizard Upgrade (4-Step Flow)

**File:** `src/components/financeiro/reconciliation/StatementImporter.tsx`

Current wizard: Upload (1) -> Review (2) -> Confirmation (3)

New wizard: **Upload (1) -> Review (2) -> Audit Info (3) -> Confirmation (4)**

| Step | Name | What Happens |
|------|------|-------------|
| 1 | Upload | Current drag-and-drop + test data generator (unchanged) |
| 2 | Revisao | Preview grid with totals (unchanged) |
| 3 | Auditoria | New step: mandatory text field "Quem esta auditando esta importacao?" |
| 4 | Confirmacao | Shows import result with count + total volume |

**Key changes:**
- Add `auditorName` state (string)
- Step 3: Simple form with a required text input for auditor name
- On "Importar" click (step 3 -> 4):
  1. Generate a shared `import_batch_id` (UUID)
  2. Insert a row into `bank_import_history` with: bank_account_id, auditor_name, total_transactions, total_amount, status='completed'
  3. Insert all entries into `bank_statement_entries` with the same `import_batch_id`
  4. Move to step 4 showing results
- Update `WIZARD_STEPS` to `['Upload', 'Revisao', 'Auditoria', 'Confirmacao']`
- Pass `onSuccessWithBatchId` callback so the parent can highlight the batch in workbench

---

## 2. Import History Tab

**File:** `src/components/financeiro/reconciliation/ReconciliationPage.tsx`

Add a third view mode tab: "Lista" | "Workbench" | "Historico"

### History View Content:
- Query `bank_import_history` table ordered by `imported_at DESC`
- Filter by selected bank account (or show all if consolidated)
- Each import shown as a card:

```text
+----------------------------------------------------+
| 19/02/2026 14:30  |  Auditor: Maria Silva          |
| Banco Itau        |  30 transacoes | R$ 45.200,00   |
| Status: Concluido                   [Ver Detalhes]  |
+----------------------------------------------------+
```

- "Ver Detalhes" opens a Dialog listing all `bank_statement_entries` where `import_batch_id` matches

### New Hook:
Add `useImportHistory(bankAccountId)` to `useReconciliation.ts`:
- Queries `bank_import_history` table with optional bank_account_id filter
- Returns list sorted by imported_at DESC

Add `useImportBatchEntries(batchId)` for the detail modal:
- Queries `bank_statement_entries` where `import_batch_id = batchId`

---

## 3. Workbench Integration

**File:** `src/components/financeiro/reconciliation/ReconciliationPage.tsx`

After a successful import:
- Auto-switch to "Workbench" tab
- The workbench already handles pending items correctly via `usePendingReconciliation`
- New imports will appear automatically in the left panel (bank statement entries)

---

## 4. File Changes Summary

| File | Change |
|------|--------|
| `StatementImporter.tsx` | Add step 3 (Audit Info), write to `bank_import_history`, generate shared batch ID |
| `ReconciliationPage.tsx` | Add "Historico" tab with timeline view + detail dialog |
| `useReconciliation.ts` | Add `useImportHistory` and `useImportBatchEntries` hooks |

No new files. No database migrations. No new dependencies.

---

## Technical Details

### Import Flow (StatementImporter)

```text
Step 1: User uploads OFX/CSV -> entries parsed
Step 2: User reviews parsed entries -> clicks "Continuar"
Step 3: User enters auditor name -> clicks "Importar"
Step 4: System executes:
   a) const batchId = crypto.randomUUID()
   b) INSERT into bank_import_history (bank_account_id, auditor_name, total_transactions, total_amount, status, imported_by)
   c) INSERT into bank_statement_entries (all entries with import_batch_id = batchId)
   d) Show confirmation screen
```

### Import History Hook

```text
useImportHistory(bankAccountId):
  SELECT * FROM bank_import_history
  WHERE bank_account_id = :bankAccountId (or all if null)
  ORDER BY imported_at DESC
  LIMIT 50

useImportBatchEntries(batchId):
  SELECT * FROM bank_statement_entries
  WHERE import_batch_id = :batchId
  ORDER BY transaction_date ASC
```

### View Mode Tabs (ReconciliationPage)

Current: `viewMode: 'lista' | 'workbench'`
New: `viewMode: 'lista' | 'workbench' | 'historico'`

The "Historico" tab is always available (not bank-dependent like Workbench).
