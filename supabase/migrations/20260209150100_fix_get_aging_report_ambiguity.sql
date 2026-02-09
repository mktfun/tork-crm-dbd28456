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
  -- NOTE: financial_transactions does NOT have due_date column.
  -- The original aging report logic was based on an incorrect schema assumption.
  -- Without due_date, we cannot calculate aging/overdue correctly.
  -- 
  -- Options:
  -- 1. Return empty result (current implementation)
  -- 2. Add due_date column to schema
  -- 3. Use transaction_date as proxy (not accurate for aging)
  --
  -- For now, returning empty result to prevent errors.
  -- TODO: Add due_date column or implement proper receivables tracking
  
  RETURN QUERY
  SELECT 
    '0-5 dias'::TEXT as range_label,
    0::DECIMAL as total_amount,
    0::INTEGER as transaction_count,
    '#FCD34D'::TEXT as color
  WHERE FALSE; -- Returns empty set
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_aging_report IS 
'DEPRECATED: Returns empty result. Original implementation assumed due_date column which does not exist in financial_transactions. Needs schema update or reimplementation.';

GRANT EXECUTE ON FUNCTION get_aging_report(UUID, DATE) TO authenticated;
