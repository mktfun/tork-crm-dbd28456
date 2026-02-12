-- Dropar versao legada
DROP FUNCTION IF EXISTS get_aging_report(uuid, text);

-- Recriar a versao moderna com suporte a p_type
CREATE OR REPLACE FUNCTION get_aging_report(
  p_user_id uuid, 
  p_type text DEFAULT 'receivables',
  p_reference_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(bucket_range text, bucket_amount numeric, bucket_count integer, bucket_color text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_account_type TEXT;
  v_bucket_1_label TEXT;
  v_bucket_2_label TEXT;
  v_bucket_3_label TEXT;
  v_bucket_4_label TEXT;
BEGIN
  IF p_type = 'receivables' THEN
    v_account_type := 'revenue';
    v_bucket_1_label := '1-30 dias';
    v_bucket_2_label := '31-60 dias';
    v_bucket_3_label := '61-90 dias';
    v_bucket_4_label := '90+ dias';
  ELSE
    v_account_type := 'expense';
    v_bucket_1_label := '1-30 dias';
    v_bucket_2_label := '31-60 dias';
    v_bucket_3_label := '61-90 dias';
    v_bucket_4_label := '90+ dias';
  END IF;

  RETURN QUERY
  WITH overdue AS (
    SELECT 
        ft.id, 
        ABS(ft.total_amount) as amount,
        (p_reference_date - ft.transaction_date)::INTEGER as days_overdue
    FROM financial_transactions ft
    JOIN financial_ledger fl ON fl.transaction_id = ft.id
    JOIN financial_accounts fa ON fa.id = fl.account_id
    WHERE ft.user_id = p_user_id
      AND fa.type = v_account_type
      AND NOT ft.is_confirmed
      AND NOT ft.reconciled
      AND NOT ft.is_void
      AND ft.transaction_date < p_reference_date
      -- Para evitar contagem dupla se houver múltiplos entries no ledger para a mesma conta (raro, mas possível)
      -- Group by para garantir unicidade da transação
    GROUP BY ft.id, ft.total_amount, ft.transaction_date
  ),
  buckets AS (
    SELECT
      CASE
        WHEN days_overdue <= 30 THEN v_bucket_1_label
        WHEN days_overdue <= 60 THEN v_bucket_2_label
        WHEN days_overdue <= 90 THEN v_bucket_3_label
        ELSE v_bucket_4_label
      END as range_label,
      CASE
        WHEN days_overdue <= 30 THEN 1
        WHEN days_overdue <= 60 THEN 2
        WHEN days_overdue <= 90 THEN 3
        ELSE 4
      END as sort_order,
      CASE
        WHEN days_overdue <= 30 THEN 'bg-yellow-500' -- Amarelo para atraso curto
        WHEN days_overdue <= 60 THEN 'bg-orange-500' -- Laranja para médio
        WHEN days_overdue <= 90 THEN 'bg-red-500'    -- Vermelho para longo
        ELSE 'bg-red-700'                            -- Vermelho escuro para crítico
      END as color_class,
      amount
    FROM overdue
  )
  SELECT
    b.range_label::text,
    COALESCE(SUM(b.amount), 0)::numeric,
    COUNT(*)::integer,
    MAX(b.color_class)::text
  FROM buckets b
  GROUP BY b.range_label, b.sort_order
  ORDER BY b.sort_order;
END;
$$;
