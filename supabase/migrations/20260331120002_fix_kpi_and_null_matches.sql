-- Migration: Fix KPI grouping and hydrate NULL match entries
-- Description:
-- 1. Creates missing financial transactions for statement entries that were
--    matched but saved with matched_transaction_id = NULL.
-- 2. Modifies get_financial_summary to correctly group KPIs by transaction_date
--    instead of reconciled_at, ensuring competencies align correctly.

DO $$
DECLARE
    v_entry RECORD;
    v_transaction_id UUID;
    v_asset_account_id UUID;
    v_category_account_id UUID;
    v_count_created INTEGER := 0;
BEGIN
    FOR v_entry IN 
        SELECT b.*
        FROM bank_statement_entries b
        WHERE b.reconciliation_status IN ('matched', 'manual_match')
          AND b.matched_transaction_id IS NULL
    LOOP
        v_transaction_id := gen_random_uuid();
        
        -- Safe approach for Orphaned matches: get category accounts mapped to Diverse
        IF v_entry.amount > 0 THEN
            SELECT id INTO v_category_account_id FROM financial_accounts 
            WHERE user_id = v_entry.user_id AND type = 'revenue' 
            ORDER BY name LIMIT 1;
        ELSE
            SELECT id INTO v_category_account_id FROM financial_accounts 
            WHERE user_id = v_entry.user_id AND type = 'expense' 
            ORDER BY name LIMIT 1;
        END IF;

        -- Find active asset account for the user to be the counterparty
        SELECT id INTO v_asset_account_id FROM financial_accounts 
        WHERE user_id = v_entry.user_id AND type = 'asset' AND status = 'active'
        ORDER BY name LIMIT 1;

        IF v_asset_account_id IS NOT NULL AND v_category_account_id IS NOT NULL THEN
            -- Create the missing financial transaction
            INSERT INTO financial_transactions (
                id, user_id, created_by, description, transaction_date, reference_number,
                bank_account_id, is_reconciled, reconciled_at, reconciled_statement_id,
                type, total_amount, paid_amount, reconciled, is_confirmed, status
            ) VALUES (
                v_transaction_id,
                v_entry.user_id, v_entry.user_id,
                COALESCE(v_entry.description, 'Lançamento Bancário (Recuperado V2)'),
                v_entry.transaction_date, v_entry.reference_number,
                v_entry.bank_account_id,
                TRUE, COALESCE(v_entry.matched_at, v_entry.created_at), v_entry.id,
                CASE WHEN v_entry.amount < 0 THEN 'expense' ELSE 'revenue' END,
                ABS(v_entry.amount), ABS(v_entry.amount),
                TRUE, TRUE, 'paid'
            );

            -- Link it back to the statement entry
            UPDATE bank_statement_entries 
            SET matched_transaction_id = v_transaction_id 
            WHERE id = v_entry.id;

            -- Create ledger entries (Double-entry accounting)
            IF v_entry.amount > 0 THEN
                INSERT INTO financial_ledger (transaction_id, account_id, amount)
                VALUES 
                    (v_transaction_id, v_asset_account_id, v_entry.amount),
                    (v_transaction_id, v_category_account_id, -v_entry.amount);
            ELSE
                INSERT INTO financial_ledger (transaction_id, account_id, amount)
                VALUES 
                    (v_transaction_id, v_category_account_id, ABS(v_entry.amount)),
                    (v_transaction_id, v_asset_account_id, v_entry.amount);
            END IF;
            
            v_count_created := v_count_created + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'Created % missing financial transactions for NULL matched bank statements', v_count_created;
END $$;


