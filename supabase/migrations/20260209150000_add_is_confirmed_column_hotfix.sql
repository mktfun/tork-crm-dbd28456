-- =======================================================================
-- HOTFIX: Add is_confirmed column to financial_transactions
-- =======================================================================
-- Problem: RPC create_financial_movement tries to insert into is_confirmed
--          but the column doesn't exist in financial_transactions table.
--          This was assumed to exist in migration 20260206145500 but was never added.
-- Solution: Add is_confirmed BOOLEAN column with default false
-- Date: 2026-02-09
-- =======================================================================

-- Add is_confirmed column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'financial_transactions' 
    AND column_name = 'is_confirmed'
  ) THEN
    ALTER TABLE public.financial_transactions 
    ADD COLUMN is_confirmed BOOLEAN NOT NULL DEFAULT false;
    
    RAISE NOTICE 'Column is_confirmed added to financial_transactions';
  ELSE
    RAISE NOTICE 'Column is_confirmed already exists';
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_is_confirmed 
ON public.financial_transactions(is_confirmed) 
WHERE NOT is_void;

-- Add comment
COMMENT ON COLUMN public.financial_transactions.is_confirmed IS 
'Indicates if the transaction has been confirmed/settled (true) or is pending (false). Used to track payment status.';

-- Backfill existing data: assume old transactions are confirmed if not voided
-- (Only for transactions WITHOUT a bank_account_id, which likely means they were 
-- created via old flows and are already settled)
UPDATE public.financial_transactions
SET is_confirmed = true
WHERE is_confirmed = false
  AND NOT is_void
  AND bank_account_id IS NULL
  AND created_at < '2026-02-09'::date;

-- Log backfill completion
DO $$
BEGIN
  RAISE NOTICE 'Backfilled is_confirmed for existing transactions';
END
$$;
