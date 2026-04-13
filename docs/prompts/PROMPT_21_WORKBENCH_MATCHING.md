# Prompt 21: Workbench Matching UI & "Sem Banco" Visibility

**Problem:**
1.  **Visibility**: User is in Workbench (with a selected bank) but cannot see "Unassigned" (Provisioned) commissions to match.
2.  **Naming & Details**: Commissions show generic names. User needs: **Customer Name**, **Branch**, **Insurer**, **Item**.
3.  **Values**: User needs to see **Full Value**, **Paid**, and **Remaining**.
4.  **Layout**: Needs to clearly show **Extrato (Left)** vs **Sistema (Right)** with a **Difference Indicator** in the middle.

**Goal:**
Fix the Workbench UI to allow matching "Sem Banco" commissions, displaying rich policy details instead of generic descriptions.

**Instructions:**

1.  **Database Updates (SQL) - ALREADY EXECUTED**:
    *The following commands have been executed by the Agent. You may skip this step or verify if needed.*
    
    (Executed on Supabase Project: `jaouwhckqqnaxqyfvgyq`)

```sql
-- UPDATE RPC: get_transactions_for_reconciliation
-- Change:
-- 1. JOINs with Policy, Customer, Company, Ramo to get details.
-- 2. Logic to include 'Sem Banco' items even when p_bank_account_id is provided.
CREATE OR REPLACE FUNCTION get_transactions_for_reconciliation(p_bank_account_id UUID)
RETURNS TABLE (
    id UUID,
    transaction_date DATE,
    description TEXT,
    amount NUMERIC,
    type TEXT,
    status TEXT,
    -- NEW COLUMNS
    total_amount NUMERIC,
    paid_amount NUMERIC,
    remaining_amount NUMERIC,
    customer_name TEXT,
    insurer_name TEXT,
    branch_name TEXT,
    item_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ft.id,
        ft.transaction_date,
        ft.description,
        -- Combined logic for amount display
        (ft.total_amount - COALESCE(ft.paid_amount, 0)) as amount, 
        fa.type::TEXT AS type,
        ft.status,
        -- Detail Columns
        ft.total_amount,
        COALESCE(ft.paid_amount, 0),
        (ft.total_amount - COALESCE(ft.paid_amount, 0)) as remaining_amount,
        c.name as customer_name,
        comp.name as insurer_name,
        r.nome as branch_name,
        p.insured_asset as item_name
    FROM financial_transactions ft
    JOIN financial_ledger fl ON ft.id = fl.transaction_id
    JOIN financial_accounts fa ON fl.account_id = fa.id
    -- JOINS for Details
    LEFT JOIN apolices p ON ft.related_entity_id::text = p.id::text AND ft.related_entity_type = 'policy'
    LEFT JOIN clientes c ON p.client_id = c.id
    LEFT JOIN companies comp ON p.insurance_company = comp.id
    LEFT JOIN ramos r ON p.ramo_id = r.id
    WHERE
        (fa.type = 'expense' OR fa.type = 'revenue')
        AND ft.is_void = false
        AND (
            -- Option A: Linked to this specific Bank Account
            (ft.bank_account_id = p_bank_account_id)
            
            -- Option B: Unassigned Provision (Pending & No Bank Account)
            OR (ft.bank_account_id IS NULL AND ft.status IN ('pending', 'partial'))
        )
        AND (ft.reconciled = false OR ft.reconciled IS NULL)
        AND (ft.total_amount > COALESCE(ft.paid_amount, 0)) -- Hide fully paid
    ORDER BY ft.transaction_date DESC;
END;
$$ LANGUAGE plpgsql;
```

2.  **Frontend Updates (ReconciliationPage / Components)**:
    *   **Right Column (System Lists)**:
        *   **Card Layout**: 
            *   **Top**: **Customer Name** (Large, Bold).
            *   **Middle**: Badge-like row: `Branch` | `Insurer` | `Item`.
            *   **Bottom**: Value Breakdown:
                *   "Valor Cheio: R$ X" (Gray)
                *   "Baixado: R$ Y" (Green)
                *   "Faltante: R$ Z" (Red/Bold - This is the value to match)
        *   *Fallback*: If `customer_name` is null, show standard `description`.
    
    *   **Workbench Header (The "Tripod")**:
        *   **Left**: "EXTRATO (BANCO)" - Sum of selected statement items.
        *   **Center**: "DIFERENÇA" 
            *   Calculation: `Sum(Statement Selected) - Sum(System Selected)` (Absolute).
            *   Visual: Large text. Red if != 0, Green if == 0.
        *   **Right**: "SISTEMA (ERP)" - Sum of selected system items (using `remaining_amount`).

    *   **Matching Logic**:
        *   Use `remaining_amount` for the calculation.

**User User Story**:
1. User enters Workbench (Santander).
2. Right column shows: 
   > **JOÃO DA SILVA**
   > Auto | Porto Seguro | Corolla XEi
   > Cheio: R$ 1.000 | Baixado: R$ 500 | **Faltante: R$ 500**
3. User drags "Recebimento R$ 500" from statement to this card.
4. Difference shows "R$ 0,00".
5. User confirms. 
6. Transaction becomes Fully Paid and linked to Santander.
