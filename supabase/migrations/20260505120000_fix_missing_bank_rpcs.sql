-- ============================================================
-- Spec 057: Finance Deletions Bugfix
-- Cria as 2 funções RPC faltantes no banco de dados
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. get_bank_linked_count
-- Conta quantas transações + extratos estão vinculados a um banco
CREATE OR REPLACE FUNCTION public.get_bank_linked_count(p_bank_account_id uuid)
RETURNS integer AS $$
DECLARE
  v_transaction_count integer;
  v_statement_count integer;
BEGIN
  SELECT COUNT(*) INTO v_transaction_count
  FROM public.financial_transactions
  WHERE bank_account_id = p_bank_account_id;

  SELECT COUNT(*) INTO v_statement_count
  FROM public.bank_statement_entries
  WHERE bank_account_id = p_bank_account_id;

  RETURN COALESCE(v_transaction_count, 0) + COALESCE(v_statement_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. migrate_and_delete_bank
-- Migra ou desvincula registros e deleta a conta bancária
CREATE OR REPLACE FUNCTION public.migrate_and_delete_bank(
  p_source_bank_id uuid,
  p_target_bank_id uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF p_target_bank_id IS NOT NULL THEN
    -- Migra transações para o banco destino
    UPDATE public.financial_transactions
    SET bank_account_id = p_target_bank_id
    WHERE bank_account_id = p_source_bank_id;

    -- Migra histórico de importação
    UPDATE public.bank_import_history
    SET bank_account_id = p_target_bank_id
    WHERE bank_account_id = p_source_bank_id;

    -- Migra entradas de extrato
    UPDATE public.bank_statement_entries
    SET bank_account_id = p_target_bank_id
    WHERE bank_account_id = p_source_bank_id;
  ELSE
    -- Sem destino: apenas desvincula transações
    UPDATE public.financial_transactions
    SET bank_account_id = NULL
    WHERE bank_account_id = p_source_bank_id;

    -- Deleta histórico de importação e entradas
    DELETE FROM public.bank_statement_entries
    WHERE bank_account_id = p_source_bank_id;

    DELETE FROM public.bank_import_history
    WHERE bank_account_id = p_source_bank_id;
  END IF;

  -- Deleta o banco de origem
  DELETE FROM public.bank_accounts
  WHERE id = p_source_bank_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
