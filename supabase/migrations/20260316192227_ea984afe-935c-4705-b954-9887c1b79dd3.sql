-- Limpar referências em financial_transactions
UPDATE financial_transactions
SET reconciled_statement_id = NULL
WHERE reconciled_statement_id IN (
  SELECT id FROM bank_statement_entries
  WHERE import_batch_id = '8eb8b8e7-0f4e-403e-a4e9-f39cfc15a953'
);

-- Deletar entries do batch
DELETE FROM bank_statement_entries
WHERE import_batch_id = '8eb8b8e7-0f4e-403e-a4e9-f39cfc15a953';

-- Deletar histórico de importação
DELETE FROM bank_import_history
WHERE id = '8eb8b8e7-0f4e-403e-a4e9-f39cfc15a953';