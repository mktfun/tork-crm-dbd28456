-- Fix: cast fa.type enum to text for comparison
DROP FUNCTION IF EXISTS get_aging_report(uuid, text, date);

CREATE OR REPLACE FUNCTION get_aging_report(
  p_user_id uuid, 
  p_type text DEFAULT 'receivables',
  p_reference_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(bucket_range text, bucket_amount numeric, bucket_count integer, bucket_color text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_account_type TEXT;
BEGIN
  IF p_type = 'receivables' THEN
    v_account_type := 'revenue';
  ELSE
    v_account_type := 'expense';
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
      AND fa.type::text = v_account_type
      AND NOT ft.is_confirmed
      AND NOT ft.is_void
      AND ft.transaction_date < p_reference_date
    GROUP BY ft.id, ft.total_amount, ft.transaction_date
  ),
  buckets AS (
    SELECT
      CASE
        WHEN o.days_overdue <= 30 THEN '1-30 dias'
        WHEN o.days_overdue <= 60 THEN '31-60 dias'
        WHEN o.days_overdue <= 90 THEN '61-90 dias'
        ELSE '90+ dias'
      END as range_label,
      CASE
        WHEN o.days_overdue <= 30 THEN 1
        WHEN o.days_overdue <= 60 THEN 2
        WHEN o.days_overdue <= 90 THEN 3
        ELSE 4
      END as sort_order,
      CASE
        WHEN o.days_overdue <= 30 THEN '#FBBF24'
        WHEN o.days_overdue <= 60 THEN '#F97316'
        WHEN o.days_overdue <= 90 THEN '#EF4444'
        ELSE '#B91C1C'
      END as color_class,
      o.amount
    FROM overdue o
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

GRANT EXECUTE ON FUNCTION get_aging_report(uuid, text, date) TO authenticated;
