-- Fix: populate reconciled_at for reconciled transactions that are missing it
UPDATE financial_transactions SET reconciled_at = created_at WHERE reconciled = true AND reconciled_at IS NULL;