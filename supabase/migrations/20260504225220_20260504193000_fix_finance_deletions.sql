-- 1. Modify the Foreign Key Constraint to ON DELETE SET NULL
ALTER TABLE "public"."financial_transactions" 
  DROP CONSTRAINT IF EXISTS "financial_transactions_reconciled_statement_id_fkey";

ALTER TABLE "public"."financial_transactions"
  ADD CONSTRAINT "financial_transactions_reconciled_statement_id_fkey"
  FOREIGN KEY ("reconciled_statement_id")
  REFERENCES "public"."bank_statement_entries"("id")
  ON DELETE SET NULL;

-- 2. Create the missing RPC for migrate_and_delete_bank
CREATE OR REPLACE FUNCTION public.migrate_and_delete_bank(
  p_source_bank_id uuid,
  p_target_bank_id uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- If there is a target bank, reassign all transactions and statements to it
  IF p_target_bank_id IS NOT NULL THEN
    -- Update financial transactions
    UPDATE public.financial_transactions
    SET bank_account_id = p_target_bank_id
    WHERE bank_account_id = p_source_bank_id;

    -- Update bank statements
    UPDATE public.bank_statements
    SET bank_account_id = p_target_bank_id
    WHERE bank_account_id = p_source_bank_id;

    -- Update bank statement entries
    UPDATE public.bank_statement_entries
    SET bank_account_id = p_target_bank_id
    WHERE bank_account_id = p_source_bank_id;
  ELSE
    -- If there's no target bank, unassign transactions
    UPDATE public.financial_transactions
    SET bank_account_id = NULL
    WHERE bank_account_id = p_source_bank_id;

    -- Delete all imported bank statements for this bank (which will cascade to entries)
    DELETE FROM public.bank_statements
    WHERE bank_account_id = p_source_bank_id;
    
    -- In case there are orphaned entries
    DELETE FROM public.bank_statement_entries
    WHERE bank_account_id = p_source_bank_id;
  END IF;

  -- Delete the source bank account
  DELETE FROM public.bank_accounts
  WHERE id = p_source_bank_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
