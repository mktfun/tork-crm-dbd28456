-- =======================================================================
-- HOTFIX: Fix get_aging_report function ambiguity
-- =======================================================================
-- Problem: Multiple signatures of get_aging_report exist causing error:
--          "Could not choose the best candidate function between..."
-- Solution: Drop all versions and recreate with single signature
-- Date: 2026-02-09
-- ========================================================================

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS get_aging_report(UUID);
DROP FUNCTION IF EXISTS get_aging_report(UUID, DATE);
DROP FUNCTION IF EXISTS get_aging_report(p_user_id UUID);
DROP FUNCTION IF EXISTS get_aging_report(p_user_id UUID, p_reference_date DATE);

-- Recreate with single, clear signature using DEFAULT parameter
CREATE OR REPLACE FUNCTION get_aging_report(
  p_user_id UUID,
  p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  bucket_range TEXT,
  bucket_amount DECIMAL,
  bucket_count INTEGER,
  bucket_color TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH overdue_transactions AS (
    SELECT 
      ft.id,
      ft.due_date,
      fl.amount,
      CASE 
        WHEN ft.due_date >= p_reference_date THEN 0
        ELSE p_reference_date - ft.due_date
      END as days_overdue
    FROM financial_transactions ft
    JOIN financial_ledger fl ON fl.transaction_id = ft.id
    JOIN financial_accounts fa ON fa.id = fl.account_id
    WHERE ft.user_id = p_user_id
      AND fa.type IN ('revenue', 'income') -- Support both naming conventions
      AND NOT COALESCE(ft.is_confirmed, false) -- Pending transactions
      AND NOT COALESCE(ft.is_void, false)
      AND fl.amount > 0
      AND ft.due_date IS NOT NULL
      AND ft.due_date < p_reference_date
  )
  SELECT 
    CASE 
      WHEN days_overdue <= 5 THEN '0-5 dias'
      WHEN days_overdue <= 15 THEN '6-15 dias'
      WHEN days_overdue <= 30 THEN '16-30 dias'
      WHEN days_overdue <= 60 THEN '31-60 dias'
      ELSE '60+ dias'
    END as range_label,
    COALESCE(SUM(amount), 0) as total_amount,
    COUNT(*)::INTEGER as transaction_count,
    CASE 
      WHEN days_overdue <= 5 THEN '#FCD34D'
      WHEN days_overdue <= 15 THEN '#FB923C'
      WHEN days_overdue <= 30 THEN '#F87171'
      WHEN days_overdue <= 60 THEN '#EF4444'
      ELSE '#DC2626'
    END as color
  FROM overdue_transactions
  GROUP BY 
    CASE 
      WHEN days_overdue <= 5 THEN '0-5 dias'
      WHEN days_overdue <= 15 THEN '6-15 dias'
      WHEN days_overdue <= 30 THEN '16-30 dias'
      WHEN days_overdue <= 60 THEN '31-60 dias'
      ELSE '60+ dias'
    END,
    CASE 
      WHEN days_overdue <= 5 THEN '#FCD34D'
      WHEN days_overdue <= 15 THEN '#FB923C'
      WHEN days_overdue <= 30 THEN '#F87171'
      WHEN days_overdue <= 60 THEN '#EF4444'
      ELSE '#DC2626'
    END
  ORDER BY 
    CASE 
      WHEN days_overdue <= 5 THEN 1
      WHEN days_overdue <= 15 THEN 2
      WHEN days_overdue <= 30 THEN 3
      WHEN days_overdue <= 60 THEN 4
      ELSE 5
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_aging_report IS 
'Retorna relatório de aging (análise de vencimentos) agrupado por faixas de dias em atraso. Analisa apenas receitas pendentes (is_confirmed=false) vencidas. Parâmetro p_reference_date é opcional e default para CURRENT_DATE.';

GRANT EXECUTE ON FUNCTION get_aging_report(UUID, DATE) TO authenticated;