-- ==========================================
-- Update get_financial_summary RPC
-- Fixes KPI grouping error (uses t.transaction_date instead of reconciled_at)
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_financial_summary(
    p_start_date date,
    p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID; 
  v_current_income NUMERIC := 0; 
  v_current_expense NUMERIC := 0;
  v_current_pending_income NUMERIC := 0; 
  v_current_pending_expense NUMERIC := 0;
  v_current_op_pending_income NUMERIC := 0; 
  v_prev_income NUMERIC := 0; 
  v_prev_expense NUMERIC := 0;
  v_prev_pending_income NUMERIC := 0; 
  v_prev_pending_expense NUMERIC := 0;
  v_period_days INTEGER; 
  v_prev_start_date DATE; 
  v_prev_end_date DATE;
  v_cash_balance NUMERIC := 0; 
  v_global_pending_income NUMERIC := 0; 
  v_global_pending_expense NUMERIC := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN 
    RAISE EXCEPTION 'User not authenticated'; 
  END IF;

  v_period_days := p_end_date - p_start_date;
  v_prev_end_date := p_start_date - 1;
  v_prev_start_date := v_prev_end_date - v_period_days;

  -- CALCULATE CURRENT RECEIVED/PAID (FIX: Use exactly transaction_date)
  SELECT
    COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN
      CASE WHEN COALESCE(t.reconciled,false)=true THEN t.total_amount
           WHEN COALESCE(t.paid_amount,0) > 0 THEN t.paid_amount ELSE 0 END
    ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN
      CASE WHEN COALESCE(t.reconciled,false)=true THEN t.total_amount
           WHEN COALESCE(t.paid_amount,0) > 0 THEN t.paid_amount ELSE 0 END
    ELSE 0 END),0)
  INTO v_current_income, v_current_expense 
  FROM financial_transactions t
  WHERE t.user_id = v_user_id
    -- FIX APPLIED HERE:
    AND t.transaction_date BETWEEN p_start_date AND p_end_date
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.status,'pending')!='ignored'
    AND (COALESCE(t.reconciled,false)=true OR COALESCE(t.paid_amount,0) > 0);

  -- CALCULATE CURRENT PENDING (EXPECTED)
  SELECT 
    COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN t.total_amount ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN t.total_amount ELSE 0 END),0)
  INTO v_current_pending_income, v_current_pending_expense 
  FROM financial_transactions t
  WHERE t.user_id = v_user_id 
    AND COALESCE(t.due_date,t.transaction_date) BETWEEN p_start_date AND p_end_date
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.reconciled,false)=false AND COALESCE(t.paid_amount,0)=0
    AND COALESCE(t.status,'pending') NOT IN ('confirmed','ignored');

  -- OPERATIONAL PENDING INCOME
  SELECT COALESCE(SUM(t.total_amount - COALESCE(t.paid_amount,0)),0) 
  INTO v_current_op_pending_income 
  FROM financial_transactions t
  WHERE t.user_id = v_user_id 
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.reconciled,false)=false AND COALESCE(t.status,'pending') NOT IN ('confirmed','ignored')
    AND t.transaction_date <= (CURRENT_DATE+30) 
    AND t.type IN ('revenue','income','Entrada');

  -- CALCULATE PREVIOUS RECEIVED/PAID (FIX: Use exactly transaction_date)
  SELECT
    COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN
      CASE WHEN COALESCE(t.reconciled,false)=true THEN t.total_amount
           WHEN COALESCE(t.paid_amount,0) > 0 THEN t.paid_amount ELSE 0 END
    ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN
      CASE WHEN COALESCE(t.reconciled,false)=true THEN t.total_amount
           WHEN COALESCE(t.paid_amount,0) > 0 THEN t.paid_amount ELSE 0 END
    ELSE 0 END),0)
  INTO v_prev_income, v_prev_expense 
  FROM financial_transactions t
  WHERE t.user_id = v_user_id
    -- FIX APPLIED HERE:
    AND t.transaction_date BETWEEN v_prev_start_date AND v_prev_end_date
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.status,'pending')!='ignored'
    AND (COALESCE(t.reconciled,false)=true OR COALESCE(t.paid_amount,0) > 0);

  -- CALCULATE PREVIOUS PENDING
  SELECT 
    COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN t.total_amount ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN t.total_amount ELSE 0 END),0)
  INTO v_prev_pending_income, v_prev_pending_expense 
  FROM financial_transactions t
  WHERE t.user_id = v_user_id 
    AND COALESCE(t.due_date,t.transaction_date) BETWEEN v_prev_start_date AND v_prev_end_date
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.reconciled,false)=false AND COALESCE(t.paid_amount,0)=0
    AND COALESCE(t.status,'pending') NOT IN ('confirmed','ignored');

  -- GLOBAL PENDING
  SELECT 
    COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN t.total_amount - COALESCE(t.paid_amount,0) ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN t.total_amount - COALESCE(t.paid_amount,0) ELSE 0 END),0)
  INTO v_global_pending_income, v_global_pending_expense 
  FROM financial_transactions t
  WHERE t.user_id = v_user_id 
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.reconciled,false)=false AND COALESCE(t.status,'pending') NOT IN ('confirmed','ignored')
    AND t.type IN ('revenue','expense','income','Entrada','Saída');

  -- CASH BALANCE
  SELECT COALESCE(SUM(current_balance),0) 
  INTO v_cash_balance 
  FROM bank_accounts 
  WHERE user_id = v_user_id AND is_active = true;

  RETURN jsonb_build_object(
    'current', jsonb_build_object(
      'totalIncome', v_current_income,
      'totalExpense', v_current_expense,
      'netResult', v_current_income-v_current_expense,
      'pendingIncome', v_current_pending_income,
      'pendingExpense', v_current_pending_expense,
      'operationalPendingIncome', v_current_op_pending_income,
      'globalPendingIncome', v_global_pending_income,
      'globalPendingExpense', v_global_pending_expense,
      'cashBalance', v_cash_balance
    ),
    'previous', jsonb_build_object(
      'totalIncome', v_prev_income,
      'totalExpense', v_prev_expense,
      'netResult', v_prev_income-v_prev_expense,
      'pendingIncome', v_prev_pending_income,
      'pendingExpense', v_prev_pending_expense,
      'start_date', v_prev_start_date,
      'end_date', v_prev_end_date
    )
  );
END;
$$;
