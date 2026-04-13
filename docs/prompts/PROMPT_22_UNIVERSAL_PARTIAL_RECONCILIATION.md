# Prompt 22: Universal Partial Reconciliation (Baixa Parcial)

**Problem:**
The user cannot perform **Partial Reconciliation** (Baixa Parcial) for commissions or other transactions. The backend RPC `reconcile_transaction_partial` exists, but the Frontend has no UI to trigger it when amounts differ.

**Goal:**
Implement a **"Partial Reconciliation Modal"** that activates automatically when the user tries to match items with different amounts, working in **BOTH** the Workbench and the Standard List view.

**Instructions:**

1.  **Create `PartialReconciliationModal.tsx`**:
    *   **Props**:
        *   `isOpen`: boolean
        *   `onClose`: () => void
        *   `onConfirm`: (amount: number) => void
        *   `statementItem`: { description, amount, date }
        *   `systemItem`: { description, totalAmount, paidAmount, remainingAmount }
    *   **UI**:
        *   Show **System Item Details** (Consumer Name, Total, Paid, Remaining).
        *   Show **Statement Item Details** (Bank Description, Amount).
        *   **Input Field**: "Valor a Conciliar" (Default to the Statement Amount).
        *   **Calculation**: Show "Novo Saldo Devedor" based on the input.
        *   **Warning**: If Input > Remaining, show warning (but allow if overpayment is intended, or block it - User prefers blocking mostly).
        *   **Buttons**: "Cancelar" (Gray) and "Confirmar Baixa Parcial" (Blue).

2.  **Update `ReconciliationPage.tsx` (Logic)**:
    *   **Detect Mismatch**:
        *   When User clicks "Conciliar" (List View) OR "Drag & Drop" (Workbench):
        *   **Check**: `Math.abs(statementAmount) !== Math.abs(systemAmount)`.
        *   **If Equal**: Call `reconcileTransaction` (Standard).
        *   **If Different**: Open `PartialReconciliationModal`.
    
    *   **Handle Partial Confirm**:
        *   Call the `useReconcilePartial` hook (already exists in `useReconciliation.ts`).
        *   **Payload**:
            *   `statementEntryId`: ID of statement item.
            *   `systemTransactionId`: ID of system item.
            *   `amountToReconcile`: The value from the Modal Input.
            *   `targetBankId`: `selectedBankAccountId` (Crucial for "Sem Banco" items!).

3.  **Workbench Specifics**:
    *   Ensure that dragging a Statement Item (100.00) onto a Commission Card (500.00) triggers this flow.
    *   The "Difference" indicator in the Workbench header should also verify this mismatch.

4.  **Standard List View Specifics**:
    *   If the user selects a "Match Suggestion" that has different values, explicitly offer "Baixa Parcial" button or open the modal.

**User Story:**
1.  User is in Workbench.
2.  Selected Bank: "Santander".
3.  Right Column: "Comissão João Silva" (R$ 1.000,00).
4.  Left Column: "PIX Recebido" (R$ 200,00).
5.  User drags PIX to Commission.
6.  **Modal Opens**: "Discrepância de Valores detectada. Deseja realizar baixa parcial?"
    *   Valor a Baixar: R$ 200,00.
    *   Saldo Restante: R$ 800,00.
7.  User confirms.
8.  System records R$ 200,00 paid, links to Santander, and Commission remains "Partial" with R$ 800,00 open.
