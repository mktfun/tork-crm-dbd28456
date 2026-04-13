
-- Archive unbanked financial_transactions that are fully processed
UPDATE financial_transactions SET archived = true
WHERE user_id = '65b85549-c928-4513-8d56-a3ef41512dc8'
  AND bank_account_id IS NULL
  AND COALESCE(archived, false) = false;

-- Delete orphan legacy transactions with undefined descriptions
DELETE FROM transactions
WHERE user_id = '65b85549-c928-4513-8d56-a3ef41512dc8'
  AND status = 'PENDENTE'
  AND nature = 'RECEITA'
  AND (description ILIKE '%undefined%' OR client_id IS NULL);
