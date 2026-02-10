-- =====================================================
-- RECONCILIATION LOGIC & UNRECONCILE SUPPORT
-- =====================================================

-- 1. Ensure 'reconciled' column exists
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS reconciled boolean DEFAULT false;

-- 2. Trigger Function: Update Bank Balance
-- Handles both Reconcile (Add impact) and Unreconcile (Remove impact)
CREATE OR REPLACE FUNCTION update_bank_balance_on_reconciliation()
RETURNS TRIGGER AS $$
DECLARE
    v_net_amount numeric;
BEGIN
    -- Calculate impact from Ledger (Revenue = +, Expense = -)
    SELECT COALESCE(SUM(
        CASE 
            WHEN fa.type = 'revenue' THEN ABS(fl.amount) 
            WHEN fa.type = 'expense' THEN -ABS(fl.amount)
            ELSE 0
        END
    ), 0) INTO v_net_amount
    FROM financial_ledger fl
    JOIN financial_accounts fa ON fl.account_id = fa.id
    WHERE fl.transaction_id = NEW.id;

    -- CASE 1: Reconciling (False -> True)
    IF (NEW.reconciled = true AND COALESCE(OLD.reconciled, false) = false) THEN
        UPDATE bank_accounts 
        SET current_balance = current_balance + v_net_amount,
            last_sync_date = NOW()
        WHERE id = NEW.bank_account_id;

    -- CASE 2: Unreconciling (True -> False)
    ELSIF (NEW.reconciled = false AND COALESCE(OLD.reconciled, false) = true) THEN
        UPDATE bank_accounts 
        SET current_balance = current_balance - v_net_amount,
            last_sync_date = NOW()
        WHERE id = NEW.bank_account_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger Definition
DROP TRIGGER IF EXISTS trg_update_bank_balance_on_reconcile ON financial_transactions;

CREATE TRIGGER trg_update_bank_balance_on_reconcile
  AFTER UPDATE OF reconciled ON financial_transactions
  FOR EACH ROW
  WHEN (NEW.bank_account_id IS NOT NULL)
  EXECUTE FUNCTION update_bank_balance_on_reconciliation();

-- 4. RPC: Manual Reconcile
CREATE OR REPLACE FUNCTION manual_reconcile_transaction(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  UPDATE financial_transactions 
  SET reconciled = true
  WHERE id = p_transaction_id
    AND user_id = v_user_id
    AND NOT COALESCE(is_void, false);
END;
$$;

-- 5. RPC: Unreconcile (New)
CREATE OR REPLACE FUNCTION unreconcile_transaction(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  UPDATE financial_transactions 
  SET reconciled = false
  WHERE id = p_transaction_id
    AND user_id = v_user_id
    AND NOT COALESCE(is_void, false);
END;
$$;
