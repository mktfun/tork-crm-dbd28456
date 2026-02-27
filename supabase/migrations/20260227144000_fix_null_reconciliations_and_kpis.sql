-- ==============================================================================
-- Migration: Fix Null Reconciliations and KPIs
-- Description: Conserta os bugs de geração de transação pelo extrato e alinha 
--              as funções de cálculo de KPI do dashboard com o Livro-Razão.
-- ==============================================================================

-- 1. Forçar passagem do ID da Conta Bancária na Importação de OFX
DROP FUNCTION IF EXISTS public.import_bank_statement_batch(text, numeric, jsonb, uuid);
CREATE OR REPLACE FUNCTION public.import_bank_statement_batch(p_file_name text, p_total_amount numeric, p_entries jsonb, p_bank_account_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_batch_id UUID;
    v_entry JSONB;
    v_inserted_count INT := 0;
    v_profile_name TEXT;
BEGIN
    -- Bloqueia OFX sem conta atrelada
    IF p_bank_account_id IS NULL THEN
        RAISE EXCEPTION 'A importação do arquivo OFX exige que uma conta bancária de destino seja selecionada.';
    END IF;

    SELECT nome_completo INTO v_profile_name FROM profiles WHERE id = v_user_id;

    -- Create History Record
    INSERT INTO bank_import_history (
        bank_account_id, file_name, total_amount, status, auditor_name, imported_by
    ) VALUES (
        p_bank_account_id, p_file_name, p_total_amount, 'completed', COALESCE(v_profile_name, 'Unknown'), v_user_id
    ) RETURNING id INTO v_batch_id;

    -- Insert Entries
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        INSERT INTO bank_statement_entries (
            user_id, bank_account_id, transaction_date, description, amount, reference_number, reconciliation_status, import_batch_id
        ) VALUES (
            v_user_id, 
            p_bank_account_id, 
            (v_entry->>'transaction_date')::DATE, 
            v_entry->>'description', 
            (v_entry->>'amount')::NUMERIC, 
            v_entry->>'reference_number', 
            'pending', 
            v_batch_id
        );
        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'batch_id', v_batch_id, 'count', v_inserted_count);
END;
$function$;

-- 2. Consertar a Função "Criar Transação" do Extrato
CREATE OR REPLACE FUNCTION public.create_transaction_from_statement(p_statement_entry_id uuid, p_category_account_id uuid, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_entry RECORD;
    v_asset_account_id UUID;
    v_transaction_id UUID;
BEGIN
    -- Buscar entrada do extrato
    SELECT * INTO v_entry
    FROM bank_statement_entries
    WHERE id = p_statement_entry_id AND user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Entrada não encontrada');
    END IF;
    
    -- Buscar conta de ativo vinculada à conta bancária
    SELECT fa.id INTO v_asset_account_id
    FROM financial_accounts fa
    WHERE fa.user_id = v_user_id 
        AND fa.type = 'asset' 
        AND fa.status = 'active'
    LIMIT 1;
    
    IF v_asset_account_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Conta de ativo não encontrada');
    END IF;
    
    -- Criar transação no sistema COM OS DADOS CORRETOS (Resolvido Type NULL / Amount 0 / is_confirmed FALSE)
    INSERT INTO financial_transactions (
        user_id,
        created_by,
        description,
        transaction_date,
        reference_number,
        bank_account_id,
        is_reconciled,
        reconciled_at,
        reconciled_statement_id,
        type,
        total_amount,
        paid_amount,
        reconciled,
        is_confirmed,
        status
    ) VALUES (
        v_user_id,
        v_user_id,
        COALESCE(p_description, v_entry.description),
        v_entry.transaction_date,
        v_entry.reference_number,
        v_entry.bank_account_id,
        TRUE,
        NOW(),
        p_statement_entry_id,
        CASE WHEN v_entry.amount < 0 THEN 'expense' ELSE 'revenue' END,
        ABS(v_entry.amount),
        ABS(v_entry.amount),
        TRUE,
        TRUE,
        'paid'
    ) RETURNING id INTO v_transaction_id;
    
    -- Criar movimentos no ledger (partidas dobradas)
    IF v_entry.amount > 0 THEN
        -- Receita: Débito em Ativo, Crédito em Receita
        INSERT INTO financial_ledger (transaction_id, account_id, amount)
        VALUES 
            (v_transaction_id, v_asset_account_id, v_entry.amount),
            (v_transaction_id, p_category_account_id, -v_entry.amount);
    ELSE
        -- Despesa: Débito em Despesa, Crédito em Ativo
        INSERT INTO financial_ledger (transaction_id, account_id, amount)
        VALUES 
            (v_transaction_id, p_category_account_id, ABS(v_entry.amount)),
            (v_transaction_id, v_asset_account_id, v_entry.amount);
    END IF;
    
    -- Atualizar entrada do extrato
    UPDATE bank_statement_entries
    SET 
        reconciliation_status = 'matched',
        matched_transaction_id = v_transaction_id,
        matched_at = NOW(),
        matched_by = v_user_id,
        match_confidence = 1.0,
        updated_at = NOW()
    WHERE id = p_statement_entry_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'message', 'Transação criada e conciliada'
    );
