-- Migration: Add Bulk Reconciliation RPCs
-- Purpose: Enable "Mass Action" for reconciling/unreconciling transactions.

-- 1. Bulk Reconcile (Mark as Reconciled)
CREATE OR REPLACE FUNCTION bulk_manual_reconcile(
  p_transaction_ids UUID[],
  p_bank_account_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INTEGER;
BEGIN
  -- Validate Bank Account if provided (must belong to user)
  IF p_bank_account_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM bank_accounts WHERE id = p_bank_account_id AND user_id = v_user_id) THEN
      RAISE EXCEPTION 'Conta bancária inválida';
    END IF;
  END IF;

  WITH updated AS (
    UPDATE financial_transactions
    SET 
      bank_account_id = COALESCE(p_bank_account_id, bank_account_id),
      reconciled = TRUE,
      reconciled_at = NOW(),
      reconciliation_method = 'manual'
    WHERE id = ANY(p_transaction_ids)
      AND user_id = v_user_id
      AND NOT COALESCE(is_void, false)
      -- Optional: Prevent overwriting already reconciled? 
      -- Usually mass action implies "Make sure these are reconciled".
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN json_build_object('success', true, 'count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Bulk Unreconcile
CREATE OR REPLACE FUNCTION bulk_unreconcile(
  p_transaction_ids UUID[]
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE financial_transactions
    SET 
      reconciled = FALSE,
      reconciled_at = NULL,
      reconciliation_method = NULL
    WHERE id = ANY(p_transaction_ids)
      AND user_id = v_user_id
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN json_build_object('success', true, 'count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
