-- =====================================================
-- CRIAR FUNÇÃO get_bank_accounts_summary
-- =====================================================
-- 
-- Propósito: Retornar resumo de todas as contas bancárias do usuário
-- Retorna: JSON com lista de contas e saldo consolidado
--
-- Data: 2026-01-30
-- =====================================================

CREATE OR REPLACE FUNCTION get_bank_accounts_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_accounts JSON;
  v_total_balance NUMERIC := 0;
  v_active_count INT := 0;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Buscar contas bancárias
  SELECT 
    COALESCE(JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', ba.id,
        'bankName', ba.bank_name,
        'accountNumber', ba.account_number,
        'agency', ba.agency,
        'accountType', ba.account_type,
        'currentBalance', ba.current_balance,
        'lastSyncDate', ba.last_sync_date,
        'color', ba.color,
        'icon', ba.icon,
        'isActive', ba.is_active,
        'createdAt', ba.created_at,
        'updatedAt', ba.updated_at
      ) ORDER BY ba.created_at DESC
    ), '[]'::JSON)
  INTO v_accounts
  FROM bank_accounts ba
  WHERE ba.user_id = v_user_id;

  -- Calcular saldo total e contar contas ativas
  SELECT 
    COALESCE(SUM(current_balance), 0),
    COUNT(*) FILTER (WHERE is_active = true)
  INTO v_total_balance, v_active_count
  FROM bank_accounts
  WHERE user_id = v_user_id;

  -- Retornar JSON
  RETURN JSON_BUILD_OBJECT(
    'accounts', v_accounts,
    'totalBalance', v_total_balance,
    'activeAccounts', v_active_count
  );
END;
$$;

-- Comentário
COMMENT ON FUNCTION get_bank_accounts_summary() IS 
'Retorna resumo de todas as contas bancárias do usuário autenticado, incluindo saldo consolidado.';