END;
$function$;

-- 3. Atualizar O KPI de Dashboard para não usar a Ledger (que pode ignorar certos tipos de transações)
CREATE OR REPLACE FUNCTION public.get_financial_summary(p_start_date date, p_end_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  
  -- Current Period Variables
  v_current_income NUMERIC := 0;
  v_current_expense NUMERIC := 0;
  v_current_pending_income NUMERIC := 0;
  v_current_pending_expense NUMERIC := 0;
  v_current_op_pending_income NUMERIC := 0; 
  
  -- Previous Period Variables
  v_prev_income NUMERIC := 0;
  v_prev_expense NUMERIC := 0;
  v_prev_pending_income NUMERIC := 0;
  v_prev_pending_expense NUMERIC := 0;
  
  -- Dates
  v_period_days INTEGER;
  v_prev_start_date DATE;
  v_prev_end_date DATE;
  
  -- Global/Cash
  v_cash_balance NUMERIC := 0;
  v_global_pending_income NUMERIC := 0;
  v_global_pending_expense NUMERIC := 0;

BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Calculate Previous Period
  v_period_days := p_end_date - p_start_date;
  v_prev_end_date := p_start_date - 1;
  v_prev_start_date := v_prev_end_date - v_period_days;

  -- ==========================================
  -- 1. CURRENT PERIOD
  -- ==========================================
  
  -- Realized (Reconciled)
  SELECT
    COALESCE(SUM(CASE WHEN t.type IN ('revenue', 'income', 'Entrada') THEN t.total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type IN ('expense', 'despesa', 'Saída')  THEN t.total_amount ELSE 0 END), 0)
  INTO v_current_income, v_current_expense
  FROM financial_transactions t
  WHERE t.user_id = v_user_id
    AND t.transaction_date BETWEEN p_start_date AND p_end_date
    AND COALESCE(t.is_void, false) = false
    AND COALESCE(t.status, 'pending') != 'ignored'
    AND COALESCE(t.reconciled, false) = true;

  -- Pending (In Period)
  SELECT
    COALESCE(SUM(CASE WHEN t.type IN ('revenue', 'income', 'Entrada') THEN t.total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type IN ('expense', 'despesa', 'Saída')  THEN t.total_amount ELSE 0 END), 0)
  INTO v_current_pending_income, v_current_pending_expense
  FROM financial_transactions t
  WHERE t.user_id = v_user_id
    AND COALESCE(t.due_date, t.transaction_date) BETWEEN p_start_date AND p_end_date
    AND COALESCE(t.is_void, false) = false
    AND COALESCE(t.reconciled, false) = false
    AND COALESCE(t.status, 'pending') NOT IN ('confirmed', 'ignored');

  -- Operational Pending (Up to Today + 30) - For "Total Geral a Receber"
  SELECT
    COALESCE(SUM(t.total_amount), 0)
  INTO v_current_op_pending_income
  FROM financial_transactions t
  WHERE t.user_id = v_user_id
    AND COALESCE(t.is_void, false) = false
    AND COALESCE(t.reconciled, false) = false
    AND COALESCE(t.status, 'pending') NOT IN ('confirmed', 'ignored')
    AND t.transaction_date <= (CURRENT_DATE + 30)
    AND t.type IN ('revenue', 'income', 'Entrada');


  -- ==========================================
  -- 2. PREVIOUS PERIOD
  -- ==========================================

  -- Realized
  SELECT
    COALESCE(SUM(CASE WHEN t.type IN ('revenue', 'income', 'Entrada') THEN t.total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type IN ('expense', 'despesa', 'Saída')  THEN t.total_amount ELSE 0 END), 0)
  INTO v_prev_income, v_prev_expense
  FROM financial_transactions t
  WHERE t.user_id = v_user_id
    AND t.transaction_date BETWEEN v_prev_start_date AND v_prev_end_date
    AND COALESCE(t.is_void, false) = false
    AND COALESCE(t.status, 'pending') != 'ignored'
    AND COALESCE(t.reconciled, false) = true;

  -- Pending 
  SELECT
    COALESCE(SUM(CASE WHEN t.type IN ('revenue', 'income', 'Entrada') THEN t.total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type IN ('expense', 'despesa', 'Saída')  THEN t.total_amount ELSE 0 END), 0)
  INTO v_prev_pending_income, v_prev_pending_expense
  FROM financial_transactions t
  WHERE t.user_id = v_user_id
    AND COALESCE(t.due_date, t.transaction_date) BETWEEN v_prev_start_date AND v_prev_end_date
    AND COALESCE(t.is_void, false) = false
    AND COALESCE(t.reconciled, false) = false
    AND COALESCE(t.status, 'pending') NOT IN ('confirmed', 'ignored');


  -- ==========================================
  -- 3. GLOBALS (Snapshot)
  -- ==========================================
  
  -- Global Pending
  SELECT
    COALESCE(SUM(CASE WHEN t.type IN ('revenue', 'income', 'Entrada') THEN t.total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type IN ('expense', 'despesa', 'Saída')  THEN t.total_amount ELSE 0 END), 0)
  INTO v_global_pending_income, v_global_pending_expense
  FROM financial_transactions t
  WHERE t.user_id = v_user_id
    AND COALESCE(t.is_void, false) = false
    AND COALESCE(t.reconciled, false) = false
    AND COALESCE(t.status, 'pending') NOT IN ('confirmed', 'ignored')
    AND t.type IN ('revenue', 'expense', 'income', 'Entrada', 'Saída');

  -- Cash Balance
  SELECT COALESCE(SUM(current_balance), 0)
  INTO v_cash_balance
  FROM bank_accounts
  WHERE user_id = v_user_id
    AND is_active = true;


  -- ==========================================
  -- 4. BUILD RESULT
  -- ==========================================

  RETURN JSON_BUILD_OBJECT(
    'current', JSON_BUILD_OBJECT(
      'totalIncome', v_current_income,
      'totalExpense', v_current_expense,
      'netResult', v_current_income - v_current_expense,
      'pendingIncome', v_current_pending_income,
      'pendingExpense', v_current_pending_expense,
      'operationalPendingIncome', v_current_op_pending_income, 
      'globalPendingIncome', v_global_pending_income,
      'globalPendingExpense', v_global_pending_expense,
      'cashBalance', v_cash_balance
    ),
    'previous', JSON_BUILD_OBJECT(
      'totalIncome', v_prev_income,
      'totalExpense', v_prev_expense,
      'netResult', v_prev_income - v_prev_expense,
      'pendingIncome', v_prev_pending_income,
      'pendingExpense', v_prev_pending_expense,
      'start_date', v_prev_start_date,
      'end_date', v_prev_end_date
    )
  );
END;
$function$;

-- 4. Data Backfill: Re-hidratar transações zeradas e realocar os extatos órfãos
DO $$ 
DECLARE
    v_primary_bank_id UUID;
    v_record RECORD;
BEGIN
    -- Pegar o primeiro Banco ativo
    SELECT id INTO v_primary_bank_id FROM bank_accounts WHERE bank_name ILIKE '%Bradesco%' LIMIT 1;
    
    IF v_primary_bank_id IS NULL THEN
        SELECT id INTO v_primary_bank_id FROM bank_accounts WHERE is_active = true LIMIT 1;
    END IF;

    IF v_primary_bank_id IS NOT NULL THEN
        -- Corrigir Statement Entries pulando conflitos de unicidade (OFXs duplicados no mesmo dia/ref)
        FOR v_record IN SELECT id FROM bank_statement_entries WHERE bank_account_id IS NULL
        LOOP
            BEGIN
                UPDATE bank_statement_entries
                SET bank_account_id = v_primary_bank_id
                WHERE id = v_record.id;
            EXCEPTION WHEN unique_violation THEN
                -- Ignora e deixa como NULL se já existir outro extrato com a mesma chave neste banco
                NULL;
            END;
        END LOOP;

        -- Corrigir Financial Transactions Bugadas
        UPDATE financial_transactions t
        SET 
            type = CASE WHEN e.amount < 0 THEN 'expense' ELSE 'revenue' END,
            total_amount = ABS(e.amount),
            paid_amount = ABS(e.amount),
            status = 'paid',
            reconciled = true,
            is_reconciled = true,
            bank_account_id = COALESCE(t.bank_account_id, v_primary_bank_id),
            -- Alterar Is_Confirmed pra TRUE fará o Trigger do Postgres re-escrever o current_balance 
            -- para o Valor exato da transação, corrigindo a assimetria global!
            is_confirmed = true
        FROM bank_statement_entries e
        WHERE e.matched_transaction_id = t.id 
          AND t.type IS NULL 
          AND t.total_amount = 0;
          
    END IF;
END $$;