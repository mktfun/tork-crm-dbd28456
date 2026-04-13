-- Data repair: recalculate total_amount from ledger for legacy zero-value transactions
UPDATE financial_transactions t
SET total_amount = COALESCE((
  SELECT SUM(ABS(amount)) / 2.0
  FROM financial_ledger
  WHERE transaction_id = t.id
), 0)
WHERE total_amount = 0 OR total_amount IS NULL;