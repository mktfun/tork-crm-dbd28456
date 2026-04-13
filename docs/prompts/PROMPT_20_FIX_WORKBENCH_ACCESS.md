# Prompt 20: Fix Workbench Access & Lazy Selection

**Problem:**
The "Workbench" tab is currently **disabled** when in Consolidated view ("Selecione um banco para usar o Workbench"). This prevents the "Lazy Import" workflow where the user imports first and selects the bank later.

**Goal:**
Unlock the "Workbench" tab and strictly enforce Bank Selection *only upon entering* that tab.

**Instructions:**

1.  **Frontend Updates (ReconciliationPage.tsx):**
    *   **Enable Workbench Tab**: 
        *   Remove the `disabled` attribute (or the conditional rendering) that blocks the "Workbench" tab when `!selectedBankId`.
        *   The tab must be **clickable** at all times.

2.  **Interaction Logic (The "Trap"):**
    *   **Action**: When the user clicks the "Workbench" tab (or if active tab is 'workbench'):
    *   **Check**: Is `selectedBankId` set?
        *   **YES**: Show the Workbench UI normaly.
        *   **NO**: 
            *   **Show Modal**: Immediately open a **"Selecionar Banco para Conciliação"** dialog.
            *   **Blocker**: This dialog cannot be closed (or if closed, switches back to "Lista" tab) until a bank is selected.
            *   **Content**: A simple Bank Select dropdown + "Continuar" button.
            *   **On Confirm**: Set `selectedBankId` -> Load Workbench Data.

3.  **Data Fetching (in Workbench):**
    *   Once inside the Workbench (with a Bank selected), ensure the lists include **Unassigned Items**:
    *   **Statement (Left)**: Fetch entries where `bank_account_id` is [Selected Bank] **OR** `NULL` (Unassigned).
    *   **System (Right)**: Fetch transactions where `bank_account_id` is [Selected Bank] **OR** `NULL` (Unassigned).
    *   *Note*: This ensures items imported without a bank (from Prompt 19) appear here to be linked.

**User Flow Fixed:**
1.  User imports file (No bank selected).
2.  User clicks "Workbench" tab (Enabled!).
3.  Modal pops up: "Compadre, qual banco você quer conciliar?".
4.  User selects "Santander".
5.  Workbench loads: Shows Santander items + The unassigned imported items.
6.  User matches -> Auto-link happens (SQL from Prompt 19).
