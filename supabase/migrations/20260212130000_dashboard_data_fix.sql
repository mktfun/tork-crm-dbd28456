-- =====================================================
-- FIX FINAL DASHBOARD VISIBILITY
-- =====================================================

-- 1. DATA MIGRATION: Corrigir "Gráfico Vazio" e "Meta Zerada"
-- Todas as transações antigas que estão 'completed' ou 'confirmed' devem ser consideradas 'reconciled'
-- para aparecerem nos gráficos que exigem conciliação estrita.
UPDATE financial_transactions
SET reconciled = true
WHERE status IN ('completed', 'confirmed')
  AND (reconciled IS NULL OR reconciled = false);


-- 2. RPC FIX: Corrigir "Sem Vínculo" na tabela
-- Melhorar a busca do nome do banco. Se não achar no ledger (conta asset),
-- busca direto na tabela bank_accounts vinculada.

CREATE OR REPLACE FUNCTION public.get_revenue_transactions(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  description text,
  transaction_date date,
  amount numeric,
  account_name text,
  is_confirmed boolean,
  reconciled boolean,
  legacy_status text,
  client_name text,
  policy_number text,
  related_entity_id uuid,
  related_entity_type text,
  bank_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    ft.id,
    ft.description,
    ft.transaction_date,
    -- Valor absoluto da conta de receita
    COALESCE(
      (SELECT SUM(ABS(fl.amount)) FROM financial_ledger fl
       JOIN financial_accounts fa ON fa.id = fl.account_id
       WHERE fl.transaction_id = ft.id AND fa.type = 'revenue'),
      0
    ) AS amount,
    -- Nome da categoria de receita
    (SELECT fa.name FROM financial_ledger fl
     JOIN financial_accounts fa ON fa.id = fl.account_id
     WHERE fl.transaction_id = ft.id AND fa.type = 'revenue'
     LIMIT 1) AS account_name,
    (COALESCE(ft.status, 'pending') IN ('completed', 'confirmed')) AS is_confirmed,
    COALESCE(ft.reconciled, false) as reconciled,
    NULL::text AS legacy_status,
    NULL::text AS client_name,
    NULL::text AS policy_number,
    ft.related_entity_id,
    ft.related_entity_type,
    -- Nome do banco (via conta asset associada OU via bank_account_id direto)
    COALESCE(
      (SELECT fa.name FROM financial_ledger fl
       JOIN financial_accounts fa ON fa.id = fl.account_id
       WHERE fl.transaction_id = ft.id AND fa.type = 'asset'
       LIMIT 1),
      (SELECT ba.bank_name FROM bank_accounts ba WHERE ba.id = ft.bank_account_id)
    ) AS bank_name
  FROM financial_transactions ft
  WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    AND EXISTS (
      SELECT 1 FROM financial_ledger fl
      JOIN financial_accounts fa ON fa.id = fl.account_id
      WHERE fl.transaction_id = ft.id AND fa.type = 'revenue'
    )
    AND (p_start_date IS NULL OR ft.transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR ft.transaction_date <= p_end_date)
  ORDER BY ft.transaction_date DESC, ft.created_at DESC
  LIMIT p_limit;
END;
$$;
