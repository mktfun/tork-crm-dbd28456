-- Update get_recent_financial_transactions to include is_confirmed
-- Date: 2026-02-09

DROP FUNCTION IF EXISTS public.get_recent_financial_transactions(integer, integer, text);

CREATE OR REPLACE FUNCTION public.get_recent_financial_transactions(
  p_limit integer DEFAULT 50, 
  p_offset integer DEFAULT 0, 
  p_type text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, 
  description text, 
  transaction_date date, 
  reference_number text, 
  created_at timestamptz, 
  is_void boolean, 
  total_amount numeric, 
  account_names text,
  status text,
  is_confirmed boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ft.id,
    ft.description,
    ft.transaction_date,
    ft.reference_number,
    ft.created_at,
    ft.is_void,
    COALESCE(SUM(ABS(fl.amount)) / 2, 0) as total_amount,
    STRING_AGG(DISTINCT fa.name, ', ' ORDER BY fa.name) as account_names,
    COALESCE(ft.status, 'pending') as status,
    COALESCE(ft.is_confirmed, false) as is_confirmed
  FROM public.financial_transactions ft
  LEFT JOIN public.financial_ledger fl ON fl.transaction_id = ft.id
  LEFT JOIN public.financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = auth.uid()
    AND ft.is_void = false
    -- Excluir estornos/reversals do histórico principal
    AND COALESCE(ft.related_entity_type, '') != 'reversal'
    AND (
      p_type IS NULL 
      OR EXISTS (
        SELECT 1 FROM public.financial_ledger fl2
        JOIN public.financial_accounts fa2 ON fa2.id = fl2.account_id
        WHERE fl2.transaction_id = ft.id AND fa2.type::text = p_type
      )
    )
  GROUP BY ft.id, ft.description, ft.transaction_date, ft.reference_number, 
           ft.created_at, ft.is_void, ft.status, ft.is_confirmed
  ORDER BY ft.transaction_date DESC, ft.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;
