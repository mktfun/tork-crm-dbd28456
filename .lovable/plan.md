

# Professional Side-by-Side Reconciliation Workbench

## Overview

Replace the current flat table-based reconciliation with an enterprise-grade **side-by-side workbench** where users match bank statement entries (left) against system transactions (right), with strict sum-validation before allowing reconciliation. No database changes required -- all existing RPCs are reused.

---

## Architecture

The current single-table view in `ReconciliationPage.tsx` will be restructured into two modes:
- **List Mode** (existing): The current table view for browsing/filtering all transactions (kept as a tab)
- **Workbench Mode** (new): The side-by-side matching interface (new default tab when a bank is selected)

The `StatementImporter.tsx` will be upgraded with a 3-step wizard flow.

---

## 1. StatementImporter Wizard Upgrade

**File:** `src/components/financeiro/reconciliation/StatementImporter.tsx`

Replace the current single-screen importer with a 3-step wizard:

| Step | Name | Description |
|------|------|-------------|
| 1 | Upload | Drag-and-drop zone + "Gerar Dados de Teste" button (already exists) |
| 2 | Preview | Editable grid showing parsed rows with totals summary |
| 3 | Confirm | Import result feedback: "Importado R$ X | 30 Entradas" |

**Key changes:**
- Add `wizardStep` state (1, 2, 3)
- Reuse existing `Stepper` component from `src/components/ui/stepper.tsx`
- Step 1: Current upload zone (no changes)
- Step 2: Current preview grid, but user must explicitly click "Continuar" to proceed
- Step 3: Shows import result with success animation, then "Fechar" button
- Import button moves from footer to Step 2 -> Step 3 transition
- Back button available on steps 2 and 3

---

## 2. Workbench Layout (ReconciliationPage.tsx)

**File:** `src/components/financeiro/reconciliation/ReconciliationPage.tsx`

### 2a. Add Tabs: "Lista" vs "Workbench"

Below the KPI cards, add a tab switcher:
- "Lista" tab: Shows the existing table view (current code, untouched)
- "Workbench" tab: Shows the new side-by-side matching UI

The Workbench tab is only enabled when a specific bank account is selected (not "Consolidado").

### 2b. Balance Bar (Top of Workbench)

A horizontal bar showing three values:

```text
+---------------------------+-------------------+---------------------------+
|  Extrato (Banco)          |    Diferenca      |    Sistema (ERP)          |
|  R$ 12.500,00             |    R$ 0,00        |    R$ 12.500,00           |
|  3 itens selecionados     |    (green/red)    |    2 itens selecionados   |
+---------------------------+-------------------+---------------------------+
```

- Left total = sum of selected bank statement entries (or total pending if none selected)
- Right total = sum of selected system transactions (or total pending if none selected)
- Center = Left - Right (green if 0, red otherwise)

### 2c. Split Panels

Use `react-resizable-panels` (already installed) for a resizable left/right split:

**Left Panel - "Extrato (Banco)":**
- Fetches `bank_statement_entries` with `reconciliation_status = 'pending'` using existing `usePendingReconciliation` hook (`.statement` property)
- Each entry rendered as a compact card showing: date, description, amount
- Click to toggle selection (turns blue/primary border)
- Multi-select supported

**Right Panel - "Sistema (ERP)":**
- Fetches pending system transactions using existing `usePendingReconciliation` hook (`.system` property)
- Same compact card style
- Click to toggle selection

### 2d. Selection State

```
selectedStatementIds: string[]   // Left column selections
selectedSystemIds: string[]      // Right column selections
```

Computed values:
- `bankSum` = sum of amounts from selected statement entries
- `systemSum` = sum of amounts from selected system transactions  
- `diff` = bankSum - systemSum

### 2e. Floating Action Bar (Bottom)

Appears when any items are selected. Three scenarios:

| Scenario | Condition | Action |
|----------|-----------|--------|
| Perfect Match | `diff === 0` and both sides have selections | Show "Conciliar" button (green). Calls `reconcile_transactions` RPC for each pair, or `bulk_manual_reconcile` if 1:many |
| Mismatch | `diff !== 0` and both sides have selections | Show warning: "Valores nao batem (Diff: R$ X)" with disabled button |
| Missing Transaction | Left has selection, Right is empty | Show "Criar Lancamento" button. Opens a pre-filled dialog to create a system transaction from the bank entry |

### 2f. "Criar Lancamento" Modal

When user selects bank items but no system items, a modal opens pre-filled with:
- Date from bank entry
- Description from bank entry
- Amount from bank entry
- User selects: Category (required)

On submit: uses existing `useCreateFromStatement` hook (which calls `create_transaction_from_statement` RPC). After success, auto-selects the new system transaction for matching.

---

## 3. Hooks Usage (No New Hooks)

All existing hooks are reused:
- `usePendingReconciliation(bankAccountId)` -- fetches both sides
- `useReconcileManual()` -- pairs statement + system entries
- `useMatchSuggestions(bankAccountId)` -- highlights suggested matches
- `useCreateFromStatement()` -- creates missing transactions
- `useBulkReconcile()` -- batch reconciliation

---

## 4. File Changes Summary

| File | Change Type | Description |
|------|------------|-------------|
| `StatementImporter.tsx` | Modify | Add wizard steps (Upload -> Preview -> Confirm) using existing Stepper component |
| `ReconciliationPage.tsx` | Modify | Add "Lista"/"Workbench" tabs. Build the side-by-side workbench with balance bar, split panels, selection logic, floating action bar, and create-transaction modal |

No new files. No database changes. No new dependencies.

---

## Technical Details

### Selection Logic Implementation

```text
1. User clicks bank entry A (R$ 5.000)     -> selectedStatementIds = [A]
2. User clicks system entry B (R$ 5.000)   -> selectedSystemIds = [B]  
3. Balance bar: R$ 5.000 - R$ 5.000 = R$ 0 -> GREEN
4. "Conciliar" button appears
5. Click -> calls reconcile_transactions(A, B)
6. Both items removed from lists, queries invalidated
```

### Multi-match (1:N) Logic

```text
1. User selects bank entries A (R$ 3.000) + B (R$ 2.000)  -> sum = R$ 5.000
2. User selects system entry C (R$ 5.000)                  -> sum = R$ 5.000
3. diff = 0 -> GREEN -> "Conciliar" enabled
4. System reconciles each pair: (A,C) and (B,C) using reconcile_transactions
```

### Match Suggestions Highlighting

When `useMatchSuggestions` returns results, items with suggested matches get a subtle glow/badge. If both sides of a suggestion are visible, a dotted line or badge connects them visually.

