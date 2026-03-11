-- Update RPC create_transaction_from_statement to accept optional p_bank_account_id
CREATE OR REPLACE FUNCTION public.create_transaction_from_statement(
    p_statement_entry_id uuid, 
    p_category_account_id uuid, 
    p_description text DEFAULT NULL::text,
    p_bank_account_id uuid DEFAULT NULL::uuid
)
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
    v_final_bank_id UUID;
BEGIN
    -- Buscar entrada do extrato
    SELECT * INTO v_entry
    FROM bank_statement_entries
    WHERE id = p_statement_entry_id AND user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Entrada não encontrada');
    END IF;
    
    -- Determine final bank_account_id: explicit param > entry's bank
    v_final_bank_id := COALESCE(p_bank_account_id, v_entry.bank_account_id);
    
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
    
    -- Criar transação no sistema
    INSERT INTO financial_transactions (
        user_id, created_by, description, transaction_date, reference_number,
        bank_account_id, is_reconciled, reconciled_at, reconciled_statement_id,
        type, total_amount, paid_amount, reconciled, is_confirmed, status
    ) VALUES (
        v_user_id, v_user_id,
        COALESCE(p_description, v_entry.description),
        v_entry.transaction_date, v_entry.reference_number,
        v_final_bank_id,
        TRUE, NOW(), p_statement_entry_id,
        CASE WHEN v_entry.amount < 0 THEN 'expense' ELSE 'revenue' END,
        ABS(v_entry.amount), ABS(v_entry.amount),
        TRUE, TRUE, 'paid'
    ) RETURNING id INTO v_transaction_id;
    
    -- Criar movimentos no ledger (partidas dobradas)
    IF v_entry.amount > 0 THEN
        INSERT INTO financial_ledger (transaction_id, account_id, amount)
        VALUES 
            (v_transaction_id, v_asset_account_id, v_entry.amount),
            (v_transaction_id, p_category_account_id, -v_entry.amount);
    ELSE
        INSERT INTO financial_ledger (transaction_id, account_id, amount)
        VALUES 
            (v_transaction_id, p_category_account_id, ABS(v_entry.amount)),
            (v_transaction_id, v_asset_account_id, v_entry.amount);
    END IF;
    
    -- Atualizar entrada do extrato (also assign bank if provided)
    UPDATE bank_statement_entries
    SET 
        reconciliation_status = 'matched',
        matched_transaction_id = v_transaction_id,
        matched_at = NOW(),
        matched_by = v_user_id,
        match_confidence = 1.0,
        bank_account_id = COALESCE(v_final_bank_id, bank_account_id),
        updated_at = NOW()
    WHERE id = p_statement_entry_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'message', 'Transação criada e conciliada'
    );
END;
$function$;